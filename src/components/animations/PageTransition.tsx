import React from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  tabKey?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, tabKey }) => {
  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
