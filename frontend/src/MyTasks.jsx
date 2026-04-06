import React, { useEffect, useState } from 'react';
import API from './api';
import { getUser } from './utils/auth';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { socket } from './utils/socket';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const user = getUser(); // Login user ki details fetch karega
  const [rejectingId, setRejectingId] = useState(null);
const [rejectReason, setRejectReason] = useState("");

 useEffect(() => {
  if (!user?.id) return;

  fetchTasks();

  const interval = setInterval(fetchTasks, 5000); // 🔥 FIX
  return () => clearInterval(interval);
}, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refreshTasks = () => fetchTasks();

socket.off("taskAssigned");
socket.off("taskUpdate");

socket.on("taskAssigned", refreshTasks);
socket.on("taskUpdate", refreshTasks);

    return () => {
      socket.off("taskAssigned", refreshTasks);
      socket.off("taskUpdate", refreshTasks);
    };
  }, [user?.id]);

  const fetchTasks = () => {
    API.get(`/task/my-tasks/${user.id}`)
      .then(res => setTasks(res.data))
      .catch(err => console.log(err));
  };

 const updateStatus = (taskId, currentStatus) => {
  let newStatus = "";

const status = currentStatus.toLowerCase();

if (status === "pending") {
  newStatus = "In Progress";
} else if (status === "in progress") {
  newStatus = "Completed";
}

  API.put(`/task/update-status/${taskId}`, { status: newStatus })
    .then(fetchTasks)
    .catch(console.log);
};
const submitReject = (taskId) => {
  if (!rejectReason) return;

  API.put(`/task/update-status/${taskId}`, {
    status: "Rejected",
    rejection_reason: rejectReason
  })
    .then(() => {
      setRejectingId(null);
      setRejectReason("");
      fetchTasks();
    })
    .catch(console.log);
};

  return (
    <div className="p-4 lg:p-8 animate-in fade-in duration-700">
      <h1 className="text-3xl font-black text-white mb-8 italic tracking-tight">
        MY <span className="text-yellow-500 not-italic">ASSIGNED TASKS</span>
      </h1>
      
      <div className="grid gap-6">
        {tasks.length > 0 ? tasks.map(task => (
          <div key={task.id} className="bg-slate-900/40 border border-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:border-yellow-500/20 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-2xl 
  ${task.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 
    task.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
    'bg-yellow-500/10 text-yellow-500'
}`}>
                {task.status === 'Completed' ? <CheckCircle size={30} /> : <Clock size={30} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{task.title}</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md">{task.description}</p>
                <div className="text-[10px] text-slate-500 mt-2 space-y-1">
  <div>📅 {new Date(task.created_at).toLocaleString()}</div>

  {task.completed_at && (
    <div className="text-green-400">
      ✅ {new Date(task.completed_at).toLocaleString()}
    </div>
  )}

  {task.duration && (
    <div className="text-yellow-400 font-bold">
      ⏱ {task.duration}
    </div>
  )}
</div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {task.priority} Priority
              </span>
              
              {task.status !== 'Completed' && task.status !== 'Rejected' && (
  <div className="flex flex-col gap-2">

    <div className="flex gap-2">
      <button 
        onClick={() => updateStatus(task.id, task.status)}
        className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-bold"
      >
        {task.status === "Pending" ? "Accept" : "Done"}
      </button>

      <button 
        onClick={() => setRejectingId(task.id)}
        className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
      >
        Reject
      </button>
    </div>

    {/* 🔥 INLINE REJECT BOX */}
    {rejectingId === task.id && (
      <div className="flex gap-2 mt-2">
        <textarea
          placeholder="Enter reason..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="flex-1 bg-slate-800 text-white p-2 rounded-xl text-xs"
        />
        <button
          onClick={() => submitReject(task.id)}
          className="bg-red-600 px-3 rounded-xl text-xs"
        >
          Submit
        </button>
      </div>
    )}

  </div>
)}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/10">
            <AlertCircle className="mx-auto text-slate-700 mb-4" size={56} />
            <p className="text-slate-500 font-black uppercase tracking-widest italic">No tasks assigned to you at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
