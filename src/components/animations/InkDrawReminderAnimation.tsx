import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export interface InkDrawReminderAnimationProps {
  status: 'preparing' | 'sending' | 'success' | 'error' | 'unknown';
  errorMessage?: string;
  recipientName?: string;
  invoiceNumber?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export const InkDrawReminderAnimation: React.FC<InkDrawReminderAnimationProps> = ({
  status,
  errorMessage = 'Reminder could not be sent. Please check your Gmail connection in Settings.',
  recipientName = 'Client',
  invoiceNumber = 'INV',
  onRetry,
  onClose,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Keyboard accessibility: Escape closes if not sending
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'sending' && status !== 'preparing' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onClose]);

  const isComplete = status === 'success';
  const isFailed = status === 'error' || status === 'unknown';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001126]/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Reminder dispatch status"
      onClick={() => {
        if (!isComplete && !isFailed) return;
        if (onClose) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#fbf9f4] dark:bg-[#121c29] border border-[#001126]/10 dark:border-white/10 shadow-2xl flex flex-col items-center text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Ink-Drawn Document Illustration */}
        <div className="relative w-28 h-36 mb-6 flex items-center justify-center">
          <svg
            viewBox="0 0 100 130"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Document Outline with folded top-right corner */}
            <motion.path
              d="M 15 10 L 65 10 L 85 30 L 85 120 L 15 120 Z"
              className="stroke-[#0f172a] dark:stroke-[#f1f5f9]"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Folded corner flap */}
            <motion.path
              d="M 65 10 L 65 30 L 85 30"
              className="stroke-[#0f172a]/70 dark:stroke-[#f1f5f9]/70"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
            />

            {/* Invoice Line 1 (Header/Title) */}
            <motion.line
              x1="28"
              y1="44"
              x2="56"
              y2="44"
              className="stroke-[#0891b2] dark:stroke-[#38bdf8]"
              strokeWidth="3"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.5, ease: 'easeOut' }}
            />

            {/* Invoice Line 2 (Detail Row 1) */}
            <motion.line
              x1="28"
              y1="62"
              x2="72"
              y2="62"
              className="stroke-[#94a3b8] dark:stroke-[#64748b]"
              strokeWidth="2"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.65, ease: 'easeOut' }}
            />

            {/* Invoice Line 3 (Detail Row 2) */}
            <motion.line
              x1="28"
              y1="76"
              x2="66"
              y2="76"
              className="stroke-[#94a3b8] dark:stroke-[#64748b]"
              strokeWidth="2"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.8, ease: 'easeOut' }}
            />

            {/* Invoice Line 4 (Total Row) */}
            <motion.line
              x1="28"
              y1="94"
              x2="50"
              y2="94"
              className="stroke-[#0f172a]/60 dark:stroke-[#f1f5f9]/60"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, delay: 0.95, ease: 'easeOut' }}
            />

            {/* Deliberate Success Checkmark - Drawn ONLY on confirmed success */}
            {status === 'success' && (
              <motion.path
                d="M 38 70 L 52 84 L 82 48"
                className="stroke-[#0d9488] dark:stroke-[#2dd4bf]"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
              />
            )}

            {/* Error Mark - Drawn ONLY on confirmed failure */}
            {isFailed && (
              <g className="stroke-[#e11d48] dark:stroke-[#f43f5e]" strokeWidth="3.5" strokeLinecap="round">
                <motion.line
                  x1="42"
                  y1="56"
                  x2="64"
                  y2="78"
                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
                <motion.line
                  x1="64"
                  y1="56"
                  x2="42"
                  y2="78"
                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.1, ease: 'easeOut' }}
                />
              </g>
            )}
          </svg>
        </div>

        {/* State Text & Progress Message */}
        <AnimatePresence mode="wait">
          {status === 'preparing' && (
            <motion.div
              key="prep"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-1.5"
              aria-live="polite"
            >
              <h3 className="text-base font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                Preparing reminder…
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Compiling invoice details for <strong className="text-[#0f172a] dark:text-[#f8fafc]">{invoiceNumber}</strong>
              </p>
            </motion.div>
          )}

          {status === 'sending' && (
            <motion.div
              key="sending"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-1.5"
              aria-live="polite"
            >
              <h3 className="text-base font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                Sending payment reminder…
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Dispatching <strong className="text-[#0f172a] dark:text-[#f8fafc]">{invoiceNumber}</strong> to {recipientName}
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5"
              aria-live="polite"
            >
              <h3 className="text-base font-semibold text-[#0d9488] dark:text-[#2dd4bf]">
                Reminder sent successfully
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Delivered for <strong className="text-[#0f172a] dark:text-[#f8fafc]">{invoiceNumber}</strong> to {recipientName}
              </p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
              aria-live="assertive"
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#e11d48] dark:text-[#f43f5e]">
                  Reminder could not be sent
                </h3>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0f172a] text-white dark:bg-[#38bdf8] dark:text-[#0c131d] hover:opacity-90 transition-opacity focus:outline-hidden focus:ring-2 focus:ring-[#0891b2]"
                  >
                    Retry sending
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#001126]/15 dark:border-white/15 text-[#64748b] dark:text-[#94a3b8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-hidden"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {status === 'unknown' && (
            <motion.div
              key="unknown"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
              aria-live="assertive"
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#d97706] dark:text-[#fbbf24]">
                  Dispatch unconfirmed
                </h3>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-xs mx-auto">
                  The result could not be confirmed. Check reminder history before retrying.
                </p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#001126]/15 dark:border-white/15 text-[#64748b] dark:text-[#94a3b8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-hidden"
                >
                  Close
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
