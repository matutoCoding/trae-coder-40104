import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Tier } from '@/types';
import { useStore } from '@/store/useStore';

interface TierFormModalProps {
  open: boolean;
  onClose: () => void;
  tierGroupId: string;
  tier?: Tier;
}

export default function TierFormModal({ open, onClose, tierGroupId, tier }: TierFormModalProps) {
  const addTier = useStore(s => s.addTier);
  const updateTier = useStore(s => s.updateTier);

  const [label, setLabel] = useState('');
  const [startMinute, setStartMinute] = useState(0);
  const [endMinute, setEndMinute] = useState<number>(60);
  const [noUpperLimit, setNoUpperLimit] = useState(false);
  const [pricePerHour, setPricePerHour] = useState(30);

  const isEdit = !!tier;

  useEffect(() => {
    if (open) {
      if (tier) {
        setLabel(tier.label);
        setStartMinute(tier.startMinute);
        if (tier.endMinute === null) {
          setNoUpperLimit(true);
          setEndMinute(0);
        } else {
          setNoUpperLimit(false);
          setEndMinute(tier.endMinute);
        }
        setPricePerHour(tier.pricePerHour);
      } else {
        setLabel('');
        setStartMinute(0);
        setEndMinute(60);
        setNoUpperLimit(false);
        setPricePerHour(30);
      }
    }
  }, [open, tier]);

  if (!open) return null;

  const handleSave = () => {
    const tierData = {
      label,
      startMinute,
      endMinute: noUpperLimit ? null : endMinute,
      pricePerHour,
    };

    if (isEdit && tier) {
      updateTier(tierGroupId, tier.id, tierData);
    } else {
      addTier(tierGroupId, tierData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-billiard-border bg-billiard-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-billiard-text">
            {isEdit ? '编辑档位' : '添加档位'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-billiard-text-muted transition-colors hover:bg-billiard-border hover:text-billiard-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">档位名称</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2 text-billiard-text outline-none transition-colors focus:border-billiard-gold"
              placeholder="例如：第一档"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">起始分钟</label>
            <input
              type="number"
              value={startMinute}
              onChange={e => setStartMinute(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2 text-billiard-text outline-none transition-colors focus:border-billiard-gold"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-billiard-text-muted">结束分钟</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-billiard-text-muted">
                <input
                  type="checkbox"
                  checked={noUpperLimit}
                  onChange={e => setNoUpperLimit(e.target.checked)}
                  className="accent-billiard-gold"
                />
                无上限
              </label>
            </div>
            <input
              type="number"
              value={endMinute}
              onChange={e => setEndMinute(Number(e.target.value))}
              min={0}
              disabled={noUpperLimit}
              className="w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2 text-billiard-text outline-none transition-colors focus:border-billiard-gold disabled:opacity-40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">时价</label>
            <div className="relative">
              <input
                type="number"
                value={pricePerHour}
                onChange={e => setPricePerHour(Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2 pr-16 text-billiard-text outline-none transition-colors focus:border-billiard-gold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-billiard-text-muted">
                ¥/小时
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-billiard-border px-4 py-2 text-sm text-billiard-text-muted transition-colors hover:bg-billiard-border hover:text-billiard-text"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            className="flex-1 rounded-lg bg-billiard-gold px-4 py-2 text-sm font-medium text-billiard-bg transition-colors hover:bg-billiard-gold-light disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
