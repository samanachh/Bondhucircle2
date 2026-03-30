import React, { useState } from 'react';
import { AppData, DepositRequest, AuditLog, SavingsLog } from '../types';
import { Upload, Check, X, Clock, FileText, Image as ImageIcon, AlertCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MONTHS, START_YEAR } from '../constants';
import { labelToMonthNum, monthNumToLabel } from '../utils';

interface DepositTrackingProps {
  db: AppData;
  isAdmin: boolean;
  memberId: number | null;
  onUpdate: (updater: AppData | ((prev: AppData) => AppData)) => void;
  toast: (msg: string) => void;
}

export const DepositTracking: React.FC<DepositTrackingProps> = ({ db, isAdmin, memberId, onUpdate, toast }) => {
  const [uploading, setUploading] = useState(false);
  const [memo, setMemo] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!screenshot || !memberId) return;

    const depositMonthNum = labelToMonthNum(selectedMonthIdx, selectedYear);

    const newRequest: DepositRequest = {
      id: db.nextDepositId.toString(),
      memberId,
      amount: db.unitValue * (db.members.find(m => m.id === memberId)?.units || 1),
      month: depositMonthNum,
      date: new Date().toISOString().split('T')[0],
      screenshotUrl: screenshot,
      memo,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const newLog: AuditLog = {
      id: Date.now().toString(),
      userId: memberId.toString(),
      action: 'DEPOSIT_REQUEST',
      details: `Member ${memberId} requested deposit for ${monthNumToLabel(depositMonthNum)}`,
      timestamp: new Date().toISOString()
    };

    onUpdate(prev => ({
      ...prev,
      depositRequests: [...prev.depositRequests, newRequest],
      auditLogs: [...prev.auditLogs, newLog],
      nextDepositId: prev.nextDepositId + 1
    }));

    setScreenshot(null);
    setMemo('');
    toast('Deposit request submitted successfully!');
  };

  const handleApprove = (req: DepositRequest) => {
    const newSavingsLog: SavingsLog = {
      id: Date.now().toString(),
      memberId: req.memberId,
      month: req.month,
      amount: req.amount,
      notifyMethod: 'whatsapp'
    };

    const newLog: AuditLog = {
      id: (Date.now() + 1).toString(),
      userId: 'admin',
      action: 'DEPOSIT_APPROVED',
      details: `Admin approved deposit ${req.id} for member ${req.memberId}`,
      timestamp: new Date().toISOString()
    };

    onUpdate(prev => ({
      ...prev,
      depositRequests: prev.depositRequests.map(r => 
        r.id === req.id ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r
      ),
      savingsLogs: [...prev.savingsLogs, newSavingsLog],
      auditLogs: [...prev.auditLogs, newLog]
    }));

    toast('Deposit approved!');
  };

  const handleReject = (req: DepositRequest) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      userId: 'admin',
      action: 'DEPOSIT_REJECTED',
      details: `Admin rejected deposit ${req.id} for member ${req.memberId}`,
      timestamp: new Date().toISOString()
    };

    onUpdate(prev => ({
      ...prev,
      depositRequests: prev.depositRequests.map(r => 
        r.id === req.id ? { ...r, status: 'rejected' as const, processedAt: new Date().toISOString() } : r
      ),
      auditLogs: [...prev.auditLogs, newLog]
    }));

    toast('Deposit rejected.');
  };

  const handleDelete = (reqId: string) => {
    onUpdate(prev => ({
      ...prev,
      depositRequests: prev.depositRequests.filter(r => r.id !== reqId)
    }));
    toast('Deposit request deleted.');
  };

  const pendingRequests = db.depositRequests.filter(r => r.status === 'pending');
  const myRequests = db.depositRequests.filter(r => r.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="p-7 max-w-4xl mx-auto">
      {isAdmin && pendingRequests.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-4 rounded-2xl mb-8 flex items-center justify-between shadow-lg shadow-green-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="font-bold text-[var(--accent)]">Action Required</div>
              <div className="text-[13px] text-[var(--text2)] font-medium">You have {pendingRequests.length} pending deposit requests to approve.</div>
            </div>
          </div>
          <div className="px-4 py-1.5 bg-[var(--accent)] text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
            {pendingRequests.length} Pending
          </div>
        </motion.div>
      )}

      {isAdmin ? (
        <div>
          <h2 className="text-2xl font-serif font-bold mb-6">Pending Approvals</h2>
          {pendingRequests.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-[var(--text3)]">
              <Check className="mb-2 opacity-20" size={48} />
              <p>No pending deposit requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => {
                const member = db.members.find(m => m.id === req.memberId);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={req.id} 
                    className="card flex flex-col md:flex-row gap-6"
                  >
                    <div className="w-full md:w-48 h-48 bg-[var(--bg2)] rounded-lg overflow-hidden border border-[var(--border)] shrink-0">
                      <img 
                        src={req.screenshotUrl} 
                        alt="Proof" 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => req.screenshotUrl && window.open(req.screenshotUrl, '_blank')}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{member?.name || 'Unknown Member'}</h3>
                          <p className="text-[var(--text3)] text-sm">Requested on {new Date(req.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-[var(--accent)]">৳{req.amount.toLocaleString()}</div>
                          <div className="text-xs uppercase tracking-wider text-[var(--text3)]">For: {monthNumToLabel(req.month)}</div>
                        </div>
                      </div>
                      {req.memo && (
                        <div className="bg-[var(--bg2)] p-3 rounded-lg text-sm mb-4 italic text-[var(--text2)]">
                          "{req.memo}"
                        </div>
                      )}
                      <div className="flex gap-3 mt-auto">
                        <button 
                          onClick={() => handleApprove(req)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check size={18} /> Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req)}
                          className="flex-1 bg-red-600/10 text-red-600 border border-red-600/20 py-2 rounded-xl font-bold hover:bg-red-600/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <X size={18} /> Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-serif font-bold mb-6">Upload Proof</h2>
            <div className="card">
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-[var(--text3)] mb-2 tracking-wider">Select Month & Year</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedMonthIdx} 
                    onChange={(e) => setSelectedMonthIdx(parseInt(e.target.value))}
                    className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    {[START_YEAR, START_YEAR + 1, START_YEAR + 2, START_YEAR + 3].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-[var(--text3)] mb-2 tracking-wider">Screenshot / Receipt</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${screenshot ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--text3)]'}`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {screenshot ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                      <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-bold uppercase">Change Image</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-[var(--text3)] mb-2" size={32} />
                      <p className="text-sm text-[var(--text3)] font-medium">Click to upload proof</p>
                      <p className="text-[10px] text-[var(--text3)] mt-1 uppercase tracking-tighter">JPG, PNG up to 5MB</p>
                    </>
                  )}
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-[var(--text3)] mb-2 tracking-wider">Memo (Optional)</label>
                <textarea 
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Add a note about your payment..."
                  className="w-full bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--accent)] min-h-[100px] resize-none"
                />
              </div>
              <button 
                disabled={!screenshot}
                onClick={handleSubmit}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${screenshot ? 'bg-[var(--accent)] text-white hover:opacity-90' : 'bg-[var(--bg3)] text-[var(--text3)] cursor-not-allowed'}`}
              >
                <Check size={20} /> Submit Request
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-serif font-bold mb-6">Recent Requests</h2>
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="card py-12 text-center text-[var(--text3)]">
                  <Clock className="mx-auto mb-2 opacity-20" size={40} />
                  <p>No deposit requests found.</p>
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--bg2)] border border-[var(--border)] overflow-hidden shrink-0">
                        <img src={req.screenshotUrl} alt="Proof" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold">৳{req.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                          {new Date(req.createdAt).toLocaleDateString()} • {monthNumToLabel(req.month)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                        req.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Request"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
