import { useState, useEffect } from 'react';
import type { TableItem } from '@/types';
import { useStore } from '@/store/useStore';
import {
  getElapsedMinutes,
  getCurrentTier,
  isApproachingNextTier,
  getNextTierThreshold,
  formatDuration,
  formatCurrency,
} from '@/utils/billing';
import { cn } from '@/lib/utils';

interface TableCardProps {
  table: TableItem;
  onOpenTable: (tableId: string) => void;
  onCloseTable: (tableId: string) => void;
}

const STATUS_DOT: Record<TableItem['status'], string> = {
  available: 'bg-billiard-available',
  occupied: 'bg-billiard-occupied',
  reserved: 'bg-billiard-reserved',
  maintenance: 'bg-billiard-maintenance',
};

const STATUS_LABEL: Record<TableItem['status'], string> = {
  available: '空闲',
  occupied: '使用中',
  reserved: '已预约',
  maintenance: '维护中',
};

const STATUS_BORDER: Record<TableItem['status'], string> = {
  available: 'border-l-billiard-available',
  occupied: 'border-l-billiard-occupied',
  reserved: 'border-l-billiard-reserved',
  maintenance: 'border-l-billiard-maintenance',
};

export default function TableCard({ table, onOpenTable, onCloseTable }: TableCardProps) {
  const occupation = useStore(s => s.getOccupationForTable(table.id));
  const tiers = useStore(s => s.getTiersForTable(table.id));
  const getLiveBillDetails = useStore(s => s.getLiveBillDetails);

  const [, setNow] = useState(Date.now());

  useEffect(() => {
    if (table.status !== 'occupied') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [table.status]);

  const isOccupied = table.status === 'occupied' && occupation;

  let elapsed = 0;
  let currentTier = null;
  let approaching = false;
  let nextThreshold: number | null = null;
  let liveBill = { details: [] as unknown[], total: 0, elapsed: 0 };

  if (isOccupied) {
    elapsed = getElapsedMinutes(occupation!.startTime);
    currentTier = getCurrentTier(tiers, elapsed);
    approaching = isApproachingNextTier(tiers, elapsed);
    nextThreshold = getNextTierThreshold(tiers, elapsed);
    liveBill = getLiveBillDetails(occupation!.id);
  }

  const progressPercent =
    isOccupied && nextThreshold !== null
      ? Math.min(((elapsed - (currentTier?.startMinute ?? 0)) / (nextThreshold - (currentTier?.startMinute ?? 0))) * 100, 100)
      : isOccupied
        ? 100
        : 0;

  return (
    <div
      className={cn(
        'glass-card rounded-xl p-5 border-l-4 transition-all',
        STATUS_BORDER[table.status],
        approaching && 'animate-pulse-gold'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-semibold text-billiard-text">{table.name}</span>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            table.category === 'vip'
              ? 'bg-billiard-red text-billiard-text'
              : 'bg-billiard-available/20 text-billiard-available'
          )}
        >
          {table.category === 'vip' ? '包厢' : '散台'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[table.status])} />
        <span className="text-sm text-billiard-text-muted">{STATUS_LABEL[table.status]}</span>
      </div>

      {isOccupied && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-billiard-text-muted">客户</span>
            <span className="text-billiard-text">{occupation!.customerName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-billiard-text-muted">用时</span>
            <span className="text-billiard-text">{formatDuration(elapsed)}</span>
          </div>
          {currentTier && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-billiard-text-muted">当前档位</span>
              <span className="text-billiard-text">{currentTier.label}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-billiard-text-muted">当前费用</span>
            <span className="text-billiard-gold font-semibold">{formatCurrency(liveBill.total)}</span>
          </div>

          <div className="w-full h-1.5 bg-billiard-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-billiard-gold rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {approaching && (
            <p className="text-xs text-billiard-gold font-medium">即将进入下一档</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        {table.status === 'available' && (
          <button
            onClick={() => onOpenTable(table.id)}
            className="px-5 py-1.5 rounded-full bg-billiard-gold text-billiard-bg text-sm font-medium hover:bg-billiard-gold-light transition-colors"
          >
            开台
          </button>
        )}
        {table.status === 'occupied' && (
          <button
            onClick={() => onCloseTable(table.id)}
            className="px-5 py-1.5 rounded-full border border-billiard-gold text-billiard-gold text-sm font-medium hover:bg-billiard-gold/10 transition-colors"
          >
            结账
          </button>
        )}
      </div>
    </div>
  );
}
