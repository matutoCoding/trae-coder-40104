import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tier, TierGroup, TableItem, Occupation, Bill, BillDetail, Member } from '@/types';
import { genId } from '@/utils/id';
import { calculateBillDetails, calculateTotal } from '@/utils/billing';

const DEFAULT_OPEN_TIER_GROUP: TierGroup = {
  id: 'tg_open',
  name: '散台费率',
  tiers: [
    { id: 't_o1', startMinute: 0, endMinute: 60, pricePerHour: 30, label: '第一档 (0-60分钟)' },
    { id: 't_o2', startMinute: 60, endMinute: 120, pricePerHour: 48, label: '第二档 (60-120分钟)' },
    { id: 't_o3', startMinute: 120, endMinute: null, pricePerHour: 72, label: '第三档 (120分钟+)' },
  ],
};

const DEFAULT_VIP_TIER_GROUP: TierGroup = {
  id: 'tg_vip',
  name: '包厢费率',
  tiers: [
    { id: 't_v1', startMinute: 0, endMinute: 60, pricePerHour: 60, label: '第一档 (0-60分钟)' },
    { id: 't_v2', startMinute: 60, endMinute: 120, pricePerHour: 90, label: '第二档 (60-120分钟)' },
    { id: 't_v3', startMinute: 120, endMinute: null, pricePerHour: 120, label: '第三档 (120分钟+)' },
  ],
};

const DEFAULT_TABLES: TableItem[] = [
  { id: 'tbl_1', name: '1号台', category: 'open', tierGroupId: 'tg_open', status: 'available' },
  { id: 'tbl_2', name: '2号台', category: 'open', tierGroupId: 'tg_open', status: 'available' },
  { id: 'tbl_3', name: '3号台', category: 'open', tierGroupId: 'tg_open', status: 'available' },
  { id: 'tbl_4', name: '4号台', category: 'open', tierGroupId: 'tg_open', status: 'available' },
  { id: 'tbl_5', name: 'VIP包厢1', category: 'vip', tierGroupId: 'tg_vip', status: 'available' },
  { id: 'tbl_6', name: 'VIP包厢2', category: 'vip', tierGroupId: 'tg_vip', status: 'available' },
];

const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'mbr_demo1',
    name: '张先生',
    phone: '13800138000',
    balance: 500,
    discount: 0.85,
    discountLabel: '金卡会员 85折',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'mbr_demo2',
    name: '李小姐',
    phone: '13900139000',
    balance: 200,
    discount: 0.95,
    discountLabel: '普通会员 95折',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeMinutesBetween(start: string, end: string): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function liveEndTime(occ: Occupation): string {
  const now = new Date().toISOString();
  if (!occ.endTime) return now;
  return new Date(occ.endTime).getTime() < Date.now() ? occ.endTime : now;
}

function updateTableStatuses(occupations: Occupation[]): (tables: TableItem[]) => TableItem[] {
  return (tables) => {
    return tables.map(t => {
      const now = Date.now();
      const active = occupations.find(o => {
        if (o.tableId !== t.id) return false;
        const start = new Date(o.startTime).getTime();
        const end = o.endTime ? new Date(o.endTime).getTime() : Infinity;
        return now >= start && now < end;
      });
      if (active) return { ...t, status: 'occupied' as const };
      const future = occupations.find(
        o => o.tableId === t.id && new Date(o.startTime).getTime() > now
      );
      if (future) return { ...t, status: 'reserved' as const };
      if (t.status === 'maintenance') return t;
      return { ...t, status: 'available' as const };
    });
  };
}

function startOfDayISO(d: Date): string {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd.toISOString();
}
function endOfDayISO(d: Date): string {
  const nd = new Date(d);
  nd.setHours(23, 59, 59, 999);
  return nd.toISOString();
}

export interface RevenueStats {
  received: number;
  refunded: number;
  net: number;
  minutesUsed: number;
  billCount: number;
  uniqueTables: number;
}

function computeRevenueStats(bills: Bill[], fromISO: string, toISO: string): RevenueStats {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  let received = 0;
  let refunded = 0;
  let minutesUsed = 0;
  let billCount = 0;
  const tableSet = new Set<string>();

  for (const b of bills) {
    if (b.status === 'merged') continue;
    const t = new Date(b.createdAt).getTime();
    if (t < from || t > to) continue;
    if (b.status === 'paid') {
      received += b.totalAmount;
      minutesUsed += b.totalMinutes;
      tableSet.add(b.tableId);
      billCount++;
    } else if (b.status === 'refunded') {
      refunded += b.totalAmount;
    }
  }

  return {
    received: round2(received),
    refunded: round2(refunded),
    net: round2(received - refunded),
    minutesUsed,
    billCount,
    uniqueTables: tableSet.size,
  };
}

export interface MemberStats {
  totalPaid: number;
  totalMinutes: number;
  visitCount: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  bills: Bill[];
}

function computeMemberStats(memberId: string, bills: Bill[]): MemberStats {
  const myBills = bills.filter(
    b => b.memberId === memberId && b.status !== 'merged' && b.status !== 'active'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let totalPaid = 0;
  let totalMinutes = 0;
  let visitCount = 0;

  for (const b of myBills) {
    if (b.status === 'paid') {
      totalPaid += b.totalAmount;
      totalMinutes += b.totalMinutes;
      visitCount++;
    }
  }

  return {
    totalPaid: round2(totalPaid),
    totalMinutes,
    visitCount,
    firstVisitAt: myBills[0]?.createdAt ?? null,
    lastVisitAt: myBills[myBills.length - 1]?.createdAt ?? null,
    bills: myBills,
  };
}

interface StoreState {
  tierGroups: TierGroup[];
  tables: TableItem[];
  occupations: Occupation[];
  bills: Bill[];
  members: Member[];

  openTable: (tableId: string, customerName: string, customerPhone: string, startTime?: string, memberId?: string | null) => void;
  closeTableByOccupation: (occupationId: string, endTimeOverride?: string, useBalance?: boolean) => Bill;
  closeTable: (tableId: string, useBalance?: boolean) => Bill;
  extendOccupation: (occupationId: string, newEndTime: string) => void;
  splitOccupation: (occupationId: string, splitTime: string, keepSecondHalf?: boolean) => { bill: Bill | null; splitSuccess: boolean };
  mergeAdjacentOccupations: (tableId: string) => void;

  addTierGroup: (name: string) => TierGroup;
  updateTierGroup: (id: string, name: string) => void;
  deleteTierGroup: (id: string) => void;
  addTier: (tierGroupId: string, tier: Omit<Tier, 'id'>) => void;
  updateTier: (tierGroupId: string, tierId: string, data: Partial<Tier>) => void;
  deleteTier: (tierGroupId: string, tierId: string) => void;

  addTable: (name: string, category: 'vip' | 'open', tierGroupId: string) => void;
  updateTable: (id: string, data: Partial<TableItem>) => void;
  deleteTable: (id: string) => void;

  addMember: (data: { name: string; phone: string; balance?: number; discount?: number; discountLabel?: string }) => Member;
  updateMember: (id: string, data: Partial<Omit<Member, 'id' | 'createdAt'>>) => void;
  rechargeMember: (id: string, amount: number) => void;
  deleteMember: (id: string) => void;
  getMemberById: (id: string) => Member | undefined;
  getMemberStats: (memberId: string) => MemberStats;

  markBillPaid: (billId: string) => void;
  markBillRefunded: (billId: string) => void;

  getOccupationForTable: (tableId: string) => Occupation | undefined;
  getTiersForTable: (tableId: string) => Tier[];
  getLiveBillDetails: (occupationId: string) => { details: BillDetail[]; total: number; elapsed: number; originalAmount: number; discountRate: number; discountLabel: string; member: Member | null };

  getRevenueStatsToday: () => RevenueStats;
  getRevenueStatsThisWeek: () => RevenueStats;
  getRevenueStatsThisMonth: () => RevenueStats;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      tierGroups: [DEFAULT_OPEN_TIER_GROUP, DEFAULT_VIP_TIER_GROUP],
      tables: DEFAULT_TABLES,
      occupations: [],
      bills: [],
      members: DEFAULT_MEMBERS,

      openTable: (tableId, customerName, customerPhone, startTime, memberId = null) => {
        const table = get().tables.find(t => t.id === tableId);
        if (!table) return;

        const effectiveStart = startTime ?? new Date().toISOString();

        const tableOccs = get().occupations.filter(o => o.tableId === tableId);
        for (const occ of tableOccs) {
          const occStart = new Date(occ.startTime).getTime();
          const occEnd = occ.endTime ? new Date(occ.endTime).getTime() : Infinity;
          const startMs = new Date(effectiveStart).getTime();
          if (startMs < occEnd && startMs >= occStart) {
            return;
          }
        }

        let finalMemberId = memberId;
        let finalName = customerName;
        let finalPhone = customerPhone;
        if (memberId) {
          const m = get().members.find(x => x.id === memberId);
          if (m) {
            finalName = m.name;
            finalPhone = m.phone;
          }
        }

        const occupation: Occupation = {
          id: genId('occ_'),
          tableId,
          customerName: finalName,
          customerPhone: finalPhone,
          memberId: finalMemberId,
          startTime: effectiveStart,
          endTime: null,
          mergedFrom: [],
          tierGroupId: table.tierGroupId,
        };

        set(s => {
          const newOccs = [...s.occupations, occupation];
          return {
            occupations: newOccs,
            tables: updateTableStatuses(newOccs)(s.tables),
          };
        });

        get().mergeAdjacentOccupations(tableId);
      },

      closeTable: (tableId, useBalance = true) => {
        const now = Date.now();
        const activeOccs = get().occupations.filter(
          o => o.tableId === tableId && (
            (o.endTime === null) ||
            (new Date(o.endTime).getTime() > now && new Date(o.startTime).getTime() <= now)
          )
        );
        const target = activeOccs.find(o => o.endTime === null) || activeOccs[0];
        if (!target) throw new Error('No active occupation found');
        return get().closeTableByOccupation(target.id, undefined, useBalance);
      },

      closeTableByOccupation: (occupationId, endTimeOverride, useBalance = true) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) throw new Error('Occupation not found');

        const endTime = endTimeOverride ?? new Date().toISOString();
        const totalMinutes = computeMinutesBetween(occ.startTime, endTime);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, totalMinutes);
        const originalAmount = calculateTotal(details);

        const member = occ.memberId ? get().members.find(m => m.id === occ.memberId) ?? null : null;
        const discountRate = member?.discount ?? 1;
        const discountLabel = member?.discountLabel ?? '';
        let totalAmount = round2(originalAmount * discountRate);

        const allOccIds = [occ.id, ...occ.mergedFrom];
        const oldMergedBills = get().bills.filter(b =>
          b.status === 'merged' && b.mergedInto === null && allOccIds.includes(b.occupationId)
        );

        let balanceUsed = 0;
        if (useBalance && member && totalAmount > 0) {
          const usable = Math.min(member.balance, totalAmount);
          balanceUsed = round2(usable);
        }

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId: occ.tableId,
          customerName: occ.customerName,
          memberId: occ.memberId,
          startTime: occ.startTime,
          endTime,
          totalMinutes,
          totalAmount: round2(totalAmount - balanceUsed),
          originalAmount,
          discountRate,
          discountLabel,
          balanceUsed,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
          mergedInto: null,
          mergedFrom: oldMergedBills.map(b => b.id),
        };

        set(s => {
          const newOccs = s.occupations.map(o =>
            o.id === occupationId ? { ...o, endTime } : o
          );
          let updatedBills = s.bills.map(b => {
            if (b.status === 'merged' && b.mergedInto === null && allOccIds.includes(b.occupationId)) {
              return { ...b, mergedInto: bill.id };
            }
            return b;
          });
          updatedBills = [...updatedBills, bill];

          let updatedMembers = s.members;
          if (member && balanceUsed > 0) {
            updatedMembers = s.members.map(m =>
              m.id === member.id ? { ...m, balance: round2(m.balance - balanceUsed) } : m
            );
          }

          return {
            occupations: newOccs,
            bills: updatedBills,
            members: updatedMembers,
            tables: updateTableStatuses(newOccs)(s.tables),
          };
        });

        return bill;
      },

      extendOccupation: (occupationId, newEndTime) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) return;

        set(s => ({
          occupations: s.occupations.map(o =>
            o.id === occupationId ? { ...o, endTime: newEndTime } : o
          ),
        }));

        get().mergeAdjacentOccupations(occ.tableId);

        set(s => ({
          tables: updateTableStatuses(s.occupations)(s.tables),
        }));
      },

      splitOccupation: (occupationId, splitTime, keepSecondHalf = true) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) return { bill: null, splitSuccess: false };

        const splitMs = new Date(splitTime).getTime();
        const startMs = new Date(occ.startTime).getTime();
        const endMs = occ.endTime ? new Date(occ.endTime).getTime() : Date.now();

        if (splitMs <= startMs || splitMs >= endMs) {
          return { bill: null, splitSuccess: false };
        }

        const firstHalfMinutes = computeMinutesBetween(occ.startTime, splitTime);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, firstHalfMinutes);
        const originalAmount = calculateTotal(details);

        const member = occ.memberId ? get().members.find(m => m.id === occ.memberId) ?? null : null;
        const discountRate = member?.discount ?? 1;
        const discountLabel = member?.discountLabel ?? '';
        const totalAmount = round2(originalAmount * discountRate);

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId: occ.tableId,
          customerName: occ.customerName,
          memberId: occ.memberId,
          startTime: occ.startTime,
          endTime: splitTime,
          totalMinutes: firstHalfMinutes,
          totalAmount,
          originalAmount,
          discountRate,
          discountLabel,
          balanceUsed: 0,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
          mergedInto: null,
          mergedFrom: [],
        };

        const originalEnd = occ.endTime;

        set(s => {
          let newOccs = s.occupations.map(o =>
            o.id === occupationId ? { ...o, endTime: splitTime } : o
          );

          if (keepSecondHalf) {
            const secondHalf: Occupation = {
              id: genId('occ_'),
              tableId: occ.tableId,
              customerName: occ.customerName,
              customerPhone: occ.customerPhone,
              memberId: occ.memberId,
              startTime: splitTime,
              endTime: originalEnd,
              mergedFrom: [],
              tierGroupId: occ.tierGroupId,
            };
            newOccs = [...newOccs, secondHalf];
          }

          return {
            occupations: newOccs,
            bills: [...s.bills, bill],
            tables: updateTableStatuses(newOccs)(s.tables),
          };
        });

        return { bill, splitSuccess: true };
      },

      mergeAdjacentOccupations: (tableId) => {
        const tableOccs = get().occupations
          .filter(o => o.tableId === tableId)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (tableOccs.length < 2) return;

        const merged: Occupation[] = [];
        let didMerge = false;
        let current = { ...tableOccs[0], mergedFrom: [...tableOccs[0].mergedFrom] };

        for (let i = 1; i < tableOccs.length; i++) {
          const next = tableOccs[i];
          const currentEnd = current.endTime ? new Date(current.endTime).getTime() : null;
          const nextStart = new Date(next.startTime).getTime();
          const nextEnd = next.endTime ? new Date(next.endTime).getTime() : null;

          const adjacentOrOverlap =
            currentEnd !== null &&
            nextStart !== null &&
            Math.abs(nextStart - currentEnd) <= 60 * 1000 &&
            current.customerName === next.customerName &&
            (current.memberId ?? null) === (next.memberId ?? null);

          if (adjacentOrOverlap) {
            let newEnd: string | null;
            if (nextEnd === null || currentEnd === null) {
              newEnd = null;
            } else if (nextEnd > currentEnd) {
              newEnd = next.endTime;
            } else {
              newEnd = current.endTime;
            }

            current = {
              ...current,
              endTime: newEnd,
              mergedFrom: [...current.mergedFrom, next.id, ...next.mergedFrom],
            };
            didMerge = true;
          } else {
            merged.push(current);
            current = { ...next, mergedFrom: [...next.mergedFrom] };
          }
        }
        merged.push(current);

        if (!didMerge) return;

        const otherOccs = get().occupations.filter(o => o.tableId !== tableId);
        const allOccs = [...otherOccs, ...merged];

        set(s => {
          const allOccIds = merged.flatMap(m => [m.id, ...m.mergedFrom]);
          const updatedBills = s.bills.map(b => {
            if (
              b.status !== 'merged' &&
              b.status !== 'refunded' &&
              allOccIds.includes(b.occupationId)
            ) {
              return { ...b, status: 'merged' as const, mergedInto: null };
            }
            return b;
          });

          return {
            occupations: allOccs,
            bills: updatedBills,
            tables: updateTableStatuses(allOccs)(s.tables),
          };
        });
      },

      addTierGroup: (name) => {
        const group: TierGroup = { id: genId('tg_'), name, tiers: [] };
        set(s => ({ tierGroups: [...s.tierGroups, group] }));
        return group;
      },

      updateTierGroup: (id, name) => {
        set(s => ({
          tierGroups: s.tierGroups.map(g => g.id === id ? { ...g, name } : g),
        }));
      },

      deleteTierGroup: (id) => {
        set(s => ({
          tierGroups: s.tierGroups.filter(g => g.id !== id),
        }));
      },

      addTier: (tierGroupId, tierData) => {
        const tier: Tier = { ...tierData, id: genId('t_') };
        set(s => ({
          tierGroups: s.tierGroups.map(g =>
            g.id === tierGroupId ? { ...g, tiers: [...g.tiers, tier] } : g
          ),
        }));
      },

      updateTier: (tierGroupId, tierId, data) => {
        set(s => ({
          tierGroups: s.tierGroups.map(g =>
            g.id === tierGroupId
              ? { ...g, tiers: g.tiers.map(t => t.id === tierId ? { ...t, ...data } : t) }
              : g
          ),
        }));
      },

      deleteTier: (tierGroupId, tierId) => {
        set(s => ({
          tierGroups: s.tierGroups.map(g =>
            g.id === tierGroupId
              ? { ...g, tiers: g.tiers.filter(t => t.id !== tierId) }
              : g
          ),
        }));
      },

      addTable: (name, category, tierGroupId) => {
        const table: TableItem = {
          id: genId('tbl_'),
          name,
          category,
          tierGroupId,
          status: 'available',
        };
        set(s => ({ tables: [...s.tables, table] }));
      },

      updateTable: (id, data) => {
        set(s => ({
          tables: s.tables.map(t => t.id === id ? { ...t, ...data } : t),
        }));
      },

      deleteTable: (id) => {
        set(s => ({
          tables: s.tables.filter(t => t.id !== id),
          occupations: s.occupations.filter(o => o.tableId !== id),
        }));
      },

      addMember: (data) => {
        const member: Member = {
          id: genId('mbr_'),
          name: data.name,
          phone: data.phone,
          balance: data.balance ?? 0,
          discount: data.discount ?? 1,
          discountLabel: data.discountLabel ?? '无折扣',
          createdAt: new Date().toISOString(),
        };
        set(s => ({ members: [...s.members, member] }));
        return member;
      },

      updateMember: (id, data) => {
        set(s => ({
          members: s.members.map(m => m.id === id ? { ...m, ...data } : m),
        }));
      },

      rechargeMember: (id, amount) => {
        set(s => ({
          members: s.members.map(m =>
            m.id === id ? { ...m, balance: round2(m.balance + amount) } : m
          ),
        }));
      },

      deleteMember: (id) => {
        set(s => ({ members: s.members.filter(m => m.id !== id) }));
      },

      getMemberById: (id) => {
        return get().members.find(m => m.id === id);
      },

      getMemberStats: (memberId) => {
        return computeMemberStats(memberId, get().bills);
      },

      markBillPaid: (billId) => {
        set(s => ({
          bills: s.bills.map(b => b.id === billId ? { ...b, status: 'paid' as const } : b),
        }));
      },

      markBillRefunded: (billId) => {
        const bill = get().bills.find(b => b.id === billId);
        if (!bill) return;

        set(s => {
          let updatedMembers = s.members;
          if (bill.memberId && bill.balanceUsed > 0) {
            updatedMembers = s.members.map(m =>
              m.id === bill.memberId ? { ...m, balance: round2(m.balance + bill.balanceUsed) } : m
            );
          }
          return {
            bills: s.bills.map(b => b.id === billId ? { ...b, status: 'refunded' as const } : b),
            members: updatedMembers,
          };
        });
      },

      getOccupationForTable: (tableId) => {
        const occs = get().occupations
          .filter(o => o.tableId === tableId)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        const now = Date.now();
        const active = occs.find(o => {
          const start = new Date(o.startTime).getTime();
          const end = o.endTime ? new Date(o.endTime).getTime() : Infinity;
          return now >= start && now < end;
        });
        return active ?? occs.find(o => o.endTime === null) ?? occs[0];
      },

      getTiersForTable: (tableId) => {
        const table = get().tables.find(t => t.id === tableId);
        if (!table) return [];
        const group = get().tierGroups.find(g => g.id === table.tierGroupId);
        return group?.tiers ?? [];
      },

      getLiveBillDetails: (occupationId) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) return { details: [], total: 0, elapsed: 0, originalAmount: 0, discountRate: 1, discountLabel: '', member: null };

        const effectiveEnd = liveEndTime(occ);
        const elapsed = computeMinutesBetween(occ.startTime, effectiveEnd);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, elapsed);
        const originalAmount = calculateTotal(details);

        const member = occ.memberId ? get().members.find(m => m.id === occ.memberId) ?? null : null;
        const discountRate = member?.discount ?? 1;
        const discountLabel = member?.discountLabel ?? '';
        const total = round2(originalAmount * discountRate);

        return { details, total, elapsed, originalAmount, discountRate, discountLabel, member };
      },

      getRevenueStatsToday: () => {
        const now = new Date();
        return computeRevenueStats(get().bills, startOfDayISO(now), endOfDayISO(now));
      },

      getRevenueStatsThisWeek: () => {
        const now = new Date();
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return computeRevenueStats(get().bills, startOfDayISO(weekStart), endOfDayISO(weekEnd));
      },

      getRevenueStatsThisMonth: () => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return computeRevenueStats(get().bills, startOfDayISO(monthStart), endOfDayISO(monthEnd));
      },
    }),
    {
      name: 'billiard-store-v4',
    }
  )
);
