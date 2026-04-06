import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './Layout';
import Login from './Login';
import Dashboard from './Dashboard';
import UserDashboard from './UserDashboard';
import AddUser from './AddUser';
import StaffRecord from './StaffRecord';
import AssignTasks from './AssignTasks';
import MyTasks from './MyTasks';
import Profile from './Profile';
import TaskView from './TaskView';
import AssignTools from './pages/AssignTools';
import PublicDashboard from './pages/PublicDashboard'; // ❗ kept (not removed)
import UserDetails from './UserDetails';

import { getToken, getUser } from './utils/auth';

function App() {
  const isAuth = !!getToken();
  const user = getUser();

  return (
    <Router>
      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={isAuth ? <Navigate to="/" /> : <Login />}
        />

        {/* MAIN LAYOUT */}
        <Route
          path="/"
          element={<Layout />}
        >

          {/* DASHBOARD (ROLE BASED + PUBLIC MODE FIX) */}
          <Route
            index
            element={
              isAuth
                ? (
                    user?.role === 'superadmin' || user?.role === 'admin'
                      ? <Dashboard />
                      : <UserDashboard />
                  )
                : <Dashboard />   // ✅ FIX: PublicDashboard → Dashboard
            }
          />

          {/* STAFF */}
          <Route path="add-staff" element={<AddUser />} />
          <Route path="staff-records" element={<StaffRecord />} />
          <Route path="user/:id" element={<UserDetails />} />

          {/* TASKS */}
         <Route 
  path="assign-tasks" 
  element={isAuth ? <AssignTasks /> : <Navigate to="/" />} 
/>
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="task-view/:id" element={<TaskView />} />

          {/* PROFILE */}
          <Route path="profile" element={<Profile />} />

          {/* 🛠 TOOLS */}
          <Route path="assign-tools" element={<AssignTools />} />

        </Route>

      </Routes>
    </Router>
  );
}

export default App;