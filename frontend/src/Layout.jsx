import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { isPublic } from './utils/publicMode';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, UserPlus, ClipboardList, LogOut, 
  Users, UserCircle, Menu, X, ChevronRight 
} from 'lucide-react';
import { logout, getUser } from './utils/auth';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = getUser();
  const navigate = useNavigate();

  // Route change hone par mobile sidebar auto-close ho jaye
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
  logout();
  window.location.href = "/";
};

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['superadmin', 'admin', 'electrician', 'cro'] },
    { name: 'My Tasks', icon: <ClipboardList size={20} />, path: '/my-tasks', roles: ['electrician', 'cro'] },
    { name: 'Add Staff', icon: <UserPlus size={20} />, path: '/add-staff', roles: ['superadmin', 'admin'] },
    { name: 'Staff Records', icon: <Users size={20} />, path: '/staff-records', roles: ['superadmin', 'admin'] },
    { name: 'Assign Tasks', icon: <ClipboardList size={20} />, path: '/assign-tasks', roles: ['superadmin', 'admin'] },
    { name: 'Profile', icon: <UserCircle size={20} />, path: '/profile', roles: ['superadmin', 'admin', 'electrician', 'cro'] },
    { name: 'Assign Tools', icon: <ClipboardList size={20} />, path: '/assign-tools', roles: ['superadmin', 'admin'] },
  ];

  return (
   <div className={`flex h-screen w-full bg-[#0a0f1e] text-white font-sans overflow-hidden ${isPublic() ? 'pl-0' : ''}`}>
      
      {/* ================= MOBILE HEADER (FIXED TOP) ================= */}
     {!isPublic() && (
<header className="md:hidden fixed top-0 left-0 w-full z-[60] flex items-center justify-between px-6 py-4 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <h1 className="text-xl font-black tracking-tighter italic">
          POWER<span className="text-yellow-500 not-italic">HOUSE</span>
        </h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-yellow-500 rounded-xl text-black shadow-lg shadow-yellow-500/20 active:scale-95 transition-transform"
        >
          <Menu size={20} />
        </button>
      </header>
     )}

      {/* ================= MOBILE OVERLAY ================= */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

    {/* ================= SIDEBAR ================= */}
{!isPublic() && (
<aside className={`
        fixed inset-y-0 left-0 z-[80] w-72 bg-[#020617] border-r border-white/5 
        flex flex-col p-6 shadow-2xl transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0
      `}>
        
        {/* LOGO SECTION */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div>
            <h1 className="text-2xl font-black italic tracking-tight">
              POWER<span className="text-yellow-500 not-italic">HOUSE</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-1 leading-none">Management Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between group px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-yellow-500 text-black font-bold shadow-xl shadow-yellow-500/10'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={isActive ? 'text-black' : 'text-yellow-500 group-hover:scale-110 transition-transform'}>
                      {item.icon}
                    </span>
                    <span className="text-sm tracking-wide">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="opacity-50" />}
                </Link>
              );
          })}
        </nav>

        {/* BOTTOM SECTION: USER & LOGOUT */}
        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-3 py-4 bg-white/[0.03] rounded-[2rem] border border-white/5">
            <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 font-black text-sm shadow-inner">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[9px] uppercase tracking-tighter text-yellow-500 font-black mt-0.5">{user?.role}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-6 py-4 w-full text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
   </aside>
)}

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {isPublic() && (
  <div className="fixed top-0 left-0 w-full z-[90] flex justify-between items-center px-6 py-4 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5">
    <h1 className="text-xl font-black tracking-tighter">
      POWER<span className="text-yellow-500">HOUSE LIVE</span>
    </h1>

    <button
      onClick={() => navigate('/login')}
      className="bg-yellow-500 px-5 py-2 rounded-xl text-black font-bold shadow-lg"
    >
      Login
    </button>
  </div>
)}
        
        {/* SCROLLABLE WRAPPER */}
        <main className={`flex-1 overflow-y-auto px-4 md:px-10 pt-24 md:pt-10 pb-10 scroll-smooth ${isPublic() ? 'pt-28' : ''}`}>
          <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-160px)]">
            {/* Dynamic Content Renders Here */}
            <Outlet />
          </div>
          
          {/* STICKY-STYLE FOOTER */}
          <footer className="mt-20 py-8 border-t border-white/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 opacity-40 hover:opacity-100 transition-opacity duration-500">
              <p className="text-slate-500 text-[9px] uppercase tracking-[0.4em] font-black">
                © 2026 PowerHouse Enterprise v1.2
              </p>
              <div className="flex gap-6">
                <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">System Operational</span>
                <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">v1.2.0-Stable</span>
              </div>
            </div>
          </footer>
        </main>

        {/* DASHBOARD BLUR DECORATION (Optional aesthetic) */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />
      </div>

    </div>
  );
}