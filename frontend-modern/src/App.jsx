import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';

// Patient Modules
import PatientList from './pages/patients/PatientList';
import PatientRegistration from './pages/patients/PatientRegistration';
import PatientDetails from './pages/patients/PatientDetails';

// Appointment Modules
import AppointmentList from './pages/appointments/AppointmentList';
import NewAppointment from './pages/appointments/NewAppointment';
import DoctorManagement from './pages/appointments/DoctorManagement';

// ADT Modules
import AdtDashboard from './pages/adt/AdtDashboard';
import NewAdmission from './pages/adt/NewAdmission';
import BedManagement from './pages/adt/BedManagement';

// Staff Modules
import StaffList from './pages/staff/StaffList';
import StaffDetails from './pages/staff/StaffDetails';
import StaffForm from './pages/staff/StaffForm';
import Attendance from './pages/staff/Attendance';
import StaffQR from './pages/staff/StaffQR';



// Configure Axios to include the token in all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
          <Route index element={<DashboardHome />} />

          {/* Patient Routes */}
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/:id" element={<PatientDetails />} />
          <Route path="patients/edit/:id" element={<PatientRegistration />} />
          <Route path="patients/new" element={<PatientRegistration />} />

          {/* Appointment Routes */}
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="appointments/new" element={<NewAppointment />} />
          <Route path="appointments/doctors" element={<DoctorManagement />} />

          {/* ADT Routes */}
          <Route path="adt" element={<AdtDashboard />} />
          <Route path="adt/admit" element={<NewAdmission />} />
          <Route path="adt/beds" element={<BedManagement />} />

          {/* Staff Routes */}
          <Route path="staff" element={<StaffList />} />
          <Route path="staff/:id" element={<StaffDetails />} />
          <Route path="staff/edit/:id" element={<StaffForm />} />
          <Route path="staff/new" element={<StaffForm />} />
          <Route path="staff/attendance" element={<Attendance />} />
          <Route path="staff/qr" element={<StaffQR />} />



          {/* Fallback */}
          <Route path="*" element={<div>Page Under Construction</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
