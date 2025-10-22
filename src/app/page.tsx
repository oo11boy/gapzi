'use client';

import { useState } from 'react';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const login = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) setToken(data.token);
  };

  if (token) return <div>شما وارد شدید. <a href="/dashboard">رفتن به داشبورد</a></div>;

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">ورود</h1>
      <input type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 mb-2"/>
      <input type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 mb-2"/>
      <button onClick={login} className="bg-blue-500 text-white px-4 py-2 rounded">ورود</button>
    </div>
  );
}
