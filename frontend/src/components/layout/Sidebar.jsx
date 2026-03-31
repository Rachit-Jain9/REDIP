import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, HeartHandshake, Calculator, BarChart3,
  FileText, Activity, Map, GitCompare, Settings, LogOut, ChevronLeft, ChevronRight, Brain,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/deals', icon: HeartHandshake, label: 'Deals' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/comps', icon: BarChart3, label: 'Comps' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/activities', icon: Activity, label: 'Activities' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/reports', icon: Calculator, label: 'Reports' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-gray-900 text-gray-300 flex flex-col transition-all duration-200 min-h-screen`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && <span className="text-lg font-bold text-white">REDIP</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-800 rounded">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        {!collapsed && user && (
          <div className="mb-3 text-xs">
            <div className="text-white font-medium truncate">{user.name}</div>
            <div className="text-gray-500 truncate">{user.email}</div>
            <div className="text-gray-500 capitalize">{user.role}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
