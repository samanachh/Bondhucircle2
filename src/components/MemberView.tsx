import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AppData } from '../types';
import {
  fmt,
  f2,
  monthNumToLabel,
  memberSavingsToMonth,
  memberDepositedToInvestments,
  memberProfitEarned,
  memberExpenseShare,
  totalUnitsAt,
  initials,
  memberLoggedSavings,
  totalForInv,
  profitForInv,
  getMemberContributionToInv,
  calculateInvRate,
} from '../utils';
import { AV_CLASSES } from '../constants';

interface MemberViewProps {
  db: AppData;
  selectedMemberId: number;
  setSelectedMemberId: (id: number) => void;
  isAdmin: boolean;
  initialTab?: 'overview' | 'investments' | 'source' | 'expenses';
}

export const MemberView: React.FC<MemberViewProps> = ({
  db,
  selectedMemberId,
  setSelectedMemberId,
  isAdmin,
  initialTab = 'overview',
}) => {
  const {
    members,
    investments,
    profitLogs,
    expenses,
    withdrawals,
    unitValue,
    currentMonth,
  } = db;
  const [innerTab, setInnerTab] = useState<'overview' | 'investments' | 'source' | 'expenses'>(initialTab);

  const m = members.find((x) => x.id === selectedMemberId) || members[0];
  if (!m)
    return (
      <div className="p-7">
        <div className="text-[var(--text3)]">
          No members found. Add members in Setup.
        </div>
      </div>
    );

  const confirmed = memberLoggedSavings(m.id, db.savingsLogs);
  const expectedSaved = memberSavingsToMonth(m, currentMonth, unitValue);
  const deposited = memberDepositedToInvestments(m.id, investments, withdrawals);
  const uninvestedWithdrawals = (withdrawals || []).filter(w => w.memberId === m.id && w.sourceType === 'uninvested').reduce((s, w) => s + w.amount, 0);
  const uninvested = Math.max(0, confirmed - deposited - uninvestedWithdrawals);
  const profitEarned = memberProfitEarned(m.id, investments, profitLogs, withdrawals);
  const expShare = memberExpenseShare(
    m.id,
    expenses,
    members
  );
  const myWithdrawals = (withdrawals || []).filter(w => w.memberId === m.id).reduce((s, w) => s + w.amount, 0);
  const netProfit = profitEarned - expShare;
  const tu = totalUnitsAt(members, currentMonth);
  const shareP =
    m.joinMonth <= currentMonth && tu > 0 ? (m.units / tu) * 100 : 0;

  const savPct =
    confirmed + profitEarned > 0
      ? (confirmed / (confirmed + profitEarned)) * 100
      : 0;
  const prPct = 100 - savPct;

  const myInvestments = investments.filter((inv) =>
    getMemberContributionToInv(m.id, inv, investments, withdrawals) > 0
  );

  const avClass = AV_CLASSES[m.id % 5];

  // Savings Progress Ring Data
  const totalAllMembersSavings = members.reduce((s, mem) => s + memberLoggedSavings(mem.id, db.savingsLogs), 0);
  const mySavingsShare = totalAllMembersSavings > 0 ? (confirmed / totalAllMembersSavings) * 100 : 0;
  
  // Monthly Savings Sparkline Data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = ((currentMonth - 1 - i + 12) % 12) + 1;
    const amount = (db.savingsLogs || [])
      .filter(l => l.memberId === m.id && l.month === month)
      .reduce((s, l) => s + l.amount, 0);
    return { month, amount };
  }).reverse();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1400px] mx-auto"
    >
      {/* Profile Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-[var(--bg2)] to-[var(--bg3)] border border-[var(--border)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] opacity-[0.03] blur-[80px] -mr-32 -mt-32 rounded-full" />
        <div className="p-8 flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-[32px] font-bold border-4 border-[var(--bg)] shadow-2xl ${avClass}`}>
            {initials(m.name)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-serif text-[32px] font-bold text-[var(--text)] mb-2">{m.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[13px] text-[var(--text3)] font-medium">
              <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                {m.units} Units
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--blue)]" />
                Joined {monthNumToLabel(m.joinMonth)}
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--amber)]" />
                {fmt(m.units * unitValue)} tk/month
              </div>
              {m.email && (
                <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--purple)]" />
                  {m.email}
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2 font-bold">Admin Switch</div>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                className="text-[12px] px-3 py-2 bg-[var(--bg2)] border border-[var(--border)] rounded-xl w-full"
              >
                {members.map((mem) => (
                  <option key={mem.id} value={mem.id}>
                    {mem.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Savings Progress Ring */}
        <div className="card flex flex-col items-center justify-center p-8">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-6 font-bold">Circle Savings Share</div>
          <div className="relative w-40 h-40">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-[var(--bg3)] stroke-current"
                strokeWidth="10"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <motion.circle
                className="text-[var(--accent)] stroke-current"
                strokeWidth="10"
                strokeLinecap="round"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                style={{
                  strokeDasharray: 251.2,
                  strokeDashoffset: 251.2 - (251.2 * mySavingsShare) / 100,
                }}
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - (251.2 * mySavingsShare) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{f2(mySavingsShare)}%</div>
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">of total</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <div className="text-[13px] text-[var(--text2)] font-medium">Your contribution to the</div>
            <div className="text-[13px] text-[var(--text2)] font-medium">Bondhu Circle fund</div>
          </div>
        </div>

        {/* Monthly Savings Sparkline */}
        <div className="card lg:col-span-2 p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] font-bold">Savings History (Last 6 Months)</div>
            <div className="text-[12px] font-bold text-[var(--blue)]">Avg: {fmt(confirmed / Math.max(1, last6Months.length))} tk</div>
          </div>
          <div className="h-40 flex items-end gap-3">
            {last6Months.map((d, i) => {
              const max = Math.max(...last6Months.map(x => x.amount), 1);
              const height = (d.amount / max) * 100;
              const isCurrent = d.month === currentMonth;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full flex flex-col items-center">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${isCurrent ? 'bg-[var(--accent)] shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'bg-[var(--bg3)] group-hover:bg-[var(--bg4)]'}`}
                    />
                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-[var(--bg4)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      {fmt(d.amount)}
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text3)]'}`}>
                    {monthNumToLabel(d.month).substring(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <div className="metric-card b p-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Total Saved
          </div>
          <div className="font-serif text-[32px] text-[var(--blue)] leading-none font-bold">
            {fmt(confirmed)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
            Actual logged cash
          </div>
        </div>
        <div className="metric-card g p-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Profit Earned
          </div>
          <div className="font-serif text-[32px] text-[var(--accent)] leading-none font-bold">
            {fmt(profitEarned)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">tk from investments</div>
        </div>
        <div className="metric-card r p-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            My Expenses
          </div>
          <div className="font-serif text-[32px] text-[var(--red)] leading-none font-bold">
            {fmt(expShare)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">tk share of costs</div>
        </div>
        <div className="metric-card a p-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Net Profit
          </div>
          <div className="font-serif text-[32px] text-[var(--amber)] leading-none font-bold">
            {fmt(netProfit)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">tk after expenses</div>
        </div>
        <div className="metric-card p p-6">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Profit Share %
          </div>
          <div className="font-serif text-[32px] text-[var(--purple)] leading-none font-bold">
            {f2(shareP)}%
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
            of each distribution
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[var(--bg3)] p-1 rounded-[var(--radius-sm)] mb-[18px] w-fit">
        {['overview', 'investments', 'source', 'expenses'].map((t) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] cursor-pointer transition-all border-none bg-none ${
              innerTab === t ? 'bg-[var(--bg4)] text-[var(--text)] font-medium' : 'text-[var(--text2)]'
            }`}
            onClick={() => setInnerTab(t as any)}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'investments'
              ? 'My Investments'
              : t === 'source'
              ? 'Fund Source'
              : 'My Expenses'}
          </button>
        ))}
      </div>

      {innerTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 card p-8">
            <div className="text-[13px] font-bold text-[var(--text2)] mb-6 uppercase tracking-[1px]">
              Financial Summary
            </div>
            <div className="stack-bar h-8 mb-6">
              <div
                className="stack-seg bg-[var(--blue)]"
                style={{ width: `${f2(savPct)}%` }}
              />
              <div
                className="stack-seg bg-[var(--accent)]"
                style={{ width: `${f2(prPct)}%` }}
              />
            </div>
            <div className="flex gap-8 text-[15px] mb-8 font-medium">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[var(--blue)] inline-block" />{' '}
                Savings {fmt(confirmed)} tk
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[var(--accent)] inline-block" />{' '}
                Profit {fmt(profitEarned)} tk
              </span>
            </div>
            <table className="w-full text-[15px]">
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="py-4 text-[var(--text3)]">Total Saved (Confirmed)</td>
                  <td className="py-4 font-bold text-right text-[var(--teal)]">
                    {fmt(confirmed)} tk
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Expected Savings</td>
                  <td className="py-4 font-bold text-right">
                    {fmt(expectedSaved)} tk
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Invested in pools</td>
                  <td className="py-4 font-bold text-right">{fmt(deposited)} tk</td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Uninvested savings</td>
                  <td className="py-4 text-[var(--amber)] font-bold text-right">
                    {fmt(uninvested)} tk
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Gross profit earned</td>
                  <td className="py-4 text-[var(--accent)] font-bold text-right">
                    {fmt(profitEarned)} tk
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Expense deduction</td>
                  <td className="py-4 text-[var(--red)] font-bold text-right">
                    - {fmt(expShare)} tk
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-[var(--text3)]">Total Withdrawals</td>
                  <td className="py-4 text-[var(--red)] font-bold text-right">
                    - {fmt(myWithdrawals)} tk
                  </td>
                </tr>
                <tr className="bg-[var(--bg3)]/30">
                  <td className="py-4 font-bold pl-4">Net profit</td>
                  <td className="py-4 font-bold text-right text-[var(--accent)] pr-4">
                    {fmt(netProfit)} tk
                  </td>
                </tr>
                <tr className="bg-[var(--accent)]/5">
                  <td className="py-5 font-bold pl-4 text-lg">Current Balance</td>
                  <td className="py-5 font-bold text-right text-[var(--blue)] pr-4 text-xl">
                    {fmt(confirmed + netProfit - myWithdrawals)} tk
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-6">
            <div className="card p-8 bg-linear-to-br from-[var(--bg2)] to-[var(--bg3)]">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--purple)]/20 flex items-center justify-center">
                  <span className="text-[var(--purple)] text-sm">%</span>
                </div>
                Profit Share Logic
              </h3>
              <div className="space-y-5 text-[var(--text2)] text-[14px] leading-relaxed">
                <p>
                  Your <span className="text-[var(--purple)] font-bold">Profit Share %</span> determines your portion of the net profit generated by each investment pool.
                </p>
                <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2 font-bold">Calculation</div>
                  <div className="font-mono text-[13px] text-[var(--text)]">
                    (Your Units / Total Group Units)
                  </div>
                </div>
                <p>
                  For example, if you have <span className="text-[var(--text)] font-bold">{m.units} units</span> and the total group has <span className="text-[var(--text)] font-bold">{totalUnitsAt(members, currentMonth)} units</span>, your share is <span className="text-[var(--purple)] font-bold">{f2(shareP)}%</span>.
                </p>
                <p className="text-[12px] italic">
                  * This share is applied to the profit of each pool you have contributed to.
                </p>
              </div>
            </div>
            <div className="card p-8 bg-linear-to-br from-[var(--bg2)] to-[var(--bg3)]">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--red)]/20 flex items-center justify-center">
                  <span className="text-[var(--red)] text-sm">৳</span>
                </div>
                Expense Share Logic
              </h3>
              <div className="space-y-5 text-[var(--text2)] text-[14px] leading-relaxed">
                <p>
                  Most expenses are split among members who were active during the month of the expense.
                </p>
                <p>
                  However, <span className="text-[var(--rose)] font-bold">"Special"</span> category expenses (like bank charges) are split among <span className="text-[var(--text)] font-bold">ALL current members</span>, regardless of when they joined.
                </p>
                <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2 font-bold">Special Expense Rule</div>
                  <p className="text-[12px]">New members contribute to historical special costs, and existing members receive a rebuttal (refund) in their net profit.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {innerTab === 'expenses' && (
        <div className="space-y-6">
          <div className="card">
            <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
              Individual Expense Breakdown
            </div>
            <div className="text-[13px] text-[var(--text3)] mb-4">
              Your share of each expense log based on your units and active status.
            </div>
            <div className="tbl-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Category</th>
                    <th>Total Amount</th>
                    <th>Your Share (tk)</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[...expenses].reverse().map((e) => {
                    const activeAtMonth = members.filter(mem => mem.joinMonth <= e.month);
                    const totalUnitsAtMonth = activeAtMonth.reduce((s, mem) => s + mem.units, 0);
                    
                    let myShare = 0;
                    if (e.category.toLowerCase() === 'special') {
                      const totalCurrentUnits = members.reduce((s, mem) => s + mem.units, 0);
                      myShare = e.amount * (m.units / totalCurrentUnits);
                    } else {
                      const isActive = m.joinMonth <= e.month;
                      if (isActive && totalUnitsAtMonth > 0) {
                        myShare = e.amount * (m.units / totalUnitsAtMonth);
                      }
                    }

                    if (myShare === 0) return null;

                    return (
                      <tr key={e.id}>
                        <td>{monthNumToLabel(e.month)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${e.category.toLowerCase() === 'special' ? 'bg-[var(--rose)]' : 'bg-[var(--blue)]'}`} />
                            {e.category}
                          </span>
                        </td>
                        <td className="text-[var(--text3)]">{fmt(e.amount)}</td>
                        <td className="font-bold text-[var(--red)]">{fmt(myShare)}</td>
                        <td className="text-[var(--text3)] text-[12px]">{e.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="card p-8 bg-linear-to-br from-[var(--bg2)] to-[var(--bg3)]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--rose)]/20 flex items-center justify-center">
                <span className="text-[var(--rose)] text-sm">ℹ️</span>
              </div>
              Special Expense Logic
            </h3>
            <div className="space-y-4 text-[var(--text2)] text-[14px]">
              <p>
                Expenses marked as <span className="text-[var(--rose)] font-bold">"Special"</span> are divided among all current members, regardless of when they joined.
              </p>
              <p>
                This ensures that foundational costs (like bank charges) are shared fairly by everyone who benefits from the group's infrastructure.
              </p>
            </div>
          </div>
        </div>
      )}
      {innerTab === 'investments' && (
        <div className="space-y-3">
          {myInvestments.length === 0 && (
            <div className="card text-[var(--text3)] text-[13px]">
              Not part of any investment yet.
            </div>
          )}
          {myInvestments.map((inv) => {
            const invTotal = totalForInv(inv);
            const myAmt = getMemberContributionToInv(m.id, inv, investments, withdrawals);
            const share = invTotal > 0 ? myAmt / invTotal : 0;
            const profit = profitForInv(inv.id, profitLogs);
            const myProfit = profit * share;
            return (
              <div key={inv.id} className="card">
                <div className="flex justify-between mb-3">
                  <div className="font-bold text-[18px]">{inv.name}</div>
                  <span className="badge badge-b text-[13px] py-1 px-3">
                    {f2(calculateInvRate(inv, db.profitLogs, db.currentMonth))}%/month
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[13px]">
                  <div>
                    <div className="text-[var(--text3)] text-[11px] mb-0.5">
                      My contribution
                    </div>
                    <div className="font-medium">{fmt(myAmt)} tk</div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)] text-[11px] mb-0.5">
                      My share
                    </div>
                    <div className="font-medium">{f2(share * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)] text-[11px] mb-0.5">
                      Pool profit
                    </div>
                    <div className="text-[var(--accent)] font-medium">
                      {fmt(profit)} tk
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)] text-[11px] mb-0.5">
                      My profit
                    </div>
                    <div className="text-[var(--accent)] font-semibold">
                      {fmt(myProfit)} tk
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {innerTab === 'source' && (
        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Where your money comes from
          </div>
          <div className="mb-4 text-[13px] text-[var(--text3)]">
            Out of every 100 tk in your name:
          </div>
          {(() => {
            const grand = confirmed + profitEarned;
            if (grand === 0)
              return <div className="text-[var(--text3)]">No data yet.</div>;
            const rows: {
              label: string;
              val: number;
              color: string;
              indent?: boolean;
            }[] = [
              { label: 'Your savings', val: confirmed, color: 'var(--blue)' },
              {
                label: 'Profit from investments',
                val: profitEarned,
                color: 'var(--accent)',
              },
            ];
            myInvestments.forEach((inv) => {
              const myAmt = getMemberContributionToInv(m.id, inv, investments, withdrawals);
              const share = totalForInv(inv) > 0 ? myAmt / totalForInv(inv) : 0;
              const p = profitForInv(inv.id, profitLogs) * share;
              if (p > 0)
                rows.push({
                  label: `  ↳ from ${inv.name}`,
                  val: p,
                  color: 'rgba(74,222,128,0.6)',
                  indent: true,
                });
            });
            return rows.map((r, i) => (
              <div
                key={i}
                className="mb-2.5"
                style={{ paddingLeft: r.indent ? 16 : 0 }}
              >
                <div className="flex justify-between text-[13px] mb-1">
                  <span className={r.indent ? 'text-[var(--text3)]' : ''}>
                    {r.label}
                  </span>
                  <span className="font-medium">
                    {fmt(r.val)} tk ({f2((r.val / grand) * 100)}%)
                  </span>
                </div>
                <div className="progress-wrap">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${(r.val / grand) * 100}%`,
                      background: r.color,
                    }}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </motion.div>
  );
};