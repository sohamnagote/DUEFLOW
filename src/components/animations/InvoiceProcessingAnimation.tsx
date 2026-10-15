import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceProcessingAnimationProps {
  isOpen: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  statusText?: string;
  errorMessage?: string;
  invoiceNumber?: string;
  clientName?: string;
  amount?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

const PROCESSING_STAGES = [
  'Preparing your invoice…',
  'Saving invoice details…',
  'Finishing up…',
];

export const InvoiceProcessingAnimation: React.FC<InvoiceProcessingAnimationProps> = ({
  isOpen,
  isSuccess = false,
  isError = false,
  statusText,
  errorMessage,
  invoiceNumber,
  clientName,
  amount,
  onClose,
  onRetry,
}) => {
  const [stageIndex, setStageIndex] = useState(0);

  // Cycle through processing stages while actively processing
  useEffect(() => {
    if (!isOpen || isSuccess || isError) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, [isOpen, isSuccess, isError]);

  const displayText = statusText || PROCESSING_STAGES[stageIndex] || PROCESSING_STAGES[0];

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="invoice-processing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
        >
          {/* Full-viewport background layer */}
          <div className="absolute inset-0 bg-[#fbf9f4]/95 dark:bg-[#0c131d]/95 backdrop-blur-sm" />

          {/* Subtle ambient gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-[#3d6562]/8 dark:bg-teal-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-[#001126]/5 dark:bg-blue-500/5 rounded-full blur-[100px]" />
          </div>

          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-md text-center">
            <AnimatePresence mode="wait">
              {!isSuccess && !isError ? (
                /* ── Processing State ── */
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: prefersReducedMotion ? 0.05 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center space-y-8"
                >
                  {/* Invoice document graphic with line-reveal animation */}
                  <div className="relative">
                    <div className="w-24 h-32 bg-white dark:bg-[#1a283c] rounded-xl border border-[#001126]/12 dark:border-white/12 shadow-lg flex flex-col p-3.5 justify-between overflow-hidden">
                      {/* Corner fold */}
                      <div className="absolute top-0 right-0 w-5 h-5 bg-[#f5f3ee] dark:bg-[#23354d] border-b border-l border-[#001126]/8 dark:border-white/8 rounded-bl-sm" />

                      {/* Invoice header */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#15263c] dark:bg-[#38bdf8]" />
                        <div className="w-10 h-2 rounded-full bg-[#15263c]/15 dark:bg-white/15" />
                      </div>

                      {/* Line-reveal content lines */}
                      <div className="space-y-2 w-full my-auto">
                        <motion.div
                          className="h-1.5 bg-[#15263c]/20 dark:bg-white/20 rounded-full origin-left"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: prefersReducedMotion ? 0.01 : 0.8,
                            ease: 'easeOut',
                          }}
                        />
                        <motion.div
                          className="h-1.5 bg-[#15263c]/12 dark:bg-white/12 rounded-full origin-left"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 0.75 }}
                          transition={{
                            duration: prefersReducedMotion ? 0.01 : 0.8,
                            delay: 0.2,
                            ease: 'easeOut',
                          }}
                        />
                        <motion.div
                          className="h-1.5 bg-[#3d6562]/25 dark:bg-[#68b5ad]/25 rounded-full origin-left"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 0.55 }}
                          transition={{
                            duration: prefersReducedMotion ? 0.01 : 0.8,
                            delay: 0.4,
                            ease: 'easeOut',
                          }}
                        />
                      </div>

                      {/* Total line */}
                      <div className="flex justify-between items-center pt-1.5 border-t border-[#001126]/8 dark:border-white/8">
                        <div className="w-6 h-1.5 bg-[#15263c]/15 dark:bg-white/15 rounded-full" />
                        <motion.div
                          className="w-8 h-2 bg-[#001126] dark:bg-[#f3f6fa] rounded-full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6, duration: 0.4 }}
                        />
                      </div>
                    </div>

                    {/* Subtle pulsing ring behind the document */}
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute -inset-3 border border-[#3d6562]/15 dark:border-[#68b5ad]/15 rounded-2xl"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </div>

                  {/* Status text */}
                  <div className="space-y-3">
                    <motion.p
                      key={displayText}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-semibold text-[#001126] dark:text-[#f3f6fa] tracking-tight"
                    >
                      {displayText}
                    </motion.p>

                    {/* Progress track */}
                    <div className="w-48 h-1 bg-[#001126]/8 dark:bg-white/8 rounded-full overflow-hidden mx-auto">
                      <motion.div
                        className="h-full bg-[#15263c] dark:bg-[#38bdf8] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(30 + stageIndex * 30, 90)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>

                    {/* Invoice details summary */}
                    {(clientName || invoiceNumber) && (
                      <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">
                        {clientName && <span>{clientName}</span>}
                        {clientName && invoiceNumber && <span> • </span>}
                        {invoiceNumber && <span>{invoiceNumber}</span>}
                        {amount && <span> • {amount}</span>}
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : isSuccess ? (
                /* ── Success State ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: prefersReducedMotion ? 0.05 : 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex flex-col items-center space-y-5"
                >
                  <div className="w-16 h-16 rounded-full bg-[#bfebe6] dark:bg-[#3d6562]/30 text-[#00201e] dark:text-[#68b5ad] flex items-center justify-center shadow-sm">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : 0.1,
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="material-symbols-outlined text-[32px]"
                    >
                      check
                    </motion.span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-base font-bold text-[#00201e] dark:text-[#68b5ad]">
                      Invoice saved successfully
                    </p>
                    {invoiceNumber && (
                      <p className="text-xs text-[#74777d] dark:text-[#94a3b8]">
                        {invoiceNumber} has been created and is ready for tracking.
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* ── Error State ── */
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
                  className="flex flex-col items-center space-y-5 w-full"
                >
                  <div className="w-16 h-16 rounded-full bg-[#ffdad6] dark:bg-[#ba1a1a]/20 text-[#ba1a1a] dark:text-[#ff897d] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">error</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-base font-bold text-[#ba1a1a] dark:text-[#ff897d]">
                      Failed to save invoice
                    </p>
                    {errorMessage && (
                      <p className="text-xs text-[#74777d] dark:text-[#94a3b8] max-w-sm">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="btn-action-primary text-xs font-semibold px-5 py-2.5 rounded-lg cursor-pointer"
                      >
                        Try again
                      </button>
                    )}
                    {onClose && (
                      <button
                        onClick={onClose}
                        className="btn-action-secondary text-xs font-semibold px-5 py-2.5 rounded-lg cursor-pointer"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
