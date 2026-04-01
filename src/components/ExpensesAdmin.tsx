import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { AppData, Expense } from '../types';
import {
  fmt,
  f2,
  monthNumToLabel,
  totalExpenses,
  memberExpenseShare,
  activeMembersAt,
  initials,
} from '../utils';
import { EXPENSE_CATS, CAT_COLORS, AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';

interface ExpensesAdminProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const ExpensesAdmin: React.FC<ExpensesAdminProps> = ({
  db,
  setDb,
  toast,
}) => {
  const { members, expenses, currentMonth } = db;
  const [cat, setCat] = useState(EXPENSE_CATS[0]);
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<{
    cat: string;
    month: number;
    amount: string;
    desc: string;
  }>({ cat: '', month: 1, amount: '', desc: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const add = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast('Enter valid amount');
    const exp: Expense = {
      id: `exp-${db.nextExpId}`,
      category: cat,
      month: Number(month),
      amount: amt,
      description: desc,
    };
    setDb((p) => ({
      ...p,
      expenses: [...p.expenses, exp],
      nextExpId: p.nextExpId + 1,
    }));
    setAmount('');
    setDesc('');
    toast(`Expense of ${fmt(amt)} tk logged`);
  };

  const remove = (id: string) => {
    setDb((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) }));
    setConfirmDeleteId(null);
    toast('Expense deleted');
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditState({
      cat: e.category,
      month: e.month,
      amount: e.amount.toString(),
      desc: e.description || '',
    });
  };

  const saveEdit = () => {
    const amt = parseFloat(editState.amount);
    if (!amt || amt <= 0) return toast('Enter valid amount');
    setDb((p) => ({
      ...p,
      expenses: p.expenses.map((e) =>
        e.id === editingId
          ? {
              ...e,
              category: editState.cat,
              month: Number(editState.month),
              amount: amt,
              description: editState.desc,
            }
          : e
      ),
    }));
    setEditingId(null);
    toast('Expense updated');
  };

  const totalExp = totalExpenses(expenses);
  
  const activeMems = activeMembersAt(members, currentMonth);

  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Log Expense
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex gap-2.5 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                  Category
                </label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-[170px]"
                >
                  {EXPENSE_CATS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                  Month
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
                  placeholder="e.g. 500"
                  className="w-[120px]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
                Description
              </label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional note"
                className="w-full"
              />
            </div>
            <button
              className="btn btn-primary w-fit"
              onClick={add}
            >
              <Plus size={14} /> Add expense
            </button>
          </div>
        </div>
        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            By Category
          </div>
          {Object.keys(catTotals).length === 0 && (
            <div className="text-[var(--text3)] text-[13px]"><div className="flex flex-col items-center py-12 text-center">
            <div className="text-[40px] mb-3">🧾</div>
            <div className="font-serif text-[16px] text-[var(--text)] mb-1">No expenses yet</div>
            <div className="text-[13px] text-[var(--text3)]">Add your first expense using the form above.</div>
          </div></div>
          )}
          {Object.entries(catTotals).map(([c, amt]) => (
            <div
              key={c}
              className="flex items-center gap-2 mb-2.5"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: CAT_COLORS[c] || '#888' }}
              />
              <div className="flex-1 text-[13px]">{c}</div>
              <div className="text-[var(--red)] font-medium text-[13px]">
                {fmt(amt)} tk
              </div>
            </div>
          ))}
          {totalExp > 0 && (
            <div className="border-t border-[var(--border)] pt-2.5 mt-1 flex justify-between font-medium text-[13px]">
              <span>Total</span>
              <span className="text-[var(--red)]">{fmt(totalExp)} tk</span>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Per-Member Expense Share
        </div>
        <div className="text-[13px] text-[var(--text3)] mb-2.5 flex flex-col gap-1">
          <p>Expenses are split by units for the months each member was active. Total expenses: {fmt(totalExp)} tk</p>
          <p className="text-[11px] italic text-[var(--rose)]">Note: 'Special' category expenses are split among ALL current members, regardless of join date.</p>
        </div>
        <div className="tbl-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th>Member</th>
                <th>Units</th>
                <th>Total Share %</th>
                <th>Expense deduction (tk)</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const exp = memberExpenseShare(m.id, expenses, members);
                const share = totalExp > 0 ? exp / totalExp : 0;
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`av w-[24px] h-[24px] text-[10px] ${
                            AV_CLASSES[m.id % 5]
                          }`}
                        >
                          {initials(m.name)}
                        </div>
                        {m.name}
                      </div>
                    </td>
                    <td>{m.units}</td>
                    <td>{f2(share * 100)}%</td>
                    <td className="text-[var(--red)] font-medium">{fmt(exp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Expense Log
        </div>
        {expenses.length === 0 && (
          <div className="text-[var(--text3)] text-[13px]"><div className="flex flex-col items-center py-12 text-center">
            <div className="text-[40px] mb-3">🧾</div>
            <div className="font-serif text-[16px] text-[var(--text)] mb-1">No expenses logged</div>
            <div className="text-[13px] text-[var(--text3)]">Expenses will appear here once added.</div>
          </div></div>
        )}
        <div className="tbl-wrap">
          {expenses.length > 0 && (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th className="w-[150px]"></th>
                </tr>
              </thead>
              <tbody>
                {[...expenses].reverse().map((e) => (
                  <tr key={e.id}>
                    {editingId === e.id ? (
                      <>
                        <td>
                          <MonthPicker
                            value={editState.month}
                            onChange={(v) =>
                              setEditState((p) => ({ ...p, month: v }))
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={editState.cat}
                            onChange={(ev) =>
                              setEditState((p) => ({ ...p, cat: ev.target.value }))
                            }
                            className="text-[12px] p-1 px-1.5"
                          >
                            {EXPENSE_CATS.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={editState.amount}
                            onChange={(ev) =>
                              setEditState((p) => ({
                                ...p,
                                amount: ev.target.value,
                              }))
                            }
                            className="w-[90px] py-1 px-2 text-[12px]"
                          />
                        </td>
                        <td>
                          <input
                            value={editState.desc}
                            onChange={(ev) =>
                              setEditState((p) => ({ ...p, desc: ev.target.value }))
                            }
                            className="w-[120px] py-1 px-2 text-[12px]"
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
                        <td>{monthNumToLabel(e.month)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: CAT_COLORS[e.category] || '#888',
                              }}
                            />
                            {e.category}
                          </span>
                        </td>
                        <td className="text-[var(--red)] font-medium">
                          {fmt(e.amount)} tk
                        </td>
                        <td className="text-[var(--text3)]">
                          {e.description || '—'}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => startEdit(e)}
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            {confirmDeleteId === e.id ? (
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => remove(e.id)}
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
                                className="btn btn-danger btn-sm"
                                onClick={() => setConfirmDeleteId(e.id)}
                              >
                                <Trash2 size={14} /> Delete
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
          )}
        </div>
      </div>
    </motion.div>
  );
};