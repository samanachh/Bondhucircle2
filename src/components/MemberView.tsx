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
} from '../utils';
import { AV_CLASSES } from '../constants';

interface MemberViewProps {
  db: AppData;
  selectedMemberId: number;
  setSelectedMemberId: (id: number) => void;
  isAdmin: boolean;
}

export const MemberView: React.FC<MemberViewProps> = ({
  db,
  selectedMemberId,
  setSelectedMemberId,
  isAdmin,
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
  const [innerTab, setInnerTab] = useState('overview');

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
      className="p-7 pb-[60px] max-w-[1100px]"
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-5">
        <div className="metric-card b">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.7px] mb-2">
            Total Saved
          </div>
          <div className="font-serif text-[26px] text-[var(--blue)] leading-none">
            {fmt(confirmed)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-1.5">
            Actual logged cash
          </div>
        </div>
        <div className="metric-card g">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.7px] mb-2">
            Profit Earned
          </div>
          <div className="font-serif text-[26px] text-[var(--accent)] leading-none">
            {fmt(profitEarned)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-1.5">tk from investments</div>
        </div>
        <div className="metric-card r">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.7px] mb-2">
            Withdrawals
          </div>
          <div className="font-serif text-[26px] text-[var(--red)] leading-none">
            {fmt(myWithdrawals)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-1.5">tk taken out</div>
        </div>
        <div className="metric-card a">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.7px] mb-2">
            Net Profit
          </div>
          <div className="font-serif text-[26px] text-[var(--amber)] leading-none">
            {fmt(netProfit)}
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-1.5">tk after expenses</div>
        </div>
        <div className="metric-card p">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[0.7px] mb-2">
            Profit Share %
          </div>
          <div className="font-serif text-[26px] text-[var(--purple)] leading-none">
            {f2(shareP)}%
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-1.5">
            of each distribution
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[var(--bg3)] p-1 rounded-[var(--radius-sm)] mb-[18px] w-fit">
        {['overview', 'investments', 'source'].map((t) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] cursor-pointer transition-all border-none bg-none ${
              innerTab === t ? 'bg-[var(--bg4)] text-[var(--text)] font-medium' : 'text-[var(--text2)]'
            }`}
            onClick={() => setInnerTab(t)}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'investments'
              ? 'My Investments'
              : 'Fund Source'}
          </button>
        ))}
      </div>

      {innerTab === 'overview' && (
        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Financial Summary
          </div>
          <div className="stack-bar h-6 mb-2.5">
            <div
              className="stack-seg bg-[var(--blue)]"
              style={{ width: `${f2(savPct)}%` }}
            />
            <div
              className="stack-seg bg-[var(--accent)]"
              style={{ width: `${f2(prPct)}%` }}
            />
          </div>
          <div className="flex gap-5 text-[13px] mb-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--blue)] inline-block" />{' '}
              Savings {fmt(confirmed)} tk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--accent)] inline-block" />{' '}
              Profit {fmt(profitEarned)} tk
            </span>
          </div>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="text-[var(--text3)]">Total Saved (Confirmed)</td>
                <td className="font-medium text-right text-[var(--teal)]">
                  {fmt(confirmed)} tk
                </td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Expected Savings</td>
                <td className="font-medium text-right">
                  {fmt(expectedSaved)} tk
                </td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Invested in pools</td>
                <td className="font-medium text-right">{fmt(deposited)} tk</td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Uninvested savings</td>
                <td className="text-[var(--amber)] font-medium text-right">
                  {fmt(uninvested)} tk
                </td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Gross profit</td>
                <td className="text-[var(--accent)] font-medium text-right">
                  {fmt(profitEarned)} tk
                </td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Expense deduction</td>
                <td className="text-[var(--red)] font-medium text-right">
                  - {fmt(expShare)} tk
                </td>
              </tr>
              <tr>
                <td className="text-[var(--text3)]">Total Withdrawals</td>
                <td className="text-[var(--red)] font-medium text-right">
                  - {fmt(myWithdrawals)} tk
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="font-semibold pt-3">Net profit</td>
                <td className="font-bold text-right text-[var(--accent)] pt-3">
                  {fmt(netProfit)} tk
                </td>
              </tr>
              <tr>
                <td className="font-semibold pt-1">Current Balance (Savings + Net Profit - Withdrawals)</td>
                <td className="font-bold text-right text-[var(--blue)] pt-1">
                  {fmt(confirmed + netProfit - myWithdrawals)} tk
                </td>
              </tr>
            </tbody>
          </table>
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
                  <div className="font-medium text-[15px]">{inv.name}</div>
                  <span className="badge badge-b">{inv.rate}%/month</span>
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
