import React, { useState } from 'react';
import { getUser, setToken } from './utils/auth';
import API from './api';
import { User, Lock, Save, ShieldCheck } from 'lucide-react';

export default function Profile() {
  const currentUser = getUser();
  const [formData, setFormData] = useState({ 
    name: currentUser?.name || '', 
    password: '' 
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/user/update-profile/${currentUser.id}`, formData);
      const updatedUser = { ...currentUser, name: formData.name };
      setToken(JSON.stringify(updatedUser));
      alert("✅ Profile Updated Successfully!");
    } catch (err) {
      alert("❌ Update failed!");
    }
  };

  return (
    <div className="animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-yellow-500 rounded-2xl shadow-lg shadow-yellow-500/20">
          <ShieldCheck className="text-slate-900" size={28} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Profile Settings</h1>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <form onSubmit={handleUpdate} className="space-y-8 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 ml-2">Name</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors" size={20} />
              <input 
                type="text" 
                className="w-full pl-14 pr-6 py-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-500/50 transition font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 ml-2">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Leave blank to keep same"
                className="w-full pl-14 pr-6 py-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-yellow-500/50 transition font-medium"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
            <Save size={20} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}