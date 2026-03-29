import React from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { AppData } from '../types';
import { monthNumToLabel } from '../utils';

interface TopbarProps {
  page: string;
  isAdmin: boolean;
  db: AppData;
  onAdminClick: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ page, isAdmin, db, onAdminClick, onLogout }) => {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    members: 'My Profile',
    investments: 'Investments',
    'add-profit': 'Profits',
    savings: 'Monthly Savings',
    expenses: 'Expenses',
    'all-members': 'All Members',
    log: 'Transaction Log',
    setup: 'Setup',
  };

  return (
    <div className="h-16 bg-[var(--bg2)]/80 backdrop-blur-md border-b border-[var(--border)] flex items-center px-8 justify-between sticky top-0 z-50">
      <div className="flex flex-col">
        <div className="font-serif text-[16px] font-semibold text-[var(--text)]">{labels[page] || page}</div>
        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-medium">
          {monthNumToLabel(db.currentMonth)}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Admin Mode
            </div>
            <button 
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-red-400 transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onAdminClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-[12px] font-medium transition-all border border-[var(--border)] shadow-sm"
          >
            <LogIn size={14} className="text-[var(--accent)]" />
            Admin Login
          </button>
        )}
      </div>
    </div>
  );
};
