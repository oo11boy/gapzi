'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { classNames } from './utils/classNames';

interface Room {
  room_code: string;
  site_url: string;
}

interface SelectSiteModalProps {
  showSelectSiteModal: boolean;
  setShowSelectSiteModal: (value: boolean) => void;
  rooms: Room[];
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  setSelectedUser: (user: any | null) => void;
  setMessages: (messages: any[]) => void;
  loadUsers: (roomCode: string) => void;
  darkMode: boolean;
}

export default function SelectSiteModal({
  showSelectSiteModal,
  setShowSelectSiteModal,
  rooms,
  selectedRoom,
  setSelectedRoom,
  setSelectedUser,
  setMessages,
  loadUsers,
  darkMode
}: SelectSiteModalProps) {
  return (
    <AnimatePresence>
      {showSelectSiteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowSelectSiteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={classNames(
              'relative w-full max-w-md sm:max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl transition-colors',
              darkMode ? 'bg-gray-900' : 'bg-white'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-bold bg-linear-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                انتخاب سایت
              </h3>
              <button
                onClick={() => setShowSelectSiteModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Rooms List */}
            <div className="space-y-3 max-h-112 sm:max-h-96 overflow-y-auto pr-2 rtl:pr-0 rtl:pl-2 custom-scrollbar">
              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-linear-to-br from-blue-400/20 to-purple-400/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl sm:text-4xl">🏠</span>
                  </div>
                  <p className={classNames(
                    'text-sm sm:text-base font-medium',
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  )}>
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
                      'p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 border',
                      selectedRoom?.room_code === room.room_code
                        ? 'bg-linear-to-r from-blue-400/20 to-blue-500/20 border-blue-400'
                        : darkMode
                          ? 'bg-gray-800/50 hover:bg-gray-800/70 border-gray-700/50'
                          : 'bg-white/50 hover:bg-white/70 border-gray-200/50'
                    )}
                  >
                    <p className="font-semibold text-sm sm:text-base truncate">{room.site_url}</p>
                    <p className={classNames(
                      'text-xs sm:text-sm mt-1',
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      کد اتاق: {room.room_code}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
