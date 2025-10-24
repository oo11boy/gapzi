'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SettingsModalProps {
  showSettingsModal: boolean;
  setShowSettingsModal: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function SettingsModal({
  showSettingsModal,
  setShowSettingsModal,
  darkMode,
  setDarkMode,
}: SettingsModalProps) {
  return (
    <AnimatePresence>
      {showSettingsModal && (
        <>
          {/* بک‌دراپ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={() => setShowSettingsModal(false)}
          />

          {/* مودال */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl z-50 w-[90%] max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                ⚙️ تنظیمات
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">حالت تاریک</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div
                    className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      darkMode ? 'translate-x-5' : ''
                    }`}
                  />
                </label>
              </div>

              {/* تنظیمات دلخواه دیگر */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  در آینده می‌توانید گزینه‌های بیشتری مثل زبان، اعلان‌ها و فونت را اینجا تنظیم کنید.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
