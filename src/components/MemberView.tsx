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
}

export const MemberView: React.FC<MemberViewProps> = ({
  db,
  selectedMemberId,
  setSelectedMemberId,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius)] p-6 mb-5 flex items-center gap-[18px]">
        <div
          className={`av w-[52px] h-[52px] text-[18px] ${avClass}`}
        >
          {initials(m.name)}
        </div>
        <div className="flex-1">
          <div className="font-serif text-[20px]">{m.name}</div>
          <div className="text-[13px] text-[var(--text3)] mt-0.5">
            {m.units} unit{m.units > 1 ? 's' : ''} · {fmt(m.units * unitValue)} tk/month · Joined{' '}
            {monthNumToLabel(m.joinMonth)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--text3)] mb-1">Viewing as</div>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(Number(e.target.value))}
            className="text-[12px] px-2 py-1.5"
          >
            {members.map((mem) => (
              <option key={mem.id} value={mem.id}>
                {mem.name}
              </option>
            ))}
          </select>
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
