import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this? This action cannot be undone.",
  onConfirm,
  onCancel,
  confirmText = "Delete"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl z-[10000] flex flex-col gap-4 text-center items-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] m-0">{title}</h3>
            <p className="text-sm text-[var(--text3)] m-0 leading-relaxed">{message}</p>
            <div className="flex gap-3 w-full mt-4">
              <button 
                className="flex-1 bg-[var(--bg3)] text-[var(--text2)] py-2.5 rounded-lg font-medium hover:bg-[var(--bg4)] transition-colors border border-[var(--line)]"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-medium transition-colors border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};