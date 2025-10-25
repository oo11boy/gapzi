import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import WidgetEditModal from './WidgetEditModal'; // مسیر فایل WidgetEditModal را وارد کنید

interface SettingsModalProps {
  showSettingsModal: boolean;
  setShowSettingsModal: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedRoom: { room_code: string } | null;
}

export default function SettingsModal({
  showSettingsModal,
  setShowSettingsModal,
  darkMode,
  setDarkMode,
  selectedRoom,
}: SettingsModalProps) {
  const [settings, setSettings] = useState({
    primary_color: '#007bff',
    secondary_color: '#ffffff',
    chat_title: 'چت زنده',
    placeholder_text: 'پیام خود را بنویسید...',
    welcome_message: '',
    font_family: 'Vazirmatn',
  });
  const [showWidgetEditModal, setShowWidgetEditModal] = useState(false); // state جدید برای مودال ویرایش ویجت

  // بارگذاری تنظیمات فعلی
  useEffect(() => {
    if (selectedRoom?.room_code) {
      fetch(`/api/widget-settings?room=${selectedRoom.room_code}`)
        .then((res) => res.json())
        .then((data) => setSettings(data))
        .catch((err) => console.error('Error loading settings:', err));
    }
  }, [selectedRoom]);

  const handleSave = async () => {
    if (!selectedRoom?.room_code) {
      alert('لطفاً یک اتاق انتخاب کنید');
      return;
    }

    try {
      const res = await fetch('/api/widget-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ room_code: selectedRoom.room_code, ...settings }),
      });
      if (res.ok) {
        alert('تنظیمات با موفقیت ذخیره شد');
        setShowSettingsModal(false);
        setShowWidgetEditModal(false); // بستن مودال ویرایش ویجت در صورت ذخیره
      } else {
        alert('خطا در ذخیره تنظیمات');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('خطا در ذخیره تنظیمات');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  return (
    <AnimatePresence>
      {showSettingsModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={() => setShowSettingsModal(false)}
          />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl z-50 w-[90%] max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">⚙️ تنظیمات</h3>
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
                  <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
                </label>
              </div>
              <button
                onClick={() => setShowWidgetEditModal(true)} // باز کردن مودال ویرایش ویجت
                className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
              >
                ویرایش ویجت
              </button>
            </div>

            {/* رندر مودال ویرایش ویجت */}
            <AnimatePresence>
              {showWidgetEditModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black z-50"
                    onClick={() => setShowWidgetEditModal(false)}
                  />
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="fixed bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl z-60 w-[90%] max-w-md p-6"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">⚙️ ویرایش ویجت</h3>
                      <button
                        onClick={() => setShowWidgetEditModal(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg"
                      >
                        <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <WidgetEditModal
                      settings={settings}
                      handleChange={handleChange}
                      handleSave={handleSave}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}