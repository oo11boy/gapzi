// server.js ← فقط این یک فایل برای همیشه! (هم dev هم production بدون هیچ تغییری!)
require("dotenv").config();

const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const path = require("path");
const fs = require("fs");
// این ۳ خط جدید رو دقیقاً اینجا اضافه کن (بعد از require dotenv)
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  if (
    process.argv.includes("start") ||
    process.env.npm_lifecycle_event === "start"
  ) {
    process.env.NODE_ENV = "production"; // اجبار به پروداکشن در npm start
  }
}
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

// فقط در پروداکشن (npm run start) فعال باشه — در dev هیچوقت نه
const isStandalone = !dev;
const app = next({
  dev,
  // فقط در حالت standalone مسیر و تنظیمات رو بده
  ...(isStandalone ? { dir: __dirname, conf: { distDir: ".next" } } : {}),
});
const handle = app.getRequestHandler();

// دیتابیس و متغیرها
const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chat_system",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: "+00:00",
});

const onlineUsers = new Map();
const adminStatus = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const { pathname } = new URL(
      req.url || "",
      `http://${req.headers.host || "localhost"}`
    );

    // فقط در حالت standalone فایل‌های استاتیک رو دستی سرو کن
    if (isStandalone) {
      // فایل‌های JS و CSS از _next/static
      if (pathname.startsWith("/_next/static/")) {
        const filePath = path.join(
          __dirname,
          ".next/static",
          pathname.slice(13)
        );
        return fs.readFile(filePath, (err, data) => {
          if (err) return handle(req, res);
          res.setHeader(
            "Content-Type",
            pathname.endsWith(".css") ? "text/css" : "application/javascript"
          );
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.end(data);
        });
      }

      // فایل‌های public (فونت، صدا، عکس، svg و ...)
      if (
        pathname.startsWith("/public/") ||
        pathname.startsWith("/fonts/") ||
        pathname.startsWith("/sounds/") ||
        /\.(woff|woff2|ttf|mp3|svg|ico|png|jpg|jpeg|webp)$/.test(pathname)
      ) {
        const filePath = path.join(__dirname, pathname);
        return fs.readFile(filePath, (err, data) => {
          if (err) return handle(req, res);
          res.end(data);
        });
      }
    }

    // بقیه درخواست‌ها رو بده به Next.js
    handle(req, res);
  });

  // Socket.io
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: dev ? "http://localhost:3000" : "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 25000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    let userRoom = null;
    let userSession = null;
    let activityInterval = null;

    socket.on("join_session", async ({ room, session_id }) => {
      if (!room || !session_id) return;
      userRoom = room;
      userSession = session_id;

      socket.join(room);
      if (!session_id.startsWith("admin-") && session_id !== "admin-global") {
        socket.join(`${room}:${session_id}`);
      }

      try {
        const [rows] = await pool.execute(
          "SELECT id FROM chat_rooms WHERE room_code = ?",
          [room]
        );
        if (!rows.length) return socket.emit("error", "Invalid room");
        const roomId = rows[0].id;

        await pool.execute(
          "INSERT INTO user_sessions (room_id, session_id, last_active) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_active = NOW()",
          [roomId, session_id]
        );

        const count = (onlineUsers.get(session_id) || 0) + 1;
        onlineUsers.set(session_id, count);

        activityInterval = setInterval(async () => {
          try {
            await pool.execute(
              "UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?",
              [roomId, session_id]
            );
          } catch {}
        }, 25000);

        socket.data.activityInterval = activityInterval;

        io.to(room).emit("user_status", {
          session_id,
          isOnline: true,
          last_active: new Date().toISOString(),
        });
      } catch (err) {
        console.error("join_session error:", err);
      }
    });

    socket.on("send_message", async (data) => {
      if (!userRoom || !data.message?.trim()) return;
      const {
        sender_type = "guest",
        session_id: dataSessionId,
        message,
        timestamp,
      } = data;
      const sessionIdToUse = dataSessionId || userSession;

      try {
        const [rooms] = await pool.execute(
          "SELECT id FROM chat_rooms WHERE room_code = ?",
          [userRoom]
        );
        if (!rooms.length) return;
        const roomId = rooms[0].id;
        const messageId = uuidv4();

        await pool.execute(
          "INSERT INTO messages (message_id, room_id, session_id, sender_type, message, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
          [
            messageId,
            roomId,
            sessionIdToUse,
            sender_type,
            message,
            timestamp || new Date().toISOString(),
          ]
        );

        await pool.execute(
          "UPDATE user_sessions SET last_active = NOW() WHERE session_id = ?",
          [sessionIdToUse]
        );

        const msg = {
          ...data,
          message_id: messageId,
          room: userRoom,
          session_id: sessionIdToUse,
          timestamp: timestamp || new Date().toISOString(),
        };

        socket.emit("receive_message", msg);
        if (sender_type === "admin") {
          io.to(`${userRoom}:${sessionIdToUse}`).emit("receive_message", msg);
        } else {
          io.to(userRoom).emit("receive_message", msg);
        }
      } catch (err) {
        console.error("send_message error:", err);
      }
    });

    socket.on("user_typing", ({ name }) => {
      if (userRoom && userSession) {
        socket
          .to(userRoom)
          .except(`${userRoom}:${userSession}`)
          .emit("user_typing", { name, session_id: userSession });
      }
    });

    socket.on("user_activity", async ({ room, session_id }) => {
      if (!room || !session_id) return;
      try {
        const [rows] = await pool.execute(
          "SELECT id FROM chat_rooms WHERE room_code = ?",
          [room]
        );
        if (rows.length > 0) {
          await pool.execute(
            "UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?",
            [rows[0].id, session_id]
          );
        }
      } catch {}
    });

    socket.on("admin_connect", ({ room, adminId }) => {
      adminStatus.set(`${room}:${adminId}`, Date.now());
      io.to(room).emit("admin_status", { isOnline: true });
    });

    socket.on("edit_message", async (data) => {
      const { message_id, message, room, session_id } = data;
      if (!message_id || !message || !room || !session_id) return;

      try {
        const [result] = await pool.execute(
          "UPDATE messages SET message = ?, edited = 1, updated_at = NOW() WHERE message_id = ?",
          [message, message_id]
        );
        if (result.affectedRows === 0) return;

        const [rows] = await pool.execute(
          "SELECT created_at FROM messages WHERE message_id = ?",
          [message_id]
        );
        const originalTimestamp =
          rows[0]?.created_at || new Date().toISOString();

        const editData = {
          message_id,
          message,
          edited: true,
          timestamp: originalTimestamp,
          edited_at: new Date().toISOString(),
          room,
          session_id,
        };
        io.to(room).emit("message_edited", editData);
        io.to(`${room}:${session_id}`).emit("message_edited", editData);
      } catch {}
    });

    socket.on("delete_message", async ({ message_id, room }) => {
      try {
        await pool.execute("DELETE FROM messages WHERE message_id = ?", [
          message_id,
        ]);
        io.to(room).emit("message_deleted", { message_id });
      } catch {}
    });

    socket.on("disconnect", async () => {
      if (!userRoom || !userSession) return;
      if (socket.data.activityInterval)
        clearInterval(socket.data.activityInterval);

      try {
        const count = (onlineUsers.get(userSession) || 1) - 1;
        if (count <= 0) {
          onlineUsers.delete(userSession);
          const [rows] = await pool.execute(
            "SELECT id FROM chat_rooms WHERE room_code = ?",
            [userRoom]
          );
          if (rows.length > 0) {
            const roomId = rows[0].id;
            const offlineTime = new Date().toISOString();
            await pool.execute(
              "UPDATE user_sessions SET last_active = ? WHERE room_id = ? AND session_id = ?",
              [offlineTime, roomId, userSession]
            );
            io.to(userRoom).emit("user_status", {
              session_id: userSession,
              isOnline: false,
              last_active: offlineTime,
            });
          }
        } else {
          onlineUsers.set(userSession, count);
        }
      } catch {}
    });
  });

  // بررسی ادمین آفلاین هر ۳۰ ثانیه
  setInterval(() => {
    const now = Date.now();
    for (const [key, time] of adminStatus.entries()) {
      if (now - time > 600000) {
        // ۱۰ دقیقه
        const [room] = key.split(":");
        adminStatus.delete(key);
        io.to(room).emit("admin_status", { isOnline: false });
      }
    }
  }, 30000);

  server.listen(port, "0.0.0.0", () => {
    console.log(`سرور آماده → http://localhost:${port}`);
    console.log(`حالت: ${dev ? "توسعه (dev)" : "پروداکشن (standalone)"}`);
  });
});
