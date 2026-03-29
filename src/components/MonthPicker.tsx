import React from 'react';
import { MONTHS, START_YEAR } from '../constants';
import { labelToMonthNum } from '../utils';

interface MonthPickerProps {
  value: number;
  onChange: (value: number) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange }) => {
  const mn = (value - 1) % 12;
  const yr = START_YEAR + Math.floor((value - 1) / 12);
  const years = Array.from({ length: 77 }, (_, i) => 2024 + i);

  return (
    <div className="flex gap-1.5">
      <select
        value={mn}
        onChange={(e) => onChange(labelToMonthNum(parseInt(e.target.value), yr))}
        className="bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={yr}
        onChange={(e) => onChange(labelToMonthNum(mn, parseInt(e.target.value)))}
        className="bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
};
