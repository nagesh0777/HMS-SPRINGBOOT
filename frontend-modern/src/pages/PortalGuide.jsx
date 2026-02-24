import React, { useState } from 'react';
import {
    BookOpen, ChevronDown, ChevronRight, Shield, Stethoscope, Users, UserCog, Headset,
    LayoutDashboard, Calendar, Bed, ClipboardList, Pill, Heart, FileText, Bell, Search,
    Building, Activity, Lock, ArrowRight, CheckCircle, AlertTriangle, Eye, Settings,
    UserCheck, Play, Phone, MapPin, Clock, CreditCard, Briefcase, Monitor, Zap,
    Star, HelpCircle, LogIn, Key, RefreshCw, Download, Send, Edit3, Trash2, Plus
} from 'lucide-react';

// ─── Role Config ───────────────────────────────────────────────
const roles = [
    {
        id: 'superadmin', label: 'Super Admin', icon: <Building size={22} />,
        color: 'from-purple-500 to-indigo-600', ring: 'ring-purple-200', bg: 'bg-purple-50',
        text: 'text-purple-700', tagline: 'Multi-hospital oversight & control',
        description: 'The Super Admin has full control over the entire platform. You can manage multiple hospitals, monitor system-wide statistics, and configure platform-level settings.',
        credentials: { user: 'superadmin', pass: 'superadmin' },
        features: [
            { icon: <Building size={18} />, title: 'Hospital Management', desc: 'Create, activate/deactivate hospitals across the platform.' },
            { icon: <Monitor size={18} />, title: 'Platform Dashboard', desc: 'View total hospitals, active/inactive counts, and system-wide metrics.' },
            { icon: <Shield size={18} />, title: 'Access Control', desc: 'Only Super Admin can see the Hospitals management module.' },
        ],
        workflows: [
            {
                title: 'Managing Hospitals',
                steps: [
                    'Log in with Super Admin credentials.',
                    'Navigate to the "Hospitals" page from the sidebar.',
                    'View all registered hospitals with status indicators.',
                    'Click "Add Hospital" to register a new facility.',
                    'Toggle hospital status (Active/Inactive) as needed.',
                ]
            },
        ]
    },
    {
        id: 'admin', label: 'Hospital Admin', icon: <Shield size={22} />,
        color: 'from-blue-500 to-cyan-600', ring: 'ring-blue-200', bg: 'bg-blue-50',
        text: 'text-blue-700', tagline: 'Full hospital operations management',
        description: 'The Hospital Admin manages day-to-day operations of a single hospital. You have access to patient management, appointments, ADT (Admission-Discharge-Transfer), doctor management, staff management, attendance tracking, audit logs, and notifications.',
        credentials: { user: 'apollo', pass: 'apollo' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Analytics Dashboard', desc: 'Real-time stats: total patients, today\'s appointments, active admissions, revenue trends, and department analytics.' },
            { icon: <Users size={18} />, title: 'Patient Management', desc: 'Register patients, view profiles, edit details, and track medical history with comprehensive patient records.' },
            { icon: <Calendar size={18} />, title: 'Appointment Booking', desc: 'Search patients, select doctors, pick date/time, and book appointments with double-booking prevention.' },
            { icon: <Bed size={18} />, title: 'ADT Module', desc: 'Manage admissions, bed assignments, ward transfers, and discharges. View bed occupancy dashboard.' },
            { icon: <Stethoscope size={18} />, title: 'Doctor Management', desc: 'Add doctors with auto-generated login credentials, reset passwords, toggle active status, and repair accounts.' },
            { icon: <UserCog size={18} />, title: 'Staff Management', desc: 'Add, edit, and manage staff profiles. View staff details and employment history.' },
            { icon: <Clock size={18} />, title: 'Attendance Tracking', desc: 'QR-based attendance check-in/check-out with daily reports, late arrivals, and overtime tracking.' },
            { icon: <FileText size={18} />, title: 'Audit Trail', desc: 'Complete audit log of all system actions with filtering by date, action type, and user.' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'Real-time notification center with unread badge count and priority alerts.' },
        ],
        workflows: [
            {
                title: 'Register a New Patient',
                steps: [
                    'Go to "Patients" from the sidebar.',
                    'Click "Register New Patient" button.',
                    'Fill in patient details: Name, Age, Gender, Phone, Address, Blood Group, Email.',
                    'Click "Save" — the system auto-generates a unique Patient Code.',
                    'The patient now appears in the Patient List and can be searched globally.',
                ]
            },
            {
                title: 'Book an Appointment',
                steps: [
                    'Go to "Appointments" from the sidebar.',
                    'Click "Book Appointment".',
                    'Search and select a patient by name, phone, or code.',
                    'Select a doctor from the dropdown (only active doctors appear).',
                    'Pick a date and time — the system prevents double-booking.',
                    'Click "Confirm Booking" — the appointment status is set to "Booked".',
                    'The appointment auto-appears in the doctor\'s queue for that day.',
                ]
            },
            {
                title: 'Add a New Doctor',
                steps: [
                    'Go to "Doctors" from the sidebar.',
                    'Click "Add Doctor".',
                    'Fill in: Full Name, Department, Specialization, Phone, Email.',
                    'Click "Save Doctor" — the system auto-generates a username and password.',
                    'Share the credentials with the doctor — they will be prompted to change password on first login.',
                    'The doctor can now log in to their own Doctor Portal.',
                ]
            },
            {
                title: 'Admit a Patient (ADT)',
                steps: [
                    'Go to "ADT" from the sidebar.',
                    'Click "New Admission".',
                    'Search and select a patient, assign a doctor, select an available bed.',
                    'Fill in admission reason and notes.',
                    'Click "Admit" — the bed is now marked as occupied.',
                    'The patient\'s profile will show "Currently Admitted" status.',
                ]
            },
        ]
    },
    {
        id: 'doctor', label: 'Doctor', icon: <Stethoscope size={22} />,
        color: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200', bg: 'bg-emerald-50',
        text: 'text-emerald-700', tagline: 'Clinical workspace & patient care',
        description: 'Doctors have a dedicated clinical portal with their own workspace. You can manage your patient queue, write prescriptions, schedule follow-ups, view lab results, and manage your profile — all tailored for efficient clinical workflows.',
        credentials: { user: 'dr.firstname', pass: 'pass123 (auto-generated)' },
        features: [
            { icon: <Activity size={18} />, title: 'My Workspace', desc: 'Personal dashboard showing today\'s patient count, pending consultations, prescriptions written, and follow-ups due.' },
            { icon: <ClipboardList size={18} />, title: 'Patient Queue', desc: 'Today\'s appointment queue with status flow: Booked → Check In → Start Consult → Complete. Emergency priority sorting.' },
            { icon: <Search size={18} />, title: 'Patient Search', desc: 'Search any patient by name, phone, or ID. View complete medical profiles including history, prescriptions, and follow-ups.' },
            { icon: <Pill size={18} />, title: 'Prescriptions', desc: 'Create prescriptions with disease templates, inline medicine editing, dosage/frequency/duration. Save as template, send to pharmacy.' },
            { icon: <Heart size={18} />, title: 'Follow-Up Care', desc: 'Schedule follow-up appointments with priority levels (Routine, Urgent, Critical). Track overdue and completed follow-ups.' },
            { icon: <UserCog size={18} />, title: 'My Profile', desc: 'View and update your profile: specialization, email, phone. Change your password securely.' },
        ],
        workflows: [
            {
                title: 'Complete Patient Consultation',
                steps: [
                    'Go to "Patient Queue" — your today\'s patients appear automatically.',
                    'Click "Check In" on a booked patient to mark them as arrived.',
                    'Click "Start Consult" to begin the consultation — status changes to "In Consultation".',
                    'Click "Prescribe" to go directly to the prescription form with the patient pre-selected.',
                    'Select a disease template (e.g., Common Cold, UTI, Diabetes) or add medicines manually.',
                    'Add diagnosis, clinical notes, and adjust medicines as needed.',
                    'Click "Save Prescription" or "Save & Send to Pharmacy".',
                    'Return to queue and click "Complete" to finish the consultation.',
                ]
            },
            {
                title: 'Using Prescription Templates',
                steps: [
                    'Go to "Prescriptions" page.',
                    'Select a patient (auto-linked if coming from queue).',
                    'Click on a template from the template panel (e.g., "Common Cold", "UTI").',
                    'The template auto-fills diagnosis, medicines, and clinical notes.',
                    'Edit any medicines inline — change dosage, frequency, or duration.',
                    'To create your own template: fill out a prescription, then click "Save as Template".',
                    'Manage templates: click "Templates" tab to Create, Edit, or Delete custom templates.',
                ]
            },
            {
                title: 'Schedule a Follow-Up',
                steps: [
                    'Go to "Follow-Ups" from the sidebar.',
                    'Click "Schedule Follow-Up".',
                    'Enter the Patient ID, select a date, set priority (Routine / Urgent / Critical).',
                    'Add reason, care instructions, and treatment plan.',
                    'Click "Schedule Follow-Up" to save.',
                    'Track all follow-ups: view Due Today, Overdue, and Completed stats.',
                    'Mark follow-ups as "Complete" or "Missed" with one click.',
                ]
            },
        ]
    },
    {
        id: 'helpdesk', label: 'Helpdesk', icon: <Headset size={22} />,
        color: 'from-amber-500 to-orange-600', ring: 'ring-amber-200', bg: 'bg-amber-50',
        text: 'text-amber-700', tagline: 'Patient intake & appointment coordination',
        description: 'The Helpdesk role is designed for front-desk staff who handle patient registration, appointment booking, and basic queries. You have streamlined access to the most common tasks without administrative complexity.',
        credentials: { user: 'helpdesk', pass: 'Assigned by Admin' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'Quick overview of today\'s appointments, patient counts, and recent activity.' },
            { icon: <Users size={18} />, title: 'Patient Registration', desc: 'Register new patients and search existing records quickly.' },
            { icon: <Calendar size={18} />, title: 'Appointments', desc: 'Book, view, and manage patient appointments with available doctors.' },
            { icon: <Clock size={18} />, title: 'Attendance', desc: 'Check in/check out for your own attendance via QR code.' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'Stay updated with system alerts and reminders.' },
        ],
        workflows: [
            {
                title: 'Quick Patient Registration & Booking',
                steps: [
                    'Search for the patient in "Patients" — if they exist, proceed to book.',
                    'If new patient: click "Register New Patient", fill in details, and save.',
                    'Go to "Appointments" → "Book Appointment".',
                    'Search and select the patient, pick a doctor and time slot.',
                    'Confirm the booking — the patient will appear in the doctor\'s queue.',
                    'Inform the patient of their appointment details.',
                ]
            },
        ]
    },
    {
        id: 'staff', label: 'Staff', icon: <Users size={22} />,
        color: 'from-gray-500 to-slate-600', ring: 'ring-gray-200', bg: 'bg-gray-50',
        text: 'text-gray-700', tagline: 'Basic access & patient viewing',
        description: 'Staff members have basic read access to essential modules. You can view the dashboard and patient records, and receive notifications. This role is ideal for support staff who need visibility without modification rights.',
        credentials: { user: 'staff', pass: 'Assigned by Admin' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'View hospital summary statistics and key metrics.' },
            { icon: <Users size={18} />, title: 'Patient List', desc: 'View patient records and search the patient database (read-only).' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'Receive and view system notifications and alerts.' },
        ],
        workflows: [
            {
                title: 'Viewing Patient Information',
                steps: [
                    'Go to "Patients" from the sidebar.',
                    'Use the search bar to find a patient by name, phone, or code.',
                    'Click on a patient to view their full profile.',
                    'View appointment history, admission details, and contact information.',
                ]
            },
        ]
    },
];

// ─── Quick Tips ────────────────────────────────────────────────
const quickTips = [
    { icon: <LogIn size={16} />, text: 'Use the default credentials shown for each role to log in. Change your password on first login for security.' },
    { icon: <Search size={16} />, text: 'Patient search works globally — search by name, phone number, or patient code from any module.' },
    { icon: <Bell size={16} />, text: 'The notification bell in the top-right shows unread count. Click it to view all alerts.' },
    { icon: <RefreshCw size={16} />, text: 'Doctor queue auto-refreshes every 30 seconds. Emergency appointments are always shown first.' },
    { icon: <Download size={16} />, text: 'Prescriptions can be downloaded as text files for printing and pharmacy use.' },
    { icon: <Lock size={16} />, text: 'Sessions expire after 24 hours. You\'ll be automatically redirected to login if your session expires.' },
    { icon: <Zap size={16} />, text: 'Use keyboard shortcuts: press "/" to focus the search bar in patient-heavy pages.' },
    { icon: <AlertTriangle size={16} />, text: 'Double-booking prevention is built-in — the system won\'t allow two appointments for the same doctor at the same time.' },
];

// ─── Accordion Component ───────────────────────────────────────
const Accordion = ({ title, children, defaultOpen = false, icon }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={`rounded-2xl border transition-all duration-300 ${open ? 'border-gray-200 shadow-lg bg-white' : 'border-gray-100 bg-white/60 hover:bg-white'}`}>
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-gray-400">{icon}</span>}
                    <span className="text-sm font-bold text-gray-900">{title}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────
const PortalGuide = () => {
    const [activeRole, setActiveRole] = useState('admin');
    const currentRole = roles.find(r => r.id === activeRole);

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-12 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <BookOpen size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Portal Guide</h1>
                            <p className="text-gray-300 text-sm mt-1">Trikaar EMR — Hospital Management System</p>
                        </div>
                    </div>
                    <p className="text-gray-300 max-w-2xl text-sm md:text-base leading-relaxed mt-4">
                        Welcome to the Trikaar EMR system. This guide covers everything you need to know about using the portal —
                        from patient registration to clinical workflows, prescriptions, and administration.
                        Select your role below to see role-specific instructions.
                    </p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                        {[
                            { label: '5 User Roles', icon: <Users size={16} /> },
                            { label: '20+ Features', icon: <Zap size={16} /> },
                            { label: 'Role-Based Access', icon: <Shield size={16} /> },
                            { label: 'Real-Time Updates', icon: <Activity size={16} /> },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                                <span className="text-white/70">{s.icon}</span>
                                <span className="text-xs font-semibold text-white/90">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 ring-1 ring-amber-100">
                <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-4">
                    <Star size={16} className="text-amber-500" />
                    Quick Tips & Best Practices
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white/60 rounded-xl px-4 py-3">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">{tip.icon}</span>
                            <p className="text-xs text-gray-700 leading-relaxed">{tip.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Selector Tabs */}
            <div>
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                    <HelpCircle size={20} className="text-primary-500" />
                    Select Your Role
                </h2>
                <div className="flex flex-wrap gap-2">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setActiveRole(role.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeRole === role.id
                                    ? `bg-gradient-to-r ${role.color} text-white shadow-lg scale-105`
                                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-sm'
                                }`}
                        >
                            {role.icon}
                            {role.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Role Detail Panel */}
            {currentRole && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Role Header Card */}
                    <div className={`rounded-3xl bg-gradient-to-r ${currentRole.color} p-8 text-white shadow-xl`}>
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm self-start">
                                {currentRole.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black">{currentRole.label}</h2>
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {currentRole.tagline}
                                    </span>
                                </div>
                                <p className="mt-3 text-white/85 text-sm leading-relaxed max-w-3xl">
                                    {currentRole.description}
                                </p>
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="mt-6 flex flex-wrap items-center gap-4 bg-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
                            <Key size={16} className="text-white/70" />
                            <div className="text-xs">
                                <span className="text-white/60 font-medium">Default Login: </span>
                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md ml-1">{currentRole.credentials.user}</span>
                            </div>
                            <div className="text-xs">
                                <span className="text-white/60 font-medium">Password: </span>
                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md ml-1">{currentRole.credentials.pass}</span>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div>
                        <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap size={16} className="text-yellow-500" />
                            Available Features
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentRole.features.map((feat, i) => (
                                <div
                                    key={i}
                                    className={`rounded-2xl bg-white p-5 ring-1 ring-gray-100 hover:ring-gray-200 hover:shadow-lg transition-all duration-200 group`}
                                >
                                    <div className={`inline-flex p-2.5 rounded-xl ${currentRole.bg} ${currentRole.text} mb-3 group-hover:scale-110 transition-transform`}>
                                        {feat.icon}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900">{feat.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workflows (Accordion) */}
                    <div>
                        <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <ArrowRight size={16} className="text-blue-500" />
                            Step-by-Step Workflows
                        </h3>
                        <div className="space-y-3">
                            {currentRole.workflows.map((wf, i) => (
                                <Accordion key={i} title={wf.title} defaultOpen={i === 0} icon={<Play size={14} />}>
                                    <div className="space-y-3 ml-1">
                                        {wf.steps.map((step, j) => (
                                            <div key={j} className="flex items-start gap-3 group">
                                                <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${currentRole.color} text-white flex items-center justify-center text-[11px] font-black shadow-sm group-hover:scale-110 transition-transform`}>
                                                    {j + 1}
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* System Architecture Overview */}
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Settings size={20} className="text-gray-400" />
                    System Architecture
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 ring-1 ring-blue-100">
                        <div className="p-2 bg-blue-100 rounded-xl inline-flex text-blue-600 mb-3">
                            <Monitor size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Frontend — React</h4>
                        <ul className="mt-3 space-y-2 text-xs text-gray-600">
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> Modern React with Vite for fast builds</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> Role-based sidebar navigation</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> Lucide icons & Framer Motion animations</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> JWT-based auth with auto-redirect on expiry</li>
                        </ul>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 ring-1 ring-green-100">
                        <div className="p-2 bg-green-100 rounded-xl inline-flex text-green-600 mb-3">
                            <Zap size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Backend — Spring Boot</h4>
                        <ul className="mt-3 space-y-2 text-xs text-gray-600">
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> RESTful APIs with Spring Security</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> JWT authentication with hospitalId claims</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> Multi-tenant isolation by hospital</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> Auto-seeding of demo data on startup</li>
                        </ul>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 p-6 ring-1 ring-purple-100">
                        <div className="p-2 bg-purple-100 rounded-xl inline-flex text-purple-600 mb-3">
                            <CreditCard size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">Database — MySQL</h4>
                        <ul className="mt-3 space-y-2 text-xs text-gray-600">
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-purple-500 mt-0.5 flex-shrink-0" /> Auto-creates schema on first run</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-purple-500 mt-0.5 flex-shrink-0" /> JPA/Hibernate ORM with auto DDL</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-purple-500 mt-0.5 flex-shrink-0" /> Persistent data across container restarts</li>
                            <li className="flex items-start gap-2"><CheckCircle size={12} className="text-purple-500 mt-0.5 flex-shrink-0" /> Docker volume for data persistence</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Security & Access Control */}
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-red-400" />
                    Security & Access Control
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { title: 'JWT Authentication', desc: 'Every API request is secured with a Bearer token that expires after 24 hours.', icon: <Key size={16} /> },
                        { title: 'Role-Based Navigation', desc: 'The sidebar dynamically shows only the modules your role has access to.', icon: <Shield size={16} /> },
                        { title: 'Multi-Tenant Isolation', desc: 'All data is scoped to your hospital. You can never see data from another hospital.', icon: <Building size={16} /> },
                        { title: 'Password Security', desc: 'Doctor passwords can be reset by Admin. First-login prompts password change.', icon: <Lock size={16} /> },
                        { title: 'Audit Logging', desc: 'Every critical action (create, update, delete) is logged with user, timestamp, and details.', icon: <FileText size={16} /> },
                        { title: '401 Auto-Redirect', desc: 'If your session expires mid-use, you\'re automatically redirected to the login page.', icon: <LogIn size={16} /> },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm flex-shrink-0">{item.icon}</div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4">
                <p className="font-medium">Trikaar EMR v1.0 — Hospital Management System</p>
                <p className="mt-1">Built for production enterprise healthcare environments</p>
            </div>
        </div>
    );
};

export default PortalGuide;
