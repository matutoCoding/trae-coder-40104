import type { Bill } from '@/types';
import { formatDuration, formatCurrency, formatTime } from '@/utils/billing';
import { Wallet, Percent } from 'lucide-react';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
  tableName: string;
}

export default function CheckoutModal({ open, onClose, bill, tableName }: CheckoutModalProps) {
  if (!open || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-center font-display text-2xl font-bold text-billiard-gold">
          结账单
        </h2>

        <div className="mb-5 space-y-2 rounded-lg border border-billiard-border bg-billiard-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">球台</span>
            <span className="text-billiard-text">{tableName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">客户</span>
            <span className="text-billiard-text">{bill.customerName}</span>
          </div>
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

        <table className="mb-5 w-full text-sm">
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

        <div className="mb-6 space-y-2 rounded-lg border border-billiard-gold/30 bg-billiard-card px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-billiard-text-muted">原始金额</span>
            <span className="text-billiard-text">{formatCurrency(bill.originalAmount)}</span>
          </div>
          {bill.discountRate < 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-billiard-text-muted flex items-center gap-1"><Percent size={12} />{bill.discountLabel || '会员折扣'}</span>
              <span className="text-billiard-gold">-{formatCurrency(bill.originalAmount * (1 - bill.discountRate))}</span>
            </div>
          )}
          {bill.balanceUsed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-billiard-text-muted flex items-center gap-1"><Wallet size={12} />余额抵扣</span>
              <span className="text-billiard-gold">-{formatCurrency(bill.balanceUsed)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-billiard-gold/20">
            <span className="text-lg font-medium text-billiard-text">实收</span>
            <span className="text-2xl font-bold text-billiard-gold">{formatCurrency(bill.totalAmount)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg border border-billiard-border bg-billiard-card px-4 py-2.5 text-sm font-medium text-billiard-text transition-colors hover:bg-billiard-border"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="flex-1 rounded-lg bg-billiard-gold px-4 py-2.5 text-sm font-bold text-billiard-bg transition-colors hover:bg-billiard-gold-dark"
            onClick={onClose}
          >
            确认收款
          </button>
        </div>
      </div>
    </div>
  );
}
