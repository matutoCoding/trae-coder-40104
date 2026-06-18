import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatDuration, formatDate, formatTime } from '@/utils/billing';
import type { Member, Bill } from '@/types';
import { UserPlus, Wallet, Percent, Pencil, Trash2, Plus } from 'lucide-react';

const DISCOUNT_PRESETS = [
  { label: '无折扣', value: 1 },
  { label: '95折', value: 0.95 },
  { label: '9折', value: 0.9 },
  { label: '85折', value: 0.85 },
  { label: '8折', value: 0.8 },
  { label: '75折', value: 0.75 },
];

export default function Members() {
  const members = useStore((s) => s.members);
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const rechargeMember = useStore((s) => s.rechargeMember);
  const deleteMember = useStore((s) => s.deleteMember);
  const getMemberStats = useStore((s) => s.getMemberStats);
  const tables = useStore((s) => s.tables);
  const bills = useStore((s) => s.bills);

  const [search, setSearch] = useState('');
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBalance, setFormBalance] = useState('0');
  const [formDiscount, setFormDiscount] = useState(1);
  const [formDiscountLabel, setFormDiscountLabel] = useState('无折扣');
  const [rechargeAmount, setRechargeAmount] = useState('');

  const filteredMembers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(s) || m.phone.includes(s)
    );
  }, [members, search]);

  const detailMember = detailMemberId ? members.find(m => m.id === detailMemberId) ?? null : null;
  const detailStats = detailMemberId ? getMemberStats(detailMemberId) : null;

  const getTableName = (tableId: string) => tables.find(t => t.id === tableId)?.name ?? '-';

  const openForm = (m?: Member) => {
    if (m) {
      setEditing(m);
      setFormName(m.name);
      setFormPhone(m.phone);
      setFormBalance(String(m.balance));
      setFormDiscount(m.discount);
      setFormDiscountLabel(m.discountLabel);
    } else {
      setEditing(null);
      setFormName('');
      setFormPhone('');
      setFormBalance('0');
      setFormDiscount(1);
      setFormDiscountLabel('无折扣');
    }
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;
    const balance = parseFloat(formBalance) || 0;
    if (editing) {
      updateMember(editing.id, {
        name: formName.trim(),
        phone: formPhone.trim(),
        balance,
        discount: formDiscount,
        discountLabel: formDiscountLabel,
      });
    } else {
      addMember({
        name: formName.trim(),
        phone: formPhone.trim(),
        balance,
        discount: formDiscount,
        discountLabel: formDiscountLabel,
      });
    }
    setFormOpen(false);
  };

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeOpen) return;
    const amt = parseFloat(rechargeAmount);
    if (!amt || amt <= 0) return;
    rechargeMember(rechargeOpen, amt);
    setRechargeOpen(null);
    setRechargeAmount('');
  };

  const handleDelete = (id: string) => {
    if (!confirm('确认删除该会员档案？删除后不会影响历史账单。')) return;
    deleteMember(id);
  };

  return (
    <div className="min-h-screen bg-billiard-bg p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-billiard-gold">会员档案</h1>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 rounded-full bg-billiard-gold px-5 py-2 text-sm font-bold text-billiard-bg transition-colors hover:bg-billiard-gold-dark"
        >
          <Plus size={16} />新增会员
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-billiard-border bg-billiard-card p-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索会员姓名或手机号"
          className="w-full bg-transparent text-sm text-billiard-text placeholder-billiard-text-muted/50 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.length === 0 && (
          <div className="col-span-full rounded-lg border border-billiard-border bg-billiard-card py-12 text-center text-billiard-text-muted">
            暂无会员
          </div>
        )}
        {filteredMembers.map(m => {
          const stats = getMemberStats(m.id);
          return (
            <div
              key={m.id}
              className="rounded-xl border border-billiard-border bg-billiard-card p-5 transition-shadow hover:shadow-lg hover:shadow-billiard-gold/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-billiard-gold/20 text-lg font-bold text-billiard-gold">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-billiard-text">{m.name}</div>
                    <div className="text-xs text-billiard-text-muted">{m.phone}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setRechargeOpen(m.id)}
                    className="rounded-md bg-billiard-gold/15 p-1.5 text-billiard-gold transition-colors hover:bg-billiard-gold/25"
                    title="充值"
                  >
                    <Wallet size={16} />
                  </button>
                  <button
                    onClick={() => openForm(m)}
                    className="rounded-md bg-billiard-border/40 p-1.5 text-billiard-text-muted transition-colors hover:bg-billiard-border"
                    title="编辑"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="rounded-md bg-billiard-red/15 p-1.5 text-billiard-red transition-colors hover:bg-billiard-red/30"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-3 space-y-1.5 rounded-lg bg-billiard-surface p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-billiard-text-muted flex items-center gap-1"><Percent size={12} />会员等级</span>
                  <span className="text-billiard-gold font-medium">{m.discountLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-billiard-text-muted flex items-center gap-1"><Wallet size={12} />账户余额</span>
                  <span className="text-billiard-text font-semibold">{formatCurrency(m.balance)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-billiard-border/20 p-2">
                  <div className="text-xs text-billiard-text-muted">累计消费</div>
                  <div className="text-sm font-semibold text-billiard-gold">{formatCurrency(stats.totalPaid)}</div>
                </div>
                <div className="rounded-lg bg-billiard-border/20 p-2">
                  <div className="text-xs text-billiard-text-muted">到店次数</div>
                  <div className="text-sm font-semibold text-billiard-text">{stats.visitCount}</div>
                </div>
                <div className="rounded-lg bg-billiard-border/20 p-2">
                  <div className="text-xs text-billiard-text-muted">累计时长</div>
                  <div className="text-sm font-semibold text-billiard-text">{formatDuration(stats.totalMinutes)}</div>
                </div>
              </div>

              <button
                onClick={() => setDetailMemberId(m.id)}
                className="mt-3 w-full rounded-lg border border-billiard-border py-1.5 text-xs font-medium text-billiard-text-muted transition-colors hover:bg-billiard-border"
              >
                查看消费记录
              </button>
            </div>
          );
        })}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setFormOpen(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-5 font-display text-xl font-bold text-billiard-gold">{editing ? '编辑会员' : '新增会员'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-billiard-text-muted">姓名</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full rounded-lg bg-billiard-card border border-billiard-border px-3 py-2 text-billiard-text focus:outline-none focus:border-billiard-gold"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-billiard-text-muted">手机号</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full rounded-lg bg-billiard-card border border-billiard-border px-3 py-2 text-billiard-text focus:outline-none focus:border-billiard-gold"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-billiard-text-muted">初始余额</label>
                <input
                  type="number"
                  step="0.01"
                  value={formBalance}
                  onChange={e => setFormBalance(e.target.value)}
                  className="w-full rounded-lg bg-billiard-card border border-billiard-border px-3 py-2 text-billiard-text focus:outline-none focus:border-billiard-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-billiard-text-muted">折扣等级</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setFormDiscount(p.value); setFormDiscountLabel(p.label); }}
                      className={`py-1.5 rounded-md text-xs font-medium transition-colors ${formDiscount === p.value ? 'bg-billiard-gold text-billiard-bg' : 'bg-billiard-card text-billiard-text-muted'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-lg border border-billiard-border py-2 text-sm text-billiard-text hover:bg-billiard-border"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-billiard-gold py-2 text-sm font-bold text-billiard-bg hover:bg-billiard-gold-dark"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setRechargeOpen(null); setRechargeAmount(''); }}>
          <div className="mx-4 w-full max-w-sm rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 font-display text-xl font-bold text-billiard-gold">会员充值</h2>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-billiard-text-muted">充值金额 (¥)</label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={rechargeAmount}
                  onChange={e => setRechargeAmount(e.target.value)}
                  placeholder="请输入充值金额"
                  className="w-full rounded-lg bg-billiard-card border border-billiard-border px-3 py-2 text-billiard-text focus:outline-none focus:border-billiard-gold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[100, 200, 500].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRechargeAmount(String(n))}
                    className="py-1.5 rounded-md text-xs font-medium bg-billiard-card text-billiard-text-muted hover:bg-billiard-gold/15 hover:text-billiard-gold transition-colors"
                  >
                    ¥{n}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRechargeOpen(null); setRechargeAmount(''); }}
                  className="flex-1 rounded-lg border border-billiard-border py-2 text-sm text-billiard-text hover:bg-billiard-border"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!parseFloat(rechargeAmount) || parseFloat(rechargeAmount) <= 0}
                  className="flex-1 rounded-lg bg-billiard-gold py-2 text-sm font-bold text-billiard-bg hover:bg-billiard-gold-dark disabled:opacity-50"
                >
                  确认充值
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailMember && detailStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetailMemberId(null)}>
          <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-billiard-gold">{detailMember.name} 的消费记录</h2>
                <div className="text-xs text-billiard-text-muted mt-1">{detailMember.phone} · {detailMember.discountLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-billiard-text-muted">账户余额</div>
                <div className="text-lg font-bold text-billiard-gold">{formatCurrency(detailMember.balance)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg bg-billiard-card p-3 text-center">
                <div className="text-xs text-billiard-text-muted">累计消费</div>
                <div className="text-lg font-semibold text-billiard-gold">{formatCurrency(detailStats.totalPaid)}</div>
              </div>
              <div className="rounded-lg bg-billiard-card p-3 text-center">
                <div className="text-xs text-billiard-text-muted">到店次数</div>
                <div className="text-lg font-semibold text-billiard-text">{detailStats.visitCount}</div>
              </div>
              <div className="rounded-lg bg-billiard-card p-3 text-center">
                <div className="text-xs text-billiard-text-muted">累计时长</div>
                <div className="text-lg font-semibold text-billiard-text">{formatDuration(detailStats.totalMinutes)}</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-medium text-billiard-text">历史账单（仅显示总账，已合并的旧账不重复计算）</div>
            <div className="overflow-x-auto rounded-lg border border-billiard-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-billiard-border text-billiard-text-muted">
                    <th className="px-3 py-2 text-left font-medium">日期</th>
                    <th className="px-3 py-2 text-left font-medium">球台</th>
                    <th className="px-3 py-2 text-right font-medium">时长</th>
                    <th className="px-3 py-2 text-right font-medium">原金额</th>
                    <th className="px-3 py-2 text-right font-medium">实收</th>
                    <th className="px-3 py-2 text-center font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {detailStats.bills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-billiard-text-muted">暂无消费记录</td>
                    </tr>
                  )}
                  {detailStats.bills.slice().reverse().map((b: Bill) => (
                    <tr key={b.id} className="border-b border-billiard-border/40">
                      <td className="px-3 py-2 text-billiard-text">{formatDate(b.createdAt)} {formatTime(b.startTime)}</td>
                      <td className="px-3 py-2 text-billiard-text">{getTableName(b.tableId)}</td>
                      <td className="px-3 py-2 text-right text-billiard-text">{formatDuration(b.totalMinutes)}</td>
                      <td className="px-3 py-2 text-right text-billiard-text-muted line-through">{formatCurrency(b.originalAmount)}</td>
                      <td className="px-3 py-2 text-right text-billiard-gold font-medium">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${b.status === 'paid' ? 'bg-green-600/20 text-green-400' : b.status === 'refunded' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
                          {b.status === 'paid' ? '已付款' : b.status === 'refunded' ? '已退款' : '进行中'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDetailMemberId(null)}
                className="rounded-lg bg-billiard-gold px-6 py-2 text-sm font-bold text-billiard-bg hover:bg-billiard-gold-dark"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
