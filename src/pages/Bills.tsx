import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { formatDuration, formatCurrency, formatTime, formatDate } from '@/utils/billing';
import CheckoutModal from '@/components/CheckoutModal';
import BillDetailModal from '@/components/BillDetailModal';
import type { Bill, Occupation } from '@/types';

type TabKey = 'active' | 'history';

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

  const activeOccupations = occupations.filter((o) => {
    const start = new Date(o.startTime).getTime();
    const end = o.endTime ? new Date(o.endTime).getTime() : Infinity;
    return now >= start && now < end;
  });

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

  return (
    <div className="min-h-screen bg-billiard-bg p-4 md:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-billiard-gold">账单管理</h1>

      <div className="mb-6 flex gap-2">
        {(['active', 'history'] as const).map((t) => (
          <button
            key={t}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-billiard-gold text-billiard-bg'
                : 'bg-billiard-card text-billiard-text-muted hover:bg-billiard-border'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'active' ? '当前消费' : '历史账单'}
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
                  <span className="text-xs text-billiard-text-muted">当前费用</span>
                  <span className="text-xl font-bold text-billiard-gold">
                    {formatCurrency(live.total)}
                  </span>
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
