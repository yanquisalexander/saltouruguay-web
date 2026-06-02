import type { Variants, Transition } from "motion/react";

export type TransitionType = "fade" | "flash" | "glitch" | "zoom" | "slide-up" | "none";

export const itemVariants: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  flash: {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 0.3, 1] },
    exit: { opacity: 0 },
  },
  glitch: {
    initial: { x: 0 },
    animate: { x: [0, -2, 2, -1, 0], opacity: [1, 0.8, 1] },
    exit: { x: 0, opacity: 0 },
  },
  zoom: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.02, opacity: 0 },
  },
  "slide-up": {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

export const itemTransition: Transition = { duration: 0.3, ease: "easeOut" };
