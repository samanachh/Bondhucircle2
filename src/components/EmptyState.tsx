import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="text-[48px] mb-4">{icon}</div>
    <div className="font-serif text-[18px] text-[var(--text)] mb-2">{title}</div>
    <div className="text-[13px] text-[var(--text3)] max-w-[280px] leading-relaxed mb-5">{description}</div>
    {action && (
      <button
        onClick={action.onClick}
        className="btn btn-primary"
      >
        {action.label}
      </button>
    )}
  </div>
);
