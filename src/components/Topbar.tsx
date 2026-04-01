import React from 'react';
import { Menu, User, Shield, UserCircle, LogOut, ChevronRight } from 'lucide-react';
import { AppData } from '../types';

interface TopbarProps {
  page: string;
  setPage: (page: string) => void;
  isAdmin: boolean;
  isMemberLoggedIn: boolean;
  isGuest: boolean;
  db: AppData;
  selectedMemberId: number | null;
  onAdminClick: () => void;
  onLogout: () => void;
  onMenuClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  page,
  setPage,
  isAdmin, 
  isMemberLoggedIn, 
  isGuest, 
  db,
  selectedMemberId,
  onAdminClick,
  onLogout,
  onMenuClick
}) => {
  const userName = db.members.find(m => m.id === selectedMemberId)?.name;

  return (
    <>
      {/* Mobile Topbar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[var(--bg2)] border-b border-[var(--border)] flex items-center justify-between px-4 z-40 md:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="p-1.5 -ml-1 rounded-lg text-[var(--text2)] hover:bg-[var(--bg3)]"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="font-serif font-bold text-[16px] text-[var(--text)]">Bondhu Circle</div>
            <div className="flex items-center text-[var(--text3)]">
              <ChevronRight size={14} />
              <span className="text-[10px] font-medium capitalize ml-1">{page.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Shield size={10} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Admin</span>
            </div>
          ) : isMemberLoggedIn ? (
            <div className="flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20">
              <User size={10} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Member</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/20">
              <UserCircle size={10} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Guest</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Topbar */}
      <div className="hidden md:flex h-14 bg-[var(--bg2)] border-b border-[var(--border)] items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--text)] capitalize">
            {page.replace('-', ' ')}
          </h2>
          {selectedMemberId && page === 'member-view' && (
            <div className="flex items-center gap-2 text-[var(--text3)] text-xs">
              <ChevronRight size={14} />
              <span>{userName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
            <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-500' : isMemberLoggedIn ? 'bg-blue-500' : 'bg-gray-400'}`} />
            <span className="text-xs font-medium text-[var(--text2)]">
              {isAdmin ? 'Admin' : isMemberLoggedIn ? 'Member' : 'Guest'}
            </span>
          </div>

          {!isAdmin && (
            <button 
              onClick={onAdminClick}
              className="p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-all"
              title="Admin Mode"
            >
              <Shield size={18} />
            </button>
          )}

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all text-xs font-medium"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
