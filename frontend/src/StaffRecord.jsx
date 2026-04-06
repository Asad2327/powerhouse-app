import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';
import { Trash2, Edit, Eye, Printer, X } from 'lucide-react';

export default function StaffRecord() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
const [currentPage, setCurrentPage] = useState(1);
const navigate = useNavigate();

// ✅ FIX (MISSING STATE ADD)
const [selectedUser, setSelectedUser] = useState(null);

const [viewUser, setViewUser] = useState(null);
const [assignedTools, setAssignedTools] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const usersPerPage = 5;

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = () => {
    setLoading(true);
    API.get('/user/all')
      .then(res => setUsers(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  };
// FETCH USER TOOLS
const fetchUserTools = (userId) => {
  API.get(`/tools/user/${userId}`)
    .then(res => setAssignedTools(res.data))
    .catch(() => setAssignedTools([]));
};

// VIEW DETAILS
const handleViewDetails = (user) => {
  setViewUser(user);
  fetchUserTools(user.id);
};

// PRINT
const handlePrint = () => {
  window.print();
};
  const deleteUser = (id) => {
    if (window.confirm("Delete this user?")) {
      API.delete(`/user/${id}`).then(() => fetchUsers());
    }
  };

  // SEARCH + FILTER
  const filteredUsers = users.filter(user =>
    (user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === 'all' || user.role === roleFilter)
  );

  // PAGINATION
  const indexOfLast = currentPage * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfLast - usersPerPage, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // IMAGE PREVIEW
  const handleImage = (file) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
setPreview(url);
  };
  useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);

  // UPDATE USER
  const updateUser = async () => {
  const formData = new FormData();

  formData.append('name', selectedUser.name);
  formData.append('email', selectedUser.email);
  formData.append('role', selectedUser.role);

  // ✅ ADD THESE (IMPORTANT)
  formData.append('phone', selectedUser.phone || '');
  formData.append('maritalStatus', selectedUser.maritalStatus || '');
  formData.append('address', selectedUser.address || '');
  formData.append('backgroundInfo', selectedUser.backgroundInfo || '');

  if (imageFile) {
    formData.append('profile_pic', imageFile);
  }

  try {
    await API.put(`/user/${selectedUser.id}`, formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  }
});

    setSelectedUser(null);
    setImageFile(null);
    setPreview(null);

    fetchUsers();
  } catch (err) {
    console.log(err);
  }
};

  // ROLE COLOR
  const roleColor = (role) => {
    if (role === 'admin') return 'bg-blue-500/20 text-blue-400';
    if (role === 'superadmin') return 'bg-purple-500/20 text-purple-400';
    if (role === 'electrician') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  };

  return (
    <div className="p-4 md:p-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Staff Records</h1>
        <div className="bg-yellow-500 px-4 py-2 rounded-xl text-black font-bold">
          Total: {filteredUsers.length}
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          placeholder="Search user..."
          className="px-4 py-3 rounded-xl bg-slate-800 text-white w-full"
          onChange={e => {
  setSearch(e.target.value);
  setCurrentPage(1);
}}
        />
        <select
          className="px-4 py-3 rounded-xl bg-slate-800 text-white"
         onChange={e => {
  setRoleFilter(e.target.value);
  setCurrentPage(1);
}}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
          <option value="electrician">Electrician</option>
          <option value="cro">CRO</option>
        </select>
      </div>

      {/* LOADING */}
      {loading && <p className="text-yellow-500">Loading...</p>}

      {/* TABLE */}
      {!loading && (
        <div className="bg-slate-900/40 rounded-2xl overflow-x-auto">
          <table className="min-w-[800px] w-full">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="p-4">ID</th>
                <th className="p-4">Photo</th>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentUsers.map(user => (
               <tr 
  key={user.id} 
  className={`border-t border-white/5 hover:bg-white/[0.02] ${
    user.status === "inactive"
      ? "bg-red-500/10 border-l-4 border-red-500"
      : ""
  }`}
>
                  <td className="p-4 text-yellow-500">#{user.id}</td>

                  <td className="p-4">
                    <img
                     src={user.profile_pic ? user.profile_pic : '/default-avatar.png'}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
                    />
                  </td>

                  <td className="p-4 text-white">{user.name}</td>
                  <td className="p-4 text-gray-400">{user.email}</td>

                  <td className="p-4">
  <div className="flex items-center gap-3">

    {/* ROLE */}
    <span className={`px-3 py-1 rounded-full text-xs ${roleColor(user.role)}`}>
      {user.role}
    </span>

    {/* 🔥 STATUS BUTTON DROPDOWN STYLE */}
    <select
      value={user.status || "active"}
      onChange={async (e) => {
        const newStatus = e.target.value;

        try {
         const formData = new FormData();

formData.append('name', user.name);
formData.append('email', user.email);
formData.append('role', user.role);
formData.append('phone', user.phone || '');
formData.append('maritalStatus', user.maritalStatus || '');
formData.append('address', user.address || '');
formData.append('backgroundInfo', user.backgroundInfo || '');
formData.append('status', newStatus); // 🔥 IMPORTANT

await API.put(`/user/${user.id}`, formData);

          setUsers(prev =>
            prev.map(u =>
              u.id === user.id ? { ...u, status: newStatus } : u
            )
          );

        } catch (err) {
          console.log(err);
        }
      }}
      className={`text-[10px] px-3 py-1 rounded-full font-bold cursor-pointer outline-none border border-white/10 ${
        user.status === "inactive"
          ? "bg-red-500/20 text-red-400"
          : "bg-green-500/20 text-green-400"
      }`}
    >
      <option value="active">🟢 Active</option>
      <option value="inactive">🔴 Inactive</option>
    </select>

  </div>
</td>

                <td className="p-4">
  <div className="flex items-center gap-3 justify-center">

  {/* 👁 EXISTING (MODAL) — SAME */}
  <Eye
    onClick={() => handleViewDetails(user)}
    className="cursor-pointer text-blue-400 hover:text-blue-300"
  />

  {/* 🆕 NEW BUTTON → PAGE NAVIGATION */}
  <button
    onClick={() => navigate(`/user/${user.id}`)}
    className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-lg hover:bg-green-500 hover:text-black transition"
  >
    View Details
  </button>

  {/* ✏️ EDIT */}
  <Edit
    onClick={() => setSelectedUser(user)}
    className="cursor-pointer hover:text-yellow-400"
  />

  {/* 🗑 DELETE */}
  <Trash2
    onClick={() => deleteUser(user.id)}
    className="cursor-pointer text-red-500"
  />
  </div>

</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* EMPTY STATE */}
          {filteredUsers.length === 0 && (
            <p className="text-center py-10 text-gray-500">No users found</p>
          )}
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex justify-center gap-2 mt-6">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`px-4 py-2 rounded ${
              currentPage === i + 1
                ? 'bg-yellow-500 text-black'
                : 'bg-slate-800 text-white'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {/* VIEW & PRINT MODAL */}
{viewUser && (
  <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 overflow-y-auto">
    <div id="printable-area" className="bg-white text-black p-8 rounded-lg w-full max-w-3xl relative">

      <button
        onClick={() => setViewUser(null)}
        className="absolute top-4 right-4 print:hidden text-gray-500 hover:text-black"
      >
        <X size={24} />
      </button>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold">Staff Profile Report</h2>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-yellow-500 px-4 py-2 rounded font-bold print:hidden"
        >
          <Printer size={18} /> Print Record
        </button>
      </div>

      {/* USER INFO */}
      <div className="flex gap-6 mb-8">
        <img
          src={viewUser.profile_pic || 'https://via.placeholder.com/100'}
          className="w-32 h-32 rounded border object-cover"
        />
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 flex-1">
          <p><strong>ID:</strong> #{viewUser.id}</p>
          <p><strong>Name:</strong> {viewUser.name}</p>
          <p><strong>Email:</strong> {viewUser.email}</p>
          <p><strong>Role:</strong> {viewUser.role}</p>
          <p><strong>Phone:</strong> {viewUser.phone || 'N/A'}</p>
          <p><strong>Status:</strong> {viewUser.maritalStatus || 'N/A'}</p>
          <p><strong>Address:</strong> {viewUser.address || 'N/A'}</p>
<p><strong>Background:</strong> {viewUser.backgroundInfo || 'N/A'}</p>
        </div>
      </div>

      {/* TOOLS TABLE */}
      <h3 className="text-xl font-bold mb-3 border-b pb-2">
        Assigned Tools History
      </h3>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Tool Name</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Date</th>
          </tr>
        </thead>

        <tbody>
          {assignedTools.length > 0 ? assignedTools.map((tool, idx) => (
            <tr key={idx}>
              <td className="border p-2">{tool.toolName}</td>
              <td className="border p-2">{tool.category}</td>
              <td className="border p-2">{tool.quantity}</td>
              <td className="border p-2">{tool.date}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="4" className="border p-4 text-center text-gray-500">
                No tools assigned yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-10 text-xs text-gray-400 text-center italic">
        Generated by System - {new Date().toLocaleDateString()}
      </div>

    </div>
  </div>
)}

      {/* EDIT MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl w-[90%] max-w-md">

            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <p className="text-yellow-500 mb-2">ID: #{selectedUser.id}</p>

            <input
              className="w-full mb-3 p-3 rounded bg-slate-800"
              value={selectedUser.name}
              onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
            />

            <input
              className="w-full mb-3 p-3 rounded bg-slate-800"
              value={selectedUser.email}
              onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
            />

            <select
              className="w-full mb-3 p-3 rounded bg-slate-800"
              value={selectedUser.role}
              onChange={e => setSelectedUser({...selectedUser, role: e.target.value})}
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
              <option value="electrician">Electrician</option>
              <option value="cro">CRO</option>
            </select>
{/* ✅ NEW FIELDS ADD HERE (EXACT PLACE) */}

<input
  className="w-full mb-3 p-3 rounded bg-slate-800"
  placeholder="Phone"
  value={selectedUser.phone || ''}
  onChange={e => setSelectedUser({...selectedUser, phone: e.target.value})}
/>

<select
  className="w-full mb-3 p-3 rounded bg-slate-800"
  value={selectedUser.maritalStatus || 'Single'}
  onChange={e => setSelectedUser({...selectedUser, maritalStatus: e.target.value})}
>
  <option value="Single">Single</option>
  <option value="Married">Married</option>
</select>

<textarea
  className="w-full mb-3 p-3 rounded bg-slate-800"
  placeholder="Address"
  value={selectedUser.address || ''}
  onChange={e => setSelectedUser({...selectedUser, address: e.target.value})}
/>

<textarea
  className="w-full mb-3 p-3 rounded bg-slate-800"
  placeholder="Background Info"
  value={selectedUser.backgroundInfo || ''}
  onChange={e => setSelectedUser({...selectedUser, backgroundInfo: e.target.value})}
/>
            {/* IMAGE PREVIEW */}
            <div className="mb-3">
              <img
                src={preview || selectedUser.profile_pic || 'https://via.placeholder.com/80'}
                className="w-16 h-16 rounded-full mb-2"
              />
              <input type="file" onChange={e => handleImage(e.target.files[0])} />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedUser(null)}>Cancel</button>
              <button onClick={updateUser} className="bg-yellow-500 px-4 py-2 rounded text-black font-bold">
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
