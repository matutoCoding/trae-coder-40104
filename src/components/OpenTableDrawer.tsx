import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

interface OpenTableDrawerProps {
  open: boolean;
  onClose: () => void;
  tableId: string | null;
}

export default function OpenTableDrawer({ open, onClose, tableId }: OpenTableDrawerProps) {
  const openTable = useStore(s => s.openTable);
  const tables = useStore(s => s.tables);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const table = tableId ? tables.find(t => t.id === tableId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId || !customerName.trim()) return;
    openTable(tableId, customerName.trim(), customerPhone.trim());
    setCustomerName('');
    setCustomerPhone('');
    onClose();
  };

  const handleClose = () => {
    setCustomerName('');
    setCustomerPhone('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-96 bg-[#0F2E29] border-l border-billiard-border z-50 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-billiard-text">开台</h2>
              <button
                onClick={handleClose}
                className="text-billiard-text-muted hover:text-billiard-text transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {table && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-billiard-card/50 text-sm text-billiard-text-muted">
                桌台: <span className="text-billiard-text">{table.name}</span>
                <span className="ml-2">
                  ({table.category === 'vip' ? '包厢' : '散台'})
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm text-billiard-text-muted mb-1">客户姓名</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="请输入客户姓名"
                  className="w-full px-3 py-2 rounded-lg bg-billiard-card border border-billiard-border text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none focus:border-billiard-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-billiard-text-muted mb-1">手机号</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full px-3 py-2 rounded-lg bg-billiard-card border border-billiard-border text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none focus:border-billiard-gold transition-colors"
                />
              </div>
              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={!customerName.trim()}
                  className="w-full py-2.5 rounded-full bg-billiard-gold text-billiard-bg font-medium hover:bg-billiard-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认开台
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
