import React from 'react';
import {
  LayoutDashboard,
  User,
  TrendingUp,
  DollarSign,
  Wallet,
  Receipt,
  Users,
  FileText,
  Settings,
  Lock,
} from 'lucide-react';
import { NavItem } from '../types';

interface SidebarProps {
  page: string;
  setPage: (page: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  page,
  setPage,
  isAdmin,
  onLogout,
}) => {
  const memberNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'My Profile', icon: User },
  ];

  const adminNav: NavItem[] = [
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'add-profit', label: 'Profits', icon: DollarSign },
    { id: 'savings', label: 'Monthly Savings', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
    { id: 'all-members', label: 'All Members', icon: Users },
    { id: 'log', label: 'Transaction Log', icon: FileText },
    { id: 'setup', label: 'Setup', icon: Settings },
  ];

  return (
    <div className="w-[220px] shrink-0 bg-[var(--bg2)] border-r border-[var(--border)] flex flex-col fixed top-0 left-0 h-screen z-[100] transition-transform">
      <div className="p-6 pb-4 border-b border-[var(--border)]">
        <div className="font-serif text-[20px] text-[var(--text)] tracking-[-0.3px] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          Bondhu Circle
        </div>
        <div className="text-[10px] text-[var(--text3)] mt-1 tracking-[1px] uppercase font-medium">
          Investment Tracker
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="text-[10px] text-[var(--text3)] tracking-[1.5px] uppercase px-3 py-3 pb-1 font-bold">
          Public
        </div>
        {memberNav.map((n) => (
          <button
            key={n.id}
            className={`nav-item w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer text-[13px] mb-1 transition-all text-left border-none bg-none ${
              page === n.id 
                ? 'bg-[var(--bg4)] text-[var(--text)] font-semibold shadow-sm' 
                : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
            }`}
            onClick={() => setPage(n.id)}
          >
            <n.icon size={18} className={page === n.id ? 'text-[var(--accent)]' : 'opacity-60'} />
            {n.label}
          </button>
        ))}

        {isAdmin && (
          <>
            <div className="text-[10px] text-[var(--text3)] tracking-[1.5px] uppercase px-3 py-4 pb-1 mt-2 font-bold border-t border-[var(--border)]">
              Admin Panel
            </div>
            {adminNav.map((n) => (
              <button
                key={n.id}
                className={`nav-item w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer text-[13px] mb-1 transition-all text-left border-none bg-none ${
                  page === n.id 
                    ? 'bg-[var(--bg4)] text-[var(--text)] font-semibold shadow-sm' 
                    : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
                }`}
                onClick={() => setPage(n.id)}
              >
                <n.icon size={18} className={page === n.id ? 'text-[var(--accent)]' : 'opacity-60'} />
                {n.label}
              </button>
            ))}
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-[var(--border)] bg-[var(--bg2)]">
        {isAdmin ? (
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            <Lock size={14} /> Exit Admin Mode
          </button>
        ) : (
          <div className="text-[11px] text-[var(--text3)] text-center py-2 italic">
            Viewing as Member
          </div>
        )}
      </div>
    </div>
  );
};
