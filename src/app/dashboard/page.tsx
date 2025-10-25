'use client';
import ChatArea from '@/ChatComponents/ChatArea';
import CreateRoomModal from '@/ChatComponents/CreateRoomModal';
import EmbedCodeModal from '@/ChatComponents/EmbedCodeModal';
import ErrorAlert from '@/ChatComponents/ErrorAlert';
import Header from '@/ChatComponents/Header';
import MobileChatModal from '@/ChatComponents/MobileChatModal';
import SelectSiteModal from '@/ChatComponents/SelectSiteModal';
import SettingsModal from '@/ChatComponents/SettingsModal';
import UserList from '@/ChatComponents/UserList';
import { classNames } from '@/ChatComponents/utils/classNames';
import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface Room {
  room_code: string;
  site_url: string;
  embed_code?: string;
}

interface User {
  session_id: string;
  name: string;
  email: string;
  room_code?: string;
  newMessageCount?: number;
}

interface Message {
  sender: string;
  message: string;
  session_id: string;
  timestamp: string;
}

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
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedUserRef = useRef<User | null>(null);
const [showSettingsModal, setShowSettingsModal] = useState(false);

const createRoom = async () => {
  if (!siteUrl) {
    setError('لطفاً آدرس وب‌سایت را وارد کنید');
    return;
  }
  if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(siteUrl)) {
    setError('لطفاً یک URL معتبر وارد کنید (مانند https://example.com)');
    return;
  }

  try {
    setLoading(true);
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: siteUrl }),
    });
    const data = await res.json();

    if (res.ok) {
      // اگر API embedCode نداد، خودمان تولید می‌کنیم
      const embedCode = data.embedCode || `<script src="http://localhost:3000/widget.js?room=${data.room_code}"></script>`;

      const newRoom = {
        ...data,
        embed_code: embedCode,
      };

      // اضافه کردن اتاق به لیست و آپدیت selectedRoom
      setRooms((prev) => [...prev, newRoom]);
      setSelectedRoom(newRoom);
      sessionStorage.setItem('selectedRoom', JSON.stringify(newRoom));

      // بارگذاری کاربران
      if (newRoom.room_code) await loadUsers(newRoom.room_code);

      setShowCreateRoom(false);
      setSiteUrl('');
      setEmbedCode(embedCode);
      setShowEmbedModal(true); // modal باز شود
    } else {
      setError(data.error || 'ایجاد اتاق موفقیت‌آمیز نبود');
    }
  } catch (err) {
    console.error(err);
    setError('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessageAlert(false);
  }, [messages]);

  useEffect(() => {
 const fetchRooms = async () => {
  try {
    setLoading(true);
    const res = await fetch('/api/rooms', { credentials: 'include' });
    const data = await res.json();

    // اصلاح embed_code برای هر اتاق
    const roomsWithEmbed = data.map((room: any) => ({
      ...room,
      embed_code:
        room.embed_code ||
        room.embedCode ||
        `<script src="http:///localhost:3000/chat-widget.js?room=${room.room_code}"></script>`,
    }));

    setRooms(roomsWithEmbed);

    if (roomsWithEmbed.length === 0) {
      setShowCreateRoom(true);
      setLoading(false);
      return;
    }

    const savedRoom = sessionStorage.getItem('selectedRoom');
    let roomToSelect: Room | null = null;

    if (savedRoom) {
      const parsedRoom = JSON.parse(savedRoom);
      const foundRoom = roomsWithEmbed.find(
        (room: Room) => room.room_code === parsedRoom.room_code
      );
      if (foundRoom) roomToSelect = foundRoom;
    }

    if (!roomToSelect) roomToSelect = roomsWithEmbed[roomsWithEmbed.length - 1];

    setSelectedRoom(roomToSelect);
    sessionStorage.setItem('selectedRoom', JSON.stringify(roomToSelect));

    if (roomToSelect?.room_code) {
      await loadUsers(roomToSelect.room_code);
    }
  } catch (error) {
    setError('بارگذاری اتاق‌ها موفقیت‌آمیز نبود');
  } finally {
    setLoading(false);
  }
};

    fetchRooms();
  }, []);

useEffect(() => {
  if (loading || !selectedRoom || !selectedRoom.room_code) return;

  console.log('Initializing socket for room:', selectedRoom.room_code);
  const newSocket = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });

  socketRef.current = newSocket;
  setSocket(newSocket);

  newSocket.on('connect', () => {
    console.log('✅ Socket connected:', newSocket.id);
    // join اتاق انتخابی فعلی
    newSocket.emit('join_session', { room: selectedRoom.room_code, session_id: 'admin-global' });
  });

  newSocket.on('receive_message', (data) => {
    if (data.room === selectedRoom.room_code) {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.timestamp === data.timestamp &&
            msg.message === data.message &&
            msg.session_id === data.session_id
        );
        if (selectedUserRef.current && data.session_id === selectedUserRef.current.session_id) {
          return exists ? prev : [...prev, data];
        }
        return prev;
      });

      if (!selectedUserRef.current || selectedUserRef.current.session_id !== data.session_id) {
        setUsers((prev) =>
          prev.map((u) =>
            u.session_id === data.session_id
              ? { ...u, newMessageCount: (u.newMessageCount || 0) + 1 }
              : u
          )
        );
        setNewMessageAlert(true);
      }
    }
  });

  newSocket.on('user_typing', (data) => {
    if (data.session_id === selectedUserRef.current?.session_id) {
      setTypingUsers([data.name]);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUsers([]), 2000);
    }
  });

  newSocket.on('connect_error', () => setError('اتصال Socket با مشکل مواجه شد'));
  newSocket.on('disconnect', () => console.log('❌ Socket disconnected'));

  return () => {
    newSocket.disconnect();
    socketRef.current = null;
  };
}, [selectedRoom, loading]);

  const loadUsers = async (roomCode: string) => {
    if (!roomCode) {
      console.warn('No room code provided, skipping loadUsers');
      setError('لطفاً یک اتاق انتخاب کنید');
      return;
    }
    try {
      console.log('Fetching users for room:', roomCode);
      const res = await fetch(`/api/users?room=${roomCode}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const usersList = data.map((user: User) => ({
          ...user,
          room_code: roomCode,
          newMessageCount: user.newMessageCount || 0,
        }));
        setUsers(usersList);

        if (socketRef.current) {
          socketRef.current.emit('join_session', { room: roomCode, session_id: 'admin-global' });
          usersList.forEach((u: User) => {
            socketRef.current!.emit('join_session', { room: roomCode, session_id: u.session_id });
          });
        }
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
      setMessages(Array.isArray(data) ? data : []);

      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, sessionId }),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.session_id === sessionId ? { ...u, newMessageCount: 0 } : u
        )
      );
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
    setMessages((prev) => [...prev, msgData]);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-semibold text-gray-600 dark:text-gray-300">
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'min-h-screen font-sans transition-all duration-300',
        darkMode
          ? 'bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white'
          : 'bg-linear-to-br from-blue-50 via-white to-indigo-50 text-gray-900'
      )}
      dir="rtl"
    >
      <Header setShowSettingsModal={setShowSettingsModal} setDarkMode={setDarkMode} darkMode={darkMode} setShowCreateRoom={setShowCreateRoom} setShowSelectSiteModal={setShowSelectSiteModal} />

      <ErrorAlert error={error} setError={setError} />
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex justify-between items-start gap-4 max-lg:flex-col">
          <UserList
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            loadMessages={loadMessages}
          />
          <ChatArea
            selectedUser={selectedUser}
            messages={messages}
            message={message}
            setMessage={setMessage}
            typingUsers={typingUsers}
            sendMessage={sendMessage}
            handleTyping={handleTyping}
          
            darkMode={darkMode}
          />
        </div>
      </div>
      <MobileChatModal
        selectedUser={selectedUser}
        messages={messages}
        message={message}
        setMessage={setMessage}
        typingUsers={typingUsers}
        sendMessage={sendMessage}
        handleTyping={handleTyping}
        handleBack={handleBack}
        messagesEndRef={messagesEndRef}
        darkMode={darkMode}
      />
      <CreateRoomModal
        showCreateRoom={showCreateRoom}
        setShowCreateRoom={setShowCreateRoom}
        siteUrl={siteUrl}
        setSiteUrl={setSiteUrl}
        createRoom={createRoom}
      />
      <SelectSiteModal
        showSelectSiteModal={showSelectSiteModal}
        setShowSelectSiteModal={setShowSelectSiteModal}
        rooms={rooms}
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        setSelectedUser={setSelectedUser}
        setMessages={setMessages}
        loadUsers={loadUsers}
        darkMode={darkMode}
      />
      <EmbedCodeModal
        showEmbedModal={showEmbedModal}
        setShowEmbedModal={setShowEmbedModal}
        embedCode={embedCode}
      />
      <SettingsModal
  showSettingsModal={showSettingsModal}
  setShowSettingsModal={setShowSettingsModal}
  darkMode={darkMode}
  setDarkMode={setDarkMode}
/>

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