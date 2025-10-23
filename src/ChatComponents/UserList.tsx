'use client';
import { motion } from 'framer-motion';
import { classNames } from './utils/classNames';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface User {
  session_id: string;
  name: string;
  email: string;
  room_code?: string;
  newMessageCount?: number; // تعداد پیام‌های خوانده نشده
}

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  loadMessages: (roomCode: string, sessionId: string) => void;
}

export default function UserList({ users, selectedUser, setSelectedUser, loadMessages }: UserListProps) {
  // Sort by number of unread messages and name
  const sortedUsers = [...users].sort((a, b) => {
    const aCount = a.newMessageCount || 0;
    const bCount = b.newMessageCount || 0;
    if (aCount !== bCount) return bCount - aCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:col-span-1 space-y-6 w-3/12 max-lg:w-full"
    >
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-2 sm:p-2 shadow-xl border border-white/20 dark:border-gray-700/30 max-w-full">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
           <h2 className="font-bold text-lg sm:text-xl bg-linear-to-r flex items-center gap-2 from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          <UserCircleIcon className="w-6 h-6 text-[#00977F]" />
       کاربران
        </h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm sm:text-base font-medium bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
            {users.length}
          </span>
        </div>
        <div className="space-y-3 max-h-112 sm:max-h-96 overflow-y-auto pr-2 rtl:pr-0 rtl:pl-2 custom-scrollbar">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-br from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl sm:text-3xl">👤</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium">
                کاربری وجود ندارد
              </p>
            </div>
          ) : (
            sortedUsers.map((user) => (
              <motion.div
                key={user.session_id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (user.room_code) {
                    setSelectedUser(user);
                    loadMessages(user.room_code, user.session_id);
                  }
                }}
                className={classNames(
                  'group relative p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden flex justify-between items-center',
                  selectedUser?.session_id === user.session_id
                    ? 'bg-linear-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md'
                )}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse overflow-hidden">
                  <div
                    className={classNames(
                      'relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md flex items-center justify-center',
                      selectedUser?.session_id === user.session_id
                        ? 'bg-linear-to-r from-emerald-500 to-teal-500'
                        : 'bg-linear-to-r from-indigo-500 to-purple-600'
                    )}
                  >
                    <span className="text-white font-bold text-sm sm:text-base">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3 rtl:ml-0 rtl:mr-3 flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{user.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-40">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.newMessageCount!=undefined && user.newMessageCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                    {user.newMessageCount}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}