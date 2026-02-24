import React from 'react';
import { ToastProvider } from './components/Toast';
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

// Super Admin Modules
import Hospitals from './pages/superadmin/Hospitals';

// Doctor Portal Modules
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorQueue from './pages/doctor/DoctorQueue';
import DoctorPatientProfile from './pages/doctor/DoctorPatientProfile';
import PrescriptionManagement from './pages/doctor/PrescriptionManagement';
import FollowUpCare from './pages/doctor/FollowUpCare';
import DoctorProfile from './pages/doctor/DoctorProfile';

// Admin Modules
import DoctorManagementPage from './pages/doctors/DoctorManagementPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import PortalGuide from './pages/PortalGuide';



// Configure Axios to include the token in all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-redirect on 401 (session expired)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/api/Account/')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}>
            <Route index element={<DashboardHome />} />

            <Route path="hospitals" element={<Hospitals />} />

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

            {/* Doctor Management (Admin) */}
            <Route path="doctors" element={<DoctorManagementPage />} />

            {/* Doctor Portal Routes (Doctor Role) */}
            <Route path="doctor" element={<DoctorDashboard />} />
            <Route path="doctor/queue" element={<DoctorQueue />} />
            <Route path="doctor/patient" element={<DoctorPatientProfile />} />
            <Route path="doctor/patient/:id" element={<DoctorPatientProfile />} />
            <Route path="doctor/prescriptions" element={<PrescriptionManagement />} />
            <Route path="doctor/followups" element={<FollowUpCare />} />
            <Route path="doctor/profile" element={<DoctorProfile />} />

            {/* Admin Tools */}
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="guide" element={<PortalGuide />} />

            {/* Fallback */}
            <Route path="*" element={<div>Page Under Construction</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
