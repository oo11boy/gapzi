'use client';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { classNames } from '@/ChatComponents/utils/classNames';

interface Room {
  room_code: string;
  site_url: string;
  embed_code?: string;
}

interface SelectSiteModalProps {
  showSelectSiteModal: boolean;
  setShowSelectSiteModal: (value: boolean) => void;
  rooms: Room[];
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room) => void;
  setSelectedUser: (user: any) => void;
  setMessages: (messages: any[]) => void;
  loadUsers: (roomCode: string) => Promise<void>;
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
  darkMode,
}: SelectSiteModalProps) {
  const handleSelectRoom = async (room: Room) => {
    setSelectedRoom(room);
    sessionStorage.setItem('selectedRoom', JSON.stringify(room));
    setSelectedUser(null);
    setMessages([]);
    if (room.room_code) {
      await loadUsers(room.room_code);
    }
    setShowSelectSiteModal(false);
  };

  return (
    <Transition.Root show={showSelectSiteModal} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setShowSelectSiteModal(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={classNames(
                  'relative transform overflow-hidden rounded-lg text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg',
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                )}
              >
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6">
                    انتخاب سایت
                  </Dialog.Title>
                  <div className="mt-4">
                    {rooms.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        هیچ سایتی یافت نشد. لطفاً یک اتاق جدید ایجاد کنید.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {rooms.map((room) => (
                          <li
                            key={room.room_code}
                            className={classNames(
                              'p-3 rounded-md cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors',
                              selectedRoom?.room_code === room.room_code
                                ? 'bg-indigo-50 dark:bg-indigo-800'
                                : ''
                            )}
                            onClick={() => handleSelectRoom(room)}
                          >
                            <span className="font-medium">{room.site_url}</span>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              کد اتاق: {room.room_code}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div
                  className={classNames(
                    'px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6',
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  )}
                >
                  <button
                    type="button"
                    className={classNames(
                      'mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto',
                      darkMode
                        ? 'border-gray-600 bg-gray-600 text-gray-200 hover:bg-gray-500'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                    onClick={() => setShowSelectSiteModal(false)}
                  >
                    بستن
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
