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

export interface Member {
  id: string;
  name: string;
  phone: string;
  balance: number;
  discount: number;
  discountLabel: string;
  createdAt: string;
}

export interface Occupation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  memberId: string | null;
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
  memberId: string | null;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  totalAmount: number;
  originalAmount: number;
  discountRate: number;
  discountLabel: string;
  balanceUsed: number;
  details: BillDetail[];
  status: 'active' | 'paid' | 'refunded' | 'merged';
  createdAt: string;
  mergedInto: string | null;
  mergedFrom: string[];
}
