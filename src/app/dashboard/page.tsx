'use client';
import { useState, useEffect, useRef } from 'react';
import { Switch } from '@headlessui/react';
import { BellIcon, SunIcon, MoonIcon, PlusIcon, XMarkIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import io, { Socket } from 'socket.io-client';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface Room { room_code: string; site_url: string; }
interface User { session_id: string; name: string; email: string; room_code?: string; }
interface Message { sender: string; message: string; session_id: string; timestamp: string; }

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSelectSiteModal, setShowSelectSiteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessageAlert(false);
  }, [messages]);

  useEffect(() => {
    fetch('/api/rooms', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setRooms(data);
        const savedRoom = sessionStorage.getItem('selectedRoom');
        if (savedRoom) {
          const room = JSON.parse(savedRoom);
          setSelectedRoom(room);
          loadUsers(room.room_code);
        } else if (data.length > 0) {
          const lastRoom = data[data.length - 1];
          setSelectedRoom(lastRoom);
          sessionStorage.setItem('selectedRoom', JSON.stringify(lastRoom));
          loadUsers(lastRoom.room_code);
        } else {
          setShowCreateRoom(true);
        }
      })
      .catch(() => setError('بارگذاری اتاق‌ها موفقیت‌آمیز نبود'));

    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Socket متصل شد:', newSocket.id));
    newSocket.on('connect_error', () => setError('اتصال Socket با مشکل مواجه شد'));

    newSocket.on('receive_message', (data: Message & { session_id: string }) => {
      if (data.session_id === selectedUser?.session_id) {
        setMessages(prev => {
          const exists = prev.some(
            msg => msg.message === data.message && msg.sender === data.sender && msg.timestamp === data.timestamp
          );
          return exists ? prev : [...prev, { ...data, timestamp: data.timestamp || new Date().toISOString() }];
        });
      } else {
        setNewMessageAlert(true);
      }
    });

    newSocket.on('user_typing', (data: { name: string; session_id: string }) => {
      if (data.session_id === selectedUser?.session_id) {
        setTypingUsers(prev => [...new Set([...prev, data.name])]);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUsers([]), 2000);
      }
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedUser && socketRef.current) {
      socketRef.current.emit('join_session', { room: selectedUser.room_code, session_id: selectedUser.session_id });
    }
  }, [selectedUser]);

  const createRoom = async () => {
    if (!siteUrl) return setError('لطفاً آدرس سایت را وارد کنید');
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: siteUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        const newRoom = { room_code: data.roomCode, site_url: siteUrl };
        setEmbedCode(data.embedCode);
        setRooms(prev => [...prev, newRoom]);
        setSelectedRoom(newRoom);
        sessionStorage.setItem('selectedRoom', JSON.stringify(newRoom));
        loadUsers(newRoom.room_code);
        setSiteUrl('');
        setError('');
        setShowCreateRoom(false);
        setShowEmbedModal(true);
      } else {
        setError(data.error || 'ساخت اتاق موفقیت‌آمیز نبود');
      }
    } catch {
      setError('ساخت اتاق موفقیت‌آمیز نبود');
    }
  };

  const loadUsers = async (roomCode: string) => {
    try {
      const res = await fetch(`/api/users?room=${roomCode}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.map((user: User) => ({ ...user, room_code: roomCode })));
      } else {
        setError(data.error || 'بارگذاری کاربران موفقیت‌آمیز نبود');
      }
    } catch {
      setError('بارگذاری کاربران موفقیت‌آمیز نبود');
    }
  };

  const loadMessages = async (roomCode: string, sessionId: string) => {
    try {
      const res = await fetch(`/api/messages?room=${roomCode}&session_id=${sessionId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(Array.isArray(data) ? data : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (!message || !selectedUser || !socketRef.current) return;
    const msgData = {
      room: selectedUser.room_code,
      message,
      sender: 'Admin',
      session_id: selectedUser.session_id,
      timestamp: new Date().toISOString(),
    };
    socketRef.current.emit('send_message', msgData);
    setMessages(prev => [...prev, msgData]);
    setMessage('');
  };

  const handleTyping = () => {
    if (socketRef.current && selectedUser) {
      socketRef.current.emit('user_typing', {
        room: selectedUser.room_code,
        name: 'Admin',
        session_id: selectedUser.session_id,
      });
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
  };

  return (
    <div className={classNames(
      'min-h-screen font-sans transition-all duration-300',
      darkMode 
        ? 'bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-linear-to-br from-blue-50 via-white to-indigo-50 text-gray-900'
    )} dir="rtl">
      
      {/* Modern Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/50">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <span className="text-white font-bold text-2xl">💬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  داشبورد چت زنده
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">پنل مدیریت پیشرفته</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <AnimatePresence>
                {newMessageAlert && (
                  <motion.div
                    initial={{ scale: 0, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: -10 }}
                    className="relative group"
                  >
                    <div className="p-2 bg-red-500/20 rounded-full backdrop-blur-sm border border-red-500/30">
                      <BellIcon className="w-5 h-5 text-red-400 animate-pulse" />
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute -top-10 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap"
                    >
                      پیام جدید
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setShowSelectSiteModal(true)}
                className="group flex items-center space-x-2 space-x-reverse px-4 py-2 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <span>انتخاب سایت</span>
              </button>

              <button
                onClick={() => setShowCreateRoom(true)}
                className="group flex items-center space-x-2 space-x-reverse px-4 py-2 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <PlusIcon className="w-4 h-4" />
                <span>ایجاد چت</span>
              </button>

              <Switch 
                checked={darkMode} 
                onChange={setDarkMode}
                className={classNames(
                  'relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none',
                  darkMode ? 'bg-linear-to-r from-gray-700 to-gray-800' : 'bg-linear-to-r from-gray-200 to-gray-300'
                )}
              >
                <span className="sr-only">تغییر حالت تاریک</span>
                <motion.span 
                  layout 
                  className={classNames(
                    'mx-0.5 h-9 w-9 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg transition-all duration-300',
                    darkMode ? 'translate-x-10' : 'translate-x-1'
                  )}
                >
                  {darkMode ? (
                    <MoonIcon className="w-5 h-5 text-gray-900" />
                  ) : (
                    <SunIcon className="w-5 h-5 text-yellow-500" />
                  )}
                </motion.span>
              </Switch>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 sm:mx-6 lg:mx-8 mt-4 max-w-7xl"
          >
            <div className="bg-linear-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="flex items-center">
                <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Sidebar - Users Only */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-2 sm:p-2 shadow-xl border border-white/20 dark:border-gray-700/30 max-w-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-bold text-lg sm:text-xl bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  کاربران
                </h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm sm:text-base font-medium bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  {users.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[28rem] sm:max-h-96 overflow-y-auto pr-2 rtl:pr-0 rtl:pl-2 custom-scrollbar">
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl sm:text-3xl">👤</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium">
                      کاربری وجود ندارد
                    </p>
                  </div>
                ) : (
                  users.map((user) => (
                    <motion.div
                      key={user.session_id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedUser(user);
                        loadMessages(user.room_code!, user.session_id);
                      }}
                      className={classNames(
                        'group relative p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden',
                        selectedUser?.session_id === user.session_id
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : 'bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md'
                      )}
                    >
                      <div className="flex items-center space-x-3 rtl:space-x-reverse overflow-hidden">
                        <div className={classNames(
                          'relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md flex items-center justify-center',
                          selectedUser?.session_id === user.session_id
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                        )}>
                          <span className="text-white font-bold text-sm sm:text-base">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                        </div>
                        <div className="ml-3 rtl:ml-0 rtl:mr-3 flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{user.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[160px]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Main Chat Area (Desktop) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block lg:col-span-3"
          >
            <div className={classNames(
              'flex flex-col h-[70vh] lg:h-[80vh] rounded-2xl shadow-2xl overflow-hidden',
              darkMode 
                ? 'bg-linear-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-2xl border border-gray-700/50' 
                : 'bg-white/80 backdrop-blur-2xl border border-white/20'
            )}>
              {selectedUser ? (
                <>
                  <div className="sticky top-0 z-10 p-6 bg-linear-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border-b border-emerald-500/20">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg bg-linear-to-r from-emerald-500 to-teal-500">
                        <span className="text-white font-bold text-sm flex items-center justify-center h-full">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{selectedUser.name}</h3>
                        <p className="text-sm text-emerald-600 font-medium truncate max-w-[200px]">
                          آنلاین
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <AnimatePresence>
                      {messages.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center py-20 text-center"
                        >
                          <div className="w-24 h-24 bg-linear-to-br from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">💬</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            چت آماده است!
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                            اولین پیام خود را ارسال کنید تا مکالمه آغاز شود
                          </p>
                        </motion.div>
                      ) : (
                        messages.map((msg, i) => (
                          <motion.div
                            key={`${msg.session_id}-${msg.timestamp}-${i}`}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={classNames(
                              'group max-w-[75%] p-4 rounded-2xl shadow-lg relative',
                              msg.sender === 'Admin'
                                ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white ml-auto'
                                : darkMode
                                  ? 'bg-gray-800/80 text-white backdrop-blur-sm border border-gray-700/50'
                                  : 'bg-white/80 text-gray-900 backdrop-blur-sm border border-gray-200/50'
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              {msg.sender !== 'Admin' && (
                                <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-white text-xs font-bold">
                                    {msg.sender.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-sm">{msg.sender}</span>
                                  <span className="text-xs opacity-75 ml-2">
                                    {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              </div>
                            </div>
                            <div 
                              className={classNames(
                                'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
                                msg.sender === 'Admin' ? 'bg-white/20' : 'bg-black/20'
                              )}
                            >
                              <span className="text-xs">✓</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {typingUsers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50"
                        >
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {typingUsers.join(', ')} در حال تایپ...
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="sticky bottom-0 z-10 p-6 bg-linear-to-r from-white/90 to-gray-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex items-end space-x-4">
                        <div className="flex-1">
                          <div className="relative">
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
                                'w-full pr-12 pl-4 py-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-indigo-500/50 focus:outline-none transition-all duration-300 text-sm shadow-lg hover:shadow-xl',
                                message ? 'ring-2 ring-indigo-500/20' : ''
                              )}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <span className="text-lg">💭</span>
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={sendMessage}
                          disabled={!message}
                          className={classNames(
                            'group relative p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center',
                            message
                              ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                              : 'bg-gray-300/50 dark:bg-gray-700/50 text-gray-400/60 cursor-not-allowed'
                          )}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-32 h-32 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-8 shadow-lg">
                    <span className="text-5xl">💬</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-4">
                    چت زنده آماده است
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    یکی از کاربران موجود را انتخاب کنید تا مکالمه را آغاز کنید
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Chat Modal (Mobile) */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full bg-white dark:bg-gray-900 rounded-none flex flex-col"
            >
              <div className="sticky top-0 z-10 p-6 bg-linear-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border-b border-emerald-500/20 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-full bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <ArrowRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex items-center space-x-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg bg-linear-to-r from-emerald-500 to-teal-500">
                    <span className="text-white font-bold text-sm flex items-center justify-center h-full">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{selectedUser.name}</h3>
                    <p className="text-sm text-emerald-600 font-medium truncate max-w-[200px]">
                      آنلاین
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <AnimatePresence>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="w-24 h-24 bg-linear-to-br from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">💬</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        چت آماده است!
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                        اولین پیام خود را ارسال کنید تا مکالمه آغاز شود
                      </p>
                    </motion.div>
                  ) : (
                    messages.map((msg, i) => (
                      <motion.div
                        key={`${msg.session_id}-${msg.timestamp}-${i}`}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={classNames(
                          'group max-w-[75%] p-4 rounded-2xl shadow-lg relative',
                          msg.sender === 'Admin'
                            ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white ml-auto'
                            : darkMode
                              ? 'bg-gray-800/80 text-white backdrop-blur-sm border border-gray-700/50'
                              : 'bg-white/80 text-gray-900 backdrop-blur-sm border border-gray-200/50'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          {msg.sender !== 'Admin' && (
                            <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">
                                {msg.sender.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm">{msg.sender}</span>
                              <span className="text-xs opacity-75 ml-2">
                                {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                        <div 
                          className={classNames(
                            'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
                            msg.sender === 'Admin' ? 'bg-white/20' : 'bg-black/20'
                          )}
                        >
                          <span className="text-xs">✓</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {typingUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50"
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {typingUsers.join(', ')} در حال تایپ...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
              <div className="sticky bottom-0 z-10 p-6 bg-linear-to-r from-white/90 to-gray-50/90 dark:from-gray-900/90 dark:to-gray-800/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <div className="relative">
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
                            'w-full pr-12 pl-4 py-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-indigo-500/50 focus:outline-none transition-all duration-300 text-sm shadow-lg hover:shadow-xl',
                            message ? 'ring-2 ring-indigo-500/20' : ''
                          )}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <span className="text-lg">💭</span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendMessage}
                      disabled={!message}
                      className={classNames(
                        'group relative p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center',
                        message
                          ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                          : 'bg-gray-300/50 dark:bg-gray-700/50 text-gray-400/60 cursor-not-allowed'
                      )}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 text-left shadow-2xl max-w-md w-full p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    ایجاد اتاق جدید
                  </h3>
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="mx-auto w-20 h-20 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4">
                      <span className="text-3xl">🏠</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      برای شروع، یک سایت جدید اضافه کنید
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      آدرس وبسایت
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-gray-400">🌐</span>
                      </div>
                      <input
                        type="url"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-indigo-500/50 focus:outline-none transition-all duration-300 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-6">
                    <button
                      onClick={() => setShowCreateRoom(false)}
                      className="flex-1 py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all duration-300"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={createRoom}
                      disabled={!siteUrl}
                      className="flex-1 py-4 px-6 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>ایجاد اتاق</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select Site Modal */}
      <AnimatePresence>
        {showSelectSiteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSelectSiteModal(false)}
          >
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    انتخاب سایت
                  </h3>
                  <button
                    onClick={() => setShowSelectSiteModal(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[28rem] sm:max-h-96 overflow-y-auto pr-2 rtl:pr-0 rtl:pl-2 custom-scrollbar">
                  {rooms.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl sm:text-4xl">🏠</span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium">
                        هیچ سایتی وجود ندارد
                      </p>
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <motion.div
                        key={room.room_code}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedRoom(room);
                          sessionStorage.setItem('selectedRoom', JSON.stringify(room));
                          setShowSelectSiteModal(false);
                          setSelectedUser(null);
                          setMessages([]);
                          loadUsers(room.room_code);
                        }}
                        className={classNames(
                          'p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300',
                          selectedRoom?.room_code === room.room_code
                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30'
                            : 'bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50'
                        )}
                      >
                        <p className="font-semibold text-sm sm:text-base truncate">{room.site_url}</p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          کد اتاق: {room.room_code}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embed Code Modal */}
      <AnimatePresence>
        {showEmbedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEmbedModal(false)}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    کد Embed آماده است
                  </h3>
                  <button
                    onClick={() => setShowEmbedModal(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="bg-gray-900/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="relative">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                      }}
                      className="absolute top-3 left-3 p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-all duration-300"
                    >
                      <span className="text-emerald-500 font-medium text-sm">کپی</span>
                    </button>
                    <pre className="font-mono text-sm bg-gray-900/50 dark:bg-gray-800/50 rounded-lg p-6 overflow-auto border border-gray-700/30 text-white/90 leading-relaxed">
                      {embedCode}
                    </pre>
                  </div>
                </div>
                <div className="mt-8 bg-linear-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
                  <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center">
                    <CheckIcon className="w-5 h-5 mr-2" />
                    آماده استفاده
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    این کد را در <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">head</code> 
                    یا قبل از <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">closing body tag</code> 
                    وبسایت خود قرار دهید.
                  </p>
                </div>
                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setShowEmbedModal(false)}
                    className="px-8 py-4 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>بستن</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}