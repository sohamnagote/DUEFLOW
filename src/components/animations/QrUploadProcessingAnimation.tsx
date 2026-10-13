import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface QrUploadProcessingAnimationProps {
  isUploading: boolean;
  isSuccess?: boolean;
  previewUrl?: string | null;
  error?: string | null;
}

export const QrUploadProcessingAnimation: React.FC<QrUploadProcessingAnimationProps> = ({
  isUploading,
  isSuccess = false,
  previewUrl,
  error,
}) => {
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#001126]/10 dark:border-white/10 bg-[#f5f3ee] dark:bg-[#182638] p-3 flex flex-col items-center justify-center min-h-[140px]">
      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center space-y-3 w-full"
          >
            {/* Animated scanning box */}
            <div className="relative w-20 h-20 rounded-lg bg-[#ffffff] dark:bg-[#203046] border border-[#001126]/15 dark:border-white/15 flex items-center justify-center shadow-inner overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="QR Preview" className="w-full h-full object-contain opacity-50" />
              ) : (
                <span className="material-symbols-outlined text-[32px] text-[#74777d]">qr_code_2</span>
              )}

              {/* Scanning laser line */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-[#3d6562] dark:bg-[#68b5ad] shadow-[0_0_8px_#3d6562]"
                animate={{ top: ['0%', '95%', '0%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="space-y-1 text-center w-full max-w-[180px]">
              <p className="text-xs font-semibold text-[#001126] dark:text-[#f3f6fa]">
                Encrypting & uploading QR...
              </p>
              <div className="w-full h-1 bg-[#001126]/10 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#3d6562] dark:bg-[#68b5ad] rounded-full"
                  initial={{ x: '-100%', width: '35%' }}
                  animate={{ x: '300%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
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
            className="flex flex-col items-center space-y-2 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-[#bfebe6] dark:bg-[#3d6562]/40 text-[#00201e] dark:text-[#68b5ad] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <p className="text-xs font-bold text-[#00201e] dark:text-[#68b5ad]">
              QR Code Saved Securely!
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-2 text-center text-[#ba1a1a] dark:text-[#ff897d]"
          >
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] dark:bg-[#ba1a1a]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">error</span>
            </div>
            <p className="text-xs font-medium max-w-[200px] leading-tight">{error}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
