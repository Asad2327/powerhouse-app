import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "./api";
import {
  Calendar,
  User,
  Tag,
  Activity,
  Download,
  Briefcase,
  Clock
} from 'lucide-react';

const mediaBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

function getAssignedUsers(task) {
  if (Array.isArray(task?.assigned_users) && task.assigned_users.length) {
    return task.assigned_users;
  }

  if (task?.user_id || task?.staff_name) {
    return [{
      user_id: task.user_id || '',
      name: task.staff_name || 'Unassigned'
    }];
  }

  return [];
}

function renderAttachment(media, index) {
  const url = `${mediaBaseUrl}/${media.path}`;
  const ext = media.path?.split('.').pop()?.toLowerCase();
  const type = media.type || '';
  const isImage = type.startsWith('image') || (!type && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext));
  const isVideo = type.startsWith('video') || (!type && ['mp4', 'webm', 'mov'].includes(ext));
  const isAudio = type.startsWith('audio') || (!type && ['mp3', 'wav', 'ogg'].includes(ext));

  return (
    <div key={index} className="aspect-[4/3] border-2 border-slate-100 p-2 bg-white flex items-center justify-center overflow-hidden rounded-md shadow-sm">
      {isImage && (
        <img
          src={url}
          className="max-w-full max-h-full object-contain"
          alt="attachment"
        />
      )}

      {isVideo && (
        <video
          src={url}
          controls
          className="max-w-full max-h-full object-contain"
        />
      )}

      {isAudio && (
        <audio src={url} controls className="w-full" />
      )}

      {!isImage && !isVideo && !isAudio && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-yellow-600 underline"
        >
          Open Attachment
        </a>
      )}
    </div>
  );
}

export default function TaskView() {
  const { id } = useParams();
  const [task, setTask] = useState(null);

  useEffect(() => {
    API.get("/activity/stats")
      .then((res) => {
        const found = res.data?.activities?.find((item) => item.id === Number(id));
        setTask(found || null);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, [id]);

  if (!task) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-yellow-500 font-black animate-pulse tracking-widest uppercase italic">
          Initializing System...
        </div>
      </div>
    );
  }

  const assignedUsers = getAssignedUsers(task);

  return (
    <div className="bg-slate-800 min-h-screen p-0 md:p-8 flex justify-center items-start">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          #printable-report {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .page-break {
            page-break-inside: avoid;
          }
          .description-content {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        }
      `}</style>

      <div
        id="printable-report"
        className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl relative flex flex-col p-12 border-t-[8px] border-yellow-500"
      >
        <header className="border-b-2 border-slate-100 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black">
                POWER<span className="text-yellow-600">HOUSE</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.4em] uppercase mt-1">
                OPERATIONAL DOCUMENTATION SYSTEM
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase">System Token</p>
              <h2 className="text-3xl font-black text-black leading-none">#{task.id}</h2>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-8 mb-10 page-break">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <Tag size={12} className="text-yellow-600" /> Subject
            </p>
            <h3 className="text-sm font-bold text-slate-800 capitalize">{task.title || "N/A"}</h3>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <Activity size={12} className="text-yellow-600" /> Task Status
            </p>
            <h3 className="text-sm font-bold text-slate-800 uppercase">{task.status || "IN PROGRESS"}</h3>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <Briefcase size={12} className="text-yellow-600" /> Department
            </p>
            <h3 className="text-sm font-bold text-slate-800">{task.category || "General"}</h3>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <User size={12} className="text-yellow-600" /> Assigned To
            </p>
            {assignedUsers.length > 0 ? assignedUsers.map((assignedUser, index) => (
              <div key={`${assignedUser.user_id}-${index}`} className="mb-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase">
                  {assignedUser.name || "Unassigned"}
                </h3>
                <p className="text-[8px] text-slate-400 font-bold mt-0.5">
                  UID: {assignedUser.user_id || "0"}
                </p>
              </div>
            )) : (
              <h3 className="text-sm font-bold text-slate-800 uppercase">Unassigned</h3>
            )}
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <Calendar size={12} className="text-yellow-600" /> Registry Date
            </p>
            <h3 className="text-sm font-bold text-slate-800">
              {new Date(task.created_at).toLocaleDateString('en-GB')}
            </h3>
            <p className="text-[8px] text-slate-400 font-bold italic mt-0.5">
              {new Date(task.created_at).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-1">
              <Clock size={12} className="text-yellow-600" /> Priority
            </p>
            <h3 className="text-sm font-black text-red-600 uppercase italic">{task.priority || "NORMAL"}</h3>
          </div>
        </div>

        <div className="mb-10">
          <h4 className="text-lg font-black text-black mb-3">Description:</h4>
          <div className="border-2 border-slate-100 p-5 rounded-lg bg-slate-50 min-h-[100px]">
            <div className="description-content text-xs text-slate-600 leading-relaxed">
              {task.description || "No operational intelligence provided."}
            </div>
          </div>
        </div>

        <div className="mb-10 page-break">
          <h4 className="text-[11px] font-black text-black uppercase tracking-widest mb-4">
            Attached Files:
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {task.media && task.media.length > 0 ? (
              task.media.map((media, index) => renderAttachment(media, index))
            ) : (
              <div className="col-span-2 py-6 border-2 border-dashed border-slate-100 text-center text-[10px] text-slate-300 uppercase font-bold">
                No Visual Assets Attached
              </div>
            )}
          </div>
        </div>

        <footer className="mt-auto pt-10">
          <div className="flex justify-between items-end border-t-2 border-slate-50 pt-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 flex items-center justify-center text-white font-black italic text-sm rounded-lg shadow-lg">PH</div>
              <div>
                <p className="text-xs font-black text-black uppercase leading-none">System Admin</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Verified Content</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter mb-2">Digital Stamp / Approval Authority</p>
              <div className="w-48 h-[1px] bg-slate-200 ml-auto"></div>
            </div>
          </div>
          <div className="text-center text-[8px] text-slate-400 font-black uppercase tracking-[0.5em]">
            Copyright 2026 PowerHouse Management v1.2 Confidential Document
          </div>
        </footer>

        <button
          onClick={() => window.print()}
          className="fixed bottom-10 right-10 no-print bg-yellow-500 text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Download size={16} /> Print Report
        </button>
      </div>
    </div>
  );
}
