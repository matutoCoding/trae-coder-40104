import { useState, useEffect } from 'react';
import { X, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { formatTime, formatDuration, getElapsedMinutes } from '@/utils/billing';
import type { Occupation } from '@/types';

interface SplitOccupationModalProps {
  open: boolean;
  onClose: () => void;
  occupation: Occupation | null;
}

export default function SplitOccupationModal({ open, onClose, occupation }: SplitOccupationModalProps) {
  const splitOccupation = useStore(s => s.splitOccupation);

  const [splitTime, setSplitTime] = useState('');

  useEffect(() => {
    if (open && occupation) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setSplitTime(`${hh}:${mm}`);
    }
  }, [open, occupation]);

  if (!open || !occupation) return null;

  const start = new Date(occupation.startTime);
  const splitDate = new Date();
  const [sh, sm] = splitTime.split(':').map(Number);
  splitDate.setHours(sh, sm, 0, 0);

  const startMs = start.getTime();
  const splitMs = splitDate.getTime();
  const consumedMinutes = Math.max(0, Math.floor((splitMs - startMs) / 60000));

  const endMs = occupation.endTime ? new Date(occupation.endTime).getTime() : Date.now();
  const releasedMinutes = Math.max(0, Math.floor((endMs - splitMs) / 60000));
  const totalMinutes = Math.max(1, consumedMinutes + releasedMinutes);

  const consumedPct = (consumedMinutes / totalMinutes) * 100;
  const releasedPct = (releasedMinutes / totalMinutes) * 100;

  const elapsed = getElapsedMinutes(occupation.startTime);

  const handleSplit = () => {
    const [h, m] = splitTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    splitOccupation(occupation.id, d.toISOString());
    onClose();
  };

  const isSplitValid = consumedMinutes > 0 && releasedMinutes > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-billiard-border bg-billiard-card p-6',
          'animate-slide-in shadow-2xl'
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-billiard-text">
            <Scissors size={18} className="text-billiard-gold" />
            散场拆分
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-billiard-text-muted hover:bg-billiard-border hover:text-billiard-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 space-y-2 rounded-lg bg-billiard-surface p-3">
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">客户</span>
            <span className="text-billiard-text">{occupation.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">开始时间</span>
            <span className="text-billiard-text">{formatTime(occupation.startTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">已消费时长</span>
            <span className="text-billiard-text">{formatDuration(elapsed)}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm text-billiard-text-muted">拆分时间点</label>
          <input
            type="time"
            value={splitTime}
            onChange={e => setSplitTime(e.target.value)}
            className={cn(
              'w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2',
              'text-billiard-text outline-none focus:border-billiard-gold transition-colors'
            )}
          />
        </div>

        <div className="mb-5 rounded-lg bg-billiard-surface p-3">
          <p className="mb-2 text-xs text-billiard-text-muted">拆分预览</p>
          <div className="flex h-10 overflow-hidden rounded-md">
            <div
              className="flex items-center justify-center bg-emerald-900/50 text-xs text-emerald-300 border-r border-billiard-border"
              style={{ width: `${consumedPct}%` }}
            >
              {consumedPct > 15 && `已消费 ${formatDuration(consumedMinutes)}`}
            </div>
            <div
              className="flex items-center justify-center border-2 border-dashed border-billiard-border text-xs text-billiard-text-muted"
              style={{ width: `${releasedPct}%` }}
            >
              {releasedPct > 15 && `释放 ${formatDuration(releasedMinutes)}`}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-billiard-text-muted">
            <span>{formatTime(occupation.startTime)}</span>
            <span>{splitTime}</span>
            <span>{occupation.endTime ? formatTime(occupation.endTime) : '进行中'}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 rounded-lg border border-billiard-border px-4 py-2',
              'text-billiard-text-muted hover:bg-billiard-border hover:text-billiard-text transition-colors'
            )}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSplit}
            disabled={!isSplitValid}
            className={cn(
              'flex-1 rounded-lg bg-billiard-gold px-4 py-2 font-medium',
              'text-billiard-bg hover:bg-billiard-gold-dark transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            确认拆分
          </button>
        </div>
      </div>
    </div>
  );
}
