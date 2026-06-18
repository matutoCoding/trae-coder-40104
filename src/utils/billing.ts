import type { Tier, BillDetail } from '@/types';

export function calculateBillDetails(tiers: Tier[], totalMinutes: number): BillDetail[] {
  if (totalMinutes <= 0 || tiers.length === 0) return [];

  const sorted = [...tiers].sort((a, b) => a.startMinute - b.startMinute);
  const details: BillDetail[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const tierStart = tier.startMinute;
    const tierEnd = tier.endMinute ?? Infinity;

    if (totalMinutes <= tierStart) break;

    const effectiveEnd = Math.min(totalMinutes, tierEnd);
    const minutes = effectiveEnd - tierStart;

    if (minutes > 0) {
      details.push({
        tierLabel: tier.label,
        startMinute: tierStart,
        endMinute: effectiveEnd,
        minutes,
        pricePerHour: tier.pricePerHour,
        subtotal: Math.round(minutes * (tier.pricePerHour / 60) * 100) / 100,
      });
    }
  }

  return details;
}

export function calculateTotal(details: BillDetail[]): number {
  return Math.round(details.reduce((sum, d) => sum + d.subtotal, 0) * 100) / 100;
}

export function getCurrentTier(tiers: Tier[], elapsedMinutes: number): Tier | null {
  const sorted = [...tiers].sort((a, b) => a.startMinute - b.startMinute);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (elapsedMinutes > sorted[i].startMinute) return sorted[i];
  }
  return sorted[0] || null;
}

export function getNextTierThreshold(tiers: Tier[], elapsedMinutes: number): number | null {
  const sorted = [...tiers].sort((a, b) => a.startMinute - b.startMinute);
  for (const tier of sorted) {
    if (tier.startMinute > elapsedMinutes) return tier.startMinute;
  }
  return null;
}

export function isApproachingNextTier(
  tiers: Tier[],
  elapsedMinutes: number,
  warningMinutes: number = 5
): boolean {
  const threshold = getNextTierThreshold(tiers, elapsedMinutes);
  if (threshold === null) return false;
  return threshold - elapsedMinutes <= warningMinutes && threshold - elapsedMinutes > 0;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function getElapsedMinutes(startTime: string): number {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 60000));
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
