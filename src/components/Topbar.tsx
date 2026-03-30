import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, ShieldCheck, Search, User, TrendingUp, Receipt } from 'lucide-react';
import { AppData } from '../types';
import { monthNumToLabel } from '../utils';

interface TopbarProps {
  page: string;
  setPage: (page: string) => void;
  isAdmin: boolean;
  isMemberLoggedIn: boolean;
  isGuest: boolean;
  db: AppData;
  onAdminClick: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ page, setPage, isAdmin, isMemberLoggedIn, isGuest, db, onAdminClick, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search Members
    Object.entries(db.members || {}).forEach(([id, m]: [string, any]) => {
      if (m.name.toLowerCase().includes(query)) {
        results.push({ id, type: 'member', name: m.name, icon: User, page: 'all-members' });
      }
    });

    // Search Investments
    Object.entries(db.investments || {}).forEach(([id, inv]: [string, any]) => {
      if (inv.name.toLowerCase().includes(query)) {
        results.push({ id, type: 'investment', name: inv.name, icon: TrendingUp, page: 'investments' });
      }
    });

    // Search Expenses
    Object.entries(db.expenses || {}).forEach(([id, exp]: [string, any]) => {
      if (exp.category.toLowerCase().includes(query)) {
        results.push({ id, type: 'expense', name: exp.category, icon: Receipt, page: 'expenses' });
      }
    });

    setSearchResults(results.slice(0, 8));
    setShowResults(true);
  }, [searchQuery, db]);
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    members: 'My Profile',
    investments: 'Investments',
    'add-profit': 'Profits',
    savings: 'Monthly Savings',
    expenses: 'Expenses',
    'all-members': 'All Members',
    deposits: isAdmin ? 'Approve Deposits' : 'Deposit Proof',
    log: 'Transaction Log',
    report: 'Monthly Report',
    analytics: 'Analytics',
    setup: 'Setup',
  };

  return (
    <div className="h-16 bg-[var(--bg2)]/80 backdrop-blur-md border-b border-[var(--border)] flex items-center px-8 justify-between sticky top-0 z-50">
      <div className="flex flex-col">
        <div className="font-serif text-[16px] font-semibold text-[var(--text)] uppercase tracking-tight">{labels[page] || page}</div>
        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-medium">
          {monthNumToLabel(db.currentMonth)}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isAdmin && (
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
              <input
                type="text"
                placeholder="Search members, investments..."
                className="w-64 bg-[var(--bg3)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs focus:w-80 transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowResults(true)}
              />
            </div>
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg2)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text3)] font-bold">
                  Search Results
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((res, idx) => (
                    <button
                      key={`${res.type}-${res.id}-${idx}`}
                      className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg3)] transition-colors text-left border-none"
                      onClick={() => {
                        setPage(res.page);
                        setSearchQuery('');
                        setShowResults(false);
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg3)] flex items-center justify-center text-[var(--accent)]">
                        <res.icon size={16} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[var(--text)]">{res.name}</div>
                        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{res.type}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Admin Mode
            </div>
          </div>
        ) : isMemberLoggedIn ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--blue)]/10 border border-[var(--blue)]/20 text-[var(--blue)] text-[11px] font-bold uppercase tracking-wider">
            Member View
          </div>
        ) : isGuest ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--text3)]/10 border border-[var(--text3)]/20 text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">
            Guest Preview
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
