export interface Tier {
  id: string;
  startMinute: number;
  endMinute: number | null;
  pricePerHour: number;
  label: string;
}

export interface TierGroup {
  id: string;
  name: string;
  tiers: Tier[];
}

export interface TableItem {
  id: string;
  name: string;
  category: 'vip' | 'open';
  tierGroupId: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

export interface Occupation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string | null;
  mergedFrom: string[];
  tierGroupId: string;
}

export interface BillDetail {
  tierLabel: string;
  startMinute: number;
  endMinute: number;
  minutes: number;
  pricePerHour: number;
  subtotal: number;
}

export interface Bill {
  id: string;
  occupationId: string;
  tableId: string;
  customerName: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  totalAmount: number;
  details: BillDetail[];
  status: 'active' | 'paid' | 'refunded';
  createdAt: string;
}
