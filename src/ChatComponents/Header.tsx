'use client';
import { useState } from 'react';
import {
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import WidgetEditModal from './WidgetEditModal';
import ProfileEditModal from './ProfileEditModal';
import { classNames } from './utils/classNames';

interface SidebarProps {
  setShowCreateRoom: (val: boolean) => void;
  setShowSelectSiteModal: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  currentUser: {
    fullName: string;
    username: string;
    initials: string;
    isOnline: boolean;
  } | null;
  selectedRoom: { room_code: string } | null;
}

export default function Header({
  darkMode,
  setDarkMode,
  setShowCreateRoom,
  setShowSelectSiteModal,
  currentUser,
  selectedRoom,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [showWidgetEditModal, setShowWidgetEditModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [settings, setSettings] = useState({
    primary_color: '#007bff',
    secondary_color: '#ffffff',
    chat_title: 'چت زنده',
    placeholder_text: 'پیام خود را بنویسید...',
    welcome_message: '',
    font_family: 'Vazirmatn',
  });

  // بارگذاری تنظیمات ویجت
  const loadWidgetSettings = async () => {
    if (!selectedRoom?.room_code) return;
    try {
      const res = await fetch(`/api/widget-settings?room=${selectedRoom.room_code}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedRoom?.room_code) return;
    try {
      await fetch('/api/widget-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          room_code: selectedRoom.room_code,
          ...settings,
        }),
      });
      setShowWidgetEditModal(false);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const menuItems = [
    {
      label: 'انتخاب سایت',
      icon: <HomeIcon className="w-6 h-6" />,
      onClick: () => {
        setShowSelectSiteModal(true);
        setMobileOpen(false);
      },
    },
    {
      label: 'ایجاد چت',
      icon: <PlusIcon className="w-6 h-6" />,
      onClick: () => {
        setShowCreateRoom(true);
        setMobileOpen(false);
      },
    },
    {
      label: 'تنظیمات',
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      onClick: () => {
        setShowSettingsSubmenu(!showSettingsSubmenu);
      },
    },
    {
      label: 'خروج',
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />,
      onClick: async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
      },
      danger: true,
    },
  ];

  return (
    <>
      {/* هدر بالا — شامل لوگو، سوییچ تاریک و منوی همبرگری */}
      <div className="flex w-full items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
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

      {/* سایدبار کشویی */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
            >
              {/* پروفایل کاربر */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                {currentUser ? (
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {currentUser.initials}
                        </div>
                      </div>
                      {currentUser.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md">
                          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping"></span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                        {currentUser.fullName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username}</p>
                      {currentUser.isOnline && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center justify-end gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          آنلاین
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="flex-1 text-right space-y-2">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* منوی اصلی */}
              <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                  <div key={item.label}>
                    <motion.button
                      onClick={() => {
                        if (item.label === 'تنظیمات') {
                          setShowSettingsSubmenu(!showSettingsSubmenu);
                        } else {
                          item.onClick();
                          setMobileOpen(false);
                        }
                      }}
                      whileTap={{ scale: 0.95 }}
                      className={classNames(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl text-right transition-all',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        item.danger ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
                      )}
                    >
                      <span className="font-medium">{item.label}</span>
                      <div
                        className={classNames(
                          'text-gray-500 dark:text-gray-400 transition-transform',
                          item.label === 'تنظیمات' && showSettingsSubmenu ? 'rotate-90' : ''
                        )}
                      >
                        {item.label === 'تنظیمات' ? (
                          <ChevronLeftIcon className="w-5 h-5" />
                        ) : (
                          item.icon
                        )}
                      </div>
                    </motion.button>

                    {/* زیرمنوی تنظیمات */}
                    <AnimatePresence>
                      {item.label === 'تنظیمات' && showSettingsSubmenu && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pr-8 space-y-1 mt-1">
                            <button
                              onClick={() => {
                                loadWidgetSettings();
                                setShowWidgetEditModal(true);
                                setMobileOpen(false);
                              }}
                              className="w-full text-right py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            >
                              ویرایش ویجت
                            </button>
                            <button
                              onClick={() => {
                                setShowProfileEditModal(true);
                                setMobileOpen(false);
                              }}
                              className="w-full text-right py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            >
                              تغییر اطلاعات پروفایل
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* دکمه بستن */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                  <span>بستن منو</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* مودال‌های مستقل */}
      <WidgetEditModal
        settings={settings}
        handleChange={handleChange}
        handleSave={handleSaveSettings}
        show={showWidgetEditModal}
        onClose={() => setShowWidgetEditModal(false)}
      />

      <ProfileEditModal show={showProfileEditModal} onClose={() => setShowProfileEditModal(false)} />
    </>
  );
}