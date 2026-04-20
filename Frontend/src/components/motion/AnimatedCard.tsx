'use client';

import { motion } from 'framer-motion';
import { cardVariant, hoverLift, tapScale } from '@/lib/animations';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedCard({ children, className, style }: AnimatedCardProps) {
  return (
    <motion.div
      variants={cardVariant}
      initial="initial"
      animate="animate"
      whileHover={hoverLift}
      whileTap={tapScale}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
