import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { AppData, Member } from '../types';
import { fmt, monthNumToLabel, initials } from '../utils';
import { AV_CLASSES } from '../constants';
import { MonthPicker } from './MonthPicker';
import { ConfirmModal } from './ConfirmModal';

interface SetupProps {
  db: AppData;
  setDb: React.Dispatch<React.SetStateAction<AppData>>;
  toast: (msg: string) => void;
}

export const Setup: React.FC<SetupProps> = ({ db, setDb, toast }) => {
  const { members, unitValue, currentMonth } = db;
  const [name, setName] = useState('');
  const [units, setUnits] = useState(1);
  const [joinMonth, setJoinMonth] = useState(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [uv, setUv] = useState(unitValue.toString());
  const [cm, setCm] = useState(currentMonth);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const removeMember = (id: number) => {
    setDb((p) => ({
      ...p,
      members: p.members.filter((x) => x.id !== id),
    }));
    setConfirmDeleteId(null);
    toast('Member removed');
  };

  const addMember = () => {
    if (!name.trim()) return toast('Enter a name');
    const m: Member = {
      id: db.nextMemberId,
      name: name.trim(),
      units: Number(units),
      joinMonth: Number(joinMonth),
      phone: phone.trim(),
      email: email.trim(),
      pin: pin.trim() || '0000',
    };
    setDb((p) => ({
      ...p,
      members: [...p.members, m],
      nextMemberId: p.nextMemberId + 1,
    }));
    setName('');
    setPhone('');
    setEmail('');
    setPin('');
    toast(`${name} added`);
  };

  const saveSettings = () => {
    setDb((p) => ({ ...p, unitValue: Number(uv), currentMonth: Number(cm) }));
    toast('Settings saved');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-7 pb-[60px] max-w-[1100px]"
    >
      <div className="card mb-4">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Global Settings
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Unit value (tk)
            </label>
            <input
              type="number"
              value={uv}
              onChange={(e) => setUv(e.target.value)}
              className="w-[110px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Current month
            </label>
            <MonthPicker value={cm} onChange={setCm} />
          </div>
          <button className="btn btn-primary" onClick={saveSettings}>
            Save
          </button>
        </div>
        <div className="text-[12px] text-[var(--text3)] mt-3">
          1 unit = {fmt(Number(uv))} tk/month · 2 units = {fmt(Number(uv) * 2)}{' '}
          tk/month · 3 units = {fmt(Number(uv) * 3)} tk/month
        </div>
      </div>

      <div className="card mb-4">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Add Member
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rafiq"
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Units
            </label>
            <select
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-[200px]"
            >
              <option value={1}>1 unit — {fmt(unitValue)} tk/month</option>
              <option value={2}>2 units — {fmt(unitValue * 2)} tk/month</option>
              <option value={3}>3 units — {fmt(unitValue * 3)} tk/month</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Joined month
            </label>
            <MonthPicker value={joinMonth} onChange={setJoinMonth} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Investor ID (Phone)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@email.com"
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[var(--text3)] uppercase tracking-[0.5px]">
              PIN
            </label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="w-[80px]"
            />
          </div>
          <button className="btn btn-primary" onClick={addMember}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-[var(--text2)] mb-3.5 uppercase tracking-[0.5px]">
          Member Roster
        </div>
        <div className="tbl-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th>Member</th>
                <th>Units</th>
                <th>Monthly</th>
                <th>Joined</th>
                <th>Investor ID</th>
                <th>Email</th>
                <th>PIN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className={`av w-[28px] h-[28px] text-[11px] ${
                          AV_CLASSES[m.id % 5]
                        }`}
                      >
                        {initials(m.name)}
                      </div>
                      {m.name}
                    </div>
                  </td>
                  <td>{m.units}</td>
                  <td>{fmt(m.units * unitValue)} tk</td>
                  <td>{monthNumToLabel(m.joinMonth)}</td>
                  <td>
                    <input
                      value={m.phone || ''}
                      onChange={(e) =>
                        setDb((p) => ({
                          ...p,
                          members: p.members.map((x) =>
                            x.id === m.id ? { ...x, phone: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="01..."
                      className="w-[130px] py-1 px-2 text-[12px]"
                    />
                  </td>
                  <td>
                    <input
                      value={m.email || ''}
                      onChange={(e) =>
                        setDb((p) => ({
                          ...p,
                          members: p.members.map((x) =>
                            x.id === m.id ? { ...x, email: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Email"
                      className="w-[130px] py-1 px-2 text-[12px]"
                    />
                  </td>
                  <td>
                    <input
                      value={m.pin || ''}
                      onChange={(e) =>
                        setDb((p) => ({
                          ...p,
                          members: p.members.map((x) =>
                            x.id === m.id ? { ...x, pin: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="0000"
                      maxLength={4}
                      className="w-[60px] py-1 px-2 text-[12px]"
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDeleteId(m.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Member"
        message="Are you sure you want to completely delete this member? This action cannot be undone."
        onConfirm={() => confirmDeleteId !== null && removeMember(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </motion.div>
  );
};