'use client';

import { motion } from 'framer-motion';

/** Smooth fade between admin pages. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
