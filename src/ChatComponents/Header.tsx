'use client';
import { Switch } from '@headlessui/react';
import { BellIcon, SunIcon, MoonIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from './utils/classNames';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  newMessageAlert: boolean;
  setShowSelectSiteModal: (value: boolean) => void;
  setShowCreateRoom: (value: boolean) => void;
}

export default function Header({ darkMode, setDarkMode, newMessageAlert, setShowSelectSiteModal, setShowCreateRoom }: HeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/50">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <span className="text-white font-bold text-2xl">💬</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                داشبورد چت زنده
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">پنل مدیریت پیشرفته</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <AnimatePresence>
              {newMessageAlert && (
                <motion.div
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -10 }}
                  className="relative group"
                >
                  <div className="p-2 bg-red-500/20 rounded-full backdrop-blur-sm border border-red-500/30">
                    <BellIcon className="w-5 h-5 text-red-400 animate-pulse" />
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute -top-10 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap"
                  >
                    پیام جدید
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setShowSelectSiteModal(true)}
              className="group flex items-center space-x-2 space-x-reverse px-4 py-2 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <span>انتخاب سایت</span>
            </button>

            <button
              onClick={() => setShowCreateRoom(true)}
              className="group flex items-center space-x-2 space-x-reverse px-4 py-2 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <PlusIcon className="w-4 h-4" />
              <span>ایجاد چت</span>
            </button>

            <Switch 
              checked={darkMode} 
              onChange={setDarkMode}
              className={classNames(
                'relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none',
                darkMode ? 'bg-linear-to-r from-gray-700 to-gray-800' : 'bg-linear-to-r from-gray-200 to-gray-300'
              )}
            >
              <span className="sr-only">تغییر حالت تاریک</span>
              <motion.span 
                layout 
                className={classNames(
                  'mx-0.5 h-9 w-9 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg transition-all duration-300',
                  darkMode ? 'translate-x-10' : 'translate-x-1'
                )}
              >
                {darkMode ? (
                  <MoonIcon className="w-5 h-5 text-gray-900" />
                ) : (
                  <SunIcon className="w-5 h-5 text-yellow-500" />
                )}
              </motion.span>
            </Switch>
          </div>
        </div>
      </div>
    </div>
  );
}