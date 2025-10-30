'use client';

import { useState } from 'react';
import {
  PlusIcon,
  HomeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import WidgetEditModal from './WidgetEditModal';
import ProfileEditModal from './ProfileEditModal';
import { classNames } from './utils/classNames';

interface SidebarProps {
  setShowCreateRoom: (val: boolean) => void;
  setShowSelectSiteModal: (val: boolean) => void;
  currentUser: {
    fullName: string;
    username: string;
    initials: string;
    isOnline: boolean;
  } | null;
  selectedRoom: { room_code: string } | null;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export default function Sidebar({
  setShowCreateRoom,
  setShowSelectSiteModal,
  currentUser,
  selectedRoom,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [showWidgetEditModal, setShowWidgetEditModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [activeItem, setActiveItem] = useState('');
  const [settings, setSettings] = useState({
    primary_color: '#4f46e5',
    secondary_color: '#ffffff',
    chat_title: 'چت زنده',
    placeholder_text: 'پیام خود را بنویسید...',
    welcome_message: '',
    font_family: 'Vazirmatn',
  });

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
        setActiveItem('انتخاب سایت');
      },
    },
    {
      label: 'ایجاد چت',
      icon: <PlusIcon className="w-6 h-6" />,
      onClick: () => {
        setShowCreateRoom(true);
        setMobileOpen(false);
        setActiveItem('ایجاد چت');
      },
    },
    {
      label: 'تنظیمات',
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      onClick: () => setShowSettingsSubmenu(!showSettingsSubmenu),
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
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-linear-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 shadow-2xl z-50 flex flex-col"
            >
              {/* Profile */}
              <div className="p-6 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
                {currentUser ? (
                  <>
                    <div className="relative w-20 h-20 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {currentUser.initials}
                      </div>
                      {currentUser.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900 shadow-md animate-pulse"></span>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-100">{currentUser.fullName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username}</p>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-2 animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                )}
              </div>

              {/* Menu */}
              <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                  <motion.div key={item.label} whileHover={{ scale: 1.02 }} className="relative">
                    <button
                      onClick={() => {
                        if (item.label === 'تنظیمات') setShowSettingsSubmenu(!showSettingsSubmenu);
                        else item.onClick();
                      }}
                      className={classNames(
                        'flex items-center justify-between w-full px-5 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md',
                        activeItem === item.label
                          ? 'bg-indigo-100 dark:bg-indigo-800 font-semibold'
                          : 'bg-white dark:bg-gray-900',
                        item.danger ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
                      )}
                    >
                      <span className="flex items-center gap-4">
                        {item.icon}
                        <span className="text-md">{item.label}</span>
                      </span>
                      {item.label === 'تنظیمات' && <ChevronRightIcon className={`w-5 h-5 transition-transform ${showSettingsSubmenu ? 'rotate-90' : ''}`} />}
                    </button>

                    {/* Settings Submenu */}
                    <AnimatePresence>
                      {item.label === 'تنظیمات' && showSettingsSubmenu && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden pl-12 mt-2 space-y-1"
                        >
                          <button
                            onClick={() => {
                              loadWidgetSettings();
                              setShowWidgetEditModal(true);
                              setMobileOpen(false);
                            }}
                            className="w-full text-right py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg transition"
                          >
                            ویرایش ویجت
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileEditModal(true);
                              setMobileOpen(false);
                            }}
                            className="w-full text-right py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg transition"
                          >
                            تغییر اطلاعات پروفایل
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Close Button */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full gap-2 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                  <span>بستن منو</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
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
