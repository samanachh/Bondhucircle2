import { AppData, Investment, Member, ProfitLog, Expense, SavingsLog, Withdrawal } from './types';
import { MONTHS, START_YEAR } from './constants';

export const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const f2 = (n: number) => parseFloat(n.toString() || '0').toFixed(2);

export const initials = (name: string) =>
  name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const monthNumToLabel = (n: number) => {
  const idx = (n - 1) % 12;
  const yr = START_YEAR + Math.floor((n - 1) / 12);
  return `${MONTHS[idx]} ${yr}`;
};

export const labelToMonthNum = (monthIdx: number, year: number) => {
  return (year - START_YEAR) * 12 + monthIdx + 1;
};

export const totalForInv = (inv: Investment) =>
  inv.sources.reduce((s, x) => s + x.amount, 0);

export const profitForInv = (invId: string, logs: ProfitLog[]) =>
  logs.filter((p) => p.invId === invId).reduce((s, p) => s + p.amount, 0);

export const activeMembersAt = (members: Member[], month: number) =>
  members.filter((m) => m.joinMonth <= month);

export const totalUnitsAt = (members: Member[], month: number) =>
  activeMembersAt(members, month).reduce((s, m) => s + m.units, 0);

export const memberSavingsToMonth = (
  member: Member,
  month: number,
  unitValue: number
) => {
  if (member.joinMonth > month) return 0;
  return (month - member.joinMonth + 1) * member.units * unitValue;
};

export const memberLoggedSavings = (memberId: number, savingsLogs: SavingsLog[]) => {
  return (savingsLogs || []).filter((s) => s.memberId === memberId).reduce((s, l) => s + l.amount, 0);
};

export const totalSavings = (savingsLogs: SavingsLog[]) =>
  savingsLogs.reduce((s, l) => s + l.amount, 0);

export const totalWithdrawals = (withdrawals: Withdrawal[]) =>
  withdrawals.reduce((s, w) => s + w.amount, 0);

export const totalInvested = (investments: Investment[], withdrawals: Withdrawal[] = []) =>
  investments.reduce((s, i) => {
    const principal = totalForInv(i);
    const wth = (withdrawals || []).filter(w => w.sourceType === 'investment' && w.sourceId === i.id).reduce((sum, w) => sum + w.amount, 0);
    return s + Math.max(0, principal - wth);
  }, 0);

export const totalProfit = (profitLogs: ProfitLog[]) =>
  profitLogs.reduce((s, p) => s + p.amount, 0);

export const totalProfitReceived = totalProfit;

export const totalExpenses = (expenses: Expense[]) =>
  expenses.reduce((s, e) => s + e.amount, 0);

export const uninvestedMoney = (db: AppData) => {
  const ts = totalSavings(db.savingsLogs || []);
  const tp = totalProfitReceived(db.profitLogs);
  const te = totalExpenses(db.expenses);
  const tw = (db.withdrawals || []).reduce((s, w) => s + w.amount, 0);
  const investmentWth = (db.withdrawals || []).filter(w => w.sourceType === 'investment').reduce((s, w) => s + w.amount, 0);
  
  // Cash = Total In - Total Out
  // Total In = Savings + Profit
  // Total Out = Expenses + Principal Invested + Non-Investment Withdrawals
  const nonInvWth = tw - investmentWth;
  const principalInvested = db.investments.reduce((s, i) => s + totalForInv(i), 0);
  
  return ts + tp - te - principalInvested - nonInvWth;
};

export const profitInHand = (db: AppData) => {
  const totalP = totalProfit(db.profitLogs);
  const totalPInvested = db.investments.reduce((s, i) => 
    s + i.sources.filter(src => src.type === 'profit').reduce((sum, src) => sum + src.amount, 0), 0);
  const totalPWithdrawn = db.withdrawals.filter(w => w.sourceType === 'profit').reduce((s, w) => s + w.amount, 0);
  return Math.max(0, totalP - totalPInvested - totalPWithdrawn);
};

export const memberWithdrawals = (memberId: number, withdrawals: Withdrawal[]) =>
  withdrawals.filter((w) => w.memberId === memberId).reduce((s, w) => s + w.amount, 0);

export const memberExpenseShare = (
  memberId: number,
  expenses: Expense[],
  members: Member[]
) => {
  return expenses.reduce((total, exp) => {
    if (exp.category.toLowerCase() === 'special') {
      const totalUnits = members.reduce((s, m) => s + m.units, 0);
      const m = members.find((x) => x.id === memberId);
      if (!m || totalUnits === 0) return total;
      return total + exp.amount * (m.units / totalUnits);
    } else {
      const activeMems = activeMembersAt(members, exp.month);
      const totalUnits = activeMems.reduce((s, m) => s + m.units, 0);
      const m = activeMems.find((x) => x.id === memberId);
      if (!m || totalUnits === 0) return total;
      return total + exp.amount * (m.units / totalUnits);
    }
  }, 0);
};

export const memberDepositedToInvestments = (
  memberId: number,
  investments: Investment[],
  withdrawals: Withdrawal[] = []
) => {
  return investments.reduce((total, inv) => {
    const src = inv.sources.find((s) => s.memberId === memberId && s.type === 'saving');
    const wth = withdrawals.filter(w => w.memberId === memberId && w.sourceType === 'investment' && w.sourceId === inv.id).reduce((s, w) => s + w.amount, 0);
    return total + (src ? src.amount : 0) - wth;
  }, 0);
};

export const memberWithdrawalsBySource = (memberId: number, withdrawals: Withdrawal[], sourceType: 'uninvested' | 'profit' | 'investment', sourceId?: string) =>
  (withdrawals || [])
    .filter((w) => w.memberId === memberId && w.sourceType === sourceType && (sourceId ? w.sourceId === sourceId : true))
    .reduce((s, w) => s + w.amount, 0);

export const getMemberAvailableSavings = (memberId: number, db: AppData) => {
  const logged = memberLoggedSavings(memberId, db.savingsLogs);
  const principalInvested = db.investments.reduce((total, inv) => {
    const src = inv.sources.find((s) => s.memberId === memberId && s.type === 'saving');
    return total + (src ? src.amount : 0);
  }, 0);
  const withdrawn = memberWithdrawalsBySource(memberId, db.withdrawals, 'uninvested');
  return Math.max(0, logged - principalInvested - withdrawn);
};

export const getMemberAvailableProfit = (memberId: number, db: AppData) => {
  const grossProfit = memberProfitEarned(memberId, db.investments, db.profitLogs, []);
  const expShare = memberExpenseShare(memberId, db.expenses, db.members);
  const withdrawn = memberWithdrawalsBySource(memberId, db.withdrawals, 'profit');
  return Math.max(0, grossProfit - expShare - withdrawn);
};

export const getMemberAvailableInInv = (memberId: number, invId: string, db: AppData) => {
  const inv = db.investments.find(i => i.id === invId);
  if (!inv) return 0;
  const principal = inv.sources.find(s => s.memberId === memberId && s.type === 'saving')?.amount || 0;
  const withdrawn = memberWithdrawalsBySource(memberId, db.withdrawals, 'investment', invId);
  return Math.max(0, principal - withdrawn);
};

export const getMemberContributionToInv = (
  memberId: number,
  inv: Investment,
  investments: Investment[],
  withdrawals: Withdrawal[] = [],
  visited: Set<string> = new Set()
): number => {
  if (visited.has(inv.id)) return 0; // Prevent infinite recursion cycle
  visited.add(inv.id);

  let total = 0;
  inv.sources.forEach((src) => {
    if (src.memberId === memberId && src.type === 'saving') {
      total += src.amount;
    } else if (src.type === 'profit' && src.fromInvId) {
      const refInv = investments.find((i) => i.id === src.fromInvId);
      if (refInv) {
        const refTotal = totalForInv(refInv);
        if (refTotal > 0) {
          const memberShareInRef = getMemberContributionToInv(memberId, refInv, investments, withdrawals, new Set(visited)) / refTotal;
          total += src.amount * memberShareInRef;
        }
      }
    }
  });
  // Subtract withdrawals from this specific investment
  const wth = withdrawals.filter(w => w.memberId === memberId && w.sourceType === 'investment' && w.sourceId === inv.id).reduce((s, w) => s + w.amount, 0);
  return Math.max(0, total - wth);
};

export const memberProfitEarned = (
  memberId: number,
  investments: Investment[],
  profitLogs: ProfitLog[],
  withdrawals: Withdrawal[] = []
) => {
  let total = 0;
  investments.forEach((inv) => {
    const invTotal = totalForInv(inv);
    if (invTotal === 0) return;
    const totalP = profitForInv(inv.id, profitLogs);
    if (totalP === 0) return;

    const memberAmt = getMemberContributionToInv(memberId, inv, investments, withdrawals);
    if (memberAmt > 0) {
      total += totalP * (memberAmt / invTotal);
    }
  });
  
  // Subtract withdrawals from general profit pool
  const profitWth = withdrawals.filter(w => w.memberId === memberId && w.sourceType === 'profit').reduce((s, w) => s + w.amount, 0);
  
  return total - profitWth;
};

export const calculateInvRate = (inv: Investment, profitLogs: ProfitLog[], currentMonth: number) => {
  const principal = totalForInv(inv);
  if (principal === 0) return 0;
  const totalP = profitForInv(inv.id, profitLogs);
  const months = Math.max(1, currentMonth - inv.month + 1);
  return (totalP / principal / months) * 100;
};

export const confirmedSavingsForMonth = (db: AppData, month: number | string) => {
  const m = typeof month === 'string' ? parseInt(month.split('-')[1]) + (parseInt(month.split('-')[0]) - START_YEAR) * 12 : month;
  return (db.savingsLogs || []).filter(l => l.month === m).reduce((s, l) => s + l.amount, 0);
};

export const expectedSavingsForMonth = (db: AppData, month: number | string) => {
  const m = typeof month === 'string' ? parseInt(month.split('-')[1]) + (parseInt(month.split('-')[0]) - START_YEAR) * 12 : month;
  return activeMembersAt(db.members, m).reduce((s, mem) => s + mem.units * db.unitValue, 0);
};

export const getMemberBacklog = (db: AppData, memberId: number) => {
  const member = db.members.find(m => m.id === memberId);
  if (!member) return [];
  const backlog: { month: number; amount: number }[] = [];
  for (let m = member.joinMonth; m < db.currentMonth; m++) {
    const expected = member.units * db.unitValue;
    const logged = (db.savingsLogs || [])
      .filter(l => l.memberId === member.id && l.month === m)
      .reduce((s, l) => s + l.amount, 0);
    if (logged < expected) {
      backlog.push({ month: m, amount: expected - logged });
    }
  }
  return backlog;
};

export const getMonthlyProfits = (db: AppData) => {
  const profits: Record<string, number> = {};
  db.profitLogs.forEach(p => {
    const monthLabel = monthNumToLabel(p.month);
    profits[monthLabel] = (profits[monthLabel] || 0) + p.amount;
  });
  return profits;
};

export const getMonthlyExpenses = (db: AppData) => {
  const expenses: Record<string, number> = {};
  db.expenses.forEach(e => {
    const monthLabel = monthNumToLabel(e.month);
    expenses[monthLabel] = (expenses[monthLabel] || 0) + e.amount;
  });
  return expenses;
};