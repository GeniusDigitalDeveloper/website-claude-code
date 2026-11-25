"use client";
import { motion } from "motion/react";

/** iOS-style page transition: soft spring slide-up + fade on every navigation. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}>
      {children}
    </motion.div>
  );
}
