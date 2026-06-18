import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { User, Wallet, Percent } from 'lucide-react';

interface OpenTableDrawerProps {
  open: boolean;
  onClose: () => void;
  tableId: string | null;
}

export default function OpenTableDrawer({ open, onClose, tableId }: OpenTableDrawerProps) {
  const openTable = useStore(s => s.openTable);
  const tables = useStore(s => s.tables);
  const members = useStore(s => s.members);

  const [mode, setMode] = useState<'member' | 'guest'>('guest');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const table = tableId ? tables.find(t => t.id === tableId) : null;

  const filteredMembers = useMemo(() => {
    const s = memberSearch.trim().toLowerCase();
    if (!s) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(s) || m.phone.includes(s)
    );
  }, [members, memberSearch]);

  const selectedMember = selectedMemberId ? members.find(m => m.id === selectedMemberId) ?? null : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId) return;
    if (mode === 'member') {
      if (!selectedMemberId) return;
      openTable(tableId, '', '', undefined, selectedMemberId);
    } else {
      if (!guestName.trim()) return;
      openTable(tableId, guestName.trim(), guestPhone.trim(), undefined, null);
    }
    reset();
    onClose();
  };

  const reset = () => {
    setMode('guest');
    setSelectedMemberId('');
    setGuestName('');
    setGuestPhone('');
    setMemberSearch('');
  };

  const handleClose = () => {
    reset();
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
                <span className="ml-2">({table.category === 'vip' ? '包厢' : '散台'})</span>
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setMode('guest'); setSelectedMemberId(''); }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'guest' ? 'bg-billiard-gold text-billiard-bg' : 'bg-billiard-card text-billiard-text-muted'}`}
              >
                临时客
              </button>
              <button
                type="button"
                onClick={() => { setMode('member'); setGuestName(''); setGuestPhone(''); }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'member' ? 'bg-billiard-gold text-billiard-bg' : 'bg-billiard-card text-billiard-text-muted'}`}
              >
                老会员
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {mode === 'guest' && (
                <>
                  <div>
                    <label className="block text-sm text-billiard-text-muted mb-1 flex items-center gap-1"><User size={14} />客户姓名</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="请输入客户姓名"
                      className="w-full px-3 py-2 rounded-lg bg-billiard-card border border-billiard-border text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none focus:border-billiard-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-billiard-text-muted mb-1">手机号（选填）</label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      placeholder="请输入手机号"
                      className="w-full px-3 py-2 rounded-lg bg-billiard-card border border-billiard-border text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none focus:border-billiard-gold transition-colors"
                    />
                  </div>
                </>
              )}

              {mode === 'member' && (
                <>
                  <div>
                    <label className="block text-sm text-billiard-text-muted mb-1">搜索会员</label>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="输入姓名或手机号"
                      className="w-full px-3 py-2 rounded-lg bg-billiard-card border border-billiard-border text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none focus:border-billiard-gold transition-colors mb-3"
                    />
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-billiard-border divide-y divide-billiard-border/50">
                      {filteredMembers.length === 0 && (
                        <div className="py-6 text-center text-sm text-billiard-text-muted">没有匹配的会员</div>
                      )}
                      {filteredMembers.map(m => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMemberId(m.id)}
                          className={`px-3 py-2.5 cursor-pointer transition-colors ${selectedMemberId === m.id ? 'bg-billiard-gold/15 border-l-2 border-billiard-gold' : 'hover:bg-billiard-card'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-billiard-gold/20 flex items-center justify-center text-billiard-gold text-xs font-bold">
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm text-billiard-text font-medium">{m.name}</div>
                                <div className="text-xs text-billiard-text-muted">{m.phone}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-billiard-gold flex items-center"><Percent size={12} />{m.discountLabel}</div>
                              <div className="text-xs text-billiard-text-muted flex items-center gap-1 mt-0.5"><Wallet size={11} />{m.balance.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedMember && (
                    <div className="rounded-lg bg-billiard-gold/10 border border-billiard-gold/30 p-3 space-y-1.5">
                      <div className="text-sm font-medium text-billiard-gold">已选择：{selectedMember.name}</div>
                      <div className="text-xs text-billiard-text-muted">
                        <span className="mr-3">折扣：{selectedMember.discountLabel}</span>
                        <span>余额：¥{selectedMember.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={mode === 'member' ? !selectedMemberId : !guestName.trim()}
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
