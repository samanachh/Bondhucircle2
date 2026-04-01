import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './components/Dashboard';
import { MemberView } from './components/MemberView';
import { InvestmentsAdmin } from './components/InvestmentsAdmin';
import { AddProfitAdmin } from './components/AddProfitAdmin';
import { MonthlySavingsAdmin } from './components/MonthlySavingsAdmin';
import { ExpensesAdmin } from './components/ExpensesAdmin';
import { WithdrawalsAdmin } from './components/WithdrawalsAdmin';
import { AllMembersAdmin } from './components/AllMembersAdmin';
import { Analytics } from './components/Analytics';
import { MonthlyReport } from './components/MonthlyReport';
import { Setup } from './components/Setup';
import { TxLog } from './components/TxLog';
import { DepositTracking } from './components/DepositTracking';
import { Toast } from './components/Toast';
import { AIChat } from './components/AIChat';
import ErrorBoundary from './components/ErrorBoundary';
import { AppData, Member, Investment, ProfitLog, Expense, SavingsLog, Withdrawal, TxLogEntry } from './types';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { MessageSquare } from 'lucide-react';
import { ConfirmModal } from './components/ConfirmModal';

const INITIAL_DATA: AppData = {
  unitValue: 1500,
  currentMonth: 7,
  members: [],
  investments: [],
  profitLogs: [],
  expenses: [],
  txLog: [],
  savingsLogs: [],
  withdrawals: [],
  depositRequests: [],
  auditLogs: [],
  nextMemberId: 1,
  nextInvId: 1,
  nextExpId: 1,
  nextDepositId: 1,
};

const REAL_CURRENT_MONTH = (new Date().getFullYear() - 2024) * 12 + new Date().getMonth() + 1;

INITIAL_DATA.currentMonth = REAL_CURRENT_MONTH;

export default function App() {
  const [dbData, setDbData] = useState<AppData>(INITIAL_DATA);
  const [page, setPage] = useState('dashboard');
  const [memberTab, setMemberTab] = useState<'overview' | 'investments' | 'source' | 'expenses'>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMemberLoggedIn, setIsMemberLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginType, setLoginType] = useState<'admin' | 'member'>('member');
  const [adminPassword, setAdminPassword] = useState('');
  const [memberInvestorId, setMemberInvestorId] = useState('');
  const [memberPin, setMemberPin] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dbDataRef = useRef<AppData>(dbData);

  useEffect(() => {
    dbDataRef.current = dbData;
  }, [dbData]);

  const toast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.email === 'anachhsam@gmail.com') {
        // Automatically admin if logged in as the specific email
        // But the user wants a password check too?
        // Let's stick to the password check for "admin mode" as requested.
      }
    });

    // Listen to collections
    const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
      const members = snap.docs.map(d => d.data() as Member);
      setDbData(prev => ({ ...prev, members }));
    });

    const unsubInvestments = onSnapshot(collection(db, 'investments'), (snap) => {
      const investments = snap.docs.map(d => d.data() as Investment);
      setDbData(prev => ({ ...prev, investments }));
    });

    const unsubProfitLogs = onSnapshot(collection(db, 'profitLogs'), (snap) => {
      const profitLogs = snap.docs.map(d => d.data() as ProfitLog);
      setDbData(prev => ({ ...prev, profitLogs }));
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const expenses = snap.docs.map(d => d.data() as Expense);
      setDbData(prev => ({ ...prev, expenses }));
    });

    const unsubSavingsLogs = onSnapshot(collection(db, 'savingsLogs'), (snap) => {
      const savingsLogs = snap.docs.map(d => d.data() as SavingsLog);
      setDbData(prev => ({ ...prev, savingsLogs }));
    });

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      const withdrawals = snap.docs.map(d => d.data() as Withdrawal);
      setDbData(prev => ({ ...prev, withdrawals }));
    });

    const unsubDepositRequests = onSnapshot(collection(db, 'depositRequests'), (snap) => {
      const depositRequests = snap.docs.map(d => d.data() as any);
      setDbData(prev => ({ ...prev, depositRequests }));
    });

    const unsubAuditLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const auditLogs = snap.docs.map(d => d.data() as any);
      setDbData(prev => ({ ...prev, auditLogs }));
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) {
        const config = snap.data();
        setDbData(prev => ({
          ...prev,
          unitValue: config.unitValue ?? 1500,
          currentMonth: config.currentMonth ? Math.max(config.currentMonth, REAL_CURRENT_MONTH) : REAL_CURRENT_MONTH,
          nextMemberId: config.nextMemberId ?? 1,
          nextInvId: config.nextInvId ?? 1,
          nextExpId: config.nextExpId ?? 1,
          nextDepositId: config.nextDepositId ?? 1,
        }));
      }
    });

    return () => {
      unsubAuth();
      unsubMembers();
      unsubInvestments();
      unsubProfitLogs();
      unsubExpenses();
      unsubSavingsLogs();
      unsubWithdrawals();
      unsubConfig();
    };
  }, []);

  const handleAdminLogin = () => {
    if (adminPassword === 'bondhu123') {
      setIsAdmin(true);
      setShowLogin(false);
      setAdminPassword('');
      toast('Welcome Admin!');
    } else {
      toast('Incorrect password!');
    }
  };

  const handleMemberLogin = () => {
    const member = dbData.members.find(m => m.phone === memberInvestorId && m.pin === memberPin);
    if (member) {
      setSelectedMemberId(member.id);
      setIsMemberLoggedIn(true);
      setShowLogin(false);
      setMemberPin('');
      setMemberInvestorId('');
      toast(`Welcome ${member.name}!`);
    } else {
      toast('Incorrect Investor ID or PIN!');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setIsAdmin(false);
    setIsMemberLoggedIn(false);
    setIsGuest(false);
    setShowLogin(true);
    setPage('dashboard');
    toast('Logged out.');
  };

  const updateDb = async (updater: AppData | ((prev: AppData) => AppData)) => {
    try {
      const newData = typeof updater === 'function' ? updater(dbDataRef.current) : updater;
      
      // Config update
      if (newData.unitValue !== dbDataRef.current.unitValue || 
          newData.currentMonth !== dbDataRef.current.currentMonth ||
          newData.nextMemberId !== dbDataRef.current.nextMemberId ||
          newData.nextInvId !== dbDataRef.current.nextInvId ||
          newData.nextExpId !== dbDataRef.current.nextExpId ||
          newData.nextDepositId !== dbDataRef.current.nextDepositId) {
        await setDoc(doc(db, 'config', 'global'), {
          unitValue: newData.unitValue,
          currentMonth: newData.currentMonth,
          nextMemberId: newData.nextMemberId,
          nextInvId: newData.nextInvId,
          nextExpId: newData.nextExpId,
          nextDepositId: newData.nextDepositId,
        });
      }

      // Members
      for (const m of newData.members) {
        const oldM = dbDataRef.current.members.find(om => om.id === m.id);
        if (!oldM || JSON.stringify(oldM) !== JSON.stringify(m)) {
          await setDoc(doc(db, 'members', m.id.toString()), m);
        }
      }
      if (newData.members.length < dbDataRef.current.members.length) {
        const removed = dbDataRef.current.members.filter(m => !newData.members.find(nm => nm.id === m.id));
        for (const m of removed) await deleteDoc(doc(db, 'members', m.id.toString()));
      }

      // Investments
      for (const i of newData.investments) {
        const oldI = dbDataRef.current.investments.find(oi => oi.id === i.id);
        if (!oldI || JSON.stringify(oldI) !== JSON.stringify(i)) {
          await setDoc(doc(db, 'investments', i.id), i);
        }
      }
      if (newData.investments.length < dbDataRef.current.investments.length) {
        const removed = dbDataRef.current.investments.filter(i => !newData.investments.find(ni => ni.id === i.id));
        for (const i of removed) await deleteDoc(doc(db, 'investments', i.id));
      }

      // Expenses
      for (const e of newData.expenses) {
        const oldE = dbDataRef.current.expenses.find(oe => oe.id === e.id);
        if (!oldE || JSON.stringify(oldE) !== JSON.stringify(e)) {
          await setDoc(doc(db, 'expenses', e.id), e);
        }
      }
      if (newData.expenses.length < dbDataRef.current.expenses.length) {
        const removed = dbDataRef.current.expenses.filter(e => !newData.expenses.find(ne => ne.id === e.id));
        for (const e of removed) await deleteDoc(doc(db, 'expenses', e.id));
      }

      // Savings Logs
      for (const s of newData.savingsLogs) {
        const oldS = dbDataRef.current.savingsLogs.find(os => os.id === s.id);
        if (!oldS || JSON.stringify(oldS) !== JSON.stringify(s)) {
          await setDoc(doc(db, 'savingsLogs', s.id), s);
        }
      }
      if (newData.savingsLogs.length < dbDataRef.current.savingsLogs.length) {
        const removed = dbDataRef.current.savingsLogs.filter(s => !newData.savingsLogs.find(ns => ns.id === s.id));
        for (const s of removed) await deleteDoc(doc(db, 'savingsLogs', s.id));
      }

      // Profit Logs
      for (const p of newData.profitLogs) {
        const oldP = dbDataRef.current.profitLogs.find(op => op.id === p.id);
        if (!oldP || JSON.stringify(oldP) !== JSON.stringify(p)) {
          await setDoc(doc(db, 'profitLogs', p.id), p);
        }
      }
      if (newData.profitLogs.length < dbDataRef.current.profitLogs.length) {
        const removed = dbDataRef.current.profitLogs.filter(p => !newData.profitLogs.find(np => np.id === p.id));
        for (const p of removed) await deleteDoc(doc(db, 'profitLogs', p.id));
      }

      // Withdrawals
      for (const w of newData.withdrawals) {
        const oldW = dbDataRef.current.withdrawals.find(ow => ow.id === w.id);
        if (!oldW || JSON.stringify(oldW) !== JSON.stringify(w)) {
          await setDoc(doc(db, 'withdrawals', w.id), w);
        }
      }
      if (newData.withdrawals.length < dbDataRef.current.withdrawals.length) {
        const removed = dbDataRef.current.withdrawals.filter(w => !newData.withdrawals.find(nw => nw.id === w.id));
        for (const w of removed) await deleteDoc(doc(db, 'withdrawals', w.id));
      }

      // Deposit Requests
      for (const dr of newData.depositRequests) {
        const oldDR = dbDataRef.current.depositRequests.find(odr => odr.id === dr.id);
        if (!oldDR || JSON.stringify(oldDR) !== JSON.stringify(dr)) {
          await setDoc(doc(db, 'depositRequests', dr.id), dr);
        }
      }
      if (newData.depositRequests.length < dbDataRef.current.depositRequests.length) {
        const removed = dbDataRef.current.depositRequests.filter(dr => !newData.depositRequests.find(ndr => ndr.id === dr.id));
        for (const dr of removed) await deleteDoc(doc(db, 'depositRequests', dr.id));
      }

      // Audit Logs
      for (const al of newData.auditLogs) {
        const oldAL = dbDataRef.current.auditLogs.find(oal => oal.id === al.id);
        if (!oldAL || JSON.stringify(oldAL) !== JSON.stringify(al)) {
          await setDoc(doc(db, 'auditLogs', al.id), al);
        }
      }

      setDbData(newData);
    } catch (err) {
      console.error('Firestore Error:', err);
      toast('Failed to save data. Please check your permissions.');
    }
  };


  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard db={dbData} isAdmin={isAdmin} isMemberLoggedIn={isMemberLoggedIn} isGuest={isGuest} memberId={selectedMemberId} setPage={setPage} setMemberTab={setMemberTab} />;
      case 'members':
        return (
          <MemberView
            db={dbData}
            selectedMemberId={selectedMemberId || dbData.members[0]?.id || 0}
            setSelectedMemberId={setSelectedMemberId}
            isAdmin={isAdmin}
            initialTab={memberTab}
          />
        );
      case 'investments':
        return <InvestmentsAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'add-profit':
        return <AddProfitAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'savings':
        return <MonthlySavingsAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'expenses':
        return <ExpensesAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'withdrawals':
        return <WithdrawalsAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'all-members':
        return <AllMembersAdmin db={dbData} setDb={updateDb} toast={toast} />;
      case 'log':
        return <TxLog db={dbData} setDb={updateDb} toast={toast} />;
      case 'analytics':
        return <Analytics db={dbData} isAdmin={isAdmin} isGuest={isGuest} />;
      case 'report':
        return <MonthlyReport db={dbData} toast={toast} isAdmin={isAdmin} />;
      case 'deposits':
        return <DepositTracking db={dbData} onUpdate={updateDb} toast={toast} isAdmin={isAdmin} memberId={selectedMemberId} />;
      case 'setup':
        return <Setup db={dbData} setDb={updateDb} toast={toast} />;
      default:
        return <Dashboard db={dbData} isAdmin={isAdmin} isMemberLoggedIn={isMemberLoggedIn} isGuest={isGuest} memberId={selectedMemberId} />;
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />
        
        <div className="bg-[var(--card-bg)] p-8 rounded-2xl border border-[var(--line)] w-full max-w-md shadow-2xl relative z-10">
          <div className="text-center mb-8 animate-logo">
            <div className="font-serif text-[32px] font-bold text-[var(--text)] tracking-tight text-center">Bondhu Circle</div>
            <div className="text-[12px] text-[var(--text3)] uppercase tracking-[2px] mt-1 text-center">Investment Tracker</div>
          </div>

          <div className="flex gap-1 bg-[var(--bg3)] p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginType === 'member' ? 'bg-[var(--bg4)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)]'}`}
              onClick={() => setLoginType('member')}
            >
              Member
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginType === 'admin' ? 'bg-[var(--bg4)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)]'}`}
              onClick={() => setLoginType('admin')}
            >
              Admin
            </button>
          </div>

          {loginType === 'admin' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text3)] mb-2">Admin Password</label>
                <input
                  type="password"
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  autoFocus
                />
              </div>
              <button 
                className="w-full bg-[var(--accent)] text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                onClick={handleAdminLogin}
              >
                Login as Admin
              </button>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--line)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--card-bg)] px-2 text-[var(--text3)]">Or</span>
                </div>
              </div>
              <button 
                className="w-full bg-[var(--bg3)] text-[var(--text2)] py-3 rounded-lg font-medium hover:bg-[var(--bg4)] transition-colors border border-[var(--line)]"
                onClick={() => {
                  setIsGuest(true);
                  setShowLogin(false);
                  toast('Entering as Guest (Read-only)');
                }}
              >
                Guest Preview (Read-only)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text3)] mb-2">Investor ID (Mobile Number)</label>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  value={memberInvestorId}
                  onChange={(e) => setMemberInvestorId(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text3)] mb-4 text-center">4-Digit PIN</label>
                <div className="relative flex justify-center gap-3 mb-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className={`w-[52px] h-[52px] rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                        memberPin.length > i 
                          ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_15px_rgba(74,222,128,0.3)]' 
                          : 'bg-[var(--bg3)] border-[var(--border)]'
                      }`}
                    >
                      {memberPin.length > i && <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg)]" />}
                    </div>
                  ))}
                  <input
                    type="password"
                    maxLength={4}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={memberPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) setMemberPin(val);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleMemberLogin()}
                    autoFocus
                  />
                </div>
              </div>
              <button 
                className="w-full bg-[var(--blue)] text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                onClick={handleMemberLogin}
              >
                Enter Dashboard
              </button>
              <p className="text-[11px] text-center text-[var(--text3)] mt-4">
                Contact your admin if you don't have a PIN yet.
              </p>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--line)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--card-bg)] px-2 text-[var(--text3)]">Or</span>
                </div>
              </div>
              <button 
                className="w-full bg-[var(--bg3)] text-[var(--text2)] py-3 rounded-lg font-medium hover:bg-[var(--bg4)] transition-colors border border-[var(--line)]"
                onClick={() => {
                  setIsGuest(true);
                  setShowLogin(false);
                  toast('Entering as Guest (Read-only)');
                }}
              >
                Guest Preview (Read-only)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar
        page={page}
        setPage={setPage}
        isAdmin={isAdmin}
        isMemberLoggedIn={isMemberLoggedIn}
        isGuest={isGuest}
        db={dbData}
        onLogout={() => setShowLogoutConfirm(true)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`${isCollapsed ? 'md:ml-[70px]' : 'md:ml-[220px]'} ml-0 pt-12 md:pt-0 flex-1 min-h-screen relative transition-all duration-300`}>
        <Topbar 
          page={page} 
          setPage={setPage}
          isAdmin={isAdmin} 
          isMemberLoggedIn={isMemberLoggedIn}
          isGuest={isGuest}
          db={dbData} 
          selectedMemberId={selectedMemberId}
          onAdminClick={() => {
            if (isAdmin) return;
            const pass = prompt('Enter Admin Password:');
            if (pass === 'bondhu123') {
              setIsAdmin(true);
              setIsMemberLoggedIn(false);
              setIsGuest(false);
              toast('Welcome Admin!');
            } else if (pass !== null) {
              toast('Incorrect password!');
            }
          }}
          onLogout={() => setShowLogoutConfirm(true)}
          onMenuClick={() => setMobileOpen(true)}
        />
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full min-h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
        <Toast msg={toastMsg} onDone={() => setToastMsg(null)} />
      
      {/* AI Chat Toggle */}
      <button 
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent)] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 group"
      >
        <MessageSquare size={24} />
        <span className="absolute right-16 bg-[var(--bg2)] text-[var(--text)] px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          Ask Bondhu AI
        </span>
      </button>

        <AIChat 
          db={dbData} 
          setDb={updateDb}
          isAdmin={isAdmin}
          isOpen={isAIChatOpen} 
          onClose={() => setIsAIChatOpen(false)} 
        />
      </div>
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Log out"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}