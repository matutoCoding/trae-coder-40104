import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Search } from 'lucide-react';
import Sidebar from './Sidebar';

const pageTitles: Record<string, string> = {
  '/': '大厅总览',
  '/billing': '阶梯计费',
  '/bills': '账单管理',
  '/schedule': '球台排期',
};

export default function Layout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '台球室';

  return (
    <div className="min-h-screen bg-[#0A1F1C]">
      <Sidebar />

      <div className="ml-[240px]">
        <div className="flex items-center justify-between px-8 py-4 border-b border-[#1B5148]">
          <h2 className="text-[#E8E0D4] text-lg font-display tracking-wide">{title}</h2>
          <div className="flex items-center gap-2 bg-[#0F2E29] border border-[#1B5148] rounded-lg px-3 py-2 w-64">
            <Search className="w-4 h-4 text-[#8B9A96]" />
            <input
              type="text"
              placeholder="搜索..."
              className="bg-transparent text-sm text-[#E8E0D4] placeholder-[#8B9A96] outline-none w-full"
            />
          </div>
        </div>

        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
