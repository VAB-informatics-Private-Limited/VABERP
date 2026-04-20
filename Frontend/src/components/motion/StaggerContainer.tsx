'use client';

import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/animations';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay }: StaggerContainerProps) {
  return (
    <motion.div
      variants={delay !== undefined ? {
        initial: {},
        animate: { transition: { staggerChildren: 0.06, delayChildren: delay } },
      } : staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}
