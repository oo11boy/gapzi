'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorAlertProps {
  error: string;
  setError: (value: string) => void;
}

export default function ErrorAlert({ error, setError }: ErrorAlertProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
        >
          <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError('')}
              className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}