'use client';
import { useState } from 'react';
import { classNames } from './utils/classNames';
import { ClockIcon, GlobeIcon, MapPinIcon, MonitorIcon, SmartphoneIcon, TabletIcon } from 'lucide-react';

interface PageHistoryItem {
  url: string;
  timestamp: string;
  duration: number; // ثانیه
}

interface UserMetadata {
  current_page?: string;
  page_history?: PageHistoryItem[];
  referrer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  ip_address?: string;
}

interface UserInfoSidebarProps {
  metadata: UserMetadata | null;
  darkMode: boolean;
  isMobile?: boolean; // برای مودال موبایل
}

export default function UserInfoSidebar({ metadata, darkMode, isMobile = false }: UserInfoSidebarProps) {
  const [expandedHistory, setExpandedHistory] = useState(false);

  if (!metadata) {
    return (
      <div className={classNames(
        'p-4 rounded-xl border text-center',
        darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
      )}>
        <p className="text-sm">اطلاعات کاربر در دسترس نیست</p>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds} ثانیه`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه`;
    return `${Math.floor(seconds / 3600)} ساعت`;
  };

  const formatReferrer = (referrer: string): string => {
    if (!referrer || referrer === 'مستقیم') return 'ورود مستقیم';
    try {
      return new URL(referrer).hostname.replace('www.', '');
    } catch {
      return referrer;
    }
  };

  const DeviceIcon = {
    mobile: SmartphoneIcon,
    tablet: TabletIcon,
    desktop: MonitorIcon,
  }[metadata.device_type || 'desktop'] as any;

  return (
    <div className={classNames(
      'p-4 rounded-xl border overflow-hidden',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
      isMobile ? 'mt-2 text-xs' : 'text-sm'
    )}>
      <h3 className={classNames(
        'font-bold mb-4 flex items-center gap-2',
        isMobile ? 'text-sm' : 'text-base'
      )}>
        <GlobeIcon className="w-4 h-4 text-blue-500" />
        اطلاعات کاربر
      </h3>

      {/* موقعیت جغرافیایی */}
      {(metadata.country || metadata.city) && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <MapPinIcon className="w-3 h-3 text-green-500 shrink-0" />
          <span className="truncate">{metadata.city || 'نامشخص'}, {metadata.country || 'نامشخص'}</span>
        </div>
      )}

      {/* صفحه فعلی */}
      {metadata.current_page && (
        <div className="mb-3">
          <p className="font-medium text-xs mb-1 flex items-center gap-1">
            <GlobeIcon className="w-3 h-3 text-green-500" />
            صفحه فعلی:
          </p>
          <p className={classNames(
            'text-blue-600 dark:text-blue-400 truncate max-w-full',
            isMobile ? 'text-xs' : 'text-sm'
          )}>
            {new URL(metadata.current_page).pathname || metadata.current_page}
          </p>
        </div>
      )}

      {/* مرجع ورود */}
      {metadata.referrer && (
        <div className="mb-3">
          <p className="font-medium text-xs mb-1">مرجع ورود:</p>
          <p className={classNames(
            'text-purple-600 dark:text-purple-400 truncate',
            isMobile ? 'text-xs' : 'text-sm'
          )}>
            {formatReferrer(metadata.referrer)}
          </p>
        </div>
      )}

      {/* دستگاه و مرورگر */}
      <div className="flex items-center gap-2 mb-3 text-xs">
        <DeviceIcon className="w-3 h-3 text-purple-500 shrink-0" />
        <span className="truncate">{metadata.browser} روی {metadata.os}</span>
      </div>

      {/* تاریخچه صفحات */}
      {metadata.page_history && metadata.page_history.length > 0 && (
        <details 
          className="mt-4" 
          open={expandedHistory}
          onToggle={() => setExpandedHistory(!expandedHistory)}
        >
          <summary className={classNames(
            'cursor-pointer font-medium mb-2 text-xs flex items-center gap-1',
            darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
          )}>
            <ClockIcon className="w-3 h-3" />
            مسیر کاربر ({metadata.page_history.length} صفحه)
          </summary>
          <div className={classNames(
            'space-y-1 max-h-32 overflow-y-auto pr-1',
            isMobile ? 'text-xs' : 'text-sm'
          )}>
            {metadata.page_history.slice(0, expandedHistory ? undefined : 3).map((page, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <span className="truncate max-w-[150px] text-gray-600 dark:text-gray-400">
                  {new URL(page.url).pathname}
                </span>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatDuration(page.duration || 0)}
                </span>
              </div>
            ))}
            {metadata.page_history.length > 3 && (
              <button 
                onClick={(e) => { e.preventDefault(); setExpandedHistory(true); }}
                className="text-xs text-blue-500 hover:underline w-full text-left mt-1"
              >
                نمایش همه...
              </button>
            )}
          </div>
        </details>
      )}

      {isMobile && (
        <button 
          onClick={() => {/* بستن مودال اگر لازم */}} 
          className="mt-3 w-full text-xs bg-gray-200 dark:bg-gray-700 py-1 rounded text-gray-600 dark:text-gray-300"
        >
          بستن اطلاعات
        </button>
      )}
    </div>
  );
}