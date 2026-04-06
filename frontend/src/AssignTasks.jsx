import React, { useState, useEffect, useRef } from 'react';
import API from './api';
import { Loader2, UploadCloud } from 'lucide-react';
import { isPublic } from './utils/publicMode';

const initialFormData = {
  title: '',
  description: '',
  category: 'Electrical',
  priority: 'High',
  user_id: '',
  user_ids: [],
  status: 'Pending'
};

const mediaBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

function normalizeEditUserIds(task) {
  if (Array.isArray(task?.assigned_user_ids) && task.assigned_user_ids.length) {
    return task.assigned_user_ids.map((id) => String(id));
  }

  if (Array.isArray(task?.user_ids) && task.user_ids.length) {
    return task.user_ids.map((id) => String(id));
  }

  if (task?.user_id) {
    return [String(task.user_id)];
  }

  return [];
}

export default function AssignTasks() {
  if (isPublic()) {
    return (
      <div className="text-center text-white mt-40 text-2xl font-bold">
        Access Denied (Public Mode)
      </div>
    );
  }

  const [staff, setStaff] = useState([]);
  const [files, setFiles] = useState([]);
  const [removedOldFiles, setRemovedOldFiles] = useState([]);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordingStartRef = useRef(null);
  const [recording, setRecording] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const data = localStorage.getItem('editTask');

    if (!data) {
      return;
    }

    try {
      const parsed = JSON.parse(data);
      const parsedUserIds = normalizeEditUserIds(parsed);

      setIsEdit(true);
      setEditId(parsed.id);
      setFormData({
        title: parsed.title || '',
        description: parsed.description || '',
        category: parsed.category || 'Electrical',
        priority: parsed.priority || 'High',
        user_id: parsedUserIds[0] || parsed.user_id || '',
        user_ids: parsedUserIds,
        status: parsed.status || 'Pending'
      });

      if (parsed.media && Array.isArray(parsed.media)) {
        const existingFiles = parsed.media.map((media) => ({
          file: null,
          preview: `${mediaBaseUrl}/${media.path}`,
          type: media.type || '',
          isOld: true
        }));

        setFiles(existingFiles);
      }
    } catch (error) {
      console.error('Invalid editTask payload:', error);
    }

    localStorage.removeItem('editTask');
  }, []);

  useEffect(() => {
    API.get('/user/all')
      .then((res) => setStaff(res.data || []))
      .catch(() => showToast('Staff load failed', 'error'));
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const addFile = (file) => {
    if (!file || file.size === 0) {
      showToast('Empty file not allowed', 'error');
      return;
    }

    const preview = URL.createObjectURL(file);
    setFiles((prev) => [...prev, { file, preview, type: file.type || '' }]);
  };

  const handleFile = (e) => {
    Array.from(e.target.files || []).forEach(addFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files || []).forEach(addFile);
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => {
      const removed = prev[indexToRemove];
      const updated = prev.filter((_, index) => index !== indexToRemove);

      if (removed?.isOld && removed.preview) {
       const cleanPath = removed.preview
  .replace(`${mediaBaseUrl}/`, '')
  .replace(/^\/+/, '');
        setRemovedOldFiles((current) => [...current, cleanPath]);
      }

      return updated;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const duration = Date.now() - recordingStartRef.current;
        stream.getTracks().forEach((track) => track.stop());

        if (duration < 2000) {
          showToast('Voice must be at least 2 seconds', 'error');
          return;
        }

        const blob = new Blob(chunks, { type: 'audio/webm' });
        addFile(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }));
      };

      recorder.start();
      recordingStartRef.current = Date.now();
      setRecording(true);
    } catch (error) {
      showToast('Mic permission denied', 'error');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (error) {
      showToast('Camera permission denied', 'error');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        addFile(new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' }));
      }
    });
  };

  const handleStaffChange = (e) => {
    const selectedUserIds = Array.from(e.target.selectedOptions).map((option) => option.value);

    setFormData((prev) => ({
      ...prev,
      user_ids: selectedUserIds,
      user_id: selectedUserIds[0] || ''
    }));
  };

  const appendTaskPayload = (payload, selectedUserIds) => {
    payload.append('title', formData.title || '');
    payload.append('description', formData.description || '');
    payload.append('category', formData.category || '');
    payload.append('priority', formData.priority || 'High');
    payload.append('user_id', selectedUserIds[0] || '');
    selectedUserIds.forEach((userId) => payload.append('user_ids[]', userId));

    if (formData.status) {
      payload.append('status', formData.status);
    }

    files.forEach((fileItem) => {
      if (fileItem.file) {
        payload.append('files', fileItem.file);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedUserIds = formData.user_ids?.length
      ? formData.user_ids
      : (formData.user_id ? [String(formData.user_id)] : []);

    if (!formData.title.trim() || selectedUserIds.length === 0) {
      showToast('Fill required fields', 'error');
      return;
    }

    if (!isEdit && files.length === 0) {
      showToast('Add at least 1 file', 'error');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        const payload = new FormData();
        appendTaskPayload(payload, selectedUserIds);
        payload.append('removedFiles', JSON.stringify(removedOldFiles));

        await API.put(`/task/${editId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        showToast('Task Updated Successfully');
      } else {
        const payload = new FormData();
        appendTaskPayload(payload, selectedUserIds);

        await API.post('/task/assign', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000
        });

        showToast('Task Assigned');
      }

      setFiles([]);
      setRemovedOldFiles([]);
      setFormData(initialFormData);
      setIsEdit(false);
      setEditId(null);
    } catch (err) {
      console.error('Upload error:', err?.response?.data || err.message);
      showToast('Upload failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center min-h-screen p-6">
      <div className="w-full max-w-3xl bg-slate-900 p-6 rounded-2xl space-y-5">
        <h2 className="text-white text-2xl font-bold">Assign Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full p-3 bg-slate-800 text-white rounded"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <select
            className="w-full p-3 bg-slate-800 text-white rounded"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>

          <textarea
            className="w-full p-3 bg-slate-800 text-white rounded"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="space-y-2">
  <p className="text-xs text-slate-400">
    Select staff member
  </p>

 <select
  multiple
  className="w-full p-3 bg-slate-800 text-white rounded"
  value={formData.user_ids}
  onChange={handleStaffChange}
>
    <option value="">Select User</option>

    {staff.map((member) => (
      <option key={member.id} value={member.id}>
        {member.name}
      </option>
    ))}
  </select>
</div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-yellow-500 p-6 text-center rounded-xl"
          >
            <UploadCloud className="mx-auto mb-2" />
            Drag & Drop or <input type="file" multiple onChange={handleFile} />
          </div>

          {!recording ? (
            <button type="button" onClick={startRecording} className="text-green-400">
              Start Voice
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="text-red-400">
              Stop Voice
            </button>
          )}

          {!cameraOn ? (
            <button type="button" onClick={startCamera} className="text-green-400">
            </button>
          ) : (
            <div>
              <video ref={videoRef} className="w-full rounded" />
              <button type="button" onClick={capturePhoto}>Capture</button>
              <button type="button" onClick={stopCamera}>Close</button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((fileItem, index) => {
              const type = fileItem.file?.type || fileItem.type || '';
              const url = fileItem.preview;
              const ext = url?.split('.').pop()?.toLowerCase();

              const isImage = type.startsWith('image') || (!type && ['jpg', 'jpeg', 'png', 'gif'].includes(ext));
              const isVideo = type.startsWith('video') || (!type && ['mp4', 'webm'].includes(ext));
              const isAudio = type.startsWith('audio') || (!type && ['mp3', 'wav', 'ogg'].includes(ext));

              return (
                <div key={fileItem.preview || index} className="bg-slate-800 p-3 rounded-xl relative shadow">
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 px-2 rounded-full text-xs"
                  >
                    x
                  </button>

                  {isImage && (
                    <img src={fileItem.preview} className="w-full h-36 object-cover rounded" />
                  )}

                  {isVideo && (
                    <video src={fileItem.preview} controls className="w-full h-36 object-cover rounded" />
                  )}

                  {isAudio && (
                    <div className="bg-black p-2 rounded">
                      <p className="text-yellow-400 text-xs">Voice</p>
                      <audio src={fileItem.preview} controls className="w-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="w-full bg-yellow-500 py-2 rounded font-bold" disabled={loading}>
            {loading
              ? <Loader2 className="animate-spin mx-auto" />
              : isEdit ? 'Update Task' : 'Assign Task'}
          </button>
        </form>

        {toast && (
          <div className={`fixed bottom-5 right-5 px-4 py-2 rounded ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
