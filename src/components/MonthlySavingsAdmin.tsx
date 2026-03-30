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
  const [notifyMethod, setNotifyMethod] = useState<'whatsapp' | 'sms' | 'email'>(
    'whatsapp'
  );

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
      notifyMethod,
    }));
    setDb((p) => ({ ...p, savingsLogs: [...p.savingsLogs, ...entries] }));

    if (notifyMethod === 'whatsapp') {
      toLog.forEach((m, i) => {
        const phone = m.phone ? m.phone.replace(/\D/g, '') : null;
        const msg = encodeURIComponent(
          `Hi ${m.name}! Your savings of ${fmt(
            m.units * unitValue
          )} tk for ${monthNumToLabel(
            Number(month)
          )} have been logged. Thank you! — Bondhu Circle`
        );
        if (phone) {
          setTimeout(() => {
            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
          }, i * 600);
        }
      });
    }
    setCheckedIds({});
    toast(
      `Savings logged for ${toLog.length} member${
        toLog.length > 1 ? 's' : ''
      } · ${monthNumToLabel(month)}`
    );
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

  const notifyLabel = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };
  const notifyColor = {
    whatsapp: 'var(--accent)',
    sms: 'var(--blue)',
    email: 'var(--amber)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
              Notify via
            </label>
            <select
              value={notifyMethod}
              onChange={(e) =>
                setNotifyMethod(e.target.value as 'whatsapp' | 'sms' | 'email')
              }
              className="min-w-[200px]"
            >
              <option value="whatsapp">WhatsApp (opens chat)</option>
              <option value="sms">SMS / Text</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mb-3">
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
            {notifyMethod === 'whatsapp'
              ? 'Opens WhatsApp for each member with phone number'
              : `Will log with ${notifyLabel[notifyMethod]} method`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-4 uppercase tracking-[0.5px]">
          Savings history
        </div>
        {sortedMonths.length === 0 && (
          <div className="text-[var(--text3)] text-[13px] py-8 text-center bg-[var(--bg2)] rounded-xl border border-dashed border-[var(--border)]">
            No savings logged yet.
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
                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-[var(--bg2)] transition-colors"
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
                            <th>Notified via</th>
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
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      background: `rgba(${
                                        l.notifyMethod === 'whatsapp'
                                          ? '74,222,128'
                                          : l.notifyMethod === 'sms'
                                          ? '96,165,250'
                                          : '251,191,36'
                                      },0.12)`,
                                      color:
                                        notifyColor[l.notifyMethod] || 'var(--text2)',
                                    }}
                                  >
                                    {notifyLabel[l.notifyMethod] || l.notifyMethod}
                                  </span>
                                </td>
                                <td className="text-right">
                                  {confirmDeleteId === l.id ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        className="px-2 py-1 bg-red-500 text-white text-[10px] rounded hover:bg-red-600 transition-colors"
                                        onClick={() => deleteLog(l.id)}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        className="px-2 py-1 bg-[var(--bg3)] text-[var(--text2)] text-[10px] rounded hover:bg-[var(--border)] transition-colors"
                                        onClick={() => setConfirmDeleteId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      onClick={() => setConfirmDeleteId(l.id)}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
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
    </motion.div>
  );
};
