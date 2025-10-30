"use client";
import ChatArea from "@/ChatComponents/ChatArea";
import CreateRoomModal from "@/ChatComponents/CreateRoomModal";
import EmbedCodeModal from "@/ChatComponents/EmbedCodeModal";
import ErrorAlert from "@/ChatComponents/ErrorAlert";
import Header from "@/ChatComponents/Header";
import MobileChatModal from "@/ChatComponents/MobileChatModal";
import SelectSiteModal from "@/ChatComponents/SelectSiteModal";
import Sidebar from "@/ChatComponents/Sidebar";
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
  hasNewMessageFlash?: boolean;
}

interface Message {
  message_id: string;
  sender: string;
  message: string;
  session_id: string;
  timestamp: string;
  sender_type: "admin" | "guest";
  edited?: boolean;
}

function formatLastSeen(date: number | Date) {
  const now = new Date();
  const dateValue = date instanceof Date ? date.getTime() : date;
  const diff = Math.floor((now.getTime() - dateValue) / 1000);

  if (diff < 60) return "آخرین بازدید چند لحظه پیش";
  if (diff < 3600) return `آخرین بازدید ${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `آخرین بازدید ${Math.floor(diff / 3600)} ساعت پیش`;

  const days = Math.floor(diff / 86400);
  if (days === 1) return "دیروز";
  if (days < 7) return `${days} روز پیش`;
  return new Date(date).toLocaleDateString("fa-IR");
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
  const [darkMode, setDarkMode] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSelectSiteModal, setShowSelectSiteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [editingMessage, setEditingMessage] = useState<string | null>(null);

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
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // ایجاد صدا
  useEffect(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.preload = "auto";
    notificationSoundRef.current = audio;
  }, []);

  // درخواست نوتیفیکیشن
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(setNotificationPermission);
    } else if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // همگام‌سازی selectedUser
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // اسکرول خودکار
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setNewMessageAlert(false);
  }, [messages]);

  // چک احراز هویت
  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) window.location.href = "/login";
    };
    checkAuth();
  }, []);

  // ایجاد اتاق
  const createRoom = async () => {
    if (!siteUrl) return setError("لطفاً آدرس وب‌سایت را وارد کنید");
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(siteUrl))
      return setError("URL معتبر نیست");

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
        const embed = `<script src="${process.env.NEXT_PUBLIC_BASE_URL}/chat-widget.js?room=${data.room_code}"></script>`;
        const newRoom = { ...data, embed_code: embed };
        setRooms((prev) => [...prev, newRoom]);
        setSelectedRoom(newRoom);
        sessionStorage.setItem("selectedRoom", JSON.stringify(newRoom));
        await loadUsers(newRoom.room_code);
        setShowCreateRoom(false);
        setSiteUrl("");
        setEmbedCode(embed);
        setShowEmbedModal(true);
      } else {
        setError(data.error || "خطا در ایجاد اتاق");
      }
    } catch {
      setError("خطای سرور");
    } finally {
      setLoading(false);
    }
  };

  // پینگ دوره‌ای
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current?.connected && selectedRoom) {
        socketRef.current.emit("join_session", {
          room: selectedRoom.room_code,
          session_id: "admin-global",
        });
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [selectedRoom]);

  // بارگذاری اتاق‌ها
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/rooms", { credentials: "include" });
        const data = await res.json();

        if (res.status === 403) return setError("دسترسی غیرمجاز");

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

        const saved = sessionStorage.getItem("selectedRoom");
        let roomToSelect = saved
          ? JSON.parse(saved)
          : roomsWithEmbed[roomsWithEmbed.length - 1];
        const found = roomsWithEmbed.find(
          (r: Room) => r.room_code === roomToSelect.room_code
        );
        if (found) roomToSelect = found;

        setSelectedRoom(roomToSelect);
        sessionStorage.setItem("selectedRoom", JSON.stringify(roomToSelect));
        if (roomToSelect?.room_code) await loadUsers(roomToSelect.room_code);
      } catch {
        setError("بارگذاری اتاق‌ها ناموفق");
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // اتصال Socket.io
  useEffect(() => {
    if (loading || !selectedRoom) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      }
    );

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      newSocket.emit("join_session", {
        room: selectedRoom.room_code,
        session_id: "admin-global",
      });
      newSocket.emit("admin_connect", {
        room: selectedRoom.room_code,
        adminId: "admin-global",
      });
    });

    // دریافت پیام
    newSocket.on("receive_message", (data) => {
      if (data.room !== selectedRoom.room_code) return;

      if (data.sender_type === "guest") {
        const targetId = data.session_id;

        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.session_id === targetId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              name: data.sender,
              last_active: new Date().toISOString(),
              isOnline: true,
              newMessageCount:
                selectedUserRef.current?.session_id === targetId
                  ? 0
                  : (updated[idx].newMessageCount || 0) + 1,
              hasNewMessageFlash: true,
            };
            return updated;
          }
          return [
            ...prev,
            {
              session_id: targetId,
              name: data.sender,
              email: "",
              room_code: data.room,
              newMessageCount:
                selectedUserRef.current?.session_id === targetId ? 0 : 1,
              hasNewMessageFlash: true,
              isOnline: true,
              last_active: new Date().toISOString(),
            },
          ];
        });

        notificationSoundRef.current?.play().catch(() => {});

        if (
          notificationPermission === "granted" &&
          document.hidden &&
          selectedUserRef.current?.session_id !== targetId
        ) {
          const notif = new Notification(`پیام جدید از ${data.sender}`, {
            body: data.message,
            icon: "/favicon.ico",
            tag: `chat-${targetId}`,
          });
          notif.onclick = () => {
            window.focus();
            const user = users.find((u) => u.session_id === targetId) || {
              session_id: targetId,
              name: data.sender,
              email: "",
              room_code: data.room,
            };
            handleUserSelect(user as User);
          };
        }

        if (selectedUserRef.current?.session_id === targetId) {
          setMessages((prev) =>
            prev.some((m) => m.message_id === data.message_id)
              ? prev
              : [...prev, data]
          );
        }

        if (
          !selectedUserRef.current ||
          selectedUserRef.current.session_id !== targetId
        ) {
          setNewMessageAlert(true);
        }

        setTimeout(() => {
          setUsers((prev) =>
            prev.map((u) =>
              u.session_id === targetId
                ? { ...u, hasNewMessageFlash: false }
                : u
            )
          );
        }, 3000);
      }
    });

    // ویرایش پیام
    newSocket.on("message_edited", (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === data.message_id
            ? { ...m, message: data.message, edited: true }
            : m
        )
      );
    });

    // حذف پیام
    newSocket.on("message_deleted", ({ message_id }) => {
      setMessages((prev) => prev.filter((m) => m.message_id !== message_id));
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

    newSocket.on("connect_error", () => setError("اتصال قطع شد"));
    newSocket.on("disconnect", () => console.log("Socket disconnected"));

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [selectedRoom, loading, notificationPermission]);

  // بارگذاری کاربران
  const loadUsers = async (roomCode: string) => {
    try {
      const res = await fetch(`/api/users?room=${roomCode}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        const unique = data
          .filter(
            (u: User, i: number, self: User[]) =>
              i === self.findIndex((t) => t.session_id === u.session_id)
          )
          .map((u: User) => ({
            ...u,
            room_code: roomCode,
            newMessageCount: u.newMessageCount || 0,
            hasNewMessageFlash: false,
          }));
        setUsers(unique);

        if (socketRef.current) {
          socketRef.current.emit("join_session", {
            room: roomCode,
            session_id: "admin-global",
          });
          unique.forEach((u: { session_id: any; }) =>
            socketRef.current!.emit("join_session", {
              room: roomCode,
              session_id: u.session_id,
            })
          );
        }
      }
    } catch {
      setError("بارگذاری کاربران ناموفق");
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
  const handleUserSelect = (user: User | null) => {
    if (!user) return;
    setSelectedUser(user);
    loadMessages(selectedRoom!.room_code, user.session_id).then(() =>
      setNewMessageAlert(false)
    );
  };

  // ارسال/ویرایش پیام
  const sendMessage = async () => {
    if (!message.trim() || !selectedUser || !socketRef.current) return;

    const isEdit = !!editingMessage;
    const msgData = {
      message_id: isEdit ? editingMessage! : crypto.randomUUID(),
      room: selectedRoom!.room_code,
      message: message.trim(),
      sender: "Admin",
      sender_type: "admin" as const,
      session_id: selectedUser.session_id,
      timestamp: new Date().toISOString(),
      edited: isEdit,
    };

    if (isEdit) {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === editingMessage
            ? { ...m, message: message.trim(), edited: true }
            : m
        )
      );
      socketRef.current.emit("edit_message", msgData);
      await fetch(`/api/messages/${editingMessage}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
        credentials: "include",
      });
    } else {
      setMessages((prev) => [
        ...prev,
        { ...msgData, message_id: msgData.message_id },
      ]);
      socketRef.current.emit("send_message", msgData);
    }

    setMessage("");
    setEditingMessage(null);
  };

  const handleEdit = (msg: Message) => {
    setMessage(msg.message);
    setEditingMessage(msg.message_id);
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm("حذف پیام؟")) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.message_id !== messageId));
        socketRef.current?.emit("delete_message", {
          message_id: messageId,
          room: selectedRoom!.room_code,
        });
      }
    } catch {
      setError("حذف ناموفق");
    }
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

  // کاربر جاری
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser({
            fullName: data.user.fullName,
            username: data.user.username,
            initials: data.user.initials,
            isOnline: data.user.isOnline,
          });
        } else {
          window.location.href = "/login";
        }
      } catch {
        window.location.href = "/login";
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
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Sidebar
        setShowCreateRoom={setShowCreateRoom}
        setShowSelectSiteModal={setShowSelectSiteModal}
        currentUser={currentUser}
        selectedRoom={selectedRoom}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
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
            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
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
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
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
