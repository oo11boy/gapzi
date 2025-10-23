'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface CreateRoomModalProps {
  showCreateRoom: boolean;
  setShowCreateRoom: (value: boolean) => void;
  siteUrl: string;
  setSiteUrl: (value: string) => void;
  createRoom: () => void;
}

export default function CreateRoomModal({ showCreateRoom, setShowCreateRoom, siteUrl, setSiteUrl, createRoom }: CreateRoomModalProps) {
  return (
    <AnimatePresence>
      {showCreateRoom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 text-left shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ایجاد اتاق جدید
                </h3>
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-20 h-20 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    برای شروع، یک سایت جدید اضافه کنید
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    آدرس وبسایت
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-gray-400">🌐</span>
                    </div>
                    <input
                      type="url"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-indigo-500/50 focus:outline-none transition-all duration-300 shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all duration-300"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={createRoom}
                    disabled={!siteUrl}
                    className="flex-1 py-4 px-6 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>ایجاد اتاق</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}