import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { AppData } from '../types';
import {
  fmt,
  f2,
  monthNumToLabel,
  memberSavingsToMonth,
  memberProfitEarned,
  memberExpenseShare,
  memberLoggedSavings,
  totalUnitsAt,
  initials,
} from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';

interface AllMembersAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const AllMembersAdmin: React.FC<AllMembersAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const {
    members,
    investments,
    profitLogs,
    expenses,
    unitValue,
    currentMonth,
  } = db;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const remove = (id: number) => {
    if (investments.some((inv) => inv.sources.some((s) => s.memberId === id))) {
      setConfirmDeleteId(null);
      return toast('Cannot remove: member is in an investment');
    }
    setDb((p) => ({ ...p, members: p.members.filter((m) => m.id !== id) }));
    setConfirmDeleteId(null);
    toast('Member removed');
  };

  const tu = totalUnitsAt(members, viewMonth);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="flex gap-3 items-end mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
            View at month
          </label>
          <MonthPicker value={viewMonth} onChange={setViewMonth} />
        </div>
      </div>
      <div 
        className="grid gap-3 mb-5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {members.map((m) => {
          const isActive = m.joinMonth <= viewMonth;
          const share = isActive && tu > 0 ? (m.units / tu) * 100 : 0;
          const saved = isActive ? memberSavingsToMonth(m, viewMonth, unitValue) : 0;
          const profitEarned = memberProfitEarned(m.id, investments, profitLogs);
          const expShare = memberExpenseShare(m.id, expenses, members);
          const gross = saved + profitEarned;
          const confirmed = memberLoggedSavings(m.id, db.savingsLogs);
          const avCls = AV_CLASSES[m.id % 5];

          const updatePin = (newPin: string) => {
            if (newPin.length > 4) return;
            setDb(p => ({
              ...p,
              members: p.members.map(mem => mem.id === m.id ? { ...mem, pin: newPin } : mem)
            }));
          };

          return (
            <div
              key={m.id}
              className="card p-4 hover:border-[var(--border2)] transition-colors"
              style={{ opacity: isActive ? 1 : 0.5 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`av ${avCls}`}>{initials(m.name)}</div>
                <div className="flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-[12px] text-[var(--text3)]">
                    {m.units} unit{m.units > 1 ? 's' : ''} · Joined{' '}
                    {monthNumToLabel(m.joinMonth)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${isActive ? 'badge-g' : 'badge-r'}`}>
                    {isActive ? 'Active' : 'Pending'}
                  </span>
                  {confirmDeleteId === m.id ? (
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => remove(m.id)}
                        className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="bg-[var(--bg3)] text-[var(--text2)] text-[10px] px-2 py-0.5 rounded font-bold border border-[var(--border)]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteId(m.id)}
                      className="text-red-400 hover:text-red-500 p-1 transition-colors mt-1"
                      title="Remove Member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-[12px] mb-2.5">
                <div>
                  <div className="text-[var(--text3)]">Share</div>
                  <div className="font-medium text-[var(--purple)]">
                    {isActive ? f2(share) + '%' : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text3)]">Saved</div>
                  <div className="font-medium">{fmt(saved)} tk</div>
                </div>
                <div>
                  <div className="text-[var(--text3)]">Confirmed</div>
                  <div className="font-medium text-[var(--teal)]">
                    {fmt(confirmed)} tk
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text3)]">Profit</div>
                  <div className="font-medium text-[var(--accent)]">
                    {fmt(profitEarned)} tk
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text3)]">Gross</div>
                  <div className="font-semibold text-[var(--blue)]">
                    {fmt(gross)} tk
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
