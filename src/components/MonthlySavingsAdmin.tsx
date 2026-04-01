import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { AppData, SavingsLog } from '../types';
import {
  fmt,
  monthNumToLabel,
  activeMembersAt,
  initials,
} from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';
import { ConfirmModal } from './ConfirmModal';
import emailjs from '@emailjs/browser';

interface MonthlySavingsAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const MonthlySavingsAdmin: React.FC<MonthlySavingsAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const { members, savingsLogs, unitValue, currentMonth } = db;
  const [month, setMonth] = useState(currentMonth);
  const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({});
  const activeMems = activeMembersAt(members, month);

  const toggleCheck = (id: number) =>
    setCheckedIds((p) => ({ ...p, [id]: !p[id] }));
  const toggleAll = () => {
    const allChecked = activeMems.every((m) => checkedIds[m.id]);
    const newState: Record<number, boolean> = {};
    activeMems.forEach((m) => {
      newState[m.id] = !allChecked;
    });
    setCheckedIds(newState);
  };

  const logSavings = () => {
    const toLog = activeMems.filter((m) => checkedIds[m.id]);
    if (!toLog.length) return toast('Select at least one member');
    const entries: SavingsLog[] = toLog.map((m) => ({
      id: `sv-${Date.now()}-${m.id}`,
      memberId: m.id,
      month: Number(month),
      amount: m.units * unitValue,
    }));
    setDb((p) => ({ ...p, savingsLogs: [...p.savingsLogs, ...entries] }));

    // Send emails
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      toLog.forEach((m) => {
        if (m.email) {
          emailjs.send(
            serviceId,
            templateId,
            {
              to_name: m.name,
              to_email: m.email,
              month_label: monthNumToLabel(Number(month)),
              amount: fmt(m.units * unitValue),
            },
            publicKey
          ).catch(err => console.error('Failed to send email:', err));
        }
      });
      toast(`Savings logged & notifications sent!`);
    } else {
      toast(`Savings logged. (Add EmailJS keys in .env.local for automatic emails)`);
    }

    setCheckedIds({});
  };

  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleMonth = (mn: number) => {
    setExpandedMonths(p => ({ ...p, [mn]: !p[mn] }));
  };

  const deleteLog = (id: string) => {
    setDb((p) => ({
      ...p,
      savingsLogs: p.savingsLogs.filter((x) => x.id !== id),
    }));
    setConfirmDeleteId(null);
    toast('Savings log removed');
  };

  const logsByMonth: Record<number, SavingsLog[]> = {};
  savingsLogs.forEach((s) => {
    if (!logsByMonth[s.month]) logsByMonth[s.month] = [];
    logsByMonth[s.month].push(s);
  });
  const sortedMonths = Object.keys(logsByMonth)
    .map(Number)
    .sort((a, b) => b - a);

    return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="text-[13px] font-medium text-[var(--text2)] uppercase tracking-[0.5px]">
            Savings Checklist: {monthNumToLabel(month)}
          </div>
          <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-green-500">
              <CheckCircle2 size={14} /> Paid: {activeMems.filter(m => savingsLogs.some(s => s.memberId === m.id && s.month === Number(month))).length}
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle size={14} /> Pending: {activeMems.filter(m => !savingsLogs.some(s => s.memberId === m.id && s.month === Number(month))).length}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {activeMems.map(m => {
            const isPaid = savingsLogs.some(s => s.memberId === m.id && s.month === Number(month));
            return (
              <div 
                key={m.id} 
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${isPaid ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
              >
                <div className={`av w-10 h-10 text-xs ${AV_CLASSES[m.id % 5]}`}>
                  {initials(m.name)}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[var(--text)] line-clamp-1">{m.name}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight ${isPaid ? 'text-green-500' : 'text-red-500'}`}>
                    {isPaid ? 'Confirmed' : 'Pending'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-6">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Log Monthly Savings
        </div>
        <div className="text-[12px] text-[var(--text3)] mb-4">
          Add phone numbers in Setup → Member Roster for WhatsApp notifications to
          work directly.
        </div>
        <div className="flex gap-4 flex-wrap items-end mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
              Month
            </label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
          <div className="text-[12px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
            Members
          </div>
          <button className="text-[12px] text-[var(--accent)] font-medium hover:underline" onClick={toggleAll}>
            {activeMems.every((m) => checkedIds[m.id])
              ? 'Deselect all'
              : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {activeMems.map((m) => {
            const alreadyLogged = savingsLogs.some(
              (s) => s.memberId === m.id && s.month === Number(month)
            );
            const sel = !!checkedIds[m.id];
            const avCls = AV_CLASSES[m.id % 5];
            return (
              <div
                key={m.id}
                onClick={() => !alreadyLogged && toggleCheck(m.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  alreadyLogged ? 'opacity-40 cursor-not-allowed bg-[var(--bg2)]' : 'hover:border-[var(--accent)]'
                } ${sel ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.05)]' : 'border-[var(--border)] bg-[var(--bg3)]'}`}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => {}}
                  disabled={alreadyLogged}
                  className="w-4 h-4 accent-[var(--accent)] shrink-0"
                />
                <div
                  className={`av w-[32px] h-[32px] text-[12px] ${avCls}`}
                >
                  {initials(m.name)}
                </div>
                <div className="flex-1 text-[13px]">
                  <div className="font-bold text-[var(--text)]">{m.name}</div>
                  <div className="text-[var(--text3)] text-[11px]">
                    {m.units} unit{m.units > 1 ? 's' : ''} {alreadyLogged && '· logged'}
                  </div>
                </div>
                <div className="text-[13px] font-bold text-[var(--blue)]">
                  {fmt(m.units * unitValue)} tk
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3 items-center">
          <button className="btn btn-primary px-6" onClick={logSavings}>
            <Plus size={16} /> Log &amp; notify
          </button>
          <div className="text-[12px] text-[var(--text3)] italic">
            Automated confirmation emails will be sent out via EmailJS if configured.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-4 uppercase tracking-[0.5px]">
          Savings history
        </div>
        {sortedMonths.length === 0 && (
          <div className="text-[var(--text3)] text-[13px] py-8 text-center bg-[var(--bg2)] rounded-xl border border-dashed border-[var(--border)]">
            <div className="flex flex-col items-center py-12 text-center">
            <div className="text-[40px] mb-3">💰</div>
            <div className="font-serif text-[16px] text-[var(--text)] mb-1">No savings logged yet</div>
            <div className="text-[13px] text-[var(--text3)]">Log savings for members above to see history here.</div>
          </div>
          </div>
        )}
        <div className="space-y-3">
          {sortedMonths.map((mn) => {
            const logs = logsByMonth[mn];
            const monthTotal = logs.reduce((s, l) => s + l.amount, 0);
            const isExpanded = !!expandedMonths[mn];
            return (
              <div key={mn} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg3)]">
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 gap-3 cursor-pointer hover:bg-[var(--bg2)] transition-colors"
                  onClick={() => toggleMonth(mn)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-[var(--accent)]' : 'bg-[var(--text3)]'}`} />
                    <div className="font-bold text-[15px]">
                      {monthNumToLabel(mn)}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <div className="text-[14px] font-bold text-[var(--blue)]">
                        {fmt(monthTotal)} tk
                      </div>
                      <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                        {logs.length} members
                      </div>
                    </div>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[var(--border)]">
                    <div className="tbl-wrap mt-4">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Amount</th>
                            <th className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((l) => {
                            const mem = members.find((x) => x.id === l.memberId);
                            return (
                              <tr key={l.id}>
                                <td>
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`av w-[24px] h-[24px] text-[10px] ${
                                        AV_CLASSES[l.memberId % 5]
                                      }`}
                                    >
                                      {mem ? initials(mem.name) : '?'}
                                    </div>
                                    <span className="font-medium">{mem?.name}</span>
                                  </div>
                                </td>
                                <td className="font-bold text-[var(--blue)]">
                                  {fmt(l.amount)} tk
                                </td>
                                <td className="text-right">
                                    <button
                                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      onClick={() => setConfirmDeleteId(l.id)}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Savings Log"
        message="Are you sure you want to delete this savings record?"
        onConfirm={() => confirmDeleteId && deleteLog(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </motion.div>
  );
};