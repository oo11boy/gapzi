'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface EmbedCodeModalProps {
  showEmbedModal: boolean;
  setShowEmbedModal: (value: boolean) => void;
  embedCode: string;
}

export default function EmbedCodeModal({ showEmbedModal, setShowEmbedModal, embedCode }: EmbedCodeModalProps) {
  return (
    <AnimatePresence>
      {showEmbedModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
          onClick={() => setShowEmbedModal(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  کد Embed آماده است
                </h3>
                <button
                  onClick={() => setShowEmbedModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="bg-gray-900/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(embedCode);
                    }}
                    className="absolute top-3 left-3 p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-all duration-300"
                  >
                    <span className="text-emerald-500 font-medium text-sm">کپی</span>
                  </button>
                  <pre className="font-mono text-sm bg-gray-900/50 dark:bg-gray-800/50 rounded-lg p-6 overflow-auto border border-gray-700/30 text-white/90 leading-relaxed">
                    {embedCode}
                  </pre>
                </div>
              </div>
              <div className="mt-8 bg-linear-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
                <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center">
                  <CheckIcon className="w-5 h-5 mr-2" />
                  آماده استفاده
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  این کد را در <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">head</code> 
                  یا قبل از <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">closing body tag</code> 
                  وبسایت خود قرار دهید.
                </p>
              </div>
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setShowEmbedModal(false)}
                  className="px-8 py-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>بستن</span>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}