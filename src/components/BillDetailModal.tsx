import type { Bill } from '@/types';
import { useStore } from '@/store/useStore';
import { formatDuration, formatCurrency, formatTime } from '@/utils/billing';
import { GitMerge, Wallet, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillDetailModalProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
  tableName: string;
}

const statusConfig: Record<Bill['status'], { label: string; className: string }> = {
  paid: { label: '已付款', className: 'bg-green-600/20 text-green-400 border border-green-600/30' },
  refunded: { label: '已退款', className: 'bg-red-600/20 text-red-400 border border-red-600/30' },
  active: { label: '进行中', className: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' },
  merged: { label: '已合并', className: 'bg-billiard-border/50 text-billiard-text-muted border border-billiard-border' },
};

export default function BillDetailModal({ open, onClose, bill, tableName }: BillDetailModalProps) {
  const markBillRefunded = useStore((s) => s.markBillRefunded);
  const bills = useStore((s) => s.bills);
  const members = useStore((s) => s.members);
  const getMemberById = useStore((s) => s.getMemberById);

  if (!open || !bill) return null;

  const status = statusConfig[bill.status];
  const member = bill.memberId ? getMemberById(bill.memberId) ?? null : null;
  const mergedFromBills = bill.mergedFrom.map(id => bills.find(b => b.id === id)).filter(Boolean) as Bill[];
  const mergedIntoBill = bill.mergedInto ? bills.find(b => b.id === bill.mergedInto) ?? null : null;

  const handleRefund = () => {
    markBillRefunded(bill.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-billiard-gold">账单详情</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        {bill.mergedFrom.length > 0 && (
          <div className="mb-4 rounded-lg bg-billiard-gold/10 border border-billiard-gold/30">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-billiard-gold border-b border-billiard-gold/20">
              <GitMerge size={14} />
              <span>此账单由 {bill.mergedFrom.length} 笔账合并而成（点击详情行可跳转查看原始账）</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-billiard-text-muted border-b border-billiard-gold/10">
                  <th className="px-3 py-1.5 text-left font-medium">时段</th>
                  <th className="px-3 py-1.5 text-right font-medium">原金额</th>
                  <th className="px-3 py-1.5 text-right font-medium">时长</th>
                  <th className="px-3 py-1.5 text-center font-medium">原状态</th>
                </tr>
              </thead>
              <tbody>
                {mergedFromBills.map(mb => {
                  const s = statusConfig[mb.status];
                  return (
                    <tr key={mb.id} className="border-b border-billiard-gold/5 hover:bg-billiard-gold/5">
                      <td className="px-3 py-1.5 text-billiard-text">
                        {formatTime(mb.startTime)} - {formatTime(mb.endTime)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-billiard-text">{formatCurrency(mb.originalAmount)}</td>
                      <td className="px-3 py-1.5 text-right text-billiard-text">{formatDuration(mb.totalMinutes)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-billiard-gold/5">
                  <td className="px-3 py-2 text-billiard-gold font-semibold">合计（总账）</td>
                  <td className="px-3 py-2 text-right text-billiard-gold font-bold">{formatCurrency(bill.totalAmount)}</td>
                  <td className="px-3 py-2 text-right text-billiard-gold font-semibold">{formatDuration(bill.totalMinutes)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}>{status.label}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {bill.mergedInto && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-billiard-border/30 px-3 py-2 text-xs text-billiard-text-muted border border-billiard-border">
            <GitMerge size={14} />
            <span>
              此账单已合并到总账
              {mergedIntoBill && (
                <span className="ml-1 font-medium text-billiard-text">
                  「{formatTime(mergedIntoBill.startTime)} - {formatTime(mergedIntoBill.endTime)} · {formatCurrency(mergedIntoBill.totalAmount)}」
                </span>
              )}
              ，不再参与营收统计
            </span>
          </div>
        )}

        <div className="mb-5 space-y-2 rounded-lg border border-billiard-border bg-billiard-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">球台</span>
            <span className="text-billiard-text">{tableName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">客户</span>
            <span className="text-billiard-text">{bill.customerName}</span>
          </div>
          {member && (
            <div className="flex justify-between text-sm">
              <span className="text-billiard-text-muted flex items-center gap-1"><Wallet size={12} />会员</span>
              <span className="text-billiard-gold">{member.name} · {member.discountLabel}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">时段</span>
            <span className="text-billiard-text">
              {formatTime(bill.startTime)} - {formatTime(bill.endTime)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">总时长</span>
            <span className="text-billiard-text">{formatDuration(bill.totalMinutes)}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-billiard-text">计费明细（阶梯档）</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-billiard-border text-billiard-text-muted">
                <th className="pb-2 text-left font-medium">档位</th>
                <th className="pb-2 text-right font-medium">时长(分钟)</th>
                <th className="pb-2 text-right font-medium">单价(¥/小时)</th>
                <th className="pb-2 text-right font-medium">小计</th>
              </tr>
            </thead>
            <tbody>
              {bill.details.map((d, i) => (
                <tr key={i} className="border-b border-billiard-border/40">
                  <td className="py-2 text-billiard-text">{d.tierLabel}</td>
                  <td className="py-2 text-right text-billiard-text">{d.minutes}</td>
                  <td className="py-2 text-right text-billiard-text">{d.pricePerHour}</td>
                  <td className="py-2 text-right text-billiard-gold">{formatCurrency(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 space-y-2 rounded-lg border border-billiard-gold/30 bg-billiard-card px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">原始金额</span>
            <span className="text-billiard-text">{formatCurrency(bill.originalAmount)}</span>
          </div>
          {bill.discountRate < 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-billiard-text-muted flex items-center gap-1"><Percent size={12} />{bill.discountLabel || '会员折扣'}</span>
              <span className="text-billiard-gold">-{formatCurrency(bill.originalAmount - bill.originalAmount * bill.discountRate)}</span>
            </div>
          )}
          {bill.balanceUsed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-billiard-text-muted flex items-center gap-1"><Wallet size={12} />余额抵扣</span>
              <span className="text-billiard-gold">-{formatCurrency(bill.balanceUsed)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-billiard-gold/20">
            <span className="text-lg font-medium text-billiard-text">应付合计</span>
            <span className="text-2xl font-bold text-billiard-gold">{formatCurrency(bill.totalAmount)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg border border-billiard-border bg-billiard-card px-4 py-2.5 text-sm font-medium text-billiard-text transition-colors hover:bg-billiard-border"
            onClick={onClose}
          >
            关闭
          </button>
          {bill.status === 'paid' && !bill.mergedInto && (
            <button
              className="flex-1 rounded-lg bg-billiard-red px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
              onClick={handleRefund}
            >
              退款{bill.balanceUsed > 0 ? '（含余额返还）' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
