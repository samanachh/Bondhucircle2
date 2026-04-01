import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  msg: string | null;
  onDone: () => void;
}

export const Toast: React.FC<ToastProps> = ({ msg, onDone }) => {
  useEffect(() => {
    if (msg) {
      const t = setTimeout(onDone, 2500);
      return () => clearTimeout(t);
    }
  }, [msg, onDone]);

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 bg-[var(--bg4)] border border-[var(--border2)] rounded-[var(--radius-sm)] px-[18px] py-3 text-[13px] z-[9999] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
};