import type { Bill } from '@/types';
import { useStore } from '@/store/useStore';
import { formatDuration, formatCurrency, formatTime } from '@/utils/billing';

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
};

export default function BillDetailModal({ open, onClose, bill, tableName }: BillDetailModalProps) {
  const markBillRefunded = useStore((s) => s.markBillRefunded);

  if (!open || !bill) return null;

  const status = statusConfig[bill.status];

  const handleRefund = () => {
    markBillRefunded(bill.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-billiard-border bg-billiard-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-billiard-gold">账单详情</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

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

        <div className="mb-6 flex items-center justify-between rounded-lg border border-billiard-gold/30 bg-billiard-card px-4 py-3">
          <span className="text-lg font-medium text-billiard-text">合计</span>
          <span className="text-2xl font-bold text-billiard-gold">{formatCurrency(bill.totalAmount)}</span>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg border border-billiard-border bg-billiard-card px-4 py-2.5 text-sm font-medium text-billiard-text transition-colors hover:bg-billiard-border"
            onClick={onClose}
          >
            关闭
          </button>
          {bill.status === 'paid' && (
            <button
              className="flex-1 rounded-lg bg-billiard-red px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
              onClick={handleRefund}
            >
              退款
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
