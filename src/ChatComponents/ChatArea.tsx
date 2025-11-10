// components/ChatComponents/ChatArea.tsx
'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from './utils/classNames';
import { formatLastSeen } from '@/client/utils/formatLastSeen';

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
  sender_type: 'admin' | 'guest';
  message: string;
  session_id: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  edited?: boolean;
}

interface ChatAreaProps {
  selectedUser: User | null;
  messages: Message[];
  message: string;
  setMessage: (value: string) => void;
  typingUsers: string[];
  sendMessage: () => void;
  handleTyping: () => void;
  darkMode: boolean;
  editingMessage: string | null;
  setEditingMessage: (id: string | null) => void;
  handleEdit: (msg: Message) => void;
  handleDelete: (messageId: string) => void;
}

export default function ChatArea({
  selectedUser,
  messages,
  message,
  setMessage,
  typingUsers,
  sendMessage,
  handleTyping,
  darkMode,
  editingMessage,
  setEditingMessage,
  handleEdit,
  handleDelete,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="hidden lg:block lg:col-span-6 "
    >
      <div
        className={classNames(
          'flex flex-col h-[70vh] lg:h-[80vh] rounded-xl overflow-hidden border',
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        )}
      >
        {selectedUser ? (
          <>
            <div
              className={classNames(
                'sticky top-0 z-10 p-4 border-b flex items-center space-x-3 rtl:space-x-reverse',
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3
                  className={classNames(
                    'font-semibold text-base truncate',
                    darkMode ? 'text-gray-200' : 'text-gray-900'
                  )}
                >
                  {selectedUser.name}
                </h3>
                <p
                  className={classNames(
                    'text-xs font-medium',
                    selectedUser.isOnline ? 'text-green-500' : 'text-gray-500'
                  )}
                >
                 {selectedUser.isOnline 
    ? 'آنلاین' 
    : `آخرین بازدید: ${formatLastSeen(selectedUser.last_active)}`
  }
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2 custom-scrollbar">
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
                        'text-base font-medium',
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      )}
                    >
                      چت آماده است!
                    </h3>
                    <p
                      className={classNames(
                        'text-sm',
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      )}
                    >
                      اولین پیام خود را ارسال کنید
                    </p>
                  </motion.div>
                ) : (
                  messages.map((msg, i) => {
                    const isSender = msg.sender_type === 'admin';
                    const isEditable = isSender;
                    const isDeletable = isSender;

                    return (
                      <motion.div
                        key={`${msg.message_id}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={classNames(
                          'group relative flex flex-col max-w-[75%] p-3 rounded-2xl',
                          isSender
                            ? 'self-end rounded-br-none bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : darkMode
                            ? 'self-start rounded-bl-none bg-gray-800 text-gray-200 shadow-md'
                            : 'self-start rounded-bl-none bg-gray-100 text-gray-900 shadow-md'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <p className="text-sm leading-relaxed flex-1">{msg.message}</p>

                          {/* دکمه‌های ادیت و حذف */}
                          {(isEditable || isDeletable) && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {isEditable && (
                                <button
                                  onClick={() => handleEdit(msg)}
                                  className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition"
                                  title="ویرایش"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {isDeletable && (
                                <button
                                  onClick={() => handleDelete(msg.message_id)}
                                  className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 transition"
                                  title="حذف"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-1 text-xs opacity-70">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                         
                          </span>
                          {isSender && msg.status && (
                            <span className="flex items-center">
                              {msg.status === 'sent' && (
                                <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {msg.status === 'delivered' && (
                                <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4" />
                                </svg>
                              )}
                              {msg.status === 'read' && (
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

              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={classNames(
                      'flex items-center space-x-2 p-2 rounded-lg w-fit',
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    )}
                  >
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span
                      className={classNames(
                        'text-xs',
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      )}
                    >
                      {typingUsers.join(', ')} در حال تایپ...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            <div
              className={classNames(
                'sticky bottom-0 z-10 p-4 border-t',
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="flex items-center space-x-2 max-w-3xl mx-auto">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder={editingMessage ? "پیام را ویرایش کنید..." : "پیام خود را بنویسید..."}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className={classNames(
                    'flex-1 px-4 py-2 rounded-full border focus:outline-none text-sm transition-all duration-200',
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-400'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  )}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className={classNames(
                    'p-3 rounded-full flex items-center justify-center transition-colors',
                    message.trim()
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">Message</span>
            </div>
            <h3 className={classNames('text-xl font-semibold', darkMode ? 'text-gray-200' : 'text-gray-800')}>
              چت زنده آماده است
            </h3>
            <p className={classNames('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
              یک کاربر را انتخاب کنید تا مکالمه را آغاز کنید
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}