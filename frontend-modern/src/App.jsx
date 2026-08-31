import React, { lazy, Suspense } from 'react';
import { ToastProvider } from './components/Toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';

import DashboardLayout from './layouts/DashboardLayout';
/**
 * Route-level code splitting.
 *
 * Every page was previously in the entry bundle, so a receptionist opening the login screen
 * downloaded the billing dashboard, the superadmin console and the 1,700-line prescription
 * module before they could type a password. Each page is now its own chunk, fetched when its
 * route is first visited.
 *
 * Login and DashboardLayout stay eagerly imported — they are on the critical path for first
 * paint, and splitting them would only add a round trip before anything renders.
 */
const DashboardHome = lazy(() => import('./pages/DashboardHome'));

// Patients
const PatientList = lazy(() => import('./pages/patients/PatientList'));
const PatientRegistration = lazy(() => import('./pages/patients/PatientRegistration'));
const PatientDetails = lazy(() => import('./pages/patients/PatientDetails'));

// Appointments
const AppointmentList = lazy(() => import('./pages/appointments/AppointmentList'));
const NewAppointment = lazy(() => import('./pages/appointments/NewAppointment'));

// ADT
const AdtDashboard = lazy(() => import('./pages/adt/AdtDashboard'));
const NewAdmission = lazy(() => import('./pages/adt/NewAdmission'));
const BedManagement = lazy(() => import('./pages/adt/BedManagement'));

// Staff
const EmployeeManagement = lazy(() => import('./pages/staff/EmployeeManagement'));
const StaffDetails = lazy(() => import('./pages/staff/StaffDetails'));
const StaffForm = lazy(() => import('./pages/staff/StaffForm'));

// Super admin
const Hospitals = lazy(() => import('./pages/superadmin/Hospitals'));

// Doctor portal
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const DoctorQueue = lazy(() => import('./pages/doctor/DoctorQueue'));
const DoctorPatientProfile = lazy(() => import('./pages/doctor/DoctorPatientProfile'));
const PrescriptionManagement = lazy(() => import('./pages/doctor/PrescriptionManagement'));
const FollowUpCare = lazy(() => import('./pages/doctor/FollowUpCare'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile'));
const TreatedHistory = lazy(() => import('./pages/doctor/TreatedHistory'));

// Admin
const DoctorManagementPage = lazy(() => import('./pages/doctors/DoctorManagementPage'));
const HospitalSettingsPage = lazy(() => import('./pages/admin/HospitalSettingsPage'));
const ServiceCatalogPage = lazy(() => import('./pages/admin/ServiceCatalogPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const PortalGuide = lazy(() => import('./pages/PortalGuide'));
const BillingDashboard = lazy(() => import('./pages/billing/BillingDashboard'));

/** Shown while a route chunk downloads. Deliberately quiet — a full-page spinner on every
 *  navigation reads as slower than it is. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
    </div>
  );
}



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
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" />} />
          <Route path="/pricing" element={<Navigate to="/login" />} />

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

            {/* ADT Routes */}
            <Route path="adt" element={<AdtDashboard />} />
            <Route path="adt/admit" element={<NewAdmission />} />
            <Route path="adt/beds" element={<BedManagement />} />

            {/* Employee Management Routes */}
            <Route path="staff" element={<EmployeeManagement />} />
            <Route path="staff/attendance" element={<EmployeeManagement />} />
            <Route path="staff/logs" element={<EmployeeManagement />} />
            <Route path="staff/:id" element={<StaffDetails />} />
            <Route path="staff/edit/:id" element={<StaffForm />} />
            <Route path="staff/new" element={<StaffForm />} />

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
            <Route path="doctor/history" element={<TreatedHistory />} />

            {/* Admin Tools */}

            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="guide" element={<PortalGuide />} />

            {/* Billing Module */}
            <Route path="billing" element={<BillingDashboard />} />
            <Route path="services" element={<ServiceCatalogPage />} />

            {/* Hospital Settings */}
            <Route path="settings" element={<HospitalSettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<div>Page Under Construction</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
