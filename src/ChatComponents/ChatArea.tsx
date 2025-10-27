'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from './utils/classNames';

interface User {
  session_id: string;
  name: string;
  email: string;
  room_code?: string;
  newMessageCount?: number;
}

interface Message {
  sender: string;
  sender_type:string;
  message: string;
  session_id: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
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
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setTimeout(() => scrollToBottom(), 50);
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="hidden lg:block lg:col-span-3 w-10/12"
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
                'sticky top-0 z-10 p-4 border-b flex items-center space-x-3',
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
                <p className="text-xs text-green-500 font-medium">آنلاین</p>
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
                      <span className="text-2xl">💬</span>
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
                  const isSender = msg.sender_type === 'admin' || msg.sender === 'Admin';

                    return (
                      <motion.div
                        key={`${msg.session_id}-${msg.timestamp}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={classNames(
                          'flex flex-col max-w-[75%] wrap-break-word p-3 rounded-2xl relative',
                          isSender
                            ? 'self-end rounded-br-none shadow-md bg-linear-to-r from-blue-400 to-blue-500 text-white'
                            : darkMode
                            ? 'self-start rounded-bl-none shadow-md bg-gray-800 text-gray-200'
                            : 'self-start rounded-bl-none shadow-md bg-gray-100 text-gray-900'
                        )}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className="flex justify-end items-center mt-1 space-x-1 rtl:space-x-reverse">
                          <span className="text-[10px] opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
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
                  placeholder="پیام خود را بنویسید..."
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
                  disabled={!message}
                  className={classNames(
                    'p-3 rounded-full flex items-center justify-center transition-colors',
                    message
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
              <span className="text-3xl">💬</span>
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