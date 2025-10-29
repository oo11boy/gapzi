"use client";
import ChatArea from "@/ChatComponents/ChatArea";
import CreateRoomModal from "@/ChatComponents/CreateRoomModal";
import EmbedCodeModal from "@/ChatComponents/EmbedCodeModal";
import ErrorAlert from "@/ChatComponents/ErrorAlert";
import Header from "@/ChatComponents/Header";

import MobileChatModal from "@/ChatComponents/MobileChatModal";
import SelectSiteModal from "@/ChatComponents/SelectSiteModal";

import UserList from "@/ChatComponents/UserList";
import { classNames } from "@/ChatComponents/utils/classNames";
import { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";

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
  last_active?: string;
  isOnline?: boolean;
  hasNewMessageFlash?: boolean; // جدید: برای چشمک زدن
}

interface Message {
  message_id: string;
  sender: string;
  message: string;
  session_id: string;
  timestamp: string;
  sender_type: "admin" | "guest";
}

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [error, setError] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSelectSiteModal, setShowSelectSiteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default"); // جدید

  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    username: string;
    initials: string;
    isOnline: boolean;
  } | null>(null);
const messagesEndRef = useRef<HTMLDivElement>(null!);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedUserRef = useRef<User | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null); // جدید: صدا

  // ایجاد صدا یکبار
  useEffect(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.preload = "auto";
    notificationSoundRef.current = audio;
  }, []);

  // درخواست دسترسی نوتیفیکیشن مرورگر
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    } else if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // همگام‌سازی selectedUser با ref
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // اسکرول خودکار به پایین
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewMessageAlert(false);
  }, [messages]);

  // چک کردن احراز هویت
  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        window.location.href = "/login";
      }
    };
    checkAuth();
  }, []);

  // ایجاد اتاق جدید
  const createRoom = async () => {
    if (!siteUrl) {
      setError("لطفاً آدرس وب‌سایت را وارد کنید");
      return;
    }
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(siteUrl)) {
      setError("لطفاً یک URL معتبر وارد کنید (مانند https://example.com)");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ site_url: siteUrl }),
      });
      const data = await res.json();

      if (res.ok) {
        const embedCode =
          data.embedCode ||
          `<script src="${process.env.NEXT_PUBLIC_BASE_URL}/chat-widget.js?room=${data.room_code}"></script>`;
        const newRoom = { ...data, embed_code: embedCode };
        setRooms((prev) => [...prev, newRoom]);
        setSelectedRoom(newRoom);
        sessionStorage.setItem("selectedRoom", JSON.stringify(newRoom));
        if (newRoom.room_code) await loadUsers(newRoom.room_code);
        setShowCreateRoom(false);
        setSiteUrl("");
        setEmbedCode(embedCode);
        setShowEmbedModal(true);
      } else {
        setError(data.error || "ایجاد اتاق موفقیت‌آمیز نبود");
      }
    } catch (err) {
      console.error(err);
      setError("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  // بارگذاری اتاق‌ها
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/rooms", { credentials: "include" });
        const data = await res.json();

        if (res.status === 403) {
          setError(
            "دسترسی غیرمجاز: فقط ادمین‌ها می‌توانند اتاق‌ها را مشاهده کنند"
          );
          return;
        }

        const roomsWithEmbed = data.map((room: any) => ({
          ...room,
          embed_code:
            room.embed_code ||
            `<script src="${process.env.NEXT_PUBLIC_BASE_URL}/chat-widget.js?room=${room.room_code}"></script>`,
        }));

        setRooms(roomsWithEmbed);

        if (roomsWithEmbed.length === 0) {
          setShowCreateRoom(true);
          setLoading(false);
          return;
        }

        const savedRoom = sessionStorage.getItem("selectedRoom");
        let roomToSelect: Room | null = null;

        if (savedRoom) {
          const parsedRoom = JSON.parse(savedRoom);
          const foundRoom = roomsWithEmbed.find(
            (room: Room) => room.room_code === parsedRoom.room_code
          );
          if (foundRoom) roomToSelect = foundRoom;
        }

        if (!roomToSelect)
          roomToSelect = roomsWithEmbed[roomsWithEmbed.length - 1];

        setSelectedRoom(roomToSelect);
        sessionStorage.setItem("selectedRoom", JSON.stringify(roomToSelect));

        if (roomToSelect?.room_code) {
          await loadUsers(roomToSelect.room_code);
        }
      } catch (error) {
        setError("بارگذاری اتاق‌ها موفقیت‌آمیز نبود");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // اتصال Socket.io
  useEffect(() => {
    if (loading || !selectedRoom || !selectedRoom.room_code) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      }
    );

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Dashboard socket connected:", newSocket.id);

      newSocket.emit("join_session", {
        room: selectedRoom.room_code,
        session_id: "admin-global",
      });
      newSocket.emit("admin_connect", {
        room: selectedRoom.room_code,
        adminId: "admin-global",
      });
    });

    // دریافت پیام جدید — با صدا، چشمک و نوتیفیکیشن
newSocket.on("receive_message", (data) => {
  if (data.room !== selectedRoom.room_code) return;

  if (data.sender_type === "guest") {
    const targetSessionId = data.session_id;

    // 1. اگر کاربر جدیده → اضافه کن
    const userExists = users.some((u) => u.session_id === targetSessionId);
    if (!userExists) {
      const newUser: User = {
        session_id: targetSessionId,
        name: data.sender,
        email: "", // اگر ایمیل داری از سرور بگیر
        room_code: data.room,
        newMessageCount: 1,
        hasNewMessageFlash: true,
        isOnline: true,
        last_active: new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newUser]);
    }

    // 2. صدا، نوتیفیکیشن، نمایش پیام و ...
    notificationSoundRef.current?.play().catch(() => {});

    if (
      notificationPermission === "granted" &&
      document.hidden &&
      selectedUserRef.current?.session_id !== targetSessionId
    ) {
      const notif = new Notification(`پیام جدید از ${data.sender}`, {
        body: data.message,
        icon: "/favicon.ico",
        tag: `chat-${targetSessionId}`,
      });
      notif.onclick = () => {
        window.focus();
        const user = users.find((u) => u.session_id === targetSessionId) || {
          session_id: targetSessionId,
          name: data.sender,
          email: "",
          room_code: data.room,
        };
        handleUserSelect(user as User);
      };
    }

    if (selectedUserRef.current?.session_id === targetSessionId) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.message_id === data.message_id);
        return exists ? prev : [...prev, data];
      });
    }

    // 3. افزایش شمارنده برای کاربر (چه جدید چه قدیمی)
    setUsers((prev) =>
      prev.map((u) =>
        u.session_id === targetSessionId
          ? {
              ...u,
              newMessageCount: (u.newMessageCount || 0) + (userExists ? 1 : 0),
              hasNewMessageFlash: true,
              last_active: new Date().toISOString(),
              isOnline: true,
            }
          : u
      )
    );

    if (
      !selectedUserRef.current ||
      selectedUserRef.current.session_id !== targetSessionId
    ) {
      setNewMessageAlert(true);
    }

    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.session_id === targetSessionId
            ? { ...u, hasNewMessageFlash: false }
            : u
        )
      );
    }, 3000);
  }
});

    newSocket.on("user_typing", (data) => {
      if (data.session_id === selectedUserRef.current?.session_id) {
        setTypingUsers([data.name]);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUsers([]), 2000);
      }
    });

    newSocket.on("user_status", ({ session_id, last_active, isOnline }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.session_id === session_id ? { ...u, last_active, isOnline } : u
        )
      );
    });

    newSocket.on("connect_error", () =>
      setError("اتصال Socket با مشکل مواجه شد")
    );
    newSocket.on("disconnect", () => console.log("Socket disconnected"));

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [selectedRoom, loading, notificationPermission]);

  // بارگذاری کاربران
  const loadUsers = async (roomCode: string) => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/users?room=${roomCode}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        const usersList = data.map((user: User) => ({
          ...user,
          room_code: roomCode,
          newMessageCount: user.newMessageCount || 0,
          hasNewMessageFlash: false,
        }));
        setUsers(usersList);

        if (socketRef.current) {
          socketRef.current.emit("join_session", {
            room: roomCode,
            session_id: "admin-global",
          });
          usersList.forEach((u: User) => {
            socketRef.current!.emit("join_session", {
              room: roomCode,
              session_id: u.session_id,
            });
          });
        }
      } else {
        setError(data.error || "بارگذاری کاربران موفقیت‌آمیز نبود");
      }
    } catch {
      setError("بارگذاری کاربران موفقیت‌آمیز نبود");
    }
  };

  // بارگذاری پیام‌ها
  const loadMessages = async (roomCode: string, sessionId: string) => {
    try {
      const res = await fetch(
        `/api/messages?room=${roomCode}&session_id=${sessionId}`
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      await fetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, sessionId }),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.session_id === sessionId
            ? { ...u, newMessageCount: 0, hasNewMessageFlash: false }
            : u
        )
      );
    } catch {
      setMessages([]);
    }
  };

  // انتخاب کاربر
// جدا کردن setSelectedUser از async
const handleUserSelect = (user: User | null) => {
  if (!user) return;

  setSelectedUser(user);
  loadMessages(selectedRoom!.room_code, user.session_id).then(() => {
    setNewMessageAlert(false);
  });
};

  // ارسال پیام ادمین
  const sendMessage = () => {
    if (!message.trim() || !selectedUser || !socketRef.current) return;

    const msgData = {
      room: selectedRoom!.room_code,
      message: message.trim(),
      sender: "Admin",
      sender_type: "admin",
      session_id: selectedUser.session_id,
      timestamp: new Date().toISOString(),
    };

    socketRef.current.emit("send_message", msgData);
    setMessages((prev) => [
      ...prev,
      { ...msgData, sender_type: "admin" as const, message_id: crypto.randomUUID() },
    ]);
    setMessage("");
  };

  const handleTyping = () => {
    if (socketRef.current && selectedUser) {
      socketRef.current.emit("user_typing", {
        room: selectedRoom!.room_code,
        name: "Admin",
        session_id: selectedUser.session_id,
      });
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
  };

  // بعد از useEffect چک احراز هویت
useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser({
          fullName: data.user.fullName,
          username: data.user.username,
          initials: data.user.initials,
          isOnline: data.user.isOnline,
        });
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      window.location.href = '/login';
    }
  };

  fetchCurrentUser();
}, []);
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
        "min-h-screen font-sans transition-all duration-300",
        darkMode
          ? "bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-linear-to-br from-blue-50 via-white to-indigo-50 text-gray-900"
      )}
      dir="rtl"
    >
<Header
  setDarkMode={setDarkMode}
  darkMode={darkMode}
  setShowCreateRoom={setShowCreateRoom}
  setShowSelectSiteModal={setShowSelectSiteModal}
  currentUser={currentUser}
  selectedRoom={selectedRoom} // اضافه شد
/>

      <ErrorAlert error={error} setError={setError} />
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex justify-between items-start gap-4 max-lg:flex-col">
          <UserList
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={handleUserSelect}
            loadMessages={loadMessages}
            darkMode={darkMode}
            newMessageAlert={newMessageAlert}
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

 

      {/* انیمیشن چشمک فقط برای hasNewMessageFlash */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        [data-has-new-message-flash="true"] {
          animation: pulse 1.5s ease-in-out infinite;
        }
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
