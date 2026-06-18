import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tier, TierGroup, TableItem, Occupation, Bill, BillDetail } from '@/types';
import { genId } from '@/utils/id';
import { calculateBillDetails, calculateTotal, getElapsedMinutes } from '@/utils/billing';

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

function computeMinutesBetween(start: string, end: string): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function updateTableStatuses(occupations: Occupation[]): (tables: TableItem[]) => TableItem[] {
  return (tables) => {
    return tables.map(t => {
      const active = occupations.find(
        o => o.tableId === t.id && (
          (o.endTime === null) ||
          (new Date(o.endTime).getTime() > Date.now() && new Date(o.startTime).getTime() <= Date.now())
        )
      );
      if (active && active.endTime === null) {
        return { ...t, status: 'occupied' as const };
      }
      if (active) {
        return { ...t, status: 'occupied' as const };
      }
      const future = occupations.find(
        o => o.tableId === t.id && new Date(o.startTime).getTime() > Date.now()
      );
      if (future) {
        return { ...t, status: 'reserved' as const };
      }
      if (t.status === 'maintenance') return t;
      return { ...t, status: 'available' as const };
    });
  };
}

interface StoreState {
  tierGroups: TierGroup[];
  tables: TableItem[];
  occupations: Occupation[];
  bills: Bill[];

  openTable: (tableId: string, customerName: string, customerPhone: string, startTime?: string) => void;
  closeTableByOccupation: (occupationId: string, endTimeOverride?: string) => Bill;
  closeTable: (tableId: string) => Bill;
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

  markBillPaid: (billId: string) => void;
  markBillRefunded: (billId: string) => void;

  getOccupationForTable: (tableId: string) => Occupation | undefined;
  getTiersForTable: (tableId: string) => Tier[];
  getLiveBillDetails: (occupationId: string) => { details: BillDetail[]; total: number; elapsed: number };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      tierGroups: [DEFAULT_OPEN_TIER_GROUP, DEFAULT_VIP_TIER_GROUP],
      tables: DEFAULT_TABLES,
      occupations: [],
      bills: [],

      openTable: (tableId, customerName, customerPhone, startTime) => {
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

        const occupation: Occupation = {
          id: genId('occ_'),
          tableId,
          customerName,
          customerPhone,
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

      closeTable: (tableId) => {
        const activeOccs = get().occupations.filter(
          o => o.tableId === tableId && (
            (o.endTime === null) ||
            (new Date(o.endTime).getTime() > Date.now() && new Date(o.startTime).getTime() <= Date.now())
          )
        );
        const target = activeOccs.find(o => o.endTime === null) || activeOccs[0];
        if (!target) throw new Error('No active occupation found');
        return get().closeTableByOccupation(target.id);
      },

      closeTableByOccupation: (occupationId, endTimeOverride) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) throw new Error('Occupation not found');

        const endTime = endTimeOverride ?? new Date().toISOString();
        const totalMinutes = computeMinutesBetween(occ.startTime, endTime);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, totalMinutes);
        const total = calculateTotal(details);

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId: occ.tableId,
          customerName: occ.customerName,
          startTime: occ.startTime,
          endTime,
          totalMinutes,
          totalAmount: total,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
          mergedInto: null,
          mergedFrom: [],
        };

        set(s => {
          const newOccs = s.occupations.map(o =>
            o.id === occupationId ? { ...o, endTime } : o
          );
          return {
            occupations: newOccs,
            bills: [...s.bills, bill],
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
        const total = calculateTotal(details);

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId: occ.tableId,
          customerName: occ.customerName,
          startTime: occ.startTime,
          endTime: splitTime,
          totalMinutes: firstHalfMinutes,
          totalAmount: total,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
          mergedInto: null,
          mergedFrom: [],
        };

        const originalEnd = occ.endTime;
        const originalMerged = occ.mergedFrom;

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
        const billsToMarkMerged: { oldBillId: string; newBillId: string }[] = [];
        const newBills: Bill[] = [];
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
            current.customerName === next.customerName;

          if (adjacentOrOverlap) {
            let newEnd: string | null;
            if (nextEnd === null || currentEnd === null) {
              newEnd = null;
            } else if (nextEnd > currentEnd) {
              newEnd = next.endTime;
            } else {
              newEnd = current.endTime;
            }

            const occIds = [current.id, next.id, ...current.mergedFrom, ...next.mergedFrom];
            const oldBills = get().bills.filter(b =>
              occIds.includes(b.occupationId) && b.status !== 'merged' && b.status !== 'refunded'
            );

            if (oldBills.length > 0) {
              const startTime = new Date(Math.min(
                ...oldBills.map(b => new Date(b.startTime).getTime())
              )).toISOString();
              const endTime = newEnd ?? new Date(Math.max(
                ...oldBills.map(b => new Date(b.endTime).getTime())
              )).toISOString();
              const totalMinutes = computeMinutesBetween(startTime, endTime);
              const tiers = get().getTiersForTable(tableId);
              const details = calculateBillDetails(tiers, totalMinutes);
              const total = calculateTotal(details);

              const allPaid = oldBills.every(b => b.status === 'paid');

              const newBillId = genId('bill_');
              const mergedBill: Bill = {
                id: newBillId,
                occupationId: current.id,
                tableId,
                customerName: current.customerName,
                startTime,
                endTime,
                totalMinutes,
                totalAmount: total,
                details,
                status: allPaid ? 'paid' : 'active',
                createdAt: new Date().toISOString(),
                mergedInto: null,
                mergedFrom: oldBills.map(b => b.id),
              };
              newBills.push(mergedBill);
              oldBills.forEach(b => billsToMarkMerged.push({ oldBillId: b.id, newBillId }));
            }

            current = {
              ...current,
              endTime: newEnd,
              mergedFrom: [...current.mergedFrom, next.id, ...next.mergedFrom],
            };
          } else {
            merged.push(current);
            current = { ...next, mergedFrom: [...next.mergedFrom] };
          }
        }
        merged.push(current);

        const otherOccs = get().occupations.filter(o => o.tableId !== tableId);
        const allOccs = [...otherOccs, ...merged];

        set(s => {
          let updatedBills = s.bills.map(b => {
            const mark = billsToMarkMerged.find(m => m.oldBillId === b.id);
            if (mark) {
              return { ...b, status: 'merged' as const, mergedInto: mark.newBillId };
            }
            return b;
          });
          updatedBills = [...updatedBills, ...newBills];

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

      markBillPaid: (billId) => {
        set(s => ({
          bills: s.bills.map(b => b.id === billId ? { ...b, status: 'paid' as const } : b),
        }));
      },

      markBillRefunded: (billId) => {
        set(s => ({
          bills: s.bills.map(b => b.id === billId ? { ...b, status: 'refunded' as const } : b),
        }));
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
        if (!occ) return { details: [], total: 0, elapsed: 0 };

        const endTime = occ.endTime ?? new Date().toISOString();
        const elapsed = computeMinutesBetween(occ.startTime, endTime);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, elapsed);
        const total = calculateTotal(details);

        return { details, total, elapsed };
      },
    }),
    {
      name: 'billiard-store-v2',
    }
  )
);
