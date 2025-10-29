'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push('/login');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow w-80">
        <h2 className="text-2xl mb-4">ثبت‌نام ادمین</h2>
        {error && <p className="text-red-500 mb-3">{error}</p>}

        <input name="first_name" placeholder="نام" onChange={handleChange} className="border p-2 mb-3 w-full" />
        <input name="last_name" placeholder="نام خانوادگی" onChange={handleChange} className="border p-2 mb-3 w-full" />
        <input name="username" placeholder="نام کاربری" onChange={handleChange} className="border p-2 mb-3 w-full" />
        <input name="email" type="email" placeholder="ایمیل" onChange={handleChange} className="border p-2 mb-3 w-full" />
        <input name="password" type="password" placeholder="رمز عبور" onChange={handleChange} className="border p-2 mb-3 w-full" />
        
        <button type="submit" className="bg-blue-500 text-white p-2 w-full">ثبت‌نام</button>
      </form>
    </div>
  );
}
