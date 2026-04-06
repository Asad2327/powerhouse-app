import React, { useEffect, useState } from 'react';
import API from './api';
import { getUser } from './utils/auth';
import { Clock, ListTodo, ArrowRight, Layers, LayoutGrid, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { socket } from './utils/socket';
import { onMessageListener } from "../firebase";

export default function UserDashboard() {
  const [tasks, setTasks] = useState([]);
  const user = getUser();
  const navigate = useNavigate();
  const [popup, setPopup] = useState(null);

  const fetchTasks = async () => {
    if (!user?.id) {
      setTasks([]);
      return;
    }

    try {
      const res = await API.get(`/task/my-tasks/${user.id}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error('Task fetch error:', err);
      setTasks([]);
    }
  };

  const handleAccept = async (task) => {
    try {
      await API.put(`/task/update-status/${task.id}`, {
        status: 'In Progress',
      });

      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: 'In Progress' } : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    fetchTasks();

    const interval = setInterval(fetchTasks, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().catch(() => {});
    }

    socket.emit('joinUser', user.id);

    const handleTaskAssigned = (data) => {
      fetchTasks();

      setTimeout(() => {
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
       setPopup({
  title: "New Task Assigned",
  msg: data?.title || "You received a task"
});

setTimeout(() => setPopup(null), 3000);

        try {
  const audio = new Audio('/notification.mp3');
  audio.volume = 1;
  audio.play();
} catch (err) {
  console.log("Sound blocked");
}
        }
      }, 100);
    };

    const handleTaskUpdate = (data) => {
      fetchTasks();

      if (data?.status) {
        setTimeout(() => {
       setPopup({
  title: "Task Update",
  msg: data.status
});

setTimeout(() => setPopup(null), 3000);
        }, 100);
      }
    };


socket.off("taskAssigned");
socket.off("taskUpdate");

socket.on('taskAssigned', handleTaskAssigned);
socket.on('taskUpdate', handleTaskUpdate);

    return () => {
      socket.off('taskAssigned', handleTaskAssigned);
      socket.off('taskUpdate', handleTaskUpdate);
    };
  }, [user?.id]);

useEffect(() => {
  let isMounted = true;

  onMessageListener().then((payload) => {
    if (!isMounted) return;

    const taskId = payload.data?.taskId;

    if (taskId) {
      if (window.confirm("Open task?")) {
        window.location.href = `/task-view/${taskId}`;
      }
    }
  });

  return () => {
    isMounted = false;
  };
}, []);

  return (
    <div className="animate-in fade-in duration-700">
      <div className="bg-yellow-500 p-12 rounded-[3.5rem] mb-12 flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] mb-3">User Terminal</p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 italic uppercase leading-none">
            Hello, {user?.name || 'User'}
          </h1>
          <div className="flex gap-4 mt-4">
            <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg italic">
              ID: #{user?.id}
            </span>
            <span className="bg-white/20 px-4 py-1.5 rounded-xl text-[9px] font-black text-slate-900 uppercase italic">
              Tasks Assigned: {tasks.length}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/my-tasks')}
          className="mt-8 md:mt-0 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase flex items-center gap-4 hover:scale-105 transition-all shadow-2xl group"
        >
          Go To My Tasks
          <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {[
          {
            label: 'To Do',
            count: tasks.filter((task) => task.status === 'Pending').length,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            icon: <Clock />,
          },
          {
            label: 'Running',
            count: tasks.filter((task) => task.status === 'In Progress').length,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            icon: <Layers />,
          },
          {
            label: 'Completed',
            count: tasks.filter((task) => task.status === 'Completed').length,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            icon: <ListTodo />,
          },
          {
            label: 'Rejected',
            count: tasks.filter((task) => task.status === 'Rejected').length,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            icon: <ListTodo />,
          },
          {
            label: 'Total',
            count: tasks.length,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            icon: <LayoutGrid />,
          },
        ].map((item, index) => (
          <div key={index} className="bg-slate-900/60 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between shadow-xl">
            <div>
              <div className={`${item.bg} ${item.color} p-2 rounded-xl mb-3 inline-block`}>
                {item.icon}
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-white italic">
                {item.count}
              </h3>

              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                {item.label}
              </p>
            </div>

            <LayoutGrid className="text-white/[0.03]" size={50} />
          </div>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
        <h3 className="text-white font-black text-xl mb-8 uppercase italic">
          Recent Task Timeline
        </h3>

        <div className="grid gap-4">
          {tasks.length > 0 ? tasks.slice(0, 5).map((task, index) => (
            <div
              key={index}
              onClick={() => window.open(`/task-view/${task.id}`, '_blank')}
              className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-yellow-500 font-black italic shadow-lg group-hover:bg-yellow-500 group-hover:text-slate-950 transition-all">
                  #{task.id}
                </div>

                <div>
                  <h4 className="text-white font-bold text-base tracking-tight">
                    {task.title}
                  </h4>

                  <p className="text-slate-500 text-[10px] font-black uppercase mt-1 flex items-center gap-2 italic">
                    <Calendar size={12} />
                    {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <span className={`mt-4 sm:mt-0 px-6 py-2 rounded-full text-[9px] font-black uppercase ${
                task.status === 'Completed'
                  ? 'bg-green-500/10 text-green-400'
                  : task.status === 'In Progress'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {task.status}
              </span>

              {task.status === 'Pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccept(task);
                  }}
                  className="mt-2 bg-blue-500 text-white px-4 py-1 rounded-lg text-xs font-bold"
                >
                  Accept
                </button>
              )}
            </div>
          )) : (
            <p className="text-center text-slate-600 font-bold py-10 uppercase tracking-widest italic">
              No tasks assigned yet
            </p>
          )}
        </div>
           </div>

      {popup && (
        <div className="fixed top-5 right-5 bg-yellow-500 text-black px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce">
          <h4 className="font-bold">{popup.title}</h4>
          <p className="text-sm">{popup.msg}</p>
        </div>
      )}

    </div>
  );
}
