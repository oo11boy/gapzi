// components/Header.tsx
'use client';

import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { classNames } from './utils/classNames';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

export default function Header({
  darkMode,
  setDarkMode,
  mobileOpen,
  setMobileOpen,
}: HeaderProps) {
  return (
    <div className="flex w-full items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      {/* لوگو */}
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <div className="p-2 bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
          <span className="text-white font-bold text-2xl">Chat</span>
        </div>
        گپ زی
      </h2>

      <div className="flex items-center gap-3">
        {/* سوییچ حالت تاریک */}
        <Switch
          checked={darkMode}
          onChange={setDarkMode}
          className={classNames(
            darkMode
              ? 'bg-linear-to-r from-gray-800 via-gray-700 to-gray-600'
              : 'bg-linear-to-r from-yellow-400 via-orange-400 to-red-400',
            'relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:brightness-110'
          )}
        >
          <span className="sr-only">تغییر حالت تاریک</span>
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 700, damping: 25 }}
            className="absolute top-1 left-1 h-6 w-6 rounded-full flex items-center justify-center shadow-md
              hover:scale-110 hover:shadow-lg transition-transform duration-200
              bg-linear-to-tr from-gray-100 via-gray-200 to-gray-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700"
            style={{
              transform: darkMode ? 'translateX(100%) translateX(-0.25rem)' : 'translateX(0)',
            }}
          >
            <motion.div
              className={`absolute inset-0 rounded-full ${darkMode ? 'bg-gray-900/40 blur-sm' : 'bg-yellow-500/30 blur-sm'}`}
              animate={{ opacity: darkMode ? 0.3 : 0.4 }}
            />
            <AnimatePresence mode="wait">
              {darkMode ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="relative text-yellow-300"
                >
                  <MoonIcon className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="relative text-white"
                >
                  <SunIcon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Switch>

        {/* دکمه منوی همبرگری */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          {mobileOpen ? (
            <XMarkIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          ) : (
            <Bars3Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          )}
        </button>
      </div>
    </div>
  );
}