import React, { useState } from 'react';
import {
  LayoutDashboard, User, TrendingUp, DollarSign,
  Wallet, Receipt, Users, FileText, Settings, Lock,
  BarChart3, ClipboardList, ChevronLeft, ChevronRight, X, Menu,
} from 'lucide-react';
import { NavItem } from '../types';

interface SidebarProps {
  page: string;
  setPage: (page: string) => void;
  isAdmin: boolean;
  isMemberLoggedIn: boolean;
  isGuest: boolean;
  db: any;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  page, setPage, isAdmin, isMemberLoggedIn, isGuest,
  db, onLogout, isCollapsed, setIsCollapsed,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const memberNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(!isGuest ? [{ id: 'members', label: 'My Profile', icon: User }] : []),
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(!isGuest ? [
      { id: 'report', label: 'Monthly Report', icon: ClipboardList },
      { id: 'deposits', label: 'Deposits', icon: ClipboardList },
    ] : []),
  ];

  const adminNav: NavItem[] = [
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'add-profit', label: 'Profits', icon: DollarSign },
    { id: 'savings', label: 'Monthly Savings', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
    { id: 'all-members', label: 'All Members', icon: Users },
    { id: 'deposits', label: 'Approve Deposits', icon: ClipboardList },
    { id: 'log', label: 'Transaction Log', icon: FileText },
    { id: 'setup', label: 'Setup', icon: Settings },
  ];

  const navigate = (id: string) => {
    setPage(id);
    setMobileOpen(false);
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {!collapsed && (
        <div className="text-[10px] text-[var(--text3)] tracking-[1.5px] uppercase px-3 py-3 pb-1 font-bold">
          General
        </div>
      )}
      {memberNav.map((n) => (
        <button key={n.id} title={collapsed ? n.label : ''}
          className={`nav-item w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer text-[13px] mb-1 transition-all text-left border-none bg-none ${
            page === n.id ? 'bg-[var(--bg4)] text-[var(--text)] font-semibold shadow-sm' : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
          } ${collapsed ? 'justify-center' : ''}`}
          onClick={() => navigate(n.id)}>
          <n.icon size={18} className={page === n.id ? 'text-[var(--accent)]' : 'opacity-60'} />
          {!collapsed && n.label}
        </button>
      ))}
      {isAdmin && (
        <>
          {!collapsed && (
            <div className="text-[10px] text-[var(--text3)] tracking-[1.5px] uppercase px-3 py-4 pb-1 mt-2 font-bold border-t border-[var(--border)]">
              Admin Panel
            </div>
          )}
          {adminNav.map((n) => {
            const pendingCount = n.id === 'deposits' && db?.deposits
              ? Object.values(db.deposits).filter((d: any) => d.status === 'pending').length
              : 0;
            return (
              <button key={n.id} title={collapsed ? n.label : ''}
                className={`nav-item w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer text-[13px] mb-1 transition-all text-left border-none bg-none relative ${
                  page === n.id ? 'bg-[var(--bg4)] text-[var(--text)] font-semibold shadow-sm' : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
                } ${collapsed ? 'justify-center' : ''}`}
                onClick={() => navigate(n.id)}>
                <n.icon size={18} className={page === n.id ? 'text-[var(--accent)]' : 'opacity-60'} />
                {!collapsed && n.label}
                {pendingCount > 0 && (
                  <span className={`absolute ${collapsed ? 'top-1 right-1' : 'right-3'} flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}
    </>
  );

  const LogoutBtn = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="p-4 border-t border-[var(--border)] bg-[var(--bg2)]">
      <button onClick={onLogout}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 cursor-pointer`}>
        <Lock size={14} /> {!collapsed && (isAdmin ? 'Exit Admin' : isMemberLoggedIn ? 'Logout' : 'Back to Login')}
      </button>
      {!collapsed && (
        <div className="text-[10px] text-[var(--text3)] text-center mt-2 italic">
          {isAdmin ? 'Admin Mode' : isMemberLoggedIn ? 'Member Mode' : 'Guest Mode'}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[54px] bg-[var(--bg2)] border-b border-[var(--border)] flex items-center justify-between px-4 z-[200]">
        <div className="font-serif text-[17px] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          Bondhu Circle
        </div>
        <button onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded-lg text-[var(--text2)] hover:bg-[var(--bg3)] border-none bg-none cursor-pointer">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[150]" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-[260px] h-full bg-[var(--bg2)] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 pb-3 border-b border-[var(--border)]">
              <div className="font-serif text-[18px] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Bondhu Circle
              </div>
              <div className="text-[10px] text-[var(--text3)] mt-1 tracking-[1px] uppercase font-medium">Investment Tracker</div>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto"><NavContent collapsed={false} /></nav>
            <LogoutBtn collapsed={false} />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className={`hidden md:flex ${isCollapsed ? 'w-[70px]' : 'w-[220px]'} shrink-0 bg-[var(--bg2)] border-r border-[var(--border)] flex-col fixed top-0 left-0 h-screen z-[100] transition-all duration-300 ease-in-out`}>
        <div className="p-6 pb-4 border-b border-[var(--border)] relative">
          {!isCollapsed ? (
            <>
              <div className="font-serif text-[20px] text-[var(--text)] tracking-[-0.3px] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Bondhu Circle
              </div>
              <div className="text-[10px] text-[var(--text3)] mt-1 tracking-[1px] uppercase font-medium">Investment Tracker</div>
            </>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-serif font-bold text-sm mx-auto">B</div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-8 w-6 h-6 bg-[var(--bg2)] border border-[var(--border)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--bg3)] transition-colors z-[110]">
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto"><NavContent collapsed={isCollapsed} /></nav>
        <LogoutBtn collapsed={isCollapsed} />
      </div>
    </>
  );
};
