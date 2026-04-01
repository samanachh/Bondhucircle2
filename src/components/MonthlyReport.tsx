import React, { useState, useMemo, useRef } from 'react';
import { AppData, Member, ProfitLog, Expense, SavingsLog, Investment, Withdrawal } from '../types';
import { 
  confirmedSavingsForMonth, 
  expectedSavingsForMonth,
  getMemberBacklog,
  totalSavings,
  totalInvested,
  totalProfit,
  totalExpenses,
  totalWithdrawals,
  uninvestedMoney,
  monthNumToLabel
} from '../utils';
import { 
  Printer, 
  Share2, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  Copy
} from 'lucide-react';

interface MonthlyReportProps {
  db: AppData;
  toast: (msg: string) => void;
  isAdmin: boolean;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ db, toast, isAdmin }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const reportRef = useRef<HTMLDivElement>(null);

  const months = useMemo(() => {
    const m = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      m.push(d.toISOString().substring(0, 7));
    }
    return m;
  }, []);

  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthNum = (year - 2024) * 12 + month; // Assuming START_YEAR is 2024 based on utils.ts logic

    const monthSavings = db.savingsLogs.filter(s => s.month === monthNum);
    const monthProfits = db.profitLogs.filter(p => p.month === monthNum);
    const monthExpenses = db.expenses.filter(e => e.month === monthNum);
    const monthWithdrawals = db.withdrawals.filter(w => w.month === monthNum);

    const totalConfirmed = monthSavings.reduce((sum, s) => sum + s.amount, 0);
    const totalExpected = expectedSavingsForMonth(db, monthNum);
    const totalProfitMonth = monthProfits.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenseMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const memberStatus = db.members.map(m => {
      const saving = monthSavings.find(s => s.memberId === m.id);
      const expected = m.units * db.unitValue;
      const confirmed = saving ? saving.amount : 0;
      const backlogArr = getMemberBacklog(db, m.id);
      const backlogTotal = backlogArr.reduce((sum, b) => sum + b.amount, 0);
      const totalUnits = db.members.reduce((sum, mem) => sum + mem.units, 0);
      const share = totalProfitMonth > 0 && totalUnits > 0 ? (m.units / totalUnits) * totalProfitMonth : 0;

      return {
        id: m.id,
        name: m.name,
        units: m.units,
        expected,
        confirmed,
        isPaid: confirmed >= expected,
        backlog: backlogTotal,
        share
      };
    });

    return {
      totalConfirmed,
      totalExpected,
      totalProfitMonth,
      totalExpenseMonth,
      memberStatus,
      monthProfits,
      monthExpenses,
      monthWithdrawals
    };
  }, [db, selectedMonth]);

  const copyForWhatsApp = () => {
    const { totalConfirmed, totalProfitMonth, totalExpenseMonth, memberStatus } = reportData;
    const monthName = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
    
    let text = `📊 *Monthly Report: ${monthName}*\n\n`;
    text += `💰 *Fund Summary*\n`;
    text += `• Total Savings: ৳${totalConfirmed.toLocaleString()}\n`;
    text += `• Total Profit: ৳${totalProfitMonth.toLocaleString()}\n`;
    text += `• Total Expenses: ৳${totalExpenseMonth.toLocaleString()}\n\n`;
    
    text += `✅ *Payment Status*\n`;
    memberStatus.forEach(m => {
      text += `${m.isPaid ? '✅' : '❌'} ${m.name}: ${m.isPaid ? 'Paid' : 'Pending'} (৳${m.confirmed.toLocaleString()})\n`;
    });
    
    text += `\n📈 *Profit Shares*\n`;
    memberStatus.forEach(m => {
      text += `• ${m.name}: ৳${m.share.toLocaleString()}\n`;
    });

    text += `\n_Generated via Bondhu Circle App_`;

    navigator.clipboard.writeText(text);
    toast('Report copied for WhatsApp!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-7 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text)]">Monthly Report</h1>
          <p className="text-[var(--text3)] text-sm mt-1">Generate and share monthly financial summaries</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={copyForWhatsApp}
            className="flex items-center gap-2 bg-[var(--bg2)] border border-[var(--border)] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--bg3)] transition-colors"
          >
            <Copy size={16} /> WhatsApp
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Printer size={16} /> Print/PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="bg-white text-gray-900 p-10 rounded-2xl shadow-xl border border-gray-200 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-8 mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-serif font-bold tracking-tight">Bondhu Circle</h2>
            <p className="text-sm uppercase tracking-[3px] text-gray-500 mt-1">Monthly Financial Statement</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Report Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">Total Savings</div>
            <div className="text-2xl font-serif font-bold">৳{reportData.totalConfirmed.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-1">Target: ৳{reportData.totalExpected.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">Monthly Profit</div>
            <div className="text-2xl font-serif font-bold text-green-600">৳{reportData.totalProfitMonth.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-1">From {reportData.monthProfits.length} sources</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-bold">Monthly Expenses</div>
            <div className="text-2xl font-serif font-bold text-red-600">৳{reportData.totalExpenseMonth.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 mt-1">{reportData.monthExpenses.length} transactions</div>
          </div>
        </div>

        {/* Payment Status Table */}
        {isAdmin && (
          <div className="mb-12">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Member Payment Status</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="py-3 font-bold">Member</th>
                  <th className="py-3 font-bold">Units</th>
                  <th className="py-3 font-bold">Expected</th>
                  <th className="py-3 font-bold">Confirmed</th>
                  <th className="py-3 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.memberStatus.map((m, idx) => (
                  <tr key={idx} className="text-sm">
                    <td className="py-4 font-medium">{m.name}</td>
                    <td className="py-4 text-gray-500">{m.units}</td>
                    <td className="py-4 text-gray-500">৳{m.expected.toLocaleString()}</td>
                    <td className="py-4 font-medium">৳{m.confirmed.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.isPaid ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {m.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Profit Distribution */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          {isAdmin && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Profit Distribution</h3>
              <div className="space-y-3">
                {reportData.memberStatus.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{m.name} ({m.units} Unit)</span>
                    <span className="font-bold">৳{m.share.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Backlogs</h3>
            <div className="space-y-3">
              {isAdmin ? (
                reportData.memberStatus.filter(m => m.backlog > 0).map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{m.name}</span>
                    <span className="font-bold text-red-500">৳{m.backlog.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400 italic">Backlog details are restricted to admin</div>
              )}
              {isAdmin && reportData.memberStatus.filter(m => m.backlog > 0).length === 0 && (
                <div className="text-sm text-gray-400 italic">No pending backlogs</div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Transactions */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Profits Logged</h3>
            <div className="space-y-3">
              {reportData.monthProfits.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-600">{db.investments.find(i => i.id === p.invId)?.name || 'Unknown'}</span>
                  <span className="font-medium text-green-600">+৳{p.amount.toLocaleString()}</span>
                </div>
              ))}
              {reportData.monthProfits.length === 0 && (
                <div className="text-sm text-gray-400 italic">No profits logged this month</div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Expenses Logged</h3>
            <div className="space-y-3">
              {reportData.monthExpenses.map((e, idx) => (
                <div key={idx} className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-600">{e.description}</span>
                  <span className="font-medium text-red-600">-৳{e.amount.toLocaleString()}</span>
                </div>
              ))}
              {reportData.monthExpenses.length === 0 && (
                <div className="text-sm text-gray-400 italic">No expenses logged this month</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-[2px]">End of Statement • Bondhu Circle Investment Group</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};