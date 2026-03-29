import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit2, ChevronUp, ChevronRight } from 'lucide-react';
import { AppData, Investment, InvestmentSource } from '../types';
import {
  fmt,
  f2,
  monthNumToLabel,
  totalForInv,
  profitForInv,
  activeMembersAt,
  memberSavingsToMonth,
  memberDepositedToInvestments,
  initials,
  getMemberContributionToInv,
} from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';

interface InvestmentsAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

interface ProfitSourceInput {
  invId: string;
  amount: string;
}

interface WizardState {
  step: number;
  name: string;
  invMonth: number;
  totalAmt: string;
  useProfit: boolean | null;
  profitSources: ProfitSourceInput[];
  selectedMemberIds: Record<number, boolean>;
  memberAmts: Record<number, string>;
  editingInv: {
    id: string;
    name: string;
    month: number;
    srcMap: Record<number, string>;
  } | null;
}

export const InvestmentsAdmin: React.FC<InvestmentsAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const { members, investments, profitLogs, unitValue, currentMonth } = db;

  const INIT_WIZ: WizardState = {
    step: 0,
    name: '',
    invMonth: currentMonth,
    totalAmt: '',
    useProfit: null,
    profitSources: [{ invId: '', amount: '' }],
    selectedMemberIds: {},
    memberAmts: {},
    editingInv: null,
  };

  const [wiz, setWiz] = useState<WizardState>(INIT_WIZ);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const setW = (patch: Partial<WizardState>) =>
    setWiz((p) => ({ ...p, ...patch }));

  const activeMems = activeMembersAt(members, currentMonth);
  
  // Calculate available profit in each pool
  const profitPools: Record<string, number> = {};
  profitLogs.forEach((p) => {
    if (!profitPools[p.invId]) profitPools[p.invId] = 0;
    profitPools[p.invId] += p.amount;
  });
  // Subtract reinvested profit
  investments.forEach(inv => {
    inv.sources.forEach(src => {
      if (src.type === 'profit' && src.fromInvId) {
        if (!profitPools[src.fromInvId]) profitPools[src.fromInvId] = 0;
        profitPools[src.fromInvId] -= src.amount;
      }
    });
  });

  const profitPoolEntries = Object.entries(profitPools).filter(
    ([, v]) => v > 0
  );

  const totalAmt = parseFloat(wiz.totalAmt) || 0;
  const totalProfitFromSources = wiz.useProfit 
    ? wiz.profitSources.reduce((s, ps) => s + (parseFloat(ps.amount) || 0), 0)
    : 0;
  
  const savingsNeeded = Math.max(0, totalAmt - totalProfitFromSources);
  const memberTotal = (Object.values(wiz.memberAmts) as string[]).reduce(
    (s: number, v: string) => s + (parseFloat(v) || 0),
    0
  );

  const autoDistribute = (
    total: number,
    pa: number,
    selIds: Record<number, boolean>
  ) => {
    const remaining = Math.max(0, total - pa);
    const sel = activeMems.filter((m) => selIds[m.id]);
    const tu = sel.reduce((s, m) => s + m.units, 0);
    const amts: Record<number, string> = {};
    sel.forEach((m) => {
      amts[m.id] = (tu > 0 ? (remaining * m.units) / tu : 0).toString();
    });
    return amts;
  };

  const applyAutoDistribute = (pa?: number) => {
    const selIds: Record<number, boolean> = {};
    activeMems.forEach((m) => {
      selIds[m.id] = true;
    });
    const amts = autoDistribute(
      totalAmt,
      pa !== undefined ? pa : totalProfitFromSources,
      selIds
    );
    setWiz((p) => ({ ...p, selectedMemberIds: selIds, memberAmts: amts }));
  };

  const goStep1 = () => {
    if (!wiz.name.trim()) return toast('Enter a name');
    if (totalAmt <= 0) return toast('Enter a valid amount');
    if (profitPoolEntries.length === 0) {
      applyAutoDistribute(0);
      setWiz((p) => ({ ...p, step: 3, useProfit: false }));
    } else setW({ step: 1 });
  };

  const goStep2Yes = () =>
    setW({
      step: 2,
      useProfit: true,
      profitSources: [{ invId: profitPoolEntries[0]?.[0] || '', amount: '' }],
    });
  const goStep2No = () => {
    applyAutoDistribute(0);
    setWiz((p) => ({ ...p, step: 3, useProfit: false, profitSources: [] }));
  };

  const goStep3 = () => {
    applyAutoDistribute(totalProfitFromSources);
    setW({ step: 3 });
  };

  const toggleMember = (id: number) => {
    setWiz((p) => {
      const newSel = { ...p.selectedMemberIds, [id]: !p.selectedMemberIds[id] };
      const pa = p.useProfit ? totalProfitFromSources : 0;
      return {
        ...p,
        selectedMemberIds: newSel,
        memberAmts: autoDistribute(totalAmt, pa, newSel),
      };
    });
  };

  const create = () => {
    const sources: InvestmentSource[] = [];
    if (wiz.useProfit) {
      wiz.profitSources.forEach(ps => {
        const amt = parseFloat(ps.amount) || 0;
        if (amt > 0 && ps.invId) {
          sources.push({
            type: 'profit',
            fromInvId: ps.invId,
            memberId: null,
            amount: amt,
          });
        }
      });
    }
    activeMems.forEach((m) => {
      if (wiz.selectedMemberIds[m.id]) {
        const amt = parseFloat(wiz.memberAmts[m.id]) || 0;
        if (amt > 0) sources.push({ type: 'saving', memberId: m.id, amount: amt });
      }
    });
    if (!sources.length) return toast('Select at least one source');
    const inv: Investment = {
      id: `inv-${db.nextInvId}`,
      name: wiz.name.trim(),
      month: Number(wiz.invMonth),
      rate: 0,
      sources,
    };
    setDb((p) => ({
      ...p,
      investments: [...p.investments, inv],
      nextInvId: p.nextInvId + 1,
    }));
    setWiz(INIT_WIZ);
    toast(`Investment "${wiz.name}" created · ${fmt(totalAmt)} tk`);
  };

  const deleteInv = (id: string) => {
    if (profitLogs.some((p) => p.invId === id))
      return toast('Cannot delete: has profit entries. Delete profits first.');
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDb((p) => ({
      ...p,
      investments: p.investments.filter((i) => i.id !== id),
    }));
    setConfirmDeleteId(null);
    toast('Investment deleted');
  };

  const startEditInv = (inv: Investment) => {
    const srcMap: Record<number, string> = {};
    inv.sources.forEach((s) => {
      if (s.memberId !== null) srcMap[s.memberId] = s.amount.toString();
    });
    setW({
      editingInv: { id: inv.id, name: inv.name, month: inv.month, srcMap },
    });
  };

  const saveEditInv = () => {
    const ei = wiz.editingInv;
    if (!ei) return;
    if (!ei.name.trim()) return toast('Name cannot be empty');
    setDb((p) => ({
      ...p,
      investments: p.investments.map((i) => {
        if (i.id !== ei.id) return i;
        const newSrc = i.sources.map((s) => {
          if (s.memberId === null) return s;
          const ed = ei.srcMap[s.memberId];
          return ed !== undefined
            ? { ...s, amount: parseFloat(ed) || s.amount }
            : s;
        });
        return { ...i, name: ei.name, month: ei.month, sources: newSrc };
      }),
    }));
    setW({ editingInv: null });
    toast('Investment updated');
  };

  const stepLabels = ['Details', 'Add profit?', 'Profit pool', 'Members'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-5">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[13px] font-medium text-[var(--text2)] uppercase tracking-[0.5px]">
            Create New Investment
          </div>
          <div className="flex gap-1">
            {stepLabels.map((l, i) => (
              <span
                key={i}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  wiz.step === i
                    ? 'bg-[var(--accent)] text-[var(--bg)]'
                    : wiz.step > i
                    ? 'bg-[rgba(74,222,128,0.18)] text-[var(--accent)]'
                    : 'bg-[var(--bg3)] text-[var(--text3)]'
                }`}
              >
                {i + 1}. {l}
              </span>
            ))}
          </div>
        </div>

        {wiz.step === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                  Investment name
                </label>
                <input
                  value={wiz.name}
                  onChange={(e) => setW({ name: e.target.value })}
                  placeholder="e.g. Business B"
                  className="w-[200px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                  Investment amount (tk)
                </label>
                <input
                  type="number"
                  value={wiz.totalAmt}
                  onChange={(e) => setW({ totalAmt: e.target.value })}
                  placeholder="e.g. 10000"
                  className="w-[140px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                  Month started
                </label>
                <MonthPicker
                  value={wiz.invMonth}
                  onChange={(v) => setW({ invMonth: v })}
                />
              </div>
            </div>
            {totalAmt > 0 && (
              <div className="bg-[var(--bg3)] rounded-lg p-3.5 text-[13px] text-[var(--text2)]">
                <strong className="text-[var(--accent)]">{fmt(totalAmt)} tk</strong>{' '}
                to distribute among {activeMems.length} active members
              </div>
            )}
            <button className="btn btn-primary" onClick={goStep1}>
              Next →
            </button>
          </div>
        )}

        {wiz.step === 1 && (
          <div className="space-y-4">
            <div className="text-[14px]">
              Include profit from a previous investment in{' '}
              <strong className="text-[var(--accent)]">{wiz.name}</strong> ({fmt(totalAmt)} tk)?
            </div>
            <div className="flex gap-2.5">
              <button className="btn btn-primary" onClick={goStep2Yes}>
                Yes, add profit →
              </button>
              <button className="btn btn-secondary" onClick={goStep2No}>
                No, savings only →
              </button>
              <button className="btn btn-secondary" onClick={() => setW({ step: 0 })}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {wiz.step === 2 && (
          <div className="space-y-4">
            <div className="text-[14px] font-medium text-[var(--text)]">
              Which profit pool and how much to include?
            </div>
            <div className="space-y-4">
              {wiz.profitSources.map((ps, idx) => (
                <div key={idx} className="flex gap-3 flex-wrap items-end bg-[var(--bg3)] p-4 rounded-xl border border-[var(--border)] relative">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
                      Profit pool {idx + 1}
                    </label>
                    <select
                      value={ps.invId}
                      onChange={(e) => {
                        const newSources = [...wiz.profitSources];
                        newSources[idx].invId = e.target.value;
                        setW({ profitSources: newSources });
                      }}
                      className="w-full"
                    >
                      <option value="">Select a pool</option>
                      {profitPoolEntries.map(([id, amt]) => {
                        const inv = investments.find((i) => i.id === id);
                        return (
                          <option key={id} value={id}>
                            {inv?.name || id} — {fmt(amt)} tk available
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 w-[140px]">
                    <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px] font-bold">
                      Amount (tk)
                    </label>
                    <input
                      type="number"
                      value={ps.amount}
                      onChange={(e) => {
                        const newSources = [...wiz.profitSources];
                        newSources[idx].amount = e.target.value;
                        setW({ profitSources: newSources });
                      }}
                      max={profitPools[ps.invId] || 0}
                      placeholder="Amount"
                      className="w-full"
                    />
                  </div>
                  {wiz.profitSources.length > 1 && (
                    <button 
                      onClick={() => {
                        const newSources = wiz.profitSources.filter((_, i) => i !== idx);
                        setW({ profitSources: newSources });
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {totalProfitFromSources < totalAmt && (
              <button 
                onClick={() => setW({ profitSources: [...wiz.profitSources, { invId: '', amount: '' }] })}
                className="flex items-center gap-2 text-[13px] text-[var(--accent)] font-medium hover:underline"
              >
                <Plus size={14} /> Add more profit pool
              </button>
            )}

            <div className="bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.2)] rounded-xl p-4 text-[13px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--text3)]">Total profit to reinvest:</span>
                <span className="font-bold text-[var(--accent)]">{fmt(totalProfitFromSources)} tk</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text3)]">Remaining from savings:</span>
                <span className="font-bold text-[var(--text)]">{fmt(savingsNeeded)} tk</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button className="btn btn-primary" onClick={goStep3}>
                Next →
              </button>
              <button className="btn btn-secondary" onClick={() => setW({ step: 1 })}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {wiz.step === 3 && (
          <div className="space-y-4">
            <div className="text-[13px] text-[var(--text3)]">
              Savings to distribute:{' '}
              <strong className="text-[var(--text)]">{fmt(savingsNeeded)} tk</strong>{' '}
              — auto-split by units. Select which members participate.
            </div>
            <div className="space-y-1.5">
              {activeMems.map((m) => {
                const sel = !!wiz.selectedMemberIds[m.id];
                const avail = (() => {
                  const saved = memberSavingsToMonth(m, currentMonth, unitValue);
                  const dep = memberDepositedToInvestments(m.id, investments);
                  return Math.max(0, saved - dep);
                })();
                const autoAmt = sel ? parseFloat(wiz.memberAmts[m.id] || '0') : 0;
                const avCls = AV_CLASSES[m.id % 5];
                return (
                  <div
                    key={m.id}
                    className={`source-item ${sel ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.05)]' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleMember(m.id)}
                      className="w-4 h-4 accent-[var(--accent)] shrink-0"
                    />
                    <div
                      className={`av w-[26px] h-[26px] text-[10px] ${avCls}`}
                    >
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 text-[13px]">
                      <span className="font-medium">{m.name}</span>{' '}
                      <span className="text-[var(--text3)]">
                        · {m.units} unit{m.units > 1 ? 's' : ''} · avail {fmt(avail)} tk
                      </span>
                    </div>
                    <div className={`text-[13px] font-semibold min-w-[80px] text-right ${sel ? 'text-[var(--accent)]' : 'text-[var(--text3)]'}`}>
                      {sel ? `${fmt(autoAmt)} tk` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
            {wiz.useProfit && totalProfitFromSources > 0 && (
              <div className="bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.15)] rounded-lg p-2 px-3 text-[13px]">
                + {fmt(totalProfitFromSources)} tk profit from sources
              </div>
            )}
            <div className="text-[13px] text-[var(--text2)]">
              Total:{' '}
              <strong className="text-[var(--accent)]">
                {fmt(memberTotal + totalProfitFromSources)} tk
              </strong>
            </div>
            <div className="flex gap-2.5">
              <button className="btn btn-primary" onClick={create}>
                <Plus size={14} /> Create investment
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setW({ step: wiz.useProfit === false ? 1 : 2 })}
              >
                ← Back
              </button>
              <button className="btn btn-secondary" onClick={() => setWiz(INIT_WIZ)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          All Investments
        </div>
        {investments.length === 0 && (
          <div className="text-[var(--text3)] text-[13px]">No investments yet.</div>
        )}
        <div className="space-y-3">
          {[...investments].reverse().map((inv) => {
            const principal = totalForInv(inv);
            const profit = profitForInv(inv.id, profitLogs);
            const isEditing = wiz.editingInv?.id === inv.id;
            const isExpanded = expandedId === inv.id;

            const profitBreakdown: any[] = [];
            members.forEach((mem) => {
              const contrib = getMemberContributionToInv(mem.id, inv, investments);
              if (contrib > 0) {
                const share = principal > 0 ? contrib / principal : 0;
                
                // Calculate source breakdown for this member
                let savingsContrib = 0;
                let profitContrib = 0;
                inv.sources.forEach(src => {
                  if (src.memberId === mem.id && src.type === 'saving') {
                    savingsContrib += src.amount;
                  } else if (src.type === 'profit' && src.fromInvId) {
                    const refInv = investments.find(i => i.id === src.fromInvId);
                    if (refInv) {
                      const refTotal = totalForInv(refInv);
                      if (refTotal > 0) {
                        const memberShareInRef = getMemberContributionToInv(mem.id, refInv, investments) / refTotal;
                        profitContrib += src.amount * memberShareInRef;
                      }
                    }
                  }
                });

                profitBreakdown.push({
                  id: mem.id,
                  name: mem.name,
                  units: mem.units,
                  contribution: contrib,
                  savingsContrib,
                  profitContrib,
                  share,
                  profitShare: profit * share,
                });
              }
            });

            return (
              <div
                key={inv.id}
                className="bg-[var(--bg3)] border border-[var(--border)] rounded-[var(--radius)] p-4"
              >
                <div className={`flex items-center justify-between ${isEditing || isExpanded ? 'mb-3' : ''}`}>
                  <div className="flex-1">
                    {isEditing && wiz.editingInv ? (
                      <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap mb-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                              Name
                            </label>
                            <input
                              value={wiz.editingInv.name}
                              onChange={(e) =>
                                setW({
                                  editingInv: {
                                    ...wiz.editingInv!,
                                    name: e.target.value,
                                  },
                                })
                              }
                              className="w-[170px] py-1 px-2 text-[13px]"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                              Month
                            </label>
                            <MonthPicker
                              value={wiz.editingInv.month}
                              onChange={(v) =>
                                setW({
                                  editingInv: { ...wiz.editingInv!, month: v },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="text-[12px] text-[var(--text3)] mb-1.5 uppercase tracking-[0.5px]">
                          Edit contribution amounts
                        </div>
                        <div className="space-y-1.5">
                          {inv.sources
                            .filter((s) => s.memberId !== null)
                            .map((src) => {
                              const mem = members.find((x) => x.id === src.memberId);
                              return (
                                <div
                                  key={src.memberId}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className={`av w-[22px] h-[22px] text-[10px] ${
                                      AV_CLASSES[(src.memberId || 0) % 5]
                                    }`}
                                  >
                                    {mem ? initials(mem.name) : '?'}
                                  </div>
                                  <span className="w-20 text-[13px]">
                                    {mem?.name}
                                  </span>
                                  <input
                                    type="number"
                                    value={
                                      wiz.editingInv!.srcMap[src.memberId!] !==
                                      undefined
                                        ? wiz.editingInv!.srcMap[src.memberId!]
                                        : src.amount
                                    }
                                    onChange={(e) =>
                                      setW({
                                        editingInv: {
                                          ...wiz.editingInv!,
                                          srcMap: {
                                            ...wiz.editingInv!.srcMap,
                                            [src.memberId!]: e.target.value,
                                          },
                                        },
                                      })
                                    }
                                    className="w-[110px] py-1 px-2 text-[12px]"
                                  />
                                  <span className="text-[var(--text3)] text-[12px]">
                                    tk
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="flex gap-1.5 mt-2.5">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={saveEditInv}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setW({ editingInv: null })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-[15px]">{inv.name}</div>
                        <div className="text-[12px] text-[var(--text3)]">
                          Started {monthNumToLabel(inv.month)} ·{' '}
                          <strong className="text-[var(--text)]">
                            {fmt(principal)} tk
                          </strong>{' '}
                          principal
                        </div>
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-right">
                        <div className="text-[var(--accent)] font-semibold text-[16px]">
                          {fmt(profit)} tk
                        </div>
                        <div className="text-[11px] text-[var(--text3)]">
                          profit logged
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : inv.id)
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}{' '}
                          {isExpanded ? 'Hide' : 'Breakdown'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEditInv(inv)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          className={`btn btn-sm ${confirmDeleteId === inv.id ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => deleteInv(inv.id)}
                        >
                          <Trash2 size={14} /> {confirmDeleteId === inv.id ? 'Click to Confirm' : 'Delete'}
                        </button>
                        {confirmDeleteId === inv.id && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isExpanded && !isEditing && (
                  <div className="border-t border-[var(--border)] pt-3 mt-3">
                    <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-[0.5px]">
                      Contribution & profit breakdown
                    </div>
                    <div className="tbl-wrap">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Units</th>
                            <th>Contribution</th>
                            <th>Share %</th>
                            <th>Profit earned</th>
                            <th>Source Breakdown</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profitBreakdown.map((r, i) => (
                            <tr key={i}>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`av w-[22px] h-[22px] text-[10px] ${
                                      AV_CLASSES[(r.id || 0) % 5]
                                    }`}
                                  >
                                    {initials(r.name)}
                                  </div>
                                  {r.name}
                                </div>
                              </td>
                              <td>{r.units}</td>
                              <td className="font-medium">{fmt(r.contribution)} tk</td>
                              <td>{f2(r.share * 100)}%</td>
                              <td className="text-[var(--accent)] font-medium">
                                {fmt(r.profitShare)} tk
                              </td>
                              <td>
                                <div className="flex flex-col gap-0.5 min-w-[120px]">
                                  {r.savingsContrib > 0 && (
                                    <div className="flex justify-between gap-2 text-[10px]">
                                      <span className="text-[var(--text3)]">Savings:</span>
                                      <span className="font-medium text-[var(--text2)]">{fmt(r.savingsContrib)} tk</span>
                                    </div>
                                  )}
                                  {r.profitContrib > 0 && (
                                    <div className="flex justify-between gap-2 text-[10px]">
                                      <span className="text-[var(--text3)]">Reinvested:</span>
                                      <span className="font-medium text-[var(--text2)]">{fmt(r.profitContrib)} tk</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {inv.sources.some((s) => s.type === 'profit') && (
                      <div className="mt-2.5 text-[12px] bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)] rounded-lg p-2 px-3">
                        {inv.sources
                          .filter((s) => s.type === 'profit')
                          .map((s, i) => {
                            const refInv = investments.find(
                              (x) => x.id === s.fromInvId
                            );
                            const refTotal = refInv ? totalForInv(refInv) : 0;
                            return (
                              <div key={i}>
                                <div className="font-medium mb-1">
                                  Profit reinvested from {refInv?.name}:{' '}
                                  {fmt(s.amount)} tk
                                </div>
                                {refInv && members.map((m) => {
                                  const mContrib = getMemberContributionToInv(m.id, refInv, investments);
                                  const mShare = refTotal > 0 ? mContrib / refTotal : 0;
                                  if (mShare <= 0) return null;
                                  return (
                                    <div
                                      key={m.id}
                                      className="text-[var(--text2)] ml-3 mb-0.5"
                                    >
                                      {m.name}: {fmt(s.amount * mShare)} tk ({f2(
                                        mShare * 100
                                      )}%)
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                      </div>
                    )}
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
