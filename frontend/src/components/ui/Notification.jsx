/**
 * Notification Toast — animated floating notification
 */
import { motion, AnimatePresence } from 'framer-motion';

export default function Notification({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 text-sm font-medium text-text-primary"
          style={{ maxWidth: '90vw' }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
