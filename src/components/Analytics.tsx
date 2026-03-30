import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { AppData, Member } from '../types';
import { 
  confirmedSavingsForMonth, 
  expectedSavingsForMonth,
  getMonthlyProfits,
  getMonthlyExpenses,
  monthNumToLabel,
  totalProfit,
  totalExpenses,
  totalForInv
} from '../utils';
import { TrendingUp, Users, PieChart as PieIcon, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalyticsProps {
  db: AppData;
  isAdmin: boolean;
}

export const Analytics: React.FC<AnalyticsProps> = ({ db, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'members'>('overview');

  const months = useMemo(() => {
    const m = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      const monthNum = (year - 2024) * 12 + monthIdx + 1;
      m.push({
        label: monthNumToLabel(monthNum),
        iso: d.toISOString().substring(0, 7),
        num: monthNum
      });
    }
    return m;
  }, []);

  const savingsData = useMemo(() => {
    return months.map(m => ({
      month: m.label,
      confirmed: confirmedSavingsForMonth(db, m.num),
      expected: expectedSavingsForMonth(db, m.num)
    }));
  }, [db, months]);

  const profitExpenseData = useMemo(() => {
    const monthlyProfits = getMonthlyProfits(db);
    const monthlyExpenses = getMonthlyExpenses(db);
    
    return months.map(m => ({
      month: m.label,
      profit: monthlyProfits[m.label] || 0,
      expense: monthlyExpenses[m.label] || 0
    }));
  }, [db, months]);

  const cumulativeProfitData = useMemo(() => {
    const monthlyProfits = getMonthlyProfits(db);
    let cumulative = 0;
    // Sort all months from the beginning of time
    const allMonths = Object.keys(monthlyProfits).sort();
    return allMonths.map(m => {
      cumulative += monthlyProfits[m];
      return { month: m, cumulative };
    });
  }, [db]);

  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    db.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [db]);

  const investmentData = useMemo(() => {
    return db.investments.map(inv => {
      const profit = db.profitLogs
        .filter(p => p.invId === inv.id)
        .reduce((sum, p) => sum + p.amount, 0);
      const principal = totalForInv(inv);
      const roi = principal > 0 ? (profit / principal) * 100 : 0;
      return {
        name: inv.name,
        principal,
        profit,
        roi: parseFloat(roi.toFixed(1))
      };
    });
  }, [db]);

  const memberStats = useMemo(() => {
    return db.members.map(m => {
      const totalExpected = m.units * db.unitValue * months.length;
      const totalConfirmed = db.savingsLogs
        .filter(s => {
          return s.memberId === m.id && months.some(mo => mo.num === s.month);
        })
        .reduce((sum, s) => sum + s.amount, 0);
      const rate = totalExpected > 0 ? (totalConfirmed / totalExpected) * 100 : 0;
      
      let status: 'good' | 'warning' | 'danger' = 'good';
      if (rate < 70) status = 'danger';
      else if (rate < 90) status = 'warning';

      return {
        name: m.name,
        rate: parseFloat(rate.toFixed(1)),
        status
      };
    });
  }, [db, months]);

  const COLORS = ['#FF6321', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-7 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text)]">Analytics</h1>
          <p className="text-[var(--text3)] text-sm mt-1">Visualizing growth and performance metrics</p>
        </div>
        <div className="flex bg-[var(--bg2)] p-1 rounded-xl border border-[var(--border)]">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-[var(--bg4)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)] hover:text-[var(--text)]'}`}
          >
            <BarChart3 size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'investments' ? 'bg-[var(--bg4)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)] hover:text-[var(--text)]'}`}
          >
            <TrendingUp size={16} /> Investments
          </button>
          {isAdmin && (
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'members' ? 'bg-[var(--bg4)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)] hover:text-[var(--text)]'}`}
          >
            <Users size={16} /> Members
          </button>
          )}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Savings Trend */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Monthly Savings: Confirmed vs Expected</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--line)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expected" name="Expected" fill="var(--bg4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Profit */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Cumulative Profit Growth</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={cumulativeProfitData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--line)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="cumulative" name="Total Profit" stroke="var(--accent)" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit vs Expenses */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Monthly Profit vs Expenses</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={profitExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--line)', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Expense Breakdown by Category</h3>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--line)', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'investments' ? (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Principal vs Profit Comparison</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={investmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text3)" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--line)', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="principal" name="Principal" fill="var(--bg4)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" name="Total Profit" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investmentData.map((inv, idx) => (
              <div key={idx} className="bg-[var(--card-bg)] p-5 rounded-xl border border-[var(--line)]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-[var(--text)]">{inv.name}</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${inv.roi >= 10 ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {inv.roi}% ROI
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text3)] text-xs">
                  <span>Principal: ৳{inv.principal.toLocaleString()}</span>
                  <span>•</span>
                  <span>Profit: ৳{inv.profit.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--line)] shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text3)] mb-6">Member Savings Collection Rate (Last 6 Months)</h3>
          <div className="space-y-6">
            {memberStats.map((m, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-[var(--text)]">{m.name}</span>
                  <span className={`font-bold ${m.status === 'good' ? 'text-green-500' : m.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                    {m.rate}%
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${m.status === 'good' ? 'bg-green-500' : m.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${m.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-[var(--line)] flex gap-6 text-[11px] text-[var(--text3)] uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" /> Good (&gt;90%)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" /> Warning (70-90%)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" /> Danger (&lt;70%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
