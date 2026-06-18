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

interface StoreState {
  tierGroups: TierGroup[];
  tables: TableItem[];
  occupations: Occupation[];
  bills: Bill[];

  openTable: (tableId: string, customerName: string, customerPhone: string) => void;
  closeTable: (tableId: string) => Bill;
  extendOccupation: (occupationId: string, endTime: string) => void;
  splitOccupation: (occupationId: string, splitTime: string) => void;
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

      openTable: (tableId, customerName, customerPhone) => {
        const table = get().tables.find(t => t.id === tableId);
        if (!table || table.status !== 'available') return;

        const occupation: Occupation = {
          id: genId('occ_'),
          tableId,
          customerName,
          customerPhone,
          startTime: new Date().toISOString(),
          endTime: null,
          mergedFrom: [],
          tierGroupId: table.tierGroupId,
        };

        set(s => ({
          occupations: [...s.occupations, occupation],
          tables: s.tables.map(t =>
            t.id === tableId ? { ...t, status: 'occupied' as const } : t
          ),
        }));
      },

      closeTable: (tableId) => {
        const occ = get().occupations.find(
          o => o.tableId === tableId && o.endTime === null
        );
        if (!occ) throw new Error('No active occupation found');

        const endTime = new Date().toISOString();
        const elapsed = getElapsedMinutes(occ.startTime);
        const tiers = get().getTiersForTable(tableId);
        const details = calculateBillDetails(tiers, elapsed);
        const total = calculateTotal(details);

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId,
          customerName: occ.customerName,
          startTime: occ.startTime,
          endTime,
          totalMinutes: elapsed,
          totalAmount: total,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
        };

        set(s => ({
          occupations: s.occupations.map(o =>
            o.id === occ.id ? { ...o, endTime } : o
          ),
          bills: [...s.bills, bill],
          tables: s.tables.map(t =>
            t.id === tableId ? { ...t, status: 'available' as const } : t
          ),
        }));

        return bill;
      },

      extendOccupation: (occupationId, endTime) => {
        set(s => ({
          occupations: s.occupations.map(o =>
            o.id === occupationId ? { ...o, endTime } : o
          ),
        }));
        const occ = get().occupations.find(o => o.id === occupationId);
        if (occ) {
          get().mergeAdjacentOccupations(occ.tableId);
        }
      },

      splitOccupation: (occupationId, splitTime) => {
        const occ = get().occupations.find(o => o.id === occupationId);
        if (!occ) return;

        const splitDate = new Date(splitTime);
        const startDate = new Date(occ.startTime);

        if (splitDate <= startDate) return;

        const elapsed = Math.floor((splitDate.getTime() - startDate.getTime()) / 60000);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, elapsed);
        const total = calculateTotal(details);

        const bill: Bill = {
          id: genId('bill_'),
          occupationId: occ.id,
          tableId: occ.tableId,
          customerName: occ.customerName,
          startTime: occ.startTime,
          endTime: splitTime,
          totalMinutes: elapsed,
          totalAmount: total,
          details,
          status: 'paid',
          createdAt: new Date().toISOString(),
        };

        set(s => ({
          occupations: s.occupations.map(o =>
            o.id === occupationId ? { ...o, startTime: splitTime } : o
          ),
          bills: [...s.bills, bill],
        }));
      },

      mergeAdjacentOccupations: (tableId) => {
        const tableOccs = get().occupations
          .filter(o => o.tableId === tableId)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (tableOccs.length < 2) return;

        const merged: Occupation[] = [];
        let current = { ...tableOccs[0], mergedFrom: [...tableOccs[0].mergedFrom] };

        for (let i = 1; i < tableOccs.length; i++) {
          const next = tableOccs[i];
          const currentEnd = current.endTime ? new Date(current.endTime).getTime() : null;
          const nextStart = new Date(next.startTime).getTime();

          if (
            currentEnd &&
            nextStart &&
            Math.abs(nextStart - currentEnd) < 60000 &&
            current.customerName === next.customerName
          ) {
            current = {
              ...current,
              endTime: next.endTime,
              mergedFrom: [...current.mergedFrom, next.id],
            };
          } else {
            merged.push(current);
            current = { ...next, mergedFrom: [...next.mergedFrom] };
          }
        }
        merged.push(current);

        const otherOccs = get().occupations.filter(o => o.tableId !== tableId);
        set({ occupations: [...otherOccs, ...merged] });
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
        return get().occupations.find(o => o.tableId === tableId && o.endTime === null);
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

        const elapsed = getElapsedMinutes(occ.startTime);
        const tiers = get().getTiersForTable(occ.tableId);
        const details = calculateBillDetails(tiers, elapsed);
        const total = calculateTotal(details);

        return { details, total, elapsed };
      },
    }),
    {
      name: 'billiard-store',
    }
  )
);
