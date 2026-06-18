import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatDuration, formatCurrency, formatTime, formatDate } from '@/utils/billing';
import CheckoutModal from '@/components/CheckoutModal';
import BillDetailModal from '@/components/BillDetailModal';
import type { Bill, Occupation } from '@/types';
import { TrendingUp, DollarSign, Clock } from 'lucide-react';

type TabKey = 'active' | 'dashboard' | 'history';

const statusBadge: Record<Bill['status'], { label: string; className: string }> = {
  paid: { label: '已付款', className: 'bg-green-600/20 text-green-400 border border-green-600/30' },
  refunded: { label: '已退款', className: 'bg-red-600/20 text-red-400 border border-red-600/30' },
  active: { label: '进行中', className: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' },
  merged: { label: '已合并', className: 'bg-billiard-border/50 text-billiard-text-muted border border-billiard-border' },
};

export default function Bills() {
  const bills = useStore((s) => s.bills);
  const tables = useStore((s) => s.tables);
  const occupations = useStore((s) => s.occupations);
  const getLiveBillDetails = useStore((s) => s.getLiveBillDetails);
  const closeTableByOccupation = useStore((s) => s.closeTableByOccupation);
  const getRevenueStatsToday = useStore((s) => s.getRevenueStatsToday);
  const getRevenueStatsThisWeek = useStore((s) => s.getRevenueStatsThisWeek);
  const getRevenueStatsThisMonth = useStore((s) => s.getRevenueStatsThisMonth);

  const [tab, setTab] = useState<TabKey>('active');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [checkoutBill, setCheckoutBill] = useState<Bill | null>(null);
  const [checkoutTableName, setCheckoutTableName] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [detailTableName, setDetailTableName] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterTableId, setFilterTableId] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');

  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');

  const activeOccupations = occupations.filter((o) => {
    const start = new Date(o.startTime).getTime();
    const end = o.endTime ? new Date(o.endTime).getTime() : Infinity;
    return now >= start && now < end;
  });

  const revenueStats = useMemo(() => {
    if (range === 'today') return getRevenueStatsToday();
    if (range === 'week') return getRevenueStatsThisWeek();
    return getRevenueStatsThisMonth();
  }, [range, bills, getRevenueStatsToday, getRevenueStatsThisWeek, getRevenueStatsThisMonth]);

  const getTableName = useCallback(
    (tableId: string) => tables.find((t) => t.id === tableId)?.name ?? '-',
    [tables]
  );

  const handleCheckout = (occ: Occupation) => {
    const bill = closeTableByOccupation(occ.id);
    setCheckoutBill(bill);
    setCheckoutTableName(getTableName(occ.tableId));
    setCheckoutOpen(true);
  };

  const handleViewBill = (bill: Bill) => {
    setDetailBill(bill);
    setDetailTableName(getTableName(bill.tableId));
    setDetailOpen(true);
  };

  const filteredBills = bills
    .filter((b) => {
      if (b.status === 'merged') return false;
      if (dateFrom && b.createdAt < dateFrom) return false;
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        if (b.createdAt >= toDate.toISOString()) return false;
      }
      if (filterTableId && b.tableId !== filterTableId) return false;
      if (filterCustomer && !b.customerName.includes(filterCustomer)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tableUtilizationPercent = (() => {
    const totalAvailableTables = tables.filter(t => t.status !== 'maintenance').length;
    if (totalAvailableTables === 0) return 0;
    const totalMinutesCapacity = totalAvailableTables * 1440;
    return Math.min(100, Math.round((revenueStats.minutesUsed / totalMinutesCapacity) * 100));
  })();

  return (
    <div className="min-h-screen bg-billiard-bg p-4 md:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-billiard-gold">账单管理</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['active', '当前消费'],
          ['dashboard', '营收看板'],
          ['history', '历史账单'],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-billiard-gold text-billiard-bg'
                : 'bg-billiard-card text-billiard-text-muted hover:bg-billiard-border'
            }`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeOccupations.length === 0 && (
            <div className="col-span-full rounded-lg border border-billiard-border bg-billiard-card py-12 text-center text-billiard-text-muted">
              当前没有进行中的消费
            </div>
          )}
          {activeOccupations.map((occ) => {
            const live = getLiveBillDetails(occ.id);
            const table = tables.find((t) => t.id === occ.tableId);

            return (
              <div
                key={occ.id}
                className="rounded-xl border border-billiard-border bg-billiard-card p-5 transition-shadow hover:shadow-lg hover:shadow-billiard-gold/5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-lg font-semibold text-billiard-text">
                    {table?.name ?? '-'}
                  </span>
                  <span className="animate-pulse-gold rounded-full bg-billiard-gold/20 px-2 py-0.5 text-xs font-medium text-billiard-gold">
                    进行中
                  </span>
                </div>

                <div className="mb-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-billiard-text-muted">客户</span>
                    <span className="text-billiard-text">{occ.customerName}</span>
                  </div>
                  {live.member && (
                    <div className="flex justify-between">
                      <span className="text-billiard-text-muted">会员</span>
                      <span className="text-billiard-gold text-xs">{live.member.discountLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-billiard-text-muted">开始时间</span>
                    <span className="text-billiard-text">{formatTime(occ.startTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-billiard-text-muted">已用时</span>
                    <span className="text-billiard-text">{formatDuration(live.elapsed)}</span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between rounded-lg border border-billiard-border/50 bg-billiard-surface px-3 py-2">
                  <div className="text-xs text-billiard-text-muted">当前费用</div>
                  <div className="text-right">
                    {live.discountRate < 1 && (
                      <div className="text-[10px] text-billiard-text-muted line-through">
                        {formatCurrency(live.originalAmount)}</div>
                    )}
                    <span className="text-xl font-bold text-billiard-gold">
                      {formatCurrency(live.total)}
                    </span>
                  </div>
                </div>

                <button
                  className="w-full rounded-lg bg-billiard-gold py-2 text-sm font-bold text-billiard-bg transition-colors hover:bg-billiard-gold-dark"
                  onClick={() => handleCheckout(occ)}
                >
                  结账
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'dashboard' && (
        <div>
          <div className="mb-4 flex gap-2">
            {([
              ['today', '今日'],
              ['week', '本周'],
              ['month', '本月'],
            ] as const).map(([r, label]) => (
              <button
                key={r}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  range === r
                    ? 'bg-billiard-gold text-billiard-bg'
                    : 'bg-billiard-card text-billiard-text-muted hover:bg-billiard-border'
                }`}
                onClick={() => setRange(r)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-billiard-border bg-billiard-card p-5">
              <div className="flex items-center gap-2 text-xs text-billiard-text-muted mb-2">
                <DollarSign size={14} className="text-green-400" />
                <span>实收金额</span>
              </div>
              <div className="text-2xl font-bold text-billiard-gold">
                {formatCurrency(revenueStats.received)}
              </div>
              <div className="text-xs text-billiard-text-muted mt-1">
                {revenueStats.billCount} 笔订单
              </div>
            </div>

            <div className="rounded-xl border border-billiard-border bg-billiard-card p-5">
              <div className="flex items-center gap-2 text-xs text-billiard-text-muted mb-2">
                <DollarSign size={14} className="text-red-400" />
                <span>退款金额</span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(revenueStats.refunded)}
              </div>
              <div className="text-xs text-billiard-text-muted mt-1">
                已返还客户
              </div>
            </div>

            <div className="rounded-xl border border-billiard-border bg-billiard-card p-5">
              <div className="flex items-center gap-2 text-xs text-billiard-text-muted mb-2">
                <TrendingUp size={14} className="text-billiard-gold" />
                <span>净收入</span>
              </div>
              <div className="text-2xl font-bold text-billiard-text">
                {formatCurrency(revenueStats.net)}
              </div>
              <div className="text-xs text-billiard-text-muted mt-1">
                实收 − 退款
              </div>
            </div>

            <div className="rounded-xl border border-billiard-border bg-billiard-card p-5">
              <div className="flex items-center gap-2 text-xs text-billiard-text-muted mb-2">
                <Clock size={14} className="text-billiard-gold" />
                <span>桌台利用</span>
              </div>
              <div className="text-2xl font-bold text-billiard-text">
                {formatDuration(revenueStats.minutesUsed)}
              </div>
              <div className="text-xs text-billiard-text-muted mt-1">
                {revenueStats.uniqueTables} 张台被使用
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-billiard-border bg-billiard-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-billiard-text">桌台利用率分布</h3>
            </div>
            <div className="space-y-3">
              {tables.filter(t => t.status !== 'maintenance').map(t => {
                const tableBills = filteredBills.filter(b => b.tableId === t.id);
                const tableMinutes = tableBills.reduce((s, b) => s + (b.status === 'paid' ? b.totalMinutes : 0), 0);
                const tableAmount = tableBills.reduce((s, b) => s + (b.status === 'paid' ? b.totalAmount : 0), 0);
                return (
                  <div key={t.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-billiard-text">{t.name} <span className="text-xs text-billiard-text-muted">（{t.category === 'vip' ? '包厢' : '散台'}）</span></span>
                      <span className="text-billiard-text">{formatDuration(tableMinutes)} · {formatCurrency(tableAmount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-billiard-border/40 overflow-hidden">
                      <div
                        className="h-full bg-billiard-gold rounded-full"
                        style={{ width: `${Math.min(100, (tableMinutes / 1440) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-billiard-border bg-billiard-card p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-billiard-text-muted">起始日期</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-billiard-border bg-billiard-surface px-3 py-1.5 text-sm text-billiard-text outline-none focus:border-billiard-gold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-billiard-text-muted">结束日期</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-billiard-border bg-billiard-surface px-3 py-1.5 text-sm text-billiard-text outline-none focus:border-billiard-gold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-billiard-text-muted">球台</label>
              <select
                value={filterTableId}
                onChange={(e) => setFilterTableId(e.target.value)}
                className="rounded-md border border-billiard-border bg-billiard-surface px-3 py-1.5 text-sm text-billiard-text outline-none focus:border-billiard-gold"
              >
                <option value="">全部球台</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-billiard-text-muted">客户搜索</label>
              <input
                type="text"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                placeholder="客户姓名"
                className="rounded-md border border-billiard-border bg-billiard-surface px-3 py-1.5 text-sm text-billiard-text outline-none placeholder:text-billiard-text-muted/50 focus:border-billiard-gold"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-billiard-border bg-billiard-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-billiard-border text-billiard-text-muted">
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                  <th className="px-4 py-3 text-left font-medium">球台</th>
                  <th className="px-4 py-3 text-left font-medium">客户</th>
                  <th className="px-4 py-3 text-right font-medium">时长</th>
                  <th className="px-4 py-3 text-right font-medium">金额</th>
                  <th className="px-4 py-3 text-center font-medium">状态</th>
                  <th className="px-4 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-billiard-text-muted">
                      暂无账单记录
                    </td>
                  </tr>
                )}
                {filteredBills.map((bill) => {
                  const badge = statusBadge[bill.status];
                  return (
                    <tr
                      key={bill.id}
                      className="border-b border-billiard-border/40 transition-colors hover:bg-billiard-surface"
                    >
                      <td className="px-4 py-3 text-billiard-text">
                        {formatDate(bill.createdAt)} {formatTime(bill.startTime)}
                      </td>
                      <td className="px-4 py-3 text-billiard-text">{getTableName(bill.tableId)}</td>
                      <td className="px-4 py-3 text-billiard-text">{bill.customerName}</td>
                      <td className="px-4 py-3 text-right text-billiard-text">
                        {formatDuration(bill.totalMinutes)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-billiard-gold">
                        {formatCurrency(bill.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="rounded-md bg-billiard-border/50 px-3 py-1 text-xs font-medium text-billiard-text transition-colors hover:bg-billiard-border"
                          onClick={() => handleViewBill(bill)}
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        bill={checkoutBill}
        tableName={checkoutTableName}
      />

      <BillDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        bill={detailBill}
        tableName={detailTableName}
      />
    </div>
  );
}
