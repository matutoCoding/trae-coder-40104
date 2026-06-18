import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import type { TableItem } from '@/types';

interface TableFormModalProps {
  open: boolean;
  onClose: () => void;
  table?: TableItem;
}

export default function TableFormModal({ open, onClose, table }: TableFormModalProps) {
  const tierGroups = useStore(s => s.tierGroups);
  const addTable = useStore(s => s.addTable);
  const updateTable = useStore(s => s.updateTable);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'vip' | 'open'>('open');
  const [tierGroupId, setTierGroupId] = useState('');

  useEffect(() => {
    if (open) {
      if (table) {
        setName(table.name);
        setCategory(table.category);
        setTierGroupId(table.tierGroupId);
      } else {
        setName('');
        setCategory('open');
        setTierGroupId(tierGroups[0]?.id ?? '');
      }
    }
  }, [open, table, tierGroups]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tierGroupId) return;

    if (table) {
      updateTable(table.id, { name: name.trim(), category, tierGroupId });
    } else {
      addTable(name.trim(), category, tierGroupId);
    }
    onClose();
  };

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
          <h2 className="text-lg font-semibold text-billiard-text">
            {table ? '编辑球台' : '添加球台'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-billiard-text-muted hover:bg-billiard-border hover:text-billiard-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">球台名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入球台名称"
              className={cn(
                'w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2',
                'text-billiard-text placeholder-billiard-text-muted outline-none',
                'focus:border-billiard-gold transition-colors'
              )}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">类型</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as 'vip' | 'open')}
              className={cn(
                'w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2',
                'text-billiard-text outline-none focus:border-billiard-gold transition-colors'
              )}
            >
              <option value="open">散台</option>
              <option value="vip">包厢</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-billiard-text-muted">关联费率组</label>
            <select
              value={tierGroupId}
              onChange={e => setTierGroupId(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2',
                'text-billiard-text outline-none focus:border-billiard-gold transition-colors'
              )}
            >
              {tierGroups.map(tg => (
                <option key={tg.id} value={tg.id}>{tg.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
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
              type="submit"
              disabled={!name.trim() || !tierGroupId}
              className={cn(
                'flex-1 rounded-lg bg-billiard-gold px-4 py-2 font-medium',
                'text-billiard-bg hover:bg-billiard-gold-dark transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {table ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
