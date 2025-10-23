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
          className="mx-4 sm:mx-6 lg:mx-8 mt-4 max-w-7xl"
        >
          <div className="bg-linear-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}