import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { AppData } from '../types';
import { GoogleGenAI } from '@google/genai';
import {
  fmt,
  f2,
  monthNumToLabel,
  totalForInv,
  profitForInv,
  calculateInvRate,
  activeMembersAt,
  memberSavingsToMonth,
  totalExpenses,
  memberLoggedSavings,
  uninvestedMoney,
  totalInvested,
  expectedSavingsForMonth,
  confirmedSavingsForMonth,
  getMemberBacklog,
  profitInHand,
  memberExpenseShare,
} from '../utils';
import { CAT_COLORS } from '../constants';

interface DashboardProps {
  db: AppData;
  isAdmin: boolean;
  isMemberLoggedIn: boolean;
  isGuest: boolean;
  memberId: number | null;
  setPage?: (p: string) => void;
  setMemberTab?: (t: 'overview' | 'investments' | 'source' | 'expenses') => void;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({ value, duration = 1200, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{prefix}{fmt(count)}{suffix}</span>;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  db, 
  isAdmin, 
  isMemberLoggedIn, 
  isGuest, 
  memberId,
  setPage,
  setMemberTab
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const {
    members,
    investments,
    profitLogs,
    expenses,
    withdrawals,
    unitValue,
    currentMonth,
    savingsLogs,
  } = db;

  const totalInvestedVal = totalInvested(investments, withdrawals);
  const totalProfit = profitLogs.reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalWithdrawalsVal = (withdrawals || []).reduce((s, w) => s + w.amount, 0);
  const netProfit = totalProfit - totalExp;

  const active = activeMembersAt(members, currentMonth);
  const totalSavedAll = active.reduce(
    (s, m) => s + memberSavingsToMonth(m, currentMonth, unitValue),
    0
  );
  const totalConfirmedSavings = (savingsLogs || [])
    .filter(l => members.some(m => m.id === l.memberId))
    .reduce((s, l) => s + l.amount, 0);

  const uninvestedMoneyVal = uninvestedMoney(db);
  const profitInHandVal = profitInHand(db);
  const totalProfitReceivedVal = totalProfit;
  const expectedThisMonth = expectedSavingsForMonth(db, currentMonth);
  const confirmedThisMonth = confirmedSavingsForMonth(db, currentMonth);

  const backlogs = members.map(m => ({
    member: m,
    backlog: getMemberBacklog(db, m.id)
  })).filter(b => b.backlog.length > 0);

  const totalBacklog = backlogs.reduce((s, b) => s + b.backlog.reduce((ss, m) => ss + m.amount, 0), 0);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showInvestedModal, setShowInvestedModal] = useState(false);

  // Filter checklist for members
  const checklistMembers = isMemberLoggedIn && memberId 
    ? active.filter(m => m.id === memberId)
    : active;

  const myExpenseShare = isMemberLoggedIn && memberId ? memberExpenseShare(memberId, expenses, members) : 0;

  const fetchAiInsight = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setAiInsight('Consistent savings and smart investments build long-term wealth. Keep growing together! 💪');
      setLoadingAi(false);
      return;
    }
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `As a financial advisor for a community investment group called "Bondhu Circle", analyze these metrics and give a 2-sentence encouraging insight:
      Total Invested: ${totalInvestedVal} tk
      Total Profit: ${totalProfit} tk
      Total Expenses: ${totalExp} tk
      Net Profit: ${netProfit} tk
      Uninvested Money: ${uninvestedMoneyVal} tk
      Total Withdrawals: ${totalWithdrawalsVal} tk
      Number of Members: ${members.length}
      Number of Active Investments: ${investments.length}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || 'Keep growing together!');
    } catch (err) {
      console.error(err);
      setAiInsight('Focus on consistent savings to build long-term wealth.');
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchAiInsight();
  }, []);

  const grand = totalConfirmedSavings + totalProfit;
  const savPct = grand > 0 ? (totalConfirmedSavings / grand) * 100 : 0;
  const prPct = grand > 0 ? (totalProfit / grand) * 100 : 0;

  const expCatTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    expCatTotals[e.category] = (expCatTotals[e.category] || 0) + e.amount;
  });

  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
  const loggedInMember = isMemberLoggedIn ? members.find(m => m.id === memberId) : null;

  // Top Saver Calculation
  const monthlySavingsMap: Record<number, number> = {};
  (savingsLogs || []).filter(l => l.month === currentMonth).forEach(l => {
    monthlySavingsMap[l.memberId] = (monthlySavingsMap[l.memberId] || 0) + l.amount;
  });
  
  let topSaverId = -1;
  let topSaverAmount = 0;
  Object.entries(monthlySavingsMap).forEach(([id, amt]) => {
    if (amt > topSaverAmount) {
      topSaverAmount = amt;
      topSaverId = parseInt(id);
    }
  });
  
  const topSaver = members.find(m => m.id === topSaverId);
  const isTopSaver = isMemberLoggedIn && memberId === topSaverId;

  // Month Progress
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgress = (currentDay / daysInMonth) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1400px] mx-auto"
    >
      <div className="flex items-center justify-between mb-[32px]">
        <div className="flex-1">
          <div className="font-serif text-[28px] font-bold text-[var(--text)]">
            Dashboard {currentMonthName} {currentYear}
          </div>
          {isMemberLoggedIn && loggedInMember && (
            <div className="text-[18px] text-[var(--accent)] font-medium mt-1">
              Welcome back, {loggedInMember.name}
            </div>
          )}
          <div className="text-[14px] text-[var(--text3)] mt-1 font-medium">
            {monthNumToLabel(currentMonth)} · {active.length} active members
          </div>
          
          {/* Month Progress Bar */}
          <div className="mt-4 max-w-xs">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1 font-bold">
              <span>Month Progress</span>
              <span>{Math.round(monthProgress)}%</span>
            </div>
            <div className="h-1 bg-[var(--bg3)] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${monthProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {/* Top Saver Card */}
        {topSaver && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex items-center gap-4 bg-[var(--bg2)] border border-[var(--accent)]/20 p-4 rounded-2xl shadow-lg shadow-green-500/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={40} className="text-[var(--accent)]" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/20 font-bold text-lg">
              {isTopSaver ? "🏆" : topSaver.name.substring(0, 1)}
            </div>
            <div>
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] font-bold">Top Saver This Month</div>
              <div className="text-[16px] font-bold text-[var(--text)]">
                {isTopSaver ? "You!" : topSaver.name}
              </div>
              <div className="text-[12px] text-[var(--accent)] font-bold">
                {fmt(topSaverAmount)} tk
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* AI Insight Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-8 bg-linear-to-br from-[rgba(139,92,246,0.15)] to-transparent border-[rgba(139,92,246,0.2)] p-6 shadow-lg shadow-purple-500/5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[2px] text-[var(--accent)]">
              AI Financial Insight
            </h3>
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Powered by Gemini</div>
          </div>
        </div>
        {loadingAi ? (
          <div className="flex items-center gap-3 text-[var(--text3)] text-[14px] italic py-2">
            <Loader2 size={16} className="animate-spin text-[var(--accent)]" /> 
            Analyzing your circle's performance...
          </div>
        ) : (
          <p className="text-[16px] leading-relaxed text-[var(--text2)] font-medium italic">
            "{aiInsight}"
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <div className="metric-card border-l-4 border-l-[var(--blue)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Uninvested Money
          </div>
          <div className="font-serif text-[32px] text-[var(--text)] leading-none font-bold">
            <AnimatedCounter value={uninvestedMoneyVal} />
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
            Available in brokerage
          </div>
        </div>

        {isAdmin && (
          <div className="metric-card border-l-4 border-l-[var(--purple)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
            <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
              Profit in Hand
            </div>
            <div className="font-serif text-[32px] text-[var(--purple)] leading-none font-bold">
              <AnimatedCounter value={profitInHandVal} />
            </div>
            <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
              Uninvested profit pool
            </div>
          </div>
        )}

        <div 
          className={`metric-card border-l-4 border-l-[var(--accent)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm ${isAdmin ? 'cursor-pointer hover:bg-[var(--bg3)] transition-colors' : ''}`}
          onClick={() => isAdmin && setShowInvestedModal(true)}
        >
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Total Invested
          </div>
          <div className="font-serif text-[32px] text-[var(--accent)] leading-none font-bold">
            <AnimatedCounter value={totalInvestedVal} />
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
            Across {investments.length} active pools {isAdmin && '(Click for details)'}
          </div>
        </div>

        <div 
          className={`metric-card border-l-4 border-l-[var(--red)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm ${isMemberLoggedIn ? 'cursor-pointer hover:bg-[var(--bg3)]' : ''}`}
          onClick={() => {
            if (isMemberLoggedIn && setPage && setMemberTab) {
              setMemberTab('expenses');
              setPage('members');
            }
          }}
        >
          <div className="text-[11px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            {isMemberLoggedIn ? 'My Expenses' : 'Total Expenses'}
          </div>
          <div className="font-serif text-[32px] text-[var(--red)] leading-none font-bold">
            <AnimatedCounter value={isMemberLoggedIn ? myExpenseShare : totalExp} />
          </div>
          <div className="text-[12px] text-[var(--text3)] mt-2 font-medium">
            {isMemberLoggedIn ? 'Your share of costs (Click for details)' : `Across ${expenses.length} logs`}
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--amber)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Net Profit
          </div>
          <div className="font-serif text-[28px] text-[var(--amber)] leading-none font-bold">
            <AnimatedCounter value={netProfit} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            After {fmt(totalExp)} tk expenses
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--purple)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Total Profit Received
          </div>
          <div className="font-serif text-[28px] text-[var(--purple)] leading-none font-bold">
            <AnimatedCounter value={totalProfitReceivedVal} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            Gross profit logged
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--teal)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Confirmed Savings
          </div>
          <div className="font-serif text-[28px] text-[var(--teal)] leading-none font-bold">
            <AnimatedCounter value={totalConfirmedSavings} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            Actual logged cash
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--red)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Withdrawals
          </div>
          <div className="font-serif text-[28px] text-[var(--red)] leading-none font-bold">
            <AnimatedCounter value={totalWithdrawalsVal} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            Total member withdrawals
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--indigo)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Expected This Month
          </div>
          <div className="font-serif text-[28px] text-[var(--indigo)] leading-none font-bold">
            <AnimatedCounter value={expectedThisMonth} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            Based on active units
          </div>
        </div>

        <div className="metric-card border-l-4 border-l-[var(--emerald)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
            Confirmed This Month
          </div>
          <div className="font-serif text-[28px] text-[var(--emerald)] leading-none font-bold">
            <AnimatedCounter value={confirmedThisMonth} />
          </div>
          <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
            Logged for {monthNumToLabel(currentMonth)}
          </div>
        </div>

        {isAdmin && (
          <div 
            className="metric-card border-l-4 border-l-[var(--rose)] bg-[var(--bg2)] p-6 rounded-2xl shadow-sm cursor-pointer hover:bg-[var(--bg3)] transition-colors"
            onClick={() => setShowBacklog(true)}
          >
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3 font-bold">
              Backlog Money
            </div>
            <div className="font-serif text-[28px] text-[var(--rose)] leading-none font-bold">
              <AnimatedCounter value={totalBacklog} />
            </div>
            <div className="text-[11px] text-[var(--text3)] mt-2 font-medium">
              Missed previous months
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Active Investment Pools
          </div>
          {investments.length === 0 && (
            <div className="text-[var(--text3)] text-[13px]">No investments yet.</div>
          )}
          {investments.map((inv) => {
            const principal = totalForInv(inv);
            const profit = profitForInv(inv.id, profitLogs);
            return (
              <div
                key={inv.id}
                className="mb-3.5 pb-3.5 border-b border-[var(--border)] last:border-none last:pb-0"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <div className="font-medium">{inv.name}</div>
                  <span className="badge badge-b">{monthNumToLabel(inv.month)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[12px]">
                  <div>
                    <div className="text-[var(--text3)]">Principal</div>
                    <div className="font-medium">{fmt(principal)} tk</div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)]">Rate</div>
                    <div className="font-medium">
                      {f2(calculateInvRate(inv, db.profitLogs, db.currentMonth))}%/mo avg
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text3)]">Profit logged</div>
                    <div className="text-[var(--accent)] font-medium">
                      {fmt(profit)} tk
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Profit by Investment
          </div>
          {investments.map((inv) => {
            const profit = profitForInv(inv.id, profitLogs);
            const principal = totalForInv(inv);
            const pct = (profit / Math.max(principal, 1)) * 100;
            return (
              <div key={inv.id} className="mb-3.5">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium">{inv.name}</span>
                  <span className="text-[var(--accent)] font-medium">
                    {fmt(profit)} tk
                  </span>
                </div>
                <div className="progress-wrap">
                  <div
                    className="progress-bar bg-[var(--accent)]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[var(--text3)] mt-0.5">
                  {f2(pct)}% of principal returned
                </div>
              </div>
            );
          })}
          {investments.length === 0 && (
            <div className="text-[var(--text3)] text-[13px]">No data yet.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {!isGuest && (
          <div className="card">
            <div className="flex justify-between items-center mb-3.5">
              <div className="text-[13px] font-medium text-[var(--text2)] uppercase tracking-[0.5px]">
                {isMemberLoggedIn ? 'My Savings Status' : 'Savings Checklist'}: {monthNumToLabel(currentMonth)}
              </div>
              <div className="flex gap-3 text-[10px] font-bold uppercase">
                <span className="text-green-500">Paid: {checklistMembers.filter(m => savingsLogs.some(s => s.memberId === m.id && s.month === currentMonth)).length}</span>
                <span className="text-red-500">Pending: {checklistMembers.filter(m => !savingsLogs.some(s => s.memberId === m.id && s.month === currentMonth)).length}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {checklistMembers.map(m => {
                const isPaid = savingsLogs.some(s => s.memberId === m.id && s.month === currentMonth);
                return (
                  <div 
                    key={m.id} 
                    title={`${m.name}: ${isPaid ? 'Paid' : 'Pending'}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${isPaid ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}
                  >
                    {m.name.substring(0, 2).toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
            Fund Source (Group)
          </div>
          <div className="stack-bar mb-2">
            <div
              className="stack-seg bg-[var(--blue)]"
              style={{ width: `${f2(savPct)}%` }}
            />
            <div
              className="stack-seg bg-[var(--accent)]"
              style={{ width: `${f2(prPct)}%` }}
            />
          </div>
          <div className="flex gap-4 text-[12px] mb-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--blue)] inline-block" />{' '}
              Savings {fmt(totalConfirmedSavings)} tk ({f2(savPct)}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--accent)] inline-block" />{' '}
              Profit {fmt(totalProfit)} tk ({f2(prPct)}%)
            </span>
          </div>
          <div className="text-[13px] font-medium">Grand total: {fmt(grand)} tk</div>
        </div>

        {!isGuest && (
          <div className="card">
            <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
              Expenses by Category
            </div>
            {Object.keys(expCatTotals).length === 0 && (
              <div className="text-[var(--text3)] text-[13px]">No expenses logged.</div>
            )}
            {Object.entries(expCatTotals).map(([cat, amt]) => (
              <div
                key={cat}
                className="flex items-center gap-2 mb-2 text-[13px]"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: CAT_COLORS[cat] || '#888' }}
                />
                <div className="flex-1">{cat}</div>
                <div className="text-[var(--red)] font-medium">{fmt(amt)} tk</div>
              </div>
            ))}
            {totalExp > 0 && (
              <div className="border-t border-[var(--border)] pt-2 mt-1 text-[13px] font-medium flex justify-between">
                <span>Total</span>
                <span>{fmt(totalExp)} tk</span>
              </div>
            )}
          </div>
        )}
      </div>
      {showBacklog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card-bg)] p-8 rounded-2xl border border-[var(--line)] w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold">Savings Backlog</h2>
              <button 
                onClick={() => setShowBacklog(false)}
                className="text-[var(--text3)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>
            
            {backlogs.length === 0 ? (
              <div className="text-center py-10 text-[var(--text3)]">No backlogs found! All members are up to date.</div>
            ) : (
              <div className="space-y-6">
                {backlogs.map((b) => (
                  <div key={b.member.id} className="border-b border-[var(--border)] pb-4 last:border-none">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-lg">{b.member.name}</span>
                      <span className="text-[var(--rose)] font-bold">Total: {fmt(b.backlog.reduce((s, m) => s + m.amount, 0))} tk</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {b.backlog.map((m, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-[var(--bg)] p-2 rounded-lg">
                          <span className="text-[var(--text2)]">{monthNumToLabel(m.month)}</span>
                          <span className="font-medium">{fmt(m.amount)} tk</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
      {showInvestedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card-bg)] p-8 rounded-2xl border border-[var(--line)] w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold">Investment Breakdown</h2>
              <button 
                onClick={() => setShowInvestedModal(false)}
                className="text-[var(--text3)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-[var(--blue)] mb-4 border-b border-[var(--border)] pb-2">Invested from Savings</h3>
                <div className="space-y-3">
                  {investments.map(inv => {
                    const fromSavings = inv.sources.filter(s => s.type === 'saving').reduce((sum, s) => sum + s.amount, 0);
                    if (fromSavings === 0) return null;
                    return (
                      <div key={inv.id} className="flex justify-between items-center bg-[var(--bg)] p-3 rounded-xl">
                        <span className="font-medium">{inv.name}</span>
                        <span className="font-bold">{fmt(fromSavings)} tk</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 font-bold text-lg border-t border-[var(--border)] mt-2">
                    <span>Total</span>
                    <span>{fmt(investments.reduce((s, i) => s + i.sources.filter(src => src.type === 'saving').reduce((sum, src) => sum + src.amount, 0), 0))} tk</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--accent)] mb-4 border-b border-[var(--border)] pb-2">Invested from Profit</h3>
                <div className="space-y-3">
                  {investments.map(inv => {
                    const fromProfit = inv.sources.filter(s => s.type === 'profit').reduce((sum, s) => sum + s.amount, 0);
                    if (fromProfit === 0) return null;
                    return (
                      <div key={inv.id} className="flex justify-between items-center bg-[var(--bg)] p-3 rounded-xl">
                        <span className="font-medium">{inv.name}</span>
                        <span className="font-bold">{fmt(fromProfit)} tk</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 font-bold text-lg border-t border-[var(--border)] mt-2">
                    <span>Total</span>
                    <span>{fmt(investments.reduce((s, i) => s + i.sources.filter(src => src.type === 'profit').reduce((sum, src) => sum + src.amount, 0), 0))} tk</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};