import React, { useState } from 'react';
import {
    BookOpen, ChevronDown, Shield, Stethoscope, Users, UserCog, Headset,
    LayoutDashboard, Calendar, Bed, ClipboardList, Pill, Heart, FileText, Bell, Search,
    Activity, ArrowRight, CheckCircle, Play, Clock, IndianRupee, Package,
    Star, HelpCircle, Zap, Settings, Key
} from 'lucide-react';

const roles = [
    {
        id: 'admin', label: 'Hospital Admin', icon: <Shield size={22} />,
        color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700',
        tagline: 'Full hospital operations management',
        description: 'As an Admin, you manage the entire hospital — patients, doctors, appointments, admissions, billing, staff, and reports.',
        credentials: { user: 'apollo', pass: 'apollo' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'See total patients, revenue, appointments, bed occupancy — all at a glance with charts.' },
            { icon: <Users size={18} />, title: 'Patients', desc: 'Register new patients, view profiles, edit records, and track visit history.' },
            { icon: <Calendar size={18} />, title: 'Appointments', desc: 'Book appointments for patients, select a doctor and time. System prevents double-booking.' },
            { icon: <Stethoscope size={18} />, title: 'Doctors', desc: 'Add doctors to the system. The system auto-creates login credentials for them.' },
            { icon: <Bed size={18} />, title: 'ADT (Admissions)', desc: 'Admit patients, assign beds, transfer wards, and discharge. Track bed occupancy.' },
            { icon: <IndianRupee size={18} />, title: 'Billing', desc: 'Generate OPD/IPD bills, add services & medicines, apply discounts, and track payments.' },
            { icon: <Package size={18} />, title: 'Service Rates', desc: 'Set up service catalog with categories, unit prices, and GST. Used in billing.' },
            { icon: <UserCog size={18} />, title: 'Staff', desc: 'Add staff members, assign roles, select which pages they can access.' },
            { icon: <Clock size={18} />, title: 'Attendance', desc: 'QR-based check-in/check-out. View daily attendance, late arrivals, overtime.' },
            { icon: <Settings size={18} />, title: 'Settings', desc: 'Upload hospital logo, set address, phone, registration number, and doctor signature.' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'System alerts and reminders — unread count shown in the top bar.' },
        ],
        workflows: [
            {
                title: 'Register a Patient & Book Appointment',
                steps: [
                    'Open "Patients" → Click "Register New Patient".',
                    'Fill in Name, Phone, Age, Gender, Address, Blood Group.',
                    'Click "Save" — a unique Patient ID is auto-created.',
                    'Go to "Appointments" → Click "Book Appointment".',
                    'Search the patient, select a doctor, pick date & time.',
                    'Click "Confirm" — it appears in the doctor\'s queue automatically.',
                ]
            },
            {
                title: 'Create a Bill',
                steps: [
                    'Go to "Billing" → Click "New Bill".',
                    'Select OPD or IPD, search and select the patient.',
                    'Add services from the catalog — quantity and price auto-calculate.',
                    'Apply discount or tax if needed.',
                    'Click "Save Bill" — mark payment as Paid/Unpaid.',
                    'You can view and edit bills from the billing list anytime.',
                ]
            },
            {
                title: 'Add a Doctor',
                steps: [
                    'Go to "Doctors" → Click "Add Doctor".',
                    'Fill in Name, Department, Specialization, Phone, Email.',
                    'Click "Save" — username and password are auto-generated.',
                    'Share credentials with the doctor for their portal login.',
                ]
            },
            {
                title: 'Admit a Patient',
                steps: [
                    'Go to "ADT" → Click "New Admission".',
                    'Search patient, select doctor, choose an available bed.',
                    'Add admission reason, click "Admit".',
                    'The bed status changes to "Occupied" automatically.',
                    'To discharge: open the patient\'s admission → click "Discharge".',
                ]
            },
        ]
    },
    {
        id: 'doctor', label: 'Doctor', icon: <Stethoscope size={22} />,
        color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700',
        tagline: 'Clinical workspace & patient care',
        description: 'As a Doctor, you have your own clinical portal — manage patient queue, write prescriptions, schedule follow-ups, and update your profile.',
        credentials: { user: 'Auto-generated by Admin', pass: 'pass123 (default)' },
        features: [
            { icon: <Activity size={18} />, title: 'My Workspace', desc: 'Your personal dashboard — today\'s patients, pending consultations, and follow-ups due.' },
            { icon: <ClipboardList size={18} />, title: 'Patient Queue', desc: 'Today\'s appointments in order. Mark Check-In → Start Consult → Complete.' },
            { icon: <Search size={18} />, title: 'Search Patient', desc: 'Find any patient by name, phone, or ID. View their full medical history.' },
            { icon: <Pill size={18} />, title: 'Prescriptions', desc: 'Write prescriptions using templates. Add medicines with dosage, timing, and duration. Download PDF.' },
            { icon: <Heart size={18} />, title: 'Follow-Ups', desc: 'Schedule follow-up visits with priority. Track due, overdue, and completed follow-ups.' },
            { icon: <UserCog size={18} />, title: 'My Profile', desc: 'Update your specialization, contact info, and change password.' },
        ],
        workflows: [
            {
                title: 'See a Patient (Full Flow)',
                steps: [
                    'Open "Patient Queue" — your today\'s appointments show automatically.',
                    'Click "Check In" when the patient arrives.',
                    'Click "Start Consult" to begin the visit.',
                    'Click "Prescribe" to open the prescription form (patient is pre-selected).',
                    'Pick a template (Fever, UTI, Diabetes etc.) or add medicines manually.',
                    'Add diagnosis, chief complaint, weight/height if needed.',
                    'Click "Save" or "Save & Send to Pharmacy".',
                    'Go back to queue → Click "Complete" to finish.',
                ]
            },
            {
                title: 'Schedule a Follow-Up',
                steps: [
                    'Go to "Follow-Ups" → Click "Schedule Follow-Up".',
                    'Enter Patient ID, pick a date, set priority (Routine/Urgent/Critical).',
                    'Add reason and care instructions.',
                    'Click "Save" — track it in the Follow-Up dashboard.',
                ]
            },
        ]
    },
    {
        id: 'helpdesk', label: 'Helpdesk', icon: <Headset size={22} />,
        color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700',
        tagline: 'Patient intake & appointment coordination',
        description: 'As Helpdesk, you handle the front desk — register patients, book appointments, and manage billing. Quick and simple access.',
        credentials: { user: 'Assigned by Admin', pass: 'Assigned by Admin' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'Quick view of today\'s appointments and patient counts.' },
            { icon: <Users size={18} />, title: 'Patients', desc: 'Register new patients and search existing records.' },
            { icon: <Calendar size={18} />, title: 'Appointments', desc: 'Book and manage patient appointments.' },
            { icon: <IndianRupee size={18} />, title: 'Billing', desc: 'Create bills for patients and track payment status.' },
            { icon: <Clock size={18} />, title: 'Attendance', desc: 'Check in/out for your daily attendance.' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'View system alerts and reminders.' },
        ],
        workflows: [
            {
                title: 'Register + Book Appointment',
                steps: [
                    'Search the patient in "Patients" — if found, skip to step 4.',
                    'Click "Register New Patient", fill details, save.',
                    'Go to "Appointments" → "Book Appointment".',
                    'Select patient, doctor, date & time → Confirm.',
                    'Inform the patient of their appointment.',
                ]
            },
        ]
    },
    {
        id: 'staff', label: 'Staff', icon: <Users size={22} />,
        color: 'from-gray-500 to-slate-600', bg: 'bg-gray-50', text: 'text-gray-700',
        tagline: 'View access based on admin permissions',
        description: 'Staff members see only the pages the Admin has enabled. By default you can view the dashboard and patient list.',
        credentials: { user: 'Assigned by Admin', pass: 'Assigned by Admin' },
        features: [
            { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'View hospital summary and basic statistics.' },
            { icon: <Users size={18} />, title: 'Patients', desc: 'View patient records (read-only access).' },
            { icon: <Bell size={18} />, title: 'Notifications', desc: 'Receive system alerts and reminders.' },
        ],
        workflows: [
            {
                title: 'View Patient Info',
                steps: [
                    'Go to "Patients" from the sidebar.',
                    'Search by name, phone, or patient code.',
                    'Click on a patient to see their full profile.',
                ]
            },
        ]
    },
];

const tips = [
    { icon: <Search size={15} />, text: 'Search works everywhere — type name, phone, or patient code to find a patient instantly.' },
    { icon: <Bell size={15} />, text: 'The bell icon in the top bar shows unread notification count. Click to see all alerts.' },
    { icon: <Pill size={15} />, text: 'Prescriptions can be saved as templates for quick reuse with similar patients.' },
    { icon: <Calendar size={15} />, text: 'Double-booking is prevented — the system won\'t allow overlapping appointment slots.' },
    { icon: <IndianRupee size={15} />, text: 'Bills can be marked as Paid, Unpaid, or Partial. Payment mode (Cash/UPI/Card) is tracked.' },
    { icon: <Shield size={15} />, text: 'Admin controls which pages each staff member can access through the Staff form.' },
];

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={`rounded-xl border transition-all ${open ? 'border-gray-200 shadow-md bg-white' : 'border-gray-100 bg-white/80 hover:bg-white'}`}>
            <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                    <Play size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                    <span className="text-sm font-bold text-gray-800">{title}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-4">{children}</div>
            </div>
        </div>
    );
};

const PortalGuide = () => {
    const [activeRole, setActiveRole] = useState('admin');
    const current = roles.find(r => r.id === activeRole);

    return (
        <div className="space-y-8 pb-12">

            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-white/10 rounded-xl"><BookOpen size={24} /></div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Portal Guide</h1>
                            <p className="text-gray-400 text-sm"><span className="text-white font-bold">Trikaar</span> HMS — Hospital Management System</p>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mt-3 max-w-2xl">
                        Welcome to <span className="text-white font-bold">Trikaar</span> HMS. This guide explains all features and how to use them based on your role.
                        Select your role below to get started.
                    </p>
                </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl bg-amber-50/60 p-5 ring-1 ring-amber-100">
                <h3 className="flex items-center gap-2 text-xs font-bold text-amber-700 mb-3 uppercase tracking-wider">
                    <Star size={14} className="text-amber-500" /> Quick Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tips.map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-white/70 rounded-lg px-3 py-2.5">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">{t.icon}</span>
                            <p className="text-[11px] text-gray-600 leading-relaxed">{t.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Tabs */}
            <div>
                <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <HelpCircle size={16} className="text-blue-500" /> Select Your Role
                </h2>
                <div className="flex flex-wrap gap-2">
                    {roles.map(r => (
                        <button key={r.id} onClick={() => setActiveRole(r.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeRole === r.id ? `bg-gradient-to-r ${r.color} text-white shadow-lg scale-105` : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:ring-gray-300'
                                }`}>
                            {r.icon} {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Role Content */}
            {current && (
                <div className="space-y-6">

                    {/* Role Header */}
                    <div className={`rounded-2xl bg-gradient-to-r ${current.color} p-6 text-white shadow-lg`}>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/15 rounded-xl">{current.icon}</div>
                            <div className="flex-1">
                                <h2 className="text-xl font-black">{current.label}</h2>
                                <p className="text-white/70 text-xs font-semibold uppercase mt-0.5">{current.tagline}</p>
                                <p className="text-white/80 text-sm mt-2 leading-relaxed">{current.description}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 bg-white/10 rounded-xl px-4 py-3">
                            <Key size={14} className="text-white/60" />
                            <span className="text-xs text-white/60">Login:</span>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">{current.credentials.user}</span>
                            <span className="text-xs text-white/60">Password:</span>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">{current.credentials.pass}</span>
                        </div>
                    </div>

                    {/* Features */}
                    <div>
                        <h3 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500" /> What You Can Do
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {current.features.map((f, i) => (
                                <div key={i} className="rounded-xl bg-white p-4 ring-1 ring-gray-100 hover:shadow-md transition-all group">
                                    <div className={`inline-flex p-2 rounded-lg ${current.bg} ${current.text} mb-2 group-hover:scale-110 transition-transform`}>{f.icon}</div>
                                    <h4 className="text-sm font-bold text-gray-900">{f.title}</h4>
                                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workflows */}
                    <div>
                        <h3 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <ArrowRight size={14} className="text-blue-500" /> How To (Step by Step)
                        </h3>
                        <div className="space-y-2">
                            {current.workflows.map((wf, i) => (
                                <Accordion key={i} title={wf.title} defaultOpen={i === 0}>
                                    <div className="space-y-2.5 ml-1">
                                        {wf.steps.map((s, j) => (
                                            <div key={j} className="flex items-start gap-2.5">
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${current.color} text-white flex items-center justify-center text-[10px] font-black`}>{j + 1}</div>
                                                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{s}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4">
                <p><span className="text-gray-900 font-bold">Trikaar</span> HMS v1.0 — Hospital Management System</p>
            </div>
        </div>
    );
};

export default PortalGuide;
