'use client';
import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

/** Scroll-triggered reveal. Runs once, never blocks interaction, respects prefers-reduced-motion. */
export function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item: Variants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

/** Staggers its <StaggerItem/> children as the group enters the viewport. */
export function Stagger({ children, className, style }: { children: ReactNode; className?: string; style?: HTMLMotionProps<'div'>['style'] }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} style={style} variants={container} initial={reduce ? 'show' : 'hidden'} whileInView="show" viewport={{ once: true, margin: '0px 0px -6% 0px' }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className, style }: { children: ReactNode; className?: string; style?: HTMLMotionProps<'div'>['style'] }) {
  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
}

/** Subtle hover/press feedback for cards and buttons (disabled for reduced motion). */
export function HoverLift({ children, className, style }: { children: ReactNode; className?: string; style?: HTMLMotionProps<'div'>['style'] }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} style={style} whileHover={reduce ? undefined : { y: -4 }} whileTap={reduce ? undefined : { scale: 0.99 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      {children}
    </motion.div>
  );
}
