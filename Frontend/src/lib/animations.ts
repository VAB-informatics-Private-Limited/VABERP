import type { Variants, Transition } from 'framer-motion';

// Easing curves
export const smoothEasing = [0.16, 1, 0.3, 1] as const;

export const smoothTransition: Transition = {
  duration: 0.35,
  ease: smoothEasing,
};

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: smoothEasing } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: smoothEasing } },
};

// Stagger container
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// Stagger item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: smoothEasing } },
};

// Fade in
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: smoothEasing } },
};

// Fade in up
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: smoothEasing } },
};

// Card entrance
export const cardVariant: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: smoothEasing } },
};

// Hover lift effect
export const hoverLift = {
  y: -2,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  transition: { duration: 0.2, ease: smoothEasing },
};

export const tapScale = {
  scale: 0.98,
};
