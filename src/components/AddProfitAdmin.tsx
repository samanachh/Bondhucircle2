import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronRight, TrendingUp } from 'lucide-react';
import { AppData, ProfitLog } from '../types';
import {
  fmt,
  f2,
  monthNumToLabel,
  totalForInv,
  profitForInv,
  initials,
  getMemberContributionToInv,
} from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';

interface AddProfitAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const AddProfitAdmin: React.FC<AddProfitAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const { investments, profitLogs, members } = db;
  const [invId, setInvId] = useState(investments[0]?.id || '');
  const [month, setMonth] = useState(db.currentMonth);
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmt, setEditAmt] = useState('');
  const [editMonth, setEditMonth] = useState(1);
  const [expandedProfitId, setExpandedProfitId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const add = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast('Enter a valid amount');
    if (!invId) return toast('Select an investment');
    const id = `pl-${Date.now()}`;
    setDb((p) => ({
      ...p,
      profitLogs: [
        ...p.profitLogs,
        { id, invId, month: Number(month), amount: amt },
      ],
    }));
    setAmount('');
    toast(
      `Profit of ${fmt(amt)} tk logged for ${
        investments.find((i) => i.id === invId)?.name
      }`
    );
  };

  const deleteProfit = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDb((p) => ({
      ...p,
      profitLogs: p.profitLogs.filter((x) => x.id !== id),
    }));
    setConfirmDeleteId(null);
    toast('Profit entry deleted');
  };

  const startEdit = (pl: ProfitLog) => {
    setEditingId(pl.id);
    setEditAmt(pl.amount.toString());
    setEditMonth(pl.month);
  };

  const saveEdit = () => {
    const amt = parseFloat(editAmt);
    if (!amt || amt <= 0) return toast('Enter valid amount');
    setDb((p) => ({
      ...p,
      profitLogs: p.profitLogs.map((x) =>
        x.id === editingId
          ? { ...x, amount: amt, month: Number(editMonth) }
          : x
      ),
    }));
    setEditingId(null);
    toast('Profit entry updated');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-5">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Log Profit Received
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Investment
            </label>
            <select
              value={invId}
              onChange={(e) => setInvId(e.target.value)}
              className="w-[180px]"
            >
              {investments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Month received
            </label>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Amount (tk)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2700"
              className="w-[130px]"
            />
          </div>
          <button className="btn btn-primary" onClick={add}>
            <Plus size={14} /> Add profit
          </button>
        </div>

        {parseFloat(amount) > 0 && invId && (
          <div className="mt-6 p-4 bg-[var(--bg3)] rounded-xl border border-[var(--accent)]/20 animate-in fade-in slide-in-from-top-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] mb-3 flex items-center gap-2">
              <TrendingUp size={14} /> Distribution Preview (৳{parseFloat(amount).toLocaleString()})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(() => {
                const inv = investments.find(i => i.id === invId);
                if (!inv) return null;
                const principal = totalForInv(inv);
                const amt = parseFloat(amount);
                
                return members.map(mem => {
                  const totalContrib = getMemberContributionToInv(mem.id, inv, investments);
                  if (totalContrib <= 0) return null;
                  const share = principal > 0 ? totalContrib / principal : 0;
                  const profitEarned = amt * share;
                  
                  return (
                    <div key={mem.id} className="bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--line)] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`av w-6 h-6 text-[10px] ${AV_CLASSES[mem.id % 5]}`}>
                          {initials(mem.name)}
                        </div>
                        <span className="text-[12px] font-medium truncate max-w-[80px]">{mem.name}</span>
                      </div>
                      <div className="text-[12px] font-bold text-[var(--accent)]">
                        ৳{Math.round(profitEarned).toLocaleString()}
                      </div>
                    </div>
                  );
                }).filter(Boolean);
              })()}
            </div>
            <div className="mt-3 text-[10px] text-[var(--text3)] italic">
              * Based on current investment principal of ৳{totalForInv(investments.find(i => i.id === invId)!).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[...investments].reverse().map((inv) => {
          const logs = profitLogs.filter((p) => p.invId === inv.id);
          const principal = totalForInv(inv);
          const totalP = logs.reduce((s, p) => s + p.amount, 0);
          const isExpanded = expandedProfitId === inv.id;

          const memberRows: any[] = [];
          members.forEach((mem) => {
            const savingAmt = inv.sources
              .filter(s => s.memberId === mem.id && s.type === 'saving')
              .reduce((s, x) => s + x.amount, 0);
            
            const totalContrib = getMemberContributionToInv(mem.id, inv, investments);
            const profitAmt = totalContrib - savingAmt;

            if (totalContrib > 0) {
              const share = principal > 0 ? totalContrib / principal : 0;
              memberRows.push({
                memberId: mem.id,
                name: mem.name,
                units: mem.units,
                savingAmt,
                profitAmt,
                totalContrib,
                share,
                profitEarned: totalP * share,
              });
            }
          });

          const totalSavingAmt = inv.sources
            .filter(s => s.type === 'saving')
            .reduce((s, x) => s + x.amount, 0);
          const totalProfitPoolAmt = inv.sources
            .filter((s) => s.type === 'profit')
            .reduce((s, x) => s + x.amount, 0);

          const profitSources = inv.sources.filter((s) => s.type === 'profit');

          const hasMixedSources = totalSavingAmt > 0 && totalProfitPoolAmt > 0;
          const isProfitOnly = totalSavingAmt === 0 && totalProfitPoolAmt > 0;

          return (
            <div key={inv.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[15px]">{inv.name}</div>
                  <div className="text-[12px] text-[var(--text3)]">
                    Principal: {fmt(principal)} tk · Started{' '}
                    {monthNumToLabel(inv.month)}
                    {isProfitOnly && (
                      <span className="badge badge-g ml-2">100% from profit</span>
                    )}
                    {hasMixedSources && (
                      <span className="badge badge-b ml-2">savings + profit</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <div className="text-[var(--accent)] font-semibold font-serif text-[20px]">
                      {fmt(totalP)} tk
                    </div>
                    <div className="text-[11px] text-[var(--text3)]">
                      total profit
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setExpandedProfitId(isExpanded ? null : inv.id)
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}{' '}
                    {isExpanded ? 'Hide' : 'Breakdown'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3.5 border-t border-[var(--border)] pt-3.5">
                  {logs.length > 0 && (
                    <div className="tbl-wrap mb-4">
                      <div className="text-[12px] text-[var(--text3)] mb-1.5 uppercase tracking-[0.5px]">
                        Profit entries
                      </div>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Amount</th>
                            <th className="w-[160px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...logs].reverse().map((p) => (
                            <tr key={p.id}>
                              {editingId === p.id ? (
                                <>
                                  <td>
                                    <MonthPicker
                                      value={editMonth}
                                      onChange={setEditMonth}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      value={editAmt}
                                      onChange={(e) => setEditAmt(e.target.value)}
                                      className="w-[110px] py-1 px-2 text-[12px]"
                                    />
                                  </td>
                                  <td>
                                    <div className="flex gap-1">
                                      <button
                                        className="btn btn-primary btn-sm"
                                        onClick={saveEdit}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEditingId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{monthNumToLabel(p.month)}</td>
                                  <td className="text-[var(--accent)] font-medium">
                                    {fmt(p.amount)} tk
                                  </td>
                                  <td>
                                    <div className="flex gap-1">
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => startEdit(p)}
                                      >
                                        <Edit2 size={14} /> Edit
                                      </button>
                                      <button
                                        className={`btn btn-sm ${confirmDeleteId === p.id ? 'btn-primary' : 'btn-danger'}`}
                                        onClick={() => deleteProfit(p.id)}
                                      >
                                        <Trash2 size={14} /> {confirmDeleteId === p.id ? 'Confirm' : 'Delete'}
                                      </button>
                                      {confirmDeleteId === p.id && (
                                        <button 
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => setConfirmDeleteId(null)}
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {totalP > 0 && memberRows.length > 0 && (
                    <>
                      <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-[0.5px]">
                        Distribution breakdown{' '}
                        {isProfitOnly
                          ? '(profit reinvestment — traced to original investors)'
                          : hasMixedSources
                          ? '(savings + reinvested profit)'
                          : ''}
                      </div>
                      <div className="tbl-wrap">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Units</th>
                              {hasMixedSources || isProfitOnly ? (
                                <>
                                  <th>From savings</th>
                                  <th>From profit</th>
                                </>
                              ) : (
                                <th>Contribution</th>
                              )}
                              <th>Total share %</th>
                              <th>Profit earned</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberRows
                              .sort((a, b) => b.totalContrib - a.totalContrib)
                              .map((r, i) => (
                                <tr key={i}>
                                  <td>
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className={`av w-[24px] h-[24px] text-[10px] ${
                                          AV_CLASSES[r.memberId % 5]
                                        }`}
                                      >
                                        {initials(r.name)}
                                      </div>
                                      {r.name}
                                    </div>
                                  </td>
                                  <td>{r.units}</td>
                                  {hasMixedSources || isProfitOnly ? (
                                    <>
                                      <td className="text-[var(--blue)] font-medium">
                                        {r.savingAmt > 0 ? (
                                          `${fmt(r.savingAmt)} tk`
                                        ) : (
                                          <span className="text-[var(--text3)]">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-[var(--accent)] font-medium">
                                        {r.profitAmt > 0 ? (
                                          `${fmt(r.profitAmt)} tk`
                                        ) : (
                                          <span className="text-[var(--text3)]">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </>
                                  ) : (
                                    <td className="font-medium">
                                      {fmt(r.totalContrib)} tk
                                    </td>
                                  )}
                                  <td>{f2(r.share * 100)}%</td>
                                  <td className="text-[var(--accent)] font-semibold">
                                    {fmt(r.profitEarned)} tk
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {(hasMixedSources || isProfitOnly) &&
                        profitSources.length > 0 && (
                          <div className="mt-2.5 text-[12px] bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)] rounded-lg p-2 px-3">
                            {profitSources.map((s, i) => {
                              const refInv = investments.find(
                                (x) => x.id === s.fromInvId
                              );
                              return (
                                <div key={i} className="text-[var(--text2)]">
                                  ↳ {fmt(s.amount)} tk profit from{' '}
                                  <strong className="text-[var(--text)]">
                                    {refInv?.name || '—'}
                                  </strong>{' '}
                                  reinvested here
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </>
                  )}

                  {totalP === 0 && (
                    <div className="text-[var(--text3)] text-[13px]">
                      No profit logged yet for this investment.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
