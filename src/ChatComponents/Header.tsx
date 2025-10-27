'use client';
import { useState } from 'react';
import { PlusIcon, Bars3Icon, XMarkIcon, HomeIcon, MoonIcon, SunIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { classNames } from './utils/classNames';

interface SidebarProps {
  setShowCreateRoom: (val: boolean) => void;
  setShowSelectSiteModal: (val: boolean) => void;
  setShowSettingsModal: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Header({ darkMode, setDarkMode, setShowCreateRoom, setShowSelectSiteModal ,setShowSettingsModal}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const buttons = [
    {
      label: 'انتخاب سایت',
      icon: <HomeIcon className="w-5 h-5" />,
      onClick: () => setShowSelectSiteModal(true),
      bg: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      label: 'ایجاد چت',
      icon: <PlusIcon className="w-5 h-5" />,
      onClick: () => setShowCreateRoom(true),
      bg: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
  label: 'تنظیمات',
  icon: <Bars3Icon className="w-5 h-5" />,
  onClick: () => setShowSettingsModal(true),
  bg: 'bg-gray-500 hover:bg-gray-600',
},
    {
  label: 'خروج',
  icon: <ExclamationCircleIcon className="w-5 h-5" />,
  onClick: async () => {
                  await fetch("/api/logout", { method: "POST" });
                  window.location.href = "/login";
                },
  bg: 'bg-gray-500 hover:bg-gray-600',
},



  ];

  return (
    <>


      <div className=" flex w-full items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <div className="p-2 bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <span className="text-white font-bold text-2xl">💬</span>
          </div>
          گپ زی
        </h2>

        <div className="flex items-center gap-2">
          {/* Dark Mode Switch */}
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

      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-xl z-50 p-4 flex flex-col space-y-4"
            >
              {/* دکمه بستن */}
              <button
                onClick={() => setMobileOpen(false)}
                className="self-end p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <XMarkIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </button>

              {/* دکمه‌ها */}
              {buttons.map((btn) => (
                <motion.button
                  key={btn.label}
                  onClick={() => {
                    btn.onClick();
                    setMobileOpen(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${btn.bg} text-white py-2 rounded-xl shadow w-full flex items-center justify-center space-x-2`}
                >
                  {btn.icon}
                  <span>{btn.label}</span>
                </motion.button>
              ))}

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
