import { LucideIcon } from 'lucide-react';

export type Member = {
  id: number;
  name: string;
  units: number;
  joinMonth: number;
  phone: string;
  pin?: string; // 4-digit PIN for member login
};

export type InvestmentSource = {
  type: 'saving' | 'profit';
  memberId: number | null; // null for profit pool sources
  amount: number;
  fromInvId?: string; // for profit pool sources
};

export type Investment = {
  id: string;
  name: string;
  month: number;
  rate: number;
  sources: InvestmentSource[];
};

export type ProfitLog = {
  id: string;
  invId: string;
  month: number;
  amount: number;
};

export type Expense = {
  id: string;
  category: string;
  month: number;
  amount: number;
  description?: string;
};

export type TxLogEntry = {
  month: number;
  type: 'saving' | 'profit' | 'invest' | 'withdrawal' | 'other';
  amount: number;
  note?: string;
};

export type SavingsLog = {
  id: string;
  memberId: number;
  month: number;
  amount: number;
  notifyMethod: 'whatsapp' | 'sms' | 'email';
};

export type Withdrawal = {
  id: string;
  memberId: number;
  month: number;
  amount: number;
  sourceType: 'uninvested' | 'profit' | 'investment';
  sourceId?: string; // invId if sourceType is 'investment'
  note?: string;
};

export type AppData = {
  unitValue: number;
  currentMonth: number;
  members: Member[];
  investments: Investment[];
  profitLogs: ProfitLog[];
  expenses: Expense[];
  txLog: TxLogEntry[];
  savingsLogs: SavingsLog[];
  withdrawals: Withdrawal[];
  nextMemberId: number;
  nextInvId: number;
  nextExpId: number;
};

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};
