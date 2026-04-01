import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Download } from 'lucide-react';
import { AppData, TxLogEntry } from '../types';
import { fmt, monthNumToLabel } from '../utils';
import { MonthPicker } from './MonthPicker';

interface TxLogProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const TxLog: React.FC<TxLogProps> = ({ db, setDb, toast }) => {
  const [lMonth, setLMonth] = useState(db.currentMonth);
  const [lType, setLType] = useState<TxLogEntry['type']>('saving');
  const [lAmt, setLAmt] = useState('');
  const [lNote, setLNote] = useState('');

  const add = () => {
    const amt = parseFloat(lAmt);
    if (!lMonth || !amt) return toast('Fill month and amount');
    setDb((p) => ({
      ...p,
      txLog: [
        ...p.txLog,
        { month: Number(lMonth), type: lType, amount: amt, note: lNote },
      ],
    }));
    setLAmt('');
    setLNote('');
    toast('Transaction logged');
  };

  const exportCSV = () => {
    let csv = "BONDHU CIRCLE - DATA EXPORT\n";
    csv += `Exported at: ${new Date().toLocaleString()}\n\n`;

    // Members
    csv += "MEMBERS\nID,Name,Units,Join Month,Phone\n";
    db.members.forEach(m => {
      csv += `${m.id},"${m.name}",${m.units},${m.joinMonth},"${m.phone || ''}"\n`;
    });
    csv += "\n";

    // Investments
    csv += "INVESTMENTS\nID,Name,Month,Rate\n";
    db.investments.forEach(i => {
      csv += `${i.id},"${i.name}",${i.month},${i.rate}\n`;
    });
    csv += "\n";

    // Savings Logs
    csv += "SAVINGS LOGS\nID,Member ID,Month,Amount\n";
    db.savingsLogs.forEach(s => {
      csv += `${s.id},${s.memberId},${s.month},${s.amount}\n`;
    });
    csv += "\n";

    // Profit Logs
    csv += "PROFIT LOGS\nID,Inv ID,Month,Amount\n";
    db.profitLogs.forEach(p => {
      csv += `${p.id},${p.invId},${p.month},${p.amount}\n`;
    });
    csv += "\n";

    // Expenses
    csv += "EXPENSES\nID,Category,Month,Amount,Description\n";
    db.expenses.forEach(e => {
      csv += `${e.id},"${e.category}",${e.month},${e.amount},"${e.description || ''}"\n`;
    });
    csv += "\n";

    // Transaction Log
    csv += "TRANSACTION LOG\nMonth,Type,Amount,Note\n";
    db.txLog.forEach(t => {
      csv += `${t.month},${t.type},${t.amount},"${t.note || ''}"\n`;
    });
    csv += "\n";

    // Withdrawals
    csv += "WITHDRAWALS\nID,Member ID,Month,Amount,Source Type,Source ID,Note\n";
    db.withdrawals.forEach(w => {
      csv += `${w.id},${w.memberId},${w.month},${w.amount},${w.sourceType},${w.sourceId || ''},"${w.note || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bondhu_circle_backup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Data exported to CSV');
  };

  const TYPE_BADGE: Record<TxLogEntry['type'], string> = {
    saving: 'badge-b',
    profit: 'badge-g',
    invest: 'badge-p',
    withdrawal: 'badge-r',
    other: 'badge-a',
  };
  const TYPE_LABEL: Record<TxLogEntry['type'], string> = {
    saving: 'Saving',
    profit: 'Profit',
    invest: 'Investment',
    withdrawal: 'Withdrawal',
    other: 'Other',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-4">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Add Transaction
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Month
            </label>
            <MonthPicker value={lMonth} onChange={setLMonth} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Type
            </label>
            <select
              value={lType}
              onChange={(e) => setLType(e.target.value as TxLogEntry['type'])}
            >
              <option value="saving">Monthly saving</option>
              <option value="profit">Profit received</option>
              <option value="invest">Investment made</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Amount (tk)
            </label>
            <input
              type="number"
              value={lAmt}
              onChange={(e) => setLAmt(e.target.value)}
              className="w-[120px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Note
            </label>
            <input
              value={lNote}
              onChange={(e) => setLNote(e.target.value)}
              placeholder="Optional"
              className="w-[180px]"
            />
          </div>
          <button className="btn btn-primary" onClick={add}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-3.5">
          <div className="text-[13px] font-medium text-[var(--text2)] uppercase tracking-[0.5px]">
            All Transactions
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        {db.txLog.length === 0 && (
          <div className="text-[var(--text3)] text-[13px]">
            <div className="flex flex-col items-center py-12 text-center">
            <div className="text-[40px] mb-3">📋</div>
            <div className="font-serif text-[16px] text-[var(--text)] mb-1">No transactions yet</div>
            <div className="text-[13px] text-[var(--text3)]">Transaction history will appear here automatically.</div>
          </div>
          </div>
        )}
        <div className="tbl-wrap">
          {db.txLog.length > 0 && (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...db.txLog]
                  .sort((a, b) => a.month - b.month)
                  .map((t, i) => (
                    <tr key={i}>
                      <td>{monthNumToLabel(t.month)}</td>
                      <td>
                        <span className={`badge ${TYPE_BADGE[t.type]}`}>
                          {TYPE_LABEL[t.type]}
                        </span>
                      </td>
                      <td className="font-medium">{fmt(t.amount)} tk</td>
                      <td className="text-[var(--text3)]">{t.note || '—'}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() =>
                            setDb((p) => ({
                              ...p,
                              txLog: p.txLog.filter((_, j) => j !== i),
                            }))
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
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