"use client";
import { useState } from "react";
import {
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PageHistoryItem {
  url: string;
  timestamp: string;
  duration: number;
}

interface UserMetadata {
  current_page?: string;
  page_history?: PageHistoryItem[];
  referrer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device_type?: "desktop" | "mobile" | "tablet";
  ip_address?: string;
}

interface UserInfoSidebarProps {
  metadata: UserMetadata | null;
  darkMode: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function UserInfoSidebar({
  metadata,
  darkMode,
  isMobile = false,
  onClose,
}: UserInfoSidebarProps) {
  const [expandedHistory, setExpandedHistory] = useState(false);

  if (!metadata)
    return (
      <div
        className={`rounded-2xl p-6 col-span-3 text-center shadow-xl border backdrop-blur-md ${
          darkMode
            ? "bg-gray-900/60 border-gray-700 text-gray-400"
            : "bg-white/60 border-gray-200 text-gray-500"
        }`}
      >
        <p className="text-sm">اطلاعات کاربر در دسترس نیست</p>
      </div>
    );

  const formatDurationRange = (seconds: number): string => {
    if (seconds < 30) return "زیر 30 ثانیه";
    if (seconds < 60) return "۳۰ ثانیه تا ۱ دقیقه";
    if (seconds < 120) return "۱ تا ۲ دقیقه";
    if (seconds < 180) return "۲ تا ۳ دقیقه";
    if (seconds < 240) return "۳ تا ۴ دقیقه";
    if (seconds < 300) return "۴ تا ۵ دقیقه";
    if (seconds < 600) return "۵ تا ۱۰ دقیقه";
    return "بیش از ۱۰ دقیقه";
  };

  const formatReferrer = (referrer: string): string => {
    if (!referrer || referrer === "مستقیم") return "ورود مستقیم";
    try {
      return new URL(referrer).hostname.replace("www.", "");
    } catch {
      return referrer;
    }
  };

  const DeviceIcon =
    {
      mobile: SmartphoneIcon,
      tablet: TabletIcon,
      desktop: MonitorIcon,
    }[metadata.device_type || "desktop"] ?? MonitorIcon;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`rounded-3xl col-span-3 relative p-6 border shadow-xl backdrop-blur-xl overflow-hidden ${
        darkMode
          ? "bg-linear-to-br from-gray-900/80 to-gray-800/70 border-gray-700 text-gray-100"
          : "bg-linear-to-br from-white/80 to-gray-100/60 border-gray-200 text-gray-800"
      }`}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <GlobeIcon className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-semibold text-lg">اطلاعات کاربر</h3>
        </div>

        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200/30 dark:hover:bg-gray-700/50 transition"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* content */}
      <div className="space-y-5">
        {/* موقعیت جغرافیایی */}
        {(metadata.country || metadata.city) && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 bg-green-500/10 dark:bg-green-500/5 p-3 rounded-xl"
          >
            <MapPinIcon className="w-4 h-4 text-green-500" />
            <span>
              {metadata.city || "نامشخص"}, {metadata.country || "نامشخص"}
            </span>
          </motion.div>
        )}

        {/* صفحه فعلی */}
        {metadata.current_page && (
          <div>
            <p className="text-xs opacity-70 mb-1">صفحه فعلی</p>
            <p className="truncate font-medium text-blue-600 dark:text-blue-400">
              {new URL(metadata.current_page).pathname}
            </p>
          </div>
        )}

        {/* مرجع ورود */}
        {metadata.referrer && (
          <div>
            <p className="text-xs opacity-70 mb-1">مرجع ورود</p>
            <p className="truncate text-purple-600 dark:text-purple-400 font-medium">
              {formatReferrer(metadata.referrer)}
            </p>
          </div>
        )}

        {/* دستگاه و مرورگر */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-2 bg-purple-500/10 dark:bg-purple-500/5 p-3 rounded-xl"
        >
          <DeviceIcon className="w-4 h-4 text-purple-500" />
          <span className="truncate text-sm">
            {metadata.browser} روی {metadata.os}
          </span>
        </motion.div>

{metadata.page_history && metadata.page_history.length > 0 && (
  <button
    onClick={() => setExpandedHistory(true)}
    className="flex items-center justify-between w-full text-xs font-medium mt-3 py-2 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition"
  >
    <span className="flex items-center gap-1">
      <ClockIcon className="w-4 h-4" />
      مشاهده مسیر کاربر
    </span>
  </button>
)}


      </div>

      {/* دکمه بستن در موبایل */}
      {isMobile && (
        <button
          onClick={onClose}
          className="mt-6 w-full text-sm font-medium bg-linear-to-r from-blue-600 to-purple-500 text-white py-2 rounded-xl hover:opacity-90 transition"
        >
          بستن اطلاعات
        </button>
      )}
    </motion.div>

    <AnimatePresence>
  {expandedHistory && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`relative max-w-5xl w-full rounded-3xl p-6 border shadow-2xl overflow-hidden ${
          darkMode
            ? "bg-linear-to-br from-gray-900/90 to-gray-800/80 border-gray-700 text-gray-100"
            : "bg-linear-to-br from-white/90 to-gray-50/80 border-gray-200 text-gray-800"
        }`}
      >
        {/* دکمه بستن */}
        <button
          onClick={() => setExpandedHistory(false)}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-200/20 dark:hover:bg-gray-700/40 transition"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* عنوان مودال */}
        <div className="flex items-center justify-center mb-6">
          <ClockIcon className="w-5 h-5 text-blue-500 ml-2" />
          <h3 className="font-semibold text-lg">نقشه مسیر کاربر</h3>
        </div>

        {/* رودمپ */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-blue-500/40 scrollbar-track-transparent">
          <div className="flex md:flex-row flex-col items-center md:space-x-8 space-y-6 md:space-y-0 min-w-full md:pb-6">
            {(metadata.page_history ?? []).map((page, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col items-center md:min-w-[180px]"
              >
                {/* نقطه مسیر */}
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)] z-10"></div>
                  {/* خط اتصال */}
                  {i < (metadata.page_history ?? []).length - 1 && (
                    <div className="absolute md:left-5 left-2 md:top-1/2 top-5 md:w-[140px] w-0.5 md:h-0.5 h-[60px] bg-linear-to-r md:bg-linear-to-r from-blue-400/50 to-blue-300/0 dark:from-blue-500/40 dark:to-blue-300/0 md:translate-y-[-50%] md:block"></div>
                  )}
                </div>

                {/* کارت مسیر */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`mt-3 p-3 rounded-2xl border shadow-sm transition-all ${
                    darkMode
                      ? "bg-gray-800/70 border-gray-700 text-gray-300"
                      : "bg-white/80 border-gray-200 text-gray-800"
                  }`}
                >
                  <p className="font-medium text-sm text-blue-600 dark:text-blue-400 truncate">
                    {new URL(page.url).pathname}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDurationRange(page.duration)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(page.timestamp).toLocaleTimeString("fa-IR")}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* پایان مسیر */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (metadata.page_history?.length ?? 0) * 0.1 }}
          className="flex items-center justify-center gap-2 mt-8 text-green-600 dark:text-green-400 font-medium"
        >
          <MapPinIcon className="w-4 h-4" />
          <span>پایان مسیر</span>
        </motion.div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
</>
  );
}
