"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { classNames } from "./utils/classNames";
import { useEffect, useState, useRef } from "react";
import UserInfoSidebar from "./UserInfoSidebar"; // جدید

interface User {
  session_id: string;
  name: string;
  email: string;
  room_code?: string;
  newMessageCount?: number;
  last_active?: string;
  isOnline?: boolean;
}

interface Message {
  message_id: string;
  sender: string;
  sender_type: "admin" | "guest";
  message: string;
  session_id: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  edited?: boolean;
}

interface UserMetadata {
  current_page?: string;
  page_history?: { url: string; timestamp: string; duration: number }[];
  referrer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  ip_address?: string;
}

interface MobileChatModalProps {
  selectedUser: User | null;
  messages: Message[];
  message: string;
  setMessage: (value: string) => void;
  typingUsers: string[];
  sendMessage: () => void;
  handleTyping: () => void;
  handleBack: () => void;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  darkMode: boolean;
  editingMessage: string | null;
  setEditingMessage: (id: string | null) => void;
  handleEdit: (msg: Message) => void;
  handleDelete: (messageId: string) => void;
  userMetadata: UserMetadata | null; // جدید
  showUserInfo: boolean; // جدید
  setShowUserInfo: (show: boolean) => void; // جدید
}

export default function MobileChatModal({
  selectedUser,
  messages,
  message,
  setMessage,
  typingUsers,
  sendMessage,
  handleTyping,
  handleBack,
  messagesEndRef,
  darkMode,
  editingMessage,
  setEditingMessage,
  handleEdit,
  handleDelete,
  userMetadata,
  showUserInfo,
  setShowUserInfo,
}: MobileChatModalProps) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return "نامشخص";
    const date = new Date(lastActive);
    return date.toLocaleString("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // لمس طولانی برای نمایش دکمه‌ها
  const handleLongPress = (messageId: string) => {
    const timer = setTimeout(() => {
      setShowActions(messageId);
    }, 600);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (!selectedUser) return null;

  return (
    <AnimatePresence>
      {selectedUser && (
        <>
          {/* پس‌زمینه محو */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black backdrop-blur-sm z-40 lg:hidden"
            onClick={handleBack}
          />
          {/* مودال چت */}
          <motion.div
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-100%" }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col h-screen overflow-hidden shadow-2xl"
          >
            <div
              className={classNames(
                "w-full h-full flex flex-col overflow-hidden border-t",
                darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
              )}
            >
              {/* هدر - با کلیک برای نمایش اطلاعات */}
              <div
                className={classNames(
                  "sticky top-0 z-10 p-4 border-b flex items-center space-x-3 rtl:space-x-reverse",
                  darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
                )}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBack}
                  className={classNames(
                    "p-2 rounded-full transition-colors",
                    darkMode ? "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50" : "bg-gray-200/50 text-gray-600 hover:bg-gray-300/50"
                  )}
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </motion.button>

                <div 
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center flex-shrink-0"
                  onClick={() => setShowUserInfo(!showUserInfo)} // کلیک برای toggle
                  role="button"
                  tabIndex={0}
                >
                  <span className="text-white font-medium text-sm">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => setShowUserInfo(!showUserInfo)} // toggle اطلاعات
                >
                  <h3
                    className={classNames(
                      "font-semibold text-base truncate",
                      darkMode ? "text-gray-200" : "text-gray-900"
                    )}
                  >
                    {selectedUser.name}
                  </h3>
                  <p
                    className={classNames(
                      "text-xs font-medium",
                      selectedUser.isOnline ? "text-green-500" : "text-gray-500"
                    )}
                  >
                    {selectedUser.isOnline
                      ? "آنلاین"
                      : `آخرین بازدید: ${formatLastActive(selectedUser.last_active)}`}
                  </p>
                </div>
              </div>

              {/* اطلاعات کاربر (فقط موبایل، وقتی showUserInfo true) */}
              <AnimatePresence>
                {showUserInfo && userMetadata && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-b"
                  >
                    <UserInfoSidebar 
                      metadata={userMetadata} 
                      darkMode={darkMode} 
                      isMobile={true} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* بخش پیام‌ها */}
              <div
                className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2 custom-scrollbar"
                onClick={() => { if (showActions) setShowActions(null); if (showUserInfo) setShowUserInfo(false); }}
              >
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">Message</span>
                      </div>
                      <h3
                        className={classNames(
                          "text-base font-medium",
                          darkMode ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        چت آماده است!
                      </h3>
                      <p
                        className={classNames(
                          "text-sm",
                          darkMode ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        اولین پیام خود را ارسال کنید
                      </p>
                    </motion.div>
                  ) : (
                    messages.map((msg, i) => {
                      const isSender = msg.sender_type === "admin";
                      const isEditable = isSender;
                      const isDeletable = isSender;
                      const showActionButtons = showActions === msg.message_id;

                      return (
                        <motion.div
                          key={`${msg.message_id}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={classNames(
                            "relative flex flex-col max-w-[75%] p-3 rounded-2xl",
                            isSender
                              ? "self-end rounded-br-none shadow-md bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                              : darkMode
                              ? "self-start rounded-bl-none shadow-md bg-gray-800 text-gray-200"
                              : "self-start rounded-bl-none shadow-md bg-gray-100 text-gray-900"
                          )}
                          onTouchStart={() => isSender && handleLongPress(msg.message_id)}
                          onTouchEnd={handleTouchEnd}
                          onMouseDown={() => isSender && handleLongPress(msg.message_id)}
                          onMouseUp={handleTouchEnd}
                          onMouseLeave={handleTouchEnd}
                        >
                          <div className="flex items-start gap-2">
                            <p className="text-sm leading-relaxed flex-1 break-words">
                              {msg.message}
                            </p>

                            {/* دکمه‌های ویرایش و حذف */}
                            {(isEditable || isDeletable) && showActionButtons && (
                              <div className="flex gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {isEditable && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(msg);
                                      setShowActions(null);
                                    }}
                                    className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
                                    title="ویرایش"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {isDeletable && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(msg.message_id);
                                      setShowActions(null);
                                    }}
                                    className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 transition"
                                    title="حذف"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-1 text-xs opacity-70">
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isSender && msg.status && (
                              <span className="flex items-center">
                                {msg.status === "sent" && (
                                  <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {msg.status === "delivered" && (
                                  <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4" />
                                  </svg>
                                )}
                                {msg.status === "read" && (
                                  <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>

                {/* در حال تایپ */}
                <AnimatePresence>
                  {typingUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={classNames(
                        "flex items-center space-x-2 p-2 rounded-lg w-fit",
                        darkMode ? "bg-gray-800" : "bg-gray-100"
                      )}
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className={classNames("text-xs", darkMode ? "text-gray-300" : "text-gray-600")}>
                        {typingUsers.join(", ")} در حال تایپ...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* ورودی پیام */}
              <div className={classNames(
                "sticky bottom-0 z-10 p-4 border-t safe-area-inset-bottom",
                darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center space-x-2 max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder={editingMessage ? "پیام را ویرایش کنید..." : "پیام خود را بنویسید..."}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className={classNames(
                      "flex-1 px-4 py-2 rounded-full border focus:outline-none text-sm transition-all duration-200",
                      darkMode
                        ? "bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-400"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    )}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className={classNames(
                      "p-3 rounded-full flex items-center justify-center transition-colors",
                      message.trim()
                        ? "bg-blue-500 text-white shadow-lg"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}