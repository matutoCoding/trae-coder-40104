import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatDuration, formatCurrency, formatTime } from '@/utils/billing';
import TableCard from '@/components/TableCard';
import OpenTableDrawer from '@/components/OpenTableDrawer';
import type { Bill } from '@/types';

export default function Lobby() {
  const tables = useStore(s => s.tables);
  const closeTable = useStore(s => s.closeTable);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [billResult, setBillResult] = useState<Bill | null>(null);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;

  const handleOpenTable = (tableId: string) => {
    setSelectedTableId(tableId);
    setDrawerOpen(true);
  };

  const handleCloseTable = (tableId: string) => {
    const bill = closeTable(tableId);
    setBillResult(bill);
  };

  const billedTable = billResult
    ? tables.find(t => t.id === billResult.tableId)
    : undefined;

  return (
    <div className="min-h-screen bg-billiard-bg p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-billiard-text">大厅总览</h1>
          <p className="text-sm text-billiard-text-muted mt-1">
            {occupiedCount}/{tables.length} 桌在使用
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onOpenTable={handleOpenTable}
              onCloseTable={handleCloseTable}
            />
          ))}
        </div>
      </div>

      <OpenTableDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTableId(null);
        }}
        tableId={selectedTableId}
      />

      {billResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="glass-card rounded-xl p-6 w-[440px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-billiard-text">结账明细</h2>
              <button
                onClick={() => setBillResult(null)}
                className="text-billiard-text-muted hover:text-billiard-text transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-billiard-text-muted">桌台</span>
                <span className="text-billiard-text">{billedTable?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-billiard-text-muted">客户</span>
                <span className="text-billiard-text">{billResult.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-billiard-text-muted">开始时间</span>
                <span className="text-billiard-text">{formatTime(billResult.startTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-billiard-text-muted">结束时间</span>
                <span className="text-billiard-text">{formatTime(billResult.endTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-billiard-text-muted">总时长</span>
                <span className="text-billiard-text">{formatDuration(billResult.totalMinutes)}</span>
              </div>
            </div>

            {billResult.details.length > 0 && (
              <div className="mb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-billiard-border">
                      <th className="text-left py-2 text-billiard-text-muted font-normal">档位</th>
                      <th className="text-right py-2 text-billiard-text-muted font-normal">时长</th>
                      <th className="text-right py-2 text-billiard-text-muted font-normal">单价</th>
                      <th className="text-right py-2 text-billiard-text-muted font-normal">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billResult.details.map((d, i) => (
                      <tr key={i} className="border-b border-billiard-border/30">
                        <td className="py-2 text-billiard-text">{d.tierLabel}</td>
                        <td className="py-2 text-right text-billiard-text">{d.minutes}分钟</td>
                        <td className="py-2 text-right text-billiard-text">{formatCurrency(d.pricePerHour)}/时</td>
                        <td className="py-2 text-right text-billiard-gold">{formatCurrency(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between mb-6 pt-3 border-t border-billiard-border">
              <span className="text-billiard-text-muted">合计</span>
              <span className="text-xl font-bold text-billiard-gold">{formatCurrency(billResult.totalAmount)}</span>
            </div>

            <button
              onClick={() => setBillResult(null)}
              className="w-full py-2.5 rounded-full bg-billiard-gold text-billiard-bg font-medium hover:bg-billiard-gold-light transition-colors"
            >
              确认收款
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
