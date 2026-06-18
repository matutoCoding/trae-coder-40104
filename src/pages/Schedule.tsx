import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, GitMerge, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { formatTime, formatDuration, getElapsedMinutes } from '@/utils/billing';
import type { TableItem, Occupation } from '@/types';
import TableFormModal from '@/components/TableFormModal';
import SplitOccupationModal from '@/components/SplitOccupationModal';

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_WIDTH = 80;
const ROW_HEIGHT = 56;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIMELINE_WIDTH = TOTAL_HOURS * HOUR_WIDTH;

function timeToX(dateStr: string): number {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - START_HOUR) * HOUR_WIDTH + (m / 60) * HOUR_WIDTH;
}

interface BlockPopupProps {
  occupation: Occupation;
  onSplit: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}

function BlockPopup({ occupation, onSplit, onClose, position }: BlockPopupProps) {
  const elapsed = getElapsedMinutes(occupation.startTime);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.block-popup')) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      className="block-popup absolute z-40 w-56 rounded-lg border border-billiard-border bg-billiard-card p-3 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <div className="mb-2 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-billiard-text-muted">客户</span>
          <span className="font-medium text-billiard-text">{occupation.customerName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billiard-text-muted">开始</span>
          <span className="text-billiard-text">{formatTime(occupation.startTime)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billiard-text-muted">结束</span>
          <span className="text-billiard-text">{occupation.endTime ? formatTime(occupation.endTime) : '进行中'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billiard-text-muted">时长</span>
          <span className="text-billiard-gold">{formatDuration(elapsed)}</span>
        </div>
        {occupation.mergedFrom.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-billiard-text-muted">
            <GitMerge size={12} />
            <span>已合并 {occupation.mergedFrom.length} 条记录</span>
          </div>
        )}
      </div>
      <button
        onClick={onSplit}
        className="w-full rounded-md bg-billiard-surface px-3 py-1.5 text-sm text-billiard-gold hover:bg-billiard-border transition-colors"
      >
        散场拆分
      </button>
    </div>
  );
}

export default function Schedule() {
  const tables = useStore(s => s.tables);
  const occupations = useStore(s => s.occupations);
  const tierGroups = useStore(s => s.tierGroups);
  const deleteTable = useStore(s => s.deleteTable);
  const openTable = useStore(s => s.openTable);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | undefined>(undefined);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitOccupation, setSplitOccupation] = useState<Occupation | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    occupation: Occupation;
    position: { x: number; y: number };
  } | null>(null);
  const [now, setNow] = useState(new Date());

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleAddTable = useCallback(() => {
    setEditingTable(undefined);
    setFormModalOpen(true);
  }, []);

  const handleEditTable = useCallback((table: TableItem) => {
    setEditingTable(table);
    setFormModalOpen(true);
  }, []);

  const handleDeleteTable = useCallback((id: string) => {
    deleteTable(id);
  }, [deleteTable]);

  const handleBlockClick = useCallback((occupation: Occupation, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = timelineRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setPopupInfo({
      occupation,
      position: {
        x: rect.left - containerRect.left + rect.width / 2 - 112,
        y: rect.bottom - containerRect.top + 4,
      },
    });
  }, []);

  const handleSplitFromPopup = useCallback(() => {
    if (popupInfo) {
      setSplitOccupation(popupInfo.occupation);
      setSplitModalOpen(true);
      setPopupInfo(null);
    }
  }, [popupInfo]);

  const handleTimelineClick = useCallback((tableId: string, e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const totalMinutes = (x / HOUR_WIDTH) * 60;
    const hour = Math.floor(totalMinutes / 60) + START_HOUR;
    const minute = Math.floor(totalMinutes % 60);

    if (hour < START_HOUR || hour >= END_HOUR) return;

    const table = tables.find(t => t.id === tableId);
    if (!table || table.status !== 'available') return;

    const name = prompt(`开台 - ${table.name}\n${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}\n请输入客户姓名:`);
    if (!name) return;

    const phone = prompt('请输入客户电话:') || '';
    openTable(tableId, name, phone);
  }, [tables, openTable]);

  const nowX = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * HOUR_WIDTH;

  const getTierGroupName = (tierGroupId: string) => {
    return tierGroups.find(g => g.id === tierGroupId)?.name ?? '-';
  };

  const getOccupationsForTable = (tableId: string) => {
    return occupations.filter(o => o.tableId === tableId);
  };

  const statusLabel: Record<string, string> = {
    available: '空闲',
    occupied: '使用中',
    reserved: '已预约',
    maintenance: '维护中',
  };

  const statusColor: Record<string, string> = {
    available: 'text-billiard-available',
    occupied: 'text-billiard-occupied',
    reserved: 'text-billiard-reserved',
    maintenance: 'text-billiard-maintenance',
  };

  return (
    <div className="min-h-screen bg-billiard-bg p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-billiard-text">球台排期</h1>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-billiard-text">球台资源管理</h2>
          <button
            onClick={handleAddTable}
            className={cn(
              'flex items-center gap-1.5 rounded-lg bg-billiard-gold px-4 py-2 text-sm font-medium',
              'text-billiard-bg hover:bg-billiard-gold-dark transition-colors'
            )}
          >
            <Plus size={16} />
            添加球台
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tables.map(table => (
            <div
              key={table.id}
              className={cn(
                'rounded-xl border bg-billiard-card p-3',
                table.category === 'vip'
                  ? 'border-billiard-red/40'
                  : 'border-billiard-border'
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-billiard-text">{table.name}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-xs',
                    table.category === 'vip'
                      ? 'bg-billiard-red/20 text-red-300'
                      : 'bg-billiard-border/40 text-billiard-text-muted'
                  )}
                >
                  {table.category === 'vip' ? '包厢' : '散台'}
                </span>
              </div>
              <div className="mb-2 text-xs text-billiard-text-muted">{getTierGroupName(table.tierGroupId)}</div>
              <div className={cn('mb-3 text-xs font-medium', statusColor[table.status])}>
                {statusLabel[table.status]}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleEditTable(table)}
                  className="flex items-center gap-1 rounded-md bg-billiard-surface px-2 py-1 text-xs text-billiard-text-muted hover:text-billiard-text hover:bg-billiard-border transition-colors"
                >
                  <Pencil size={12} />
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteTable(table.id)}
                  className="flex items-center gap-1 rounded-md bg-billiard-surface px-2 py-1 text-xs text-billiard-text-muted hover:text-red-400 hover:bg-billiard-border transition-colors"
                >
                  <Trash2 size={12} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-billiard-text">今日排期时间线</h2>
        <div
          ref={timelineRef}
          className="relative overflow-x-auto rounded-xl border border-billiard-border bg-billiard-surface"
          onClick={() => setPopupInfo(null)}
        >
          <div style={{ minWidth: TIMELINE_WIDTH + 140 }}>
            <div className="flex border-b border-billiard-border">
              <div className="w-[140px] shrink-0 px-3 py-2 text-sm font-medium text-billiard-text-muted">
                球台
              </div>
              <div className="relative flex" style={{ width: TIMELINE_WIDTH }}>
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 text-xs text-billiard-text-muted"
                    style={{ width: HOUR_WIDTH, paddingLeft: 4 }}
                  >
                    {String(START_HOUR + i).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {tables.map(table => {
              const tableOccs = getOccupationsForTable(table.id);
              return (
                <div
                  key={table.id}
                  className="flex border-b border-billiard-border/50 last:border-b-0"
                >
                  <div
                    className={cn(
                      'w-[140px] shrink-0 px-3 py-2',
                      table.category === 'vip' && 'border-l-2 border-l-billiard-red/50'
                    )}
                  >
                    <div className="text-sm font-medium text-billiard-text">{table.name}</div>
                    <div className="text-xs text-billiard-text-muted">
                      {table.category === 'vip' ? '包厢' : '散台'}
                    </div>
                  </div>
                  <div
                    className="relative"
                    style={{ width: TIMELINE_WIDTH, height: ROW_HEIGHT }}
                    onClick={e => handleTimelineClick(table.id, e)}
                  >
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-r border-billiard-border/20"
                        style={{ left: (i + 1) * HOUR_WIDTH }}
                      />
                    ))}

                    {tableOccs.map(occ => {
                      const startX = Math.max(0, timeToX(occ.startTime));
                      const endX = occ.endTime
                        ? timeToX(occ.endTime)
                        : Math.min(timeToX(new Date().toISOString()), TIMELINE_WIDTH);
                      const width = Math.max(HOUR_WIDTH / 4, endX - startX);
                      const isActive = occ.endTime === null;

                      return (
                        <div
                          key={occ.id}
                          onClick={e => handleBlockClick(occ, e)}
                          className={cn(
                            'absolute top-1 z-10 flex cursor-pointer items-center overflow-hidden rounded-md px-2',
                            isActive
                              ? 'bg-emerald-800/70 hover:bg-emerald-700/80'
                              : 'bg-billiard-border/60 hover:bg-billiard-border/80',
                          )}
                          style={{ left: startX, width, height: ROW_HEIGHT - 8 }}
                        >
                          <span className="truncate text-xs font-medium text-billiard-text">
                            {occ.customerName}
                          </span>
                          {occ.mergedFrom.length > 0 && (
                            <GitMerge size={10} className="ml-1 shrink-0 text-billiard-gold" />
                          )}
                          {isActive && (
                            <span className="absolute right-0 top-0 bottom-0 w-1.5 animate-pulse-gold bg-billiard-gold" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {nowX >= 0 && nowX <= TIMELINE_WIDTH && (
              <div
                className="absolute top-0 z-30 pointer-events-none"
                style={{ left: nowX + 140 }}
              >
                <div className="h-full w-0.5 bg-billiard-gold" style={{ minHeight: ROW_HEIGHT }}>
                  <div className="relative -top-3 -left-2 flex items-center gap-0.5">
                    <Clock size={10} className="text-billiard-gold" />
                    <span className="text-[10px] font-medium text-billiard-gold whitespace-nowrap">
                      {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {popupInfo && (
            <BlockPopup
              occupation={popupInfo.occupation}
              position={popupInfo.position}
              onSplit={handleSplitFromPopup}
              onClose={() => setPopupInfo(null)}
            />
          )}
        </div>
      </section>

      <TableFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingTable(undefined);
        }}
        table={editingTable}
      />

      <SplitOccupationModal
        open={splitModalOpen}
        onClose={() => {
          setSplitModalOpen(false);
          setSplitOccupation(null);
        }}
        occupation={splitOccupation}
      />
    </div>
  );
}
