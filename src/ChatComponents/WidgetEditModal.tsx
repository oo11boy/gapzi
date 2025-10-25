interface WidgetEditModalProps {
  settings: {
    primary_color: string;
    secondary_color: string;
    chat_title: string;
    placeholder_text: string;
    welcome_message: string;
    font_family: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSave: () => void;
}

export default function WidgetEditModal({ settings, handleChange, handleSave }: WidgetEditModalProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-700 dark:text-gray-300">رنگ اصلی</label>
        <input
          type="color"
          name="primary_color"
          value={settings.primary_color}
          onChange={handleChange}
          className="w-full h-10 rounded-md"
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">رنگ ثانویه</label>
        <input
          type="color"
          name="secondary_color"
          value={settings.secondary_color}
          onChange={handleChange}
          className="w-full h-10 rounded-md"
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">عنوان چت</label>
        <input
          type="text"
          name="chat_title"
          value={settings.chat_title}
          onChange={handleChange}
          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">متن پیش‌فرض ورودی</label>
        <input
          type="text"
          name="placeholder_text"
          value={settings.placeholder_text}
          onChange={handleChange}
          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">پیام خوش‌آمدگویی</label>
        <textarea
          name="welcome_message"
          value={settings.welcome_message || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:text-gray-100"
          rows={4}
        />
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300">فونت</label>
        <input
          type="text"
          name="font_family"
          value={settings.font_family}
          onChange={handleChange}
          className="w-full p-2 border rounded-md dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <button
        onClick={handleSave}
        className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
      >
        ذخیره تنظیمات
      </button>
    </div>
  );
}