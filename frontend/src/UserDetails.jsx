import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import API from "./api";
import { Search } from "lucide-react";

export default function UserDetails() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    API.get(`/user/full/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.log(err));
  }, [id]);

  const tasks = data?.tasks || [];
  const tools = data?.tools || [];
  const user = data?.user || {};

  const filteredTasks = useMemo(() => {
    return tasks.filter(t =>
      (filter === "All" || t.status === filter) &&
      (t.title || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [tasks, search, filter]);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "Completed").length,
    rejected: tasks.filter(t => t.status === "Rejected").length,
    running: tasks.filter(t => t.status === "In Progress").length,
    pending: tasks.filter(t => t.status === "Pending").length,
  };

  const statusColor = (s) => {
    if (s === "Completed") return "bg-green-500/20 text-green-400";
    if (s === "Rejected") return "bg-red-500/20 text-red-400";
    if (s === "In Progress") return "bg-blue-500/20 text-blue-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  if (!data) {
    return <p className="text-white p-10">Loading...</p>;
  }

  return (
    <div className="p-6 md:p-10 text-white max-w-[1400px] mx-auto space-y-10">

      {/* 🔥 HEADER */}
      <div className="relative bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-6 rounded-3xl shadow-2xl flex items-center gap-6 overflow-hidden">
        
        {/* Glow Effect */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-500/20 blur-3xl rounded-full"></div>

        <img
          src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.name}`}
          className="w-20 h-20 rounded-full border-4 border-yellow-500 shadow-lg"
        />

        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-gray-400 text-sm">{user.email}</p>

          <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
            {user.role || "User"}
          </span>
        </div>
      </div>

      {/* 🔥 STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "To Do", val: stats.pending },
          { label: "Running", val: stats.running },
          { label: "Completed", val: stats.completed },
          { label: "Rejected", val: stats.rejected },
          { label: "Total", val: stats.total },
        ].map((s, i) => (
          <div
            key={i}
            className="relative bg-slate-900/60 backdrop-blur p-5 rounded-2xl text-center hover:scale-105 transition border border-white/5"
          >
            <div className="absolute inset-0 rounded-2xl border border-yellow-500/10"></div>
            <h2 className="text-2xl font-bold">{s.val}</h2>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 🔥 USER INFO */}
      <div className="bg-slate-900/40 border border-white/10 p-8 rounded-[2rem] shadow-xl">
        <h2 className="text-xl font-bold mb-6">User Info</h2>

        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="bg-slate-800/40 p-4 rounded-xl">
            <p className="text-gray-400 text-xs">Name</p>
            <p className="font-semibold">{user.name}</p>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl">
            <p className="text-gray-400 text-xs">Email</p>
            <p className="font-semibold">{user.email}</p>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl">
            <p className="text-gray-400 text-xs">Phone</p>
            <p className="font-semibold">{user.phone}</p>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl">
            <p className="text-gray-400 text-xs">Address</p>
            <p className="font-semibold">{user.address}</p>
          </div>
        </div>
      </div>

      {/* 🔥 TASK SECTION */}
      <div className="bg-slate-900/40 p-6 rounded-3xl shadow-xl">

        {/* SEARCH + FILTER */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
            <input
              placeholder="Search task..."
              className="pl-10 pr-4 py-3 bg-slate-800 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-slate-800 px-4 py-3 rounded-xl focus:outline-none"
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Rejected</option>
          </select>
        </div>

        {/* TASK LIST */}
        <h2 className="text-xl font-bold mb-4">Tasks</h2>

        {filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks found</p>
        ) : (
          filteredTasks.map(t => (
            <div
              key={t.id}
              className="flex justify-between items-center bg-slate-800/40 p-4 rounded-xl mb-2 hover:bg-slate-800/70 transition"
            >
              <p className="font-semibold">#{t.id} - {t.title}</p>

              <span className={`text-xs px-3 py-1 rounded-full ${statusColor(t.status)}`}>
                {t.status}
              </span>
            </div>
          ))
        )}

      </div>

      {/* 🔥 TOOLS */}
      <div className="bg-slate-900/40 p-6 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold mb-4">Assigned Tools</h2>

        <div className="flex flex-wrap gap-3">
          {tools.length === 0 ? (
            <p className="text-gray-500 text-sm">No tools assigned</p>
          ) : (
            tools.map(t => (
              <span
                key={t.id}
                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-1 rounded-full text-xs hover:bg-yellow-500 hover:text-black transition"
              >
                {t.tool_name}
              </span>
            ))
          )}
        </div>
      </div>

    </div>
  );
}