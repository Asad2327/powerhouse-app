import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import API from './api';
import { 
  Users, ClipboardList, CheckCircle, Search, Calendar, Tag, Activity, 
  Loader2, RefreshCw, AlertCircle, Eye, Trash2, Download, X, FileText, 
  Clock, Edit3, Save, TrendingUp, Filter, ArrowUpDown, ChevronRight, User, Bell
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { socket } from './utils/socket';
import { isPublic } from './utils/publicMode';


export default function Dashboard() {
    const navigate = useNavigate();
  const playSound = (type) => {
  let url = "";

  if (type === "new") {
    url = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
  }

  if (type === "completed") {
    url = "https://assets.mixkit.co/active_storage/sfx/3200/3200-preview.mp3";
  }

  if (type === "rejected") {
    url = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";
  }

  const audio = new Audio(url);
  audio.play();
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
  const [stats, setStats] = useState({ 
    staffCount: 0, 
    taskCount: 0, 
    runningCount: 0, 
    closedCount: 0, 
    activities: [] 
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [notifications, setNotifications] = useState([]);
const [showPanel, setShowPanel] = useState(false);
const [toast, setToast] = useState(null);
const [hoveredReject, setHoveredReject] = useState(null);
const [tooltip, setTooltip] = useState({
  visible: false,
  x: 0,
  y: 0,
  text: "",
  width: 250,
  height: 120
});

const showToast = (msg) => {
  setToast(msg);
  setTimeout(() => setToast(null), 3000);
};
const getAssignedUserIds = (task) => {
  if (Array.isArray(task?.assigned_user_ids) && task.assigned_user_ids.length) {
    return task.assigned_user_ids.map((id) => String(id));
  }

  return task?.user_id ? [String(task.user_id)] : [];
};

const getAssignedStaffNames = (task) => {
  if (Array.isArray(task?.assigned_staff_names) && task.assigned_staff_names.length) {
    return task.assigned_staff_names;
  }

  return task?.staff_name ? [task.staff_name] : [];
};

const getAssignedUserLabel = (task) => {
  const ids = getAssignedUserIds(task);
  return ids.length ? ids.join(", ") : "N/A";
};

const getAssignedStaffLabel = (task) => {
  const names = getAssignedStaffNames(task);
  return names.length ? names.join(", ") : "Unassigned";
};

const getPrimaryStaffName = (task) => {
  const names = getAssignedStaffNames(task);
  return names[0] || task?.staff_name || "User";
};
  // ✅ REPORT FILTER STATE
const [reportType, setReportType] = useState(
  isPublic() ? "daily" : "all"
);
// ✅ CUSTOM DATE RANGE
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
  
  // Modals & Preview States
  const [previewTask, setPreviewTask] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [lastTaskId, setLastTaskId] = useState(null);
  const [lastCount, setLastCount] = useState(0);
const [isFullscreen, setIsFullscreen] = useState(false);
const [dateStep, setDateStep] = useState("from"); 
// "from" | "to" | "done"
  // ✅ FETCH DATA
 const fetchStats = async () => {
  try {
    const res = await API.get('/activity/stats');

    setStats(prev => ({
      ...prev,
      staffCount: res.data?.staffCount || 0,
      taskCount: res.data?.taskCount || 0,
      runningCount: res.data?.runningCount || 0,
      closedCount: res.data?.closedCount || 0,
      activities: Array.isArray(res.data?.activities) ? res.data.activities : []
    }));

  } catch (err) {
    console.error("❌ Stats Fetch Error:", err);
  }
};

  // ✅ CRUD OPERATIONS
  const handleDelete = async (id) => {
  if (!window.confirm("❗ Delete this Task Permanently?")) return;

  try {
  await API.delete(`/task/${id}`);

    // ✅ NO REFRESH — LOCAL UPDATE
    setStats(prev => ({
      ...prev,
      activities: prev.activities.filter(task => task.id !== id)
    }));

  } catch (err) {
    console.error(err);
  }
};

 const handleStatusUpdate = async (id, status, user_id) => {
  try {
    console.log("🔥 STATUS UPDATE:", { id, status, user_id });

   await API.put(`/task/update-status/${id}`, {
  status: status
});

    setStats(prev => ({
      ...prev,
      activities: prev.activities.map(task =>
        task.id === id ? { ...task, status } : task
      )
    }));

  } catch (err) {
    console.error("❌ STATUS UPDATE ERROR:", err?.response?.data || err.message);
  }
};

   

  const handleSaveEdit = async () => {
  try {
    const formData = new FormData();
    const assignedUserIds = getAssignedUserIds(editData);

    formData.append("title", editData.title);
    formData.append("description", editData.description);
    formData.append("category", editData.category);
    formData.append("status", editData.status);
    formData.append("user_id", assignedUserIds[0] || "");
    assignedUserIds.forEach((userId) => formData.append("user_ids[]", userId));

    // ❌ IMPORTANT: empty files send karo
    formData.append("removedFiles", JSON.stringify([]));

    await API.put(`/task/${editData.id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    alert("✅ Task Updated Successfully!");
    setEditMode(false);

    setStats(prev => ({
      ...prev,
      activities: prev.activities.map(task =>
        task.id === editData.id ? { ...task, ...editData } : task
      )
    }));

    setPreviewTask(editData);

  } catch (err) {
    console.error("❌ UPDATE ERROR:", err?.response?.data || err.message);
    alert("❌ Update Failed!");
  }
};

 useEffect(() => {
  const init = async () => {
    setLoading(true);     // ✅ ONLY FIRST TIME
    await fetchStats();
    setLoading(false);    // ✅ STOP LOADING AFTER FIRST LOAD
  };

  init();

  const interval = setInterval(() => {
    fetchStats(); // ✅ NO loading here
  }, 5000);

 socket.off("updateData"); // ✅ CLEAN OLD
socket.on("updateData", async () => {
  console.log("⚡ LIVE UPDATE");

  const res = await API.get('/activity/stats');
  const newActivities = res.data?.activities || [];
 const latest = newActivities[0];

if (!latest) return; // ✅ CRASH FIX

if (latest.status === "Completed") {
  playSound("completed");
}
else if (latest.status === "Rejected") {
  playSound("rejected");
}
else {
  playSound("new");
}
// ✅ ADD THIS BELOW SOUND BLOCK
setNotifications(prev => [
  {
    id: Date.now(),
    text: `${latest?.staff_name || "User"} → ${latest?.status}`,
    time: new Date().toLocaleTimeString()
  },
  ...prev.slice(0, 9)
]);

showToast(`Task ${latest?.status}`);

  setLastCount(newActivities.length);

  setStats({
    staffCount: res.data?.staffCount || 0,
    taskCount: res.data?.taskCount || 0,
    runningCount: res.data?.runningCount || 0,
    closedCount: res.data?.closedCount || 0,
    activities: newActivities
  });
});

 return () => {
  socket.off("updateData");
  clearInterval(interval); // ✅ ADD
};
}, []);
useEffect(() => {
  const handler = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  document.addEventListener("fullscreenchange", handler);

  return () => {
    document.removeEventListener("fullscreenchange", handler);
  };
}, []);
useEffect(() => {
  socket.on("connect", () => {
    console.log("✅ SOCKET CONNECTED:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ SOCKET ERROR:", err.message);
  });

  // ✅ ADMIN ROOM JOIN
  socket.emit("joinAdmin");

  return () => {
    socket.off("connect");
    socket.off("connect_error");
  };
}, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ ADVANCED SEARCH & MULTI-FILTER LOGIC (ID, NAME, TASK ID)
  const filteredData = useMemo(() => {
    let result = (stats.activities || []).filter(act => 
      (filterStatus === "All" || act.status === filterStatus) &&
      (categoryFilter === "All" || act.category === categoryFilter) &&
(priorityFilter === "All" || (act.priority || "Low") === priorityFilter)&&
      (staffFilter === "All" || act.staff_name === staffFilter) &&
      (
        act.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        (act.staff_name || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        act.id?.toString().includes(debouncedSearch) ||
        act.user_id?.toString().includes(debouncedSearch)
      )
    );
    // ✅ DATE FILTER (DAILY / WEEKLY / MONTHLY / YEARLY)
const now = new Date();

result = result.filter(item => {
  const itemDate = new Date(item.created_at);
  const now = new Date();

  // ✅ CUSTOM RANGE ONLY WHEN SELECTED
  if (reportType === "custom" && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return itemDate >= start && itemDate <= end;
  }

  if (reportType === "all") return true;

  if (reportType === "daily") {
    return itemDate.toDateString() === now.toDateString();
  }

  if (reportType === "weekly") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return itemDate >= weekAgo && itemDate <= now;
  }

  if (reportType === "monthly") {
    return (
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }

  if (reportType === "yearly") {
    return itemDate.getFullYear() === now.getFullYear();
  }

  return true;
});
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };

return result.sort((a, b) => {

  // ✅ PUBLIC MODE: Pending first
  if (isPublic()) {
    if (a.status === "Pending" && b.status !== "Pending") return -1;
    if (a.status !== "Pending" && b.status === "Pending") return 1;
  }

  if (sortOrder === "priority") {
    return priorityOrder[b.priority || "Low"] - priorityOrder[a.priority || "Low"];
  }

  return sortOrder === "newest"
    ? new Date(b.created_at) - new Date(a.created_at)
    : new Date(a.created_at) - new Date(b.created_at);
});
  }, [stats.activities, filterStatus, categoryFilter, priorityFilter, staffFilter, debouncedSearch, sortOrder, reportType]);

  // ✅ ANALYTICS PREP
  const chartData = [
  { name: 'Total', value: filteredData.length, color: '#eab308' },
  { 
    name: 'Running', 
    value: filteredData.filter(t => t.status === "In Progress").length, 
    color: '#f97316' 
  },
  { 
    name: 'Closed', 
    value: filteredData.filter(t => t.status === "Completed").length, 
    color: '#22c55e' 
  },
];

  // ✅ STAFF LIST FOR FILTER
 const [allStaff, setAllStaff] = useState([]);

useEffect(() => {
  API.get('/user/all')
    .then(res => setAllStaff(res.data))
    .catch(err => console.error(err));
}, []);

const staffList = useMemo(() => {
  return allStaff.map(s => s.name);
}, [allStaff]);
  // ✅ EXPORT ADVANCED CUSTOM REPORT
  const exportCustomReport = () => {
    const header = ["Task ID", "User ID", "Subject", "Category", "Status", "Staff Assigned", "Date"];
    const csvContent = [
      header.join(","),
      ...filteredData.map(r => [
        r.id, r.user_id || 'N/A', r.title, r.category, r.status, r.staff_name || 'Unassigned', new Date(r.created_at).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], {type: 'text/csv'});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PowerHouse_Custom_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };
  // ✅ ADVANCED REPORT EXPORT (WITH TYPE)
const exportAdvancedReport = () => {
  const header = ["Task ID", "User ID", "Title", "Category", "Priority", "Status", "Staff", "Date"];

  const rows = filteredData.map(r => [
    r.id,
    r.user_id || 'N/A',
    `"${(r.title || "").replace(/"/g, '""')}"`,
    r.category,
    r.status,
    r.staff_name || 'Unassigned',
    new Date(r.created_at).toLocaleString()
  ]);

  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");

  const url = URL.createObjectURL(blob);
link.href = url;
link.download = `Report_${reportType}_${new Date().toLocaleDateString()}.csv`;
link.click();
URL.revokeObjectURL(url);
};

 if (loading) return (
  <div className="h-screen flex items-center justify-center bg-[#0a0f1e] text-yellow-500">
    Loading Live Data...
    {toast && (
  <div className="fixed bottom-5 right-5 bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50">
    {toast}
  </div>
)}
  </div>
);

  return (
 <div className="min-h-screen flex flex-col overflow-x-hidden pt-[70px]">

      {/* --- TOP HEADER --- */}
 <div className="p-1 lg:p-1 space-y-3 sticky top-0 z-40 bg-[#0a0f1e]">

<div className="relative flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">

  <div>
    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter">
      {isPublic() 
        ? <>LIVE ⚡ <span className="text-yellow-500">MONITOR</span></>
        : <>Admin <span className="text-yellow-500">Ultra Portal</span></>
      }
    </h1>
    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] mt-1 italic">
      Operational Analytics & Command
    </p>
  </div>

  <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
    <button 
      onClick={() => setShowPanel(!showPanel)}
      className="relative p-3 bg-white/5 border border-white/10 rounded-2xl text-yellow-500"
    >
      <Bell size={18} />
    </button>

    <button
      onClick={toggleFullscreen}
      className="px-4 py-2 bg-yellow-500 text-black rounded-xl text-xs font-bold"
    >
      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    </button>

    <div className="relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
      <input 
        type="text"
        placeholder="Search ID, Name, Task..." 
        className="pl-12 pr-6 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-yellow-500/50 w-full md:w-64"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>

    <button
      onClick={fetchStats}
      className="p-3 bg-white/5 border border-white/10 rounded-2xl text-yellow-500 hover:scale-105 transition-all"
    >
      <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
    </button>
  </div>

  {/* ✅ NOTIFICATION PANEL (FIXED POSITION) */}
  {showPanel && (
    <div className="absolute right-0 top-[70px] w-80 bg-slate-900 border border-white/10 rounded-2xl p-4 z-50 shadow-2xl">
      <h3 className="text-white text-sm font-bold mb-3">Notifications</h3>

      {notifications.length === 0 ? (
        <p className="text-slate-500 text-xs">No activity</p>
      ) : (
        notifications.map(n => (
          <div key={n.id} className="border-b border-white/5 py-2">
            <p className="text-xs text-white">{n.text}</p>
            <p className="text-[10px] text-slate-500">{n.time}</p>
          </div>
        ))
      )}
    </div>
  )}

</div>

      {/* --- ANALYTICS GRAPH --- */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3 sticky top-[90px] z-30 bg-[#0a0f1e] py-2">
{(
    <>
      {/* --- GRAPH --- */}
   <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] shadow-xl min-h-[220px]">
        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
          <TrendingUp size={18} className="text-yellow-500" /> Operational Efficiency
        </h3>

       <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
            />
            <Tooltip 
              cursor={{ fill: '#ffffff05' }} 
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} 
            />
            <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={50}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* --- STAT CARDS --- */}
     <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3">
      {[
  { label: "Staff", val: stats.staffCount, color: "text-blue-400" },
  { label: "Total", val: filteredData.length, color: "text-yellow-500" },
  { label: "Pending", val: filteredData.filter(t => t.status === "Pending").length, color: "text-yellow-400" },
  { label: "Active", val: filteredData.filter(t => t.status === "In Progress").length, color: "text-orange-400" },
  { label: "Closed", val: filteredData.filter(t => t.status === "Completed").length, color: "text-green-400" },
  { label: "Rejected", val: filteredData.filter(t => t.status === "Rejected").length, color: "text-red-400" },
].map((item, i) => (
          <div 
            key={i} 
           className="bg-slate-900/40 border border-white/5 p-4 rounded-[1.5rem] text-center shadow-lg"
          >
            <h2 className={`text-3xl font-black mb-1 ${item.color}`}>
              {item.val}
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </>
  )}

</div>

      {/* --- ADVANCED FILTERS & REPORT --- */}
  {(
<div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-5 lg:p-6 shadow-xl mb-3 sticky top-[180px] z-20 backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6">
          <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
             <Filter className="text-yellow-500" size={24}/> Filtering & Reports
          </h2>
          <button onClick={exportAdvancedReport}className="bg-yellow-500 text-slate-950 px-8 py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase flex items-center gap-2 shadow-xl shadow-yellow-500/10">
            <Download size={16}/> Download Custom Report
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Status</label>
            <select className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs outline-none" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
               <option value="All">All Statuses</option>
               <option value="Pending">Pending</option>
               <option value="In Progress">In Progress</option>
               <option value="Completed">Completed</option>
               <option value="Rejected">Rejected</option>
            </select>
           
        
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Category</label>
            <select className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs outline-none" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
               <option value="All">All Categories</option>
               <option value="Electrical">Electrical</option>
               <option value="Mechanical">Mechanical</option>
               <option value="General">General</option>
            </select>
          </div>
{/* PRIORITY */}
<div className="space-y-2">
  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">
    Priority
  </label>
  <select
    className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs outline-none"
    value={priorityFilter}
    onChange={(e) => setPriorityFilter(e.target.value)}
  >
    <option value="All">All Priority</option>
    <option value="Low">Low</option>
    <option value="Medium">Medium</option>
    <option value="High">High</option>
  </select>
</div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">By Staff Name</label>
            <select className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs outline-none" value={staffFilter} onChange={(e)=>setStaffFilter(e.target.value)}>
               <option value="All">All Staff Members</option>
               {staffList.map((name, i) => <option key={i} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Timeline</label>
            <button onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")} className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs flex justify-between items-center">
               <span>{sortOrder === "newest" ? "Sort: Newest First" : "Sort: Oldest First"}</span>
               <ArrowUpDown size={14} className="text-yellow-500"/>
            </button>
          </div>
          <div className="space-y-2">
  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">
    Report Type
  </label>
  {/* ✅ STEP DATE PICKER */}
{reportType === "custom" && dateStep !== "done" && (
  <input
    type="date"
    autoFocus
    value={dateStep === "from" ? startDate : endDate}
    onChange={(e) => {
      if (dateStep === "from") {
        setStartDate(e.target.value);
        setDateStep("to"); // next step
      } else {
        setEndDate(e.target.value);
        setDateStep("done"); // finished
      }
    }}
    className="w-full mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-white text-xs outline-none"
  />
)}
  <select
  className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-xs outline-none"
  value={reportType}
  onChange={(e) => {
    const value = e.target.value;
    setReportType(value);

    if (value === "custom") {
      setStartDate("");
      setEndDate("");
      setDateStep("from");
    }
  }}
  onClick={() => {
    if (reportType === "custom") {
      setDateStep("from");
      setStartDate("");
      setEndDate("");
    }
  }}
>
  <option value="all">All Time</option>
  <option value="daily">Daily</option>
  <option value="weekly">Weekly</option>
  <option value="monthly">Monthly</option>
  <option value="yearly">Yearly</option>
  <option value="custom">
    {startDate && endDate
      ? `${startDate} → ${endDate}`
      : "Custom Range"}
  </option>
</select>
</div>
        </div>
      </div>
   )}
</div>
     {/* --- TABLE FEED --- */}
<div className="flex-1 overflow-hidden px-2 md:px-4 pb-6 mt-3">
<div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-6 h-full flex flex-col">

<div className="overflow-auto flex-1 max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-260px)]">
  <div className="overflow-x-auto">

      <table className="w-full text-left min-w-[700px] md:min-w-[900px]">

          <thead>
            <tr className="text-slate-500 text-[10px] md:text-xsuppercase font-black tracking-widest border-b border-white/5">
              <th className="pb-6 px-4">Task ID</th>
              <th className="pb-6 px-4">User</th>
              <th className="pb-6 px-4">Work Detail</th>
              <th className="pb-6 px-4">Priority</th>
             <th className="pb-6 px-4">Execution</th>
<th className="pb-6 px-4">Time</th>
              <th className="pb-6 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {filteredData.map((act, i) => (
              <tr
                key={i}
                className={`hover:bg-white/[0.03] transition-all group ${
                  isPublic() && act.status === "Pending"
                    ? "animate-[pulse_1s_infinite] bg-red-500/10 border-l-4 border-red-500"
                    : act.status === "Pending"
                    ? "bg-red-500/5 border-l-4 border-red-500"
                    : act.status === "In Progress"
                    ? "bg-orange-500/5 border-l-4 border-orange-400"
                    : act.status === "Completed"
                    ? "bg-green-500/5 border-l-4 border-green-500"
                    : ""
                }`}
              >

                {/* ID */}
                <td className="py-6 px-4 text-yellow-500 font-black italic text-xs">
                  #{act.id}
                </td>

                {/* USER */}
                <td className="py-6 px-4 flex items-center gap-3">
                  <img
                    src={
                      act.profile_pic
                        ? act.profile_pic.startsWith("data:")
                          ? act.profile_pic
                         : `${import.meta.env.VITE_API_URL?.replace('/api','')}/${act.profile_pic}`
                        : `https://ui-avatars.com/api/?name=${act.staff_name}`
                    }
                    alt="profile"
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-yellow-500"
                  />
                  <div>
                    <p className="text-white text-xs md:text-sm font-semibold tracking-wide">
                      {act.staff_name || "Idle"}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      #{act.user_id || "00"}
                    </p>
                  </div>
                </td>

                {/* WORK */}
                <td className="py-6 px-4">
<div className="relative group">

  <p className="text-white font-bold text-xs md:text-sm">
    {act.title || "No Title"}
  </p>

  {/* ✅ REJECT TOOLTIP */}
  {act.status === "Rejected" && act.rejection_reason && (
    <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[999]">
      
      <div className="bg-red-500 text-white text-[10px] px-3 py-2 rounded-xl shadow-xl max-w-[200px]">
        {act.rejection_reason}
      </div>

    </div>
  )}

</div>
                  <p className="text-[9px] text-slate-500 uppercase">
                    {act.category}
                  </p>
                </td>

                {/* PRIORITY */}
                <td className="py-6 px-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    act.priority === "High"
                      ? "bg-red-500/20 text-red-400"
                      : act.priority === "Medium"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    {act.priority || "Low"}
                  </span>
                </td>

               {/* STATUS */}
<td className="py-6 px-4">

  {act.status === "Rejected" ? (
  <div className="relative">
  <span
  onMouseEnter={(e) => {
    const rect = e.target.getBoundingClientRect();

    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: act.rejection_reason || "No reason provided",
      width: 260,
      height: 120
    });
  }}
  className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 cursor-pointer"
>
  Rejected
</span>

</div>
) : (

    <select
      value={act.status}
      onChange={(e) =>
        handleStatusUpdate(act.id, e.target.value, act.user_id)
      }
      className={`bg-slate-950 border border-white/10 rounded-lg px-3 py-1 text-[9px] font-black uppercase ${
        act.status === "Completed"
          ? "text-green-400"
          : act.status === "In Progress"
          ? "text-blue-400"
          : "text-yellow-500"
      }`}
    >
      <option value="Pending">Pending</option>
      <option value="In Progress">In Progress</option>
      <option value="Completed">Completed</option>
    </select>

  )}

</td>

{/* ✅ NEW TIME COLUMN ADD HERE */}
<td className="py-6 px-4 text-[10px] text-slate-400 space-y-1 leading-tight">

  {/* Assign Time */}
  <div>
    📅 {new Date(act.created_at).toLocaleString()}
  </div>

  {/* Accepted Time */}
  {act.accepted_at && (
    <div className="text-blue-400">
      ▶ {new Date(act.accepted_at).toLocaleString()}
    </div>
  )}

  {/* Completed Time */}
  {act.completed_at && (
    <div className="text-green-400">
      ✅ {new Date(act.completed_at).toLocaleString()}
    </div>
  )}

  {/* Duration */}
  {act.duration && (
    <div className="text-yellow-500 font-bold">
      ⏱ {act.duration}
    </div>
  )}

</td>

{/* ACTIONS */}
<td className="py-6 px-4 text-right space-x-3">
                  <button
                    onClick={() => {
                      window.open(`/task-view/${act.id}`, "_blank");
                      setEditMode(false);
                    }}
                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white"
                  >
                    <Eye size={16} />
                  </button>

                  {!isPublic() && (
                    <>
                      <button
                        onClick={() => {
                          localStorage.setItem("editTask", JSON.stringify(act));
                          navigate("/assign-tasks");
                        }}
                        className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(act.id)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                     
                    </>
                  )}
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </div>

  </div>
</div>
{/* ✅ GLOBAL TOOLTIP HERE */}
{tooltip.visible && (
  <div
    className="fixed z-[99999] bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl"
    style={{
      top: tooltip.y - 20,
      left: tooltip.x,
      width: tooltip.width,
      height: tooltip.height,
      transform: "translateX(-50%)"
    }}
    onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}
  >

    {/* HEADER (DRAG HANDLE) */}
    <div
      className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-t-2xl cursor-move"
      onMouseDown={(e) => {
        const startX = e.clientX;
        const startY = e.clientY;

        const handleMove = (moveEvent) => {
          setTooltip(prev => ({
            ...prev,
            x: prev.x + (moveEvent.clientX - startX),
            y: prev.y + (moveEvent.clientY - startY)
          }));
        };

        document.addEventListener("mousemove", handleMove);

        document.addEventListener("mouseup", () => {
          document.removeEventListener("mousemove", handleMove);
        }, { once: true });
      }}
    >
      Rejection Reason
    </div>

    {/* TEXTAREA */}
    <textarea
      value={tooltip.text}
      readOnly
      className="w-full h-full bg-transparent text-white text-xs p-3 outline-none resize-none"
    />

    {/* RESIZE HANDLE */}
    <div
      className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 cursor-se-resize"
      onMouseDown={(e) => {
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;

        const handleResize = (moveEvent) => {
          setTooltip(prev => ({
            ...prev,
            width: Math.max(200, prev.width + (moveEvent.clientX - startX)),
            height: Math.max(100, prev.height + (moveEvent.clientY - startY))
          }));
        };

        document.addEventListener("mousemove", handleResize);

        document.addEventListener("mouseup", () => {
          document.removeEventListener("mousemove", handleResize);
        }, { once: true });
      }}
    />
  </div>
)}
      {/* --- PREVIEW & EDIT POPUP --- */}
      {previewTask && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-[200] p-4">
          <div className="bg-slate-900 border border-white/10 p-8 lg:p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <button onClick={()=>setPreviewTask(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={28}/></button>
            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 bg-yellow-500 rounded-3xl text-slate-950"><FileText size={30}/></div>
              <div>
                <h2 className="text-white text-3xl font-black uppercase italic leading-none">{editMode ? 'Edit Record' : 'Task Analysis'}</h2>
                <p className="text-yellow-500 text-[10px] md:text-xs font-black uppercase mt-1">Registry Code: #{previewTask.id}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] md:text-xstext-slate-500 font-black uppercase tracking-widest ml-2">Subject</label>
                {editMode ? (
                  <input className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white outline-none" 
                    value={editData.title} onChange={e=>setEditData({...editData, title: e.target.value})} />
                ) : <p className="text-white text-xl font-bold ml-2">{previewTask.title}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] md:text-xs text-slate-500 font-black uppercase tracking-widest ml-2">Technical Description</label>
                {editMode ? (
                  <textarea className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white h-40 outline-none resize-none" 
                    value={editData.description} onChange={e=>setEditData({...editData, description: e.target.value})} />
                ) : <div className="bg-white/5 p-8 rounded-3xl text-slate-300 italic text-sm leading-relaxed">"{previewTask.description}"</div>}
              </div>

              {previewTask.media && Array.isArray(previewTask.media) && (
  <div className="grid grid-cols-2 gap-4 mt-4">

    {previewTask.media.map((m, i) => {
   const BASE =
  import.meta.env.VITE_API_URL?.replace('/api','');

const url = `${BASE}/${m.path}`;
      const ext = m.path.split('.').pop().toLowerCase();

      return (
        <div key={i} className="bg-black/40 p-3 rounded-xl">

          {/* IMAGE */}
          {["jpg","jpeg","png","gif"].includes(ext) && (
            <img src={url} className="w-full h-40 object-cover rounded"/>
          )}

          {/* VIDEO */}
          {["mp4","webm"].includes(ext) && (
            <video src={url} controls className="w-full h-40 rounded"/>
          )}

          {/* AUDIO */}
          {["mp3","wav","webm"].includes(ext) && (
            <audio src={url} controls className="w-full"/>
          )}

          {/* DOWNLOAD BUTTON */}
          <a href={url} download className="text-yellow-400 text-xs mt-2 inline-block">
            ⬇ Download
          </a>
        </div>
      );
    })}

  </div>
)}

              <div className="flex justify-between items-center pt-8 border-t border-white/5">
                <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Issued: {new Date(previewTask.created_at).toLocaleString()}</p>
                <div className="flex gap-4">
                  {editMode ? (
                    <button onClick={handleSaveEdit} className="bg-yellow-500 text-slate-950 px-10 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2">
                      <Save size={18}/> Save Updates
                    </button>
                  ) : (
                    <button onClick={() => setPreviewTask(null)} className="bg-yellow-500 text-slate-950 px-12 py-4 rounded-2xl font-black text-xs uppercase">Confirmed</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
