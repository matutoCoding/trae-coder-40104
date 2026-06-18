import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '@/store/useStore';
import type { Tier } from '@/types';
import { calculateBillDetails, calculateTotal, formatDuration, formatCurrency } from '@/utils/billing';
import TierFormModal from '@/components/TierFormModal';

const BAR_COLORS = ['#1B5148', '#2A7A6E', '#3DA694', '#D4A843', '#E8C76A', '#8B9A96'];

export default function Billing() {
  const tierGroups = useStore(s => s.tierGroups);
  const addTierGroup = useStore(s => s.addTierGroup);
  const deleteTierGroup = useStore(s => s.deleteTierGroup);
  const deleteTier = useStore(s => s.deleteTier);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(tierGroups[0]?.id ?? '');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [simGroupId, setSimGroupId] = useState<string>(tierGroups[0]?.id ?? '');
  const [simMinutes, setSimMinutes] = useState(60);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | undefined>(undefined);

  const selectedGroup = tierGroups.find(g => g.id === selectedGroupId);
  const simGroup = tierGroups.find(g => g.id === simGroupId);

  const billDetails = useMemo(() => {
    if (!simGroup) return [];
    return calculateBillDetails(simGroup.tiers, simMinutes);
  }, [simGroup, simMinutes]);

  const totalAmount = useMemo(() => calculateTotal(billDetails), [billDetails]);

  const chartData = useMemo(() => {
    return billDetails.map((d, i) => ({
      name: d.tierLabel,
      小计: d.subtotal,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
  }, [billDetails]);

  const handleAddGroup = () => {
    const name = prompt('请输入费率组名称');
    if (name?.trim()) {
      const group = addTierGroup(name.trim());
      setSelectedGroupId(group.id);
    }
  };

  const handleDeleteGroup = (id: string) => {
    if (tierGroups.length <= 1) return;
    deleteTierGroup(id);
    if (selectedGroupId === id) {
      setSelectedGroupId(tierGroups.find(g => g.id !== id)?.id ?? '');
    }
    if (simGroupId === id) {
      setSimGroupId(tierGroups.find(g => g.id !== id)?.id ?? '');
    }
  };

  const handleAddTier = () => {
    setEditingTier(undefined);
    setModalOpen(true);
  };

  const handleEditTier = (tier: Tier) => {
    setEditingTier(tier);
    setModalOpen(true);
  };

  const handleDeleteTier = (tierId: string) => {
    deleteTier(selectedGroupId, tierId);
  };

  const formatTierRange = (tier: Tier) => {
    const start = formatDuration(tier.startMinute);
    if (tier.endMinute === null) return `${start}起`;
    return `${start} - ${formatDuration(tier.endMinute)}`;
  };

  const totalTierMinutes = selectedGroup
    ? selectedGroup.tiers.reduce((sum, t) => {
        const end = t.endMinute ?? 300;
        return sum + (end - t.startMinute);
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-billiard-bg p-6">
      <h1 className="mb-6 text-2xl font-bold text-billiard-text">阶梯计费</h1>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-xl border border-billiard-border bg-billiard-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-billiard-text">费率组管理</h2>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {tierGroups.map(g => (
              <div
                key={g.id}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  g.id === selectedGroupId
                    ? 'border-billiard-gold bg-billiard-gold/10 text-billiard-gold'
                    : 'border-billiard-border text-billiard-text-muted hover:border-billiard-text-muted'
                }`}
              >
                <button onClick={() => setSelectedGroupId(g.id)} className="cursor-pointer">
                  {g.name}
                </button>
                {tierGroups.length > 1 && (
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="ml-1 rounded p-0.5 text-billiard-text-muted hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddGroup}
              className="flex items-center gap-1 rounded-lg border border-dashed border-billiard-border px-3 py-1.5 text-sm text-billiard-text-muted transition-colors hover:border-billiard-gold hover:text-billiard-gold"
            >
              <Plus size={14} />
              新建费率组
            </button>
          </div>

          {selectedGroup && (
            <>
              <div className="overflow-hidden rounded-lg border border-billiard-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-billiard-border bg-billiard-surface">
                      <th className="px-3 py-2 text-left text-billiard-text-muted">档位名称</th>
                      <th className="px-3 py-2 text-left text-billiard-text-muted">时长范围</th>
                      <th className="px-3 py-2 text-left text-billiard-text-muted">单价(¥/小时)</th>
                      <th className="px-3 py-2 text-right text-billiard-text-muted">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.tiers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-billiard-text-muted">
                          暂无档位，请添加
                        </td>
                      </tr>
                    )}
                    {selectedGroup.tiers.map(tier => (
                      <tr
                        key={tier.id}
                        className="border-b border-billiard-border/50 transition-colors hover:bg-billiard-surface/50"
                      >
                        <td className="px-3 py-2 text-billiard-text">{tier.label}</td>
                        <td className="px-3 py-2 text-billiard-text-muted">{formatTierRange(tier)}</td>
                        <td className="px-3 py-2 text-billiard-gold">¥{tier.pricePerHour}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditTier(tier)}
                              className="rounded p-1 text-billiard-text-muted transition-colors hover:bg-billiard-border hover:text-billiard-text"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTier(tier.id)}
                              className="rounded p-1 text-billiard-text-muted transition-colors hover:bg-red-900/30 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleAddTier}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-billiard-border py-2 text-sm text-billiard-text-muted transition-colors hover:border-billiard-gold hover:text-billiard-gold"
              >
                <Plus size={14} />
                添加档位
              </button>
            </>
          )}

          <TierFormModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingTier(undefined);
            }}
            tierGroupId={selectedGroupId}
            tier={editingTier}
          />
        </section>

        <section className="rounded-xl border border-billiard-border bg-billiard-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-billiard-text">计费模拟器</h2>

          <div className="relative mb-4">
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex w-full items-center justify-between rounded-lg border border-billiard-border bg-billiard-surface px-3 py-2 text-sm text-billiard-text transition-colors hover:border-billiard-gold"
            >
              {simGroup?.name ?? '选择费率组'}
              <ChevronDown size={16} className="text-billiard-text-muted" />
            </button>
            {showGroupDropdown && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-billiard-border bg-billiard-card py-1 shadow-xl">
                {tierGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSimGroupId(g.id);
                      setShowGroupDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      g.id === simGroupId
                        ? 'bg-billiard-gold/10 text-billiard-gold'
                        : 'text-billiard-text hover:bg-billiard-surface'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-billiard-text-muted">模拟消费时长</span>
              <span className="text-sm font-medium text-billiard-gold">{formatDuration(simMinutes)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              value={simMinutes}
              onChange={e => setSimMinutes(Number(e.target.value))}
              className="w-full accent-billiard-gold"
            />
            <div className="mt-1 flex justify-between text-xs text-billiard-text-muted">
              <span>0分钟</span>
              <span>5小时</span>
            </div>
          </div>

          {billDetails.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-billiard-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-billiard-border bg-billiard-surface">
                    <th className="px-3 py-2 text-left text-billiard-text-muted">档位</th>
                    <th className="px-3 py-2 text-left text-billiard-text-muted">时长</th>
                    <th className="px-3 py-2 text-left text-billiard-text-muted">单价</th>
                    <th className="px-3 py-2 text-right text-billiard-text-muted">小计</th>
                  </tr>
                </thead>
                <tbody>
                  {billDetails.map((d, i) => (
                    <tr
                      key={i}
                      className="border-b border-billiard-border/50"
                    >
                      <td className="px-3 py-2 text-billiard-text">{d.tierLabel}</td>
                      <td className="px-3 py-2 text-billiard-text-muted">{formatDuration(d.minutes)}</td>
                      <td className="px-3 py-2 text-billiard-text-muted">¥{d.pricePerHour}/小时</td>
                      <td className="px-3 py-2 text-right text-billiard-gold">{formatCurrency(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {billDetails.length === 0 && (
            <div className="mb-4 rounded-lg border border-billiard-border py-8 text-center text-sm text-billiard-text-muted">
              请设置消费时长以查看计费明细
            </div>
          )}

          {chartData.length > 0 && (
            <div className="mb-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8B9A96', fontSize: 11 }}
                    axisLine={{ stroke: '#1B5148' }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: '#143D36',
                      border: '1px solid #1B5148',
                      borderRadius: '8px',
                      color: '#E8E0D4',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCurrency(value), '小计']}
                  />
                  <Bar dataKey="小计" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-billiard-border bg-billiard-surface px-4 py-3">
            <span className="text-sm text-billiard-text-muted">总计</span>
            <span className="text-2xl font-bold text-billiard-gold">{formatCurrency(totalAmount)}</span>
          </div>
        </section>

        <section className="col-span-2 rounded-xl border border-billiard-border bg-billiard-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-billiard-text">计费规则图示</h2>

          {selectedGroup && selectedGroup.tiers.length > 0 ? (
            <div>
              <div className="mb-2 flex flex-wrap gap-3">
                {selectedGroup.tiers.map((tier, i) => (
                  <div key={tier.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                    <span className="text-billiard-text-muted">{tier.label}</span>
                    <span className="text-billiard-gold">¥{tier.pricePerHour}/小时</span>
                  </div>
                ))}
              </div>

              <div className="flex h-12 w-full overflow-hidden rounded-lg border border-billiard-border">
                {selectedGroup.tiers.map((tier, i) => {
                  const end = tier.endMinute ?? 300;
                  const width = totalTierMinutes > 0 ? ((end - tier.startMinute) / totalTierMinutes) * 100 : 0;
                  return (
                    <div
                      key={tier.id}
                      className="flex items-center justify-center overflow-hidden border-r border-billiard-border/30 last:border-r-0"
                      style={{
                        width: `${width}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        minWidth: width > 0 ? '2rem' : 0,
                      }}
                    >
                      <span className="truncate px-1 text-xs font-medium text-billiard-text">
                        {formatDuration(tier.startMinute)}
                        {tier.endMinute === null ? '+' : `-${formatDuration(tier.endMinute)}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex">
                {selectedGroup.tiers.map((tier, i) => {
                  const end = tier.endMinute ?? 300;
                  const width = totalTierMinutes > 0 ? ((end - tier.startMinute) / totalTierMinutes) * 100 : 0;
                  return (
                    <div
                      key={`price-${tier.id}`}
                      className="flex items-center justify-center overflow-hidden"
                      style={{ width: `${width}%`, minWidth: width > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-xs text-billiard-gold">¥{tier.pricePerHour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-billiard-text-muted">
              请先添加档位以查看计费规则图示
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
