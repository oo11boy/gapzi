// ChatComponents/ProfileEditModal.tsx
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

interface ProfileEditModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ show, onClose }: ProfileEditModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // بارگذاری اطلاعات پروفایل
  useEffect(() => {
    if (show && activeTab === "profile") {
      fetch("/api/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setProfileData({
              first_name: data.user.firstName || "",
              last_name: data.user.lastName || "",
              username: data.user.username || "",
              email: data.user.email || "",
            });
          }
        })
        .catch(() => setMessage({ text: "خطا در بارگذاری اطلاعات", type: "error" }));
    }
  }, [show, activeTab]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // ذخیره اطلاعات پروفایل
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileData),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ text: "اطلاعات با موفقیت به‌روزرسانی شد", type: "success" });
        setTimeout(() => onClose(), 1500);
      } else {
        setMessage({ text: result.error || "خطا در به‌روزرسانی", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "خطا در ارتباط با سرور", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // تغییر رمز عبور
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ text: "رمز جدید و تکرار آن یکسان نیستند", type: "error" });
      setLoading(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ text: "رمز جدید باید حداقل ۶ کاراکتر باشد", type: "error" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ text: "رمز عبور با موفقیت تغییر کرد", type: "success" });
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        setTimeout(() => setActiveTab("profile"), 1500);
      } else {
        setMessage({ text: result.error || "خطا در تغییر رمز", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "خطا در ارتباط با سرور", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl z-50 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                ویرایش پروفایل
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === "profile"
                    ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                اطلاعات
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === "password"
                    ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                رمز عبور
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.form
                  key="profile"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleProfileSubmit}
                  className="space-y-4"
                >
                  <InputField
                    name="first_name"
                    placeholder="نام"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                  />
                  <InputField
                    name="last_name"
                    placeholder="نام خانوادگی"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                  />
                  <InputField
                    name="username"
                    placeholder="نام کاربری"
                    value={profileData.username}
                    onChange={handleProfileChange}
                  />
                  <InputField
                    name="email"
                    type="email"
                    placeholder="ایمیل"
                    value={profileData.email}
                    onChange={handleProfileChange}
                  />

                  <MessageAlert message={message} />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-indigo-500 to-indigo-600 text-white font-medium py-3.5 rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        در حال ذخیره...
                      </span>
                    ) : (
                      "ذخیره تغییرات"
                    )}
                  </button>
                </motion.form>
              )}

              {activeTab === "password" && (
                <motion.form
                  key="password"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePasswordSubmit}
                  className="space-y-4"
                >
                  <InputField
                    type="password"
                    name="current_password"
                    placeholder="رمز عبور فعلی"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <InputField
                    type="password"
                    name="new_password"
                    placeholder="رمز عبور جدید"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <InputField
                    type="password"
                    name="confirm_password"
                    placeholder="تکرار رمز عبور جدید"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    required
                  />

                  <MessageAlert message={message} />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-purple-500 to-purple-600 text-white font-medium py-3.5 rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        در حال تغییر...
                      </span>
                    ) : (
                      "تغییر رمز عبور"
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// کامپوننت ورودی حرفه‌ای
function InputField({
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
}: {
  type?: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 peer"
      />
      <label className="absolute right-4 top-3.5 text-sm text-gray-500 dark:text-gray-400 pointer-events-none transition-all duration-200 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-gray-900 px-1 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-indigo-600 dark:peer-valid:text-indigo-400 peer-valid:bg-white dark:peer-valid:bg-gray-900">
        {placeholder}
      </label>
    </div>
  );
}

// کامپوننت پیام با انیمیشن
function MessageAlert({ message }: { message: { text: string; type: "success" | "error" } | null }) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
        message.type === "success"
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      }`}
    >
      {message.type === "success" ? (
        <CheckCircleIcon className="w-5 h-5" />
      ) : (
        <XCircleIcon className="w-5 h-5" />
      )}
      <span>{message.text}</span>
    </motion.div>
  );
}