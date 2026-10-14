import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ClientProcessingAnimationProps {
  isSuccess?: boolean;
  isError?: boolean;
  statusText?: string;
  clientName?: string;
  clientEmail?: string;
}

export const ClientProcessingAnimation: React.FC<ClientProcessingAnimationProps> = ({
  isSuccess = false,
  isError = false,
  statusText = 'Saving client to directory...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
      <AnimatePresence mode="wait">
        {!isSuccess && !isError ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center space-y-4"
          >
            {/* Animated Client ID Card */}
            <div className="relative w-28 h-18 bg-[#ffffff] dark:bg-[#1a283c] rounded-xl border border-[#001126]/15 dark:border-white/15 shadow-md p-2.5 flex items-center gap-2.5 overflow-hidden">
              {/* Avatar silhouette circle */}
              <motion.div
                className="w-8 h-8 rounded-full bg-[#15263c]/10 dark:bg-white/10 flex items-center justify-center text-[#15263c] dark:text-[#f3f6fa] shrink-0"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
              </motion.div>

              {/* Text lines */}
              <div className="space-y-1.5 flex-1">
                <motion.div
                  className="h-2 bg-[#15263c]/35 dark:bg-white/35 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '80%' }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
                <motion.div
                  className="h-1.5 bg-[#15263c]/20 dark:bg-white/20 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, repeatType: 'reverse' }}
                />
              </div>

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent pointer-events-none -skew-x-12"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                {statusText}
              </p>
              <div className="w-28 h-1 bg-[#001126]/10 dark:bg-white/10 rounded-full overflow-hidden mx-auto">
                <motion.div
                  className="h-full bg-[#15263c] dark:bg-[#38bdf8] rounded-full"
                  initial={{ x: '-100%', width: '40%' }}
                  animate={{ x: '250%' }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="flex flex-col items-center space-y-2.5"
          >
            <div className="w-12 h-12 rounded-full bg-[#bfebe6] dark:bg-[#3d6562]/40 text-[#00201e] dark:text-[#68b5ad] flex items-center justify-center shadow-sm">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                className="material-symbols-outlined text-[28px]"
              >
                check
              </motion.span>
            </div>
            <p className="text-xs font-bold text-[#00201e] dark:text-[#68b5ad]">
              Client saved to directory!
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-2 text-[#ba1a1a] dark:text-[#ff897d]"
          >
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] dark:bg-[#ba1a1a]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">error</span>
            </div>
            <p className="text-xs font-semibold">Failed to save client</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
