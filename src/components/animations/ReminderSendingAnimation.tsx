import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ReminderSendingAnimationProps {
  isSuccess?: boolean;
  isError?: boolean;
  errorMessage?: string;
  recipientName?: string;
  invoiceNumber?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export const ReminderSendingAnimation: React.FC<ReminderSendingAnimationProps> = ({
  isSuccess = false,
  isError = false,
  errorMessage = 'Failed to dispatch reminder.',
  recipientName = 'Client',
  invoiceNumber = 'INV',
  onRetry,
  onClose,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-5 text-center max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {!isSuccess && !isError ? (
          <motion.div
            key="sending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full flex flex-col items-center space-y-4"
          >
            {/* Signature Flight Path Micro-interaction */}
            <div className="relative w-full max-w-[240px] h-16 flex items-center justify-between px-3 bg-[#f5f3ee] dark:bg-[#182638] rounded-2xl border border-[#001126]/10 dark:border-white/10 overflow-hidden shadow-inner">
              {/* Origin / Outbox Icon */}
              <div className="z-10 w-8 h-8 rounded-full bg-[#ffffff] dark:bg-[#203046] border border-[#001126]/10 dark:border-white/10 flex items-center justify-center text-[#15263c] dark:text-[#38bdf8] shadow-xs">
                <span className="material-symbols-outlined text-[16px]">outgoing_mail</span>
              </div>

              {/* Dotted Flight Path */}
              <div className="absolute left-10 right-10 h-0.5 border-b-2 border-dashed border-[#15263c]/20 dark:border-white/20" />

              {/* Gliding Envelope */}
              <motion.div
                className="absolute z-20"
                animate={{
                  x: [12, 160, 12],
                  y: [0, -4, 0, 4, 0],
                }}
                transition={{
                  x: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <div className="w-7 h-5 rounded-sm bg-[#001126] dark:bg-[#f3f6fa] text-[#ffffff] dark:text-[#001126] shadow-md flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                </div>
              </motion.div>

              {/* Destination / Recipient Icon */}
              <motion.div
                className="z-10 w-8 h-8 rounded-full bg-[#ffffff] dark:bg-[#203046] border border-[#001126]/10 dark:border-white/10 flex items-center justify-center text-[#3d6562] dark:text-[#68b5ad] shadow-xs"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="material-symbols-outlined text-[16px]">inbox</span>
              </motion.div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa]">
                Sending payment reminder...
              </h4>
              <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">
                Dispatching for <strong className="text-[#001126] dark:text-white">{invoiceNumber}</strong> to {recipientName}
              </p>
            </div>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="flex flex-col items-center space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-[#bfebe6] dark:bg-[#3d6562]/40 text-[#00201e] dark:text-[#68b5ad] flex items-center justify-center shadow-md">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                className="material-symbols-outlined text-[32px]"
              >
                mark_email_read
              </motion.span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#00201e] dark:text-[#68b5ad]">
                Reminder Delivered!
              </h4>
              <p className="text-xs text-[#44474d] dark:text-[#cbd5e1] max-w-xs">
                Email dispatched via connected Gmail to {recipientName} for {invoiceNumber}.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-action-primary text-xs px-4 py-2 mt-2 cursor-pointer"
              >
                Done
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-3 text-[#ba1a1a] dark:text-[#ff897d]"
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] dark:bg-[#ba1a1a]/20 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[28px]">unsubscribe</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Could not send reminder</h4>
              <p className="text-xs max-w-xs leading-relaxed text-[#44474d] dark:text-[#cbd5e1]">
                {errorMessage}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="btn-action-primary text-xs px-4 py-1.5 cursor-pointer"
                >
                  Retry Send
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-action-secondary text-xs px-3 py-1.5 cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
