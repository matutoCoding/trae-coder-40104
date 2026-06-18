import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calculator, Receipt, Calendar, Circle } from 'lucide-react';

const navItems = [
  { to: '/', label: '大厅总览', icon: LayoutDashboard },
  { to: '/billing', label: '阶梯计费', icon: Calculator },
  { to: '/bills', label: '账单管理', icon: Receipt },
  { to: '/schedule', label: '球台排期', icon: Calendar },
];

export default function Sidebar() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0F2E29] border-r border-[#1B5148] flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-6">
        <Circle className="w-8 h-8 text-[#D4A843]" />
        <h1 className="font-display text-2xl text-[#D4A843] tracking-wide">台球室</h1>
      </div>

      <nav className="flex-1 px-3 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-r-md text-sm transition-colors ${
                isActive
                  ? 'border-l-[3px] border-[#D4A843] text-[#D4A843] bg-[#143D36]'
                  : 'border-l-[3px] border-transparent text-[#8B9A96] hover:bg-[#143D36]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-[#1B5148]">
        <div className="text-[#8B9A96] text-xs mb-1">当前时间</div>
        <div className="text-[#E8E0D4] text-xl font-display tracking-widest">{time}</div>
      </div>
    </aside>
  );
}
