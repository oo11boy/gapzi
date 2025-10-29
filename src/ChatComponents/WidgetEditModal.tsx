// WidgetEditModal.tsx
'use client';

import { Palette, Type, MessageSquare, Sparkles, Save, ArrowLeftIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface WidgetEditModalProps {
  settings: {
    primary_color: string;
    secondary_color: string;
    chat_title: string;
    placeholder_text: string;
    welcome_message: string;
    font_family: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSave: () => Promise<void>;
  show: boolean;
  onClose: () => void;
}

export default function WidgetEditModal({
  settings,
  handleChange,
  handleSave,
  show,
  onClose,
}: WidgetEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    setIsSaving(true);
    try {
      await handleSave();
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const hexToRgb = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const lighten = (hex: string, percent: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const b = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  };

  const darken = (hex: string, percent: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.max(0, (num >> 16) - amt);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const b = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-60 bg-white dark:bg-gray-900 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                ویرایش ویجت
              </h3>
              <div className="w-10" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-7xl mx-auto">
                {/* Left Column: Settings Form */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    تنظیمات ویجت
                  </h3>

                  {/* Primary Color */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Palette className="w-4 h-4" />
                      رنگ اصلی
                    </label>
                    <div className="relative group">
                      <input
                        type="color"
                        name="primary_color"
                        value={settings.primary_color}
                        onChange={handleChange}
                        className="w-full h-12 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-gray-700 
                                 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                                 transition-all duration-200"
                        style={{ backgroundColor: settings.primary_color }}
                      />
                      <span className="absolute bottom-1 left-1 text-xs text-white font-mono bg-black/30 px-1 rounded">
                        {settings.primary_color}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Palette className="w-4 h-4" />
                      رنگ ثانویه
                    </label>
                    <div className="relative group">
                      <input
                        type="color"
                        name="secondary_color"
                        value={settings.secondary_color}
                        onChange={handleChange}
                        className="w-full h-12 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-gray-700 
                                 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                                 transition-all duration-200"
                        style={{ backgroundColor: settings.secondary_color }}
                      />
                      <span className="absolute bottom-1 left-1 text-xs text-white font-mono bg-black/30 px-1 rounded">
                        {settings.secondary_color}
                      </span>
                    </div>
                  </div>

                  {/* Chat Title */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Type className="w-4 h-4" />
                      عنوان چت
                    </label>
                    <input
                      type="text"
                      name="chat_title"
                      value={settings.chat_title}
                      onChange={handleChange}
                      placeholder="مثال: پشتیبانی هوشمند"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                               transition-all duration-200"
                    />
                  </div>

                  {/* Placeholder Text */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MessageSquare className="w-4 h-4" />
                      متن پیش‌فرض ورودی
                    </label>
                    <input
                      type="text"
                      name="placeholder_text"
                      value={settings.placeholder_text}
                      onChange={handleChange}
                      placeholder="سوال خود را بپرسید..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                               transition-all duration-200"
                    />
                  </div>

                  {/* Welcome Message */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Sparkles className="w-4 h-4" />
                      پیام خوش‌آمدگویی
                    </label>
                    <textarea
                      name="welcome_message"
                      value={settings.welcome_message || ''}
                      onChange={handleChange}
                      rows={3}
                      placeholder="سلام! چطور می‌توانم به شما کمک کنم؟"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                               resize-none transition-all duration-200"
                    />
                  </div>

                  {/* Font Family */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Type className="w-4 h-4" />
                      فونت خانواده
                    </label>
                    <input
                      type="text"
                      name="font_family"
                      value={settings.font_family}
                      onChange={handleChange}
                      placeholder="مثال: Vazirmatn, Inter, system-ui"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 
                               transition-all duration-200 font-mono text-sm"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 
                             bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800
                             text-white font-medium rounded-xl 
                             shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 
                             transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        ذخیره تنظیمات
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Live Preview */}
                <div className="lg:sticky lg:top-6 h-fit">
                  <div className="p-6 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      پیش‌نمایش زنده ویجت
                    </p>

                    <div className="relative h-96 md:h-[500px] bg-linear-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden shadow-inner">
                      {/* Floating Button */}
                      <div
                        className="absolute bottom-6 right-6 w-16 h-16 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                        style={{
                          backgroundColor: settings.primary_color,
                          boxShadow: `0 4px 10px rgba(${hexToRgb(settings.primary_color)}, 0.3)`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darken(settings.primary_color, 10))}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = settings.primary_color)}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill={settings.secondary_color}>
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                        </svg>
                      </div>

                      {/* Chat Window */}
                      <div
                        className="absolute bottom-24 right-6 w-80 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        style={{
                          fontFamily: `'${settings.font_family}', sans-serif`,
                          direction: 'rtl',
                        }}
                      >
                        {/* Header */}
                        <div
                          className="p-4 flex flex-col gap-2"
                          style={{
                            backgroundColor: settings.primary_color,
                            color: settings.secondary_color,
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">{settings.chat_title}</span>
                            <button className="text-2xl">×</button>
                          </div>
                          <div
                            className="text-xs font-medium px-3 py-1 rounded-full inline-flex items-center gap-1"
                            style={{
                              background: 'rgba(255,255,255,0.15)',
                              backdropFilter: 'blur(4px)',
                              color: lighten(settings.secondary_color, 20),
                            }}
                          >
                            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                            ادمین آنلاین است
                          </div>
                        </div>

                        {/* Messages */}
                        <div
                          className="flex-1 p-4 space-y-3 overflow-y-auto"
                          style={{
                            backgroundColor: lighten(settings.secondary_color, 5),
                          }}
                        >
                          {settings.welcome_message && (
                            <div
                              className="max-w-[80%] p-3 rounded-xl rounded-bl-sm text-sm"
                              style={{
                                backgroundColor: lighten(settings.secondary_color, 10),
                                color: '#333',
                              }}
                            >
                              {settings.welcome_message}
                            </div>
                          )}
                        </div>

                        {/* Input */}
                        <div
                          className="p-3 flex gap-2 border-t"
                          style={{
                            backgroundColor: settings.secondary_color,
                            borderColor: lighten(settings.secondary_color, 15),
                          }}
                        >
                          <input
                            type="text"
                            placeholder={settings.placeholder_text}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition"
                            style={{
                              borderColor: lighten(settings.secondary_color, 20),
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = settings.primary_color;
                              e.target.style.boxShadow = `0 0 0 2px rgba(${hexToRgb(settings.primary_color)}, 0.2)`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = lighten(settings.secondary_color, 20);
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                          <button
                            className="px-4 py-2 text-sm font-medium rounded-lg transition"
                            style={{
                              backgroundColor: settings.primary_color,
                              color: settings.secondary_color,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darken(settings.primary_color, 10))}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = settings.primary_color)}
                          >
                            ارسال
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                      تغییرات بلافاصله اعمال می‌شود
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}