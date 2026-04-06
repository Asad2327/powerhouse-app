import React, { useState } from 'react';
import API from './api';

export default function AddUser() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'electrician',
    phone: '',
    maritalStatus: 'Single',
    address: '',
    backgroundInfo: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await API.post('/user', form);
    alert("User Added ✅");
  };

  // ✅ COMMON INPUT STYLE (NO REPEAT)
  const inputStyle =
    "w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-white/5 focus:border-yellow-500 outline-none";

  return (
    <div className="p-4 md:p-10">
      <h1 className="text-2xl md:text-3xl text-white mb-6">Add Staff</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">

        {/* AUTO ID NOTE */}
        <div className="text-yellow-500 text-sm font-bold md:col-span-2">
          Employee ID will be auto generated
        </div>

        {/* NAME */}
        <input
          placeholder="Full Name"
          className={inputStyle}
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        {/* EMAIL */}
        <input
          placeholder="Email"
          className={inputStyle}
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        {/* PASSWORD */}
        <input
          placeholder="Set Password"
          type="password"
          className={inputStyle}
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {/* PHONE */}
        <input
          placeholder="Phone"
          className={inputStyle}
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />

        {/* PROFILE IMAGE */}
        <input
          type="file"
          className="w-full text-sm text-white"
        />

        {/* ROLE */}
        <select
          className={inputStyle}
          value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value })}
        >
          <option value="electrician">Electrician</option>
          <option value="cro">CRO</option>
          <option value="admin">Admin</option>
        </select>

        {/* MARITAL STATUS */}
        <select
          className={inputStyle}
          value={form.maritalStatus}
          onChange={e => setForm({ ...form, maritalStatus: e.target.value })}
        >
          <option value="Single">Single</option>
          <option value="Married">Married</option>
        </select>

        {/* ADDRESS */}
        <textarea
          placeholder="Address"
          className={inputStyle}
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />

        {/* BACKGROUND */}
        <textarea
          placeholder="Background Info"
          className={inputStyle}
          value={form.backgroundInfo}
          onChange={e => setForm({ ...form, backgroundInfo: e.target.value })}
        />

        {/* BUTTON */}
        <button
          className="col-span-1 md:col-span-2 bg-yellow-500 py-3 rounded-xl font-bold hover:scale-[1.02] transition"
        >
          Create
        </button>

      </form>
    </div>
  );
}