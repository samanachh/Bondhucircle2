import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { AppData, Withdrawal } from '../types';
import { fmt, monthNumToLabel, initials, getMemberAvailableSavings, getMemberAvailableProfit, getMemberAvailableInInv } from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';

type SourceEntry = {
  type: 'uninvested' | 'profit' | 'investment';
  id: string;
  amount: string;
};

interface WithdrawalsAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const WithdrawalsAdmin: React.FC<WithdrawalsAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const { members, withdrawals, currentMonth } = db;
  const [memberId, setMemberId] = useState<number>(members[0]?.id || 0);
  const [month, setMonth] = useState(currentMonth);
  const [sources, setSources] = useState<SourceEntry[]>([
    { type: 'uninvested', id: '', amount: '' }
  ]);
  const [note, setNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const addSource = () => {
    setSources([...sources, { type: 'uninvested', id: '', amount: '' }]);
  };

  const removeSource = (idx: number) => {
    if (sources.length > 1) {
      setSources(sources.filter((_, i) => i !== idx));
    }
  };

  const updateSource = (idx: number, field: keyof SourceEntry, value: string) => {
    const next = [...sources];
    const updated = { ...next[idx], [field]: value };
    if (field === 'type' && value !== 'investment') {
      updated.id = '';
    }
    next[idx] = updated;
    setSources(next);
  };

  const add = () => {
    if (!memberId) return toast('Select a member');
    
    const validSources = sources.filter(s => parseFloat(s.amount) > 0);
    if (validSources.length === 0) return toast('Enter at least one valid amount');

    const newWithdrawals: Withdrawal[] = validSources.map((s, i) => ({
      id: `wth-${Date.now()}-${i}`,
      memberId,
      month: Number(month),
      amount: parseFloat(s.amount),
      sourceType: s.type,
      sourceId: s.type === 'investment' ? s.id : undefined,
      note,
    }));

    setDb((p) => ({
      ...p,
      withdrawals: [...p.withdrawals, ...newWithdrawals],
    }));
    
    setSources([{ type: 'uninvested', id: '', amount: '' }]);
    setNote('');
    toast(`Withdrawal logged for ${members.find(m => m.id === memberId)?.name}`);
  };

  const remove = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDb((p) => ({
      ...p,
      withdrawals: p.withdrawals.filter((w) => w.id !== id),
    }));
    setConfirmDeleteId(null);
    toast('Withdrawal deleted');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-6">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-4 uppercase tracking-[0.5px]">
          Log Withdrawal
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
              Member
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(Number(e.target.value))}
            >
              <option value={0}>Select Member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
              Month
            </label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1px] font-bold border-b border-[var(--border)] pb-1">
            Withdrawal Sources
          </div>
          {sources.map((s, idx) => {
            let available = 0;
            if (memberId) {
              if (s.type === 'uninvested') available = getMemberAvailableSavings(memberId, db);
              else if (s.type === 'profit') available = getMemberAvailableProfit(memberId, db);
              else if (s.type === 'investment' && s.id) available = getMemberAvailableInInv(memberId, s.id, db);
            }

            return (
              <div key={idx} className="bg-[var(--bg2)] p-4 rounded-xl border border-[var(--border)] relative">
                {sources.length > 1 && (
                  <button 
                    onClick={() => removeSource(idx)}
                    className="absolute top-2 right-2 text-[var(--text3)] hover:text-[var(--red)] p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Source Type</label>
                    <select
                      value={s.type}
                      onChange={(e) => updateSource(idx, 'type', e.target.value)}
                    >
                      <option value="uninvested">Savings (Uninvested)</option>
                      <option value="profit">Earned Profit</option>
                      <option value="investment">Investment Pool</option>
                    </select>
                  </div>
                  {s.type === 'investment' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Investment</label>
                      <select
                        value={s.id}
                        onChange={(e) => updateSource(idx, 'id', e.target.value)}
                      >
                        <option value="">Select Investment</option>
                        {db.investments.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[var(--text3)] uppercase font-bold">Amount (tk)</label>
                    <input
                      type="number"
                      value={s.amount}
                      onChange={(e) => updateSource(idx, 'amount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {memberId > 0 && (
                  <div className="mt-2 text-[11px] font-medium flex items-center gap-1.5">
                    <Wallet size={12} className="text-[var(--text3)]" />
                    <span className="text-[var(--text3)]">Available:</span>
                    <span className={available > 0 ? 'text-[var(--teal)]' : 'text-[var(--red)]'}>
                      {fmt(available)} tk
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <button 
            onClick={addSource}
            className="text-[12px] font-medium text-[var(--accent)] flex items-center gap-1.5 hover:underline"
          >
            <Plus size={14} /> Add another source
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
            Reason / Note
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this withdrawal being made?"
            className="w-full"
          />
        </div>
        <button className="btn btn-primary" onClick={add}>
          <Plus size={16} /> Log Withdrawal
        </button>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-4 uppercase tracking-[0.5px]">
          Withdrawal History
        </div>
        {withdrawals.length === 0 ? (
          <div className="text-[var(--text3)] text-[13px] py-8 text-center bg-[var(--bg2)] rounded-xl border border-dashed border-[var(--border)]">
            <div className="flex flex-col items-center py-12 text-center">
            <div className="text-[40px] mb-3">💸</div>
            <div className="font-serif text-[16px] text-[var(--text)] mb-1">No withdrawals yet</div>
            <div className="text-[13px] text-[var(--text3)]">Member withdrawals will appear here once logged.</div>
          </div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...withdrawals].reverse().map((w) => {
                  const mem = members.find((m) => m.id === w.memberId);
                  const inv = w.sourceType === 'investment' ? db.investments.find(i => i.id === w.sourceId) : null;
                  return (
                    <tr key={w.id}>
                      <td className="text-[13px] font-medium">{monthNumToLabel(w.month)}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`av w-[24px] h-[24px] text-[10px] ${AV_CLASSES[w.memberId % 5]}`}>
                            {mem ? initials(mem.name) : '?'}
                          </div>
                          <span className="font-medium">{mem?.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-[12px] font-medium">
                          {w.sourceType === 'uninvested' ? 'Savings' : w.sourceType === 'profit' ? 'Profit' : `Inv: ${inv?.name || 'Deleted'}`}
                        </div>
                      </td>
                      <td className="font-bold text-[var(--red)]">-{fmt(w.amount)} tk</td>
                      <td className="text-[var(--text3)] text-[13px] italic">{w.note || '—'}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {confirmDeleteId === w.id ? (
                            <div className="flex gap-1">
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => remove(w.id)}
                              >
                                Confirm
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              onClick={() => remove(w.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};