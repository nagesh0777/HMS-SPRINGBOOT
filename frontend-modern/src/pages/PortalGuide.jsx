import React, { useState } from 'react';
import {
    BookOpen, ChevronDown, Shield, Stethoscope, Users, UserCog, Headset,
    LayoutDashboard, Calendar, Bed, ClipboardList, Pill, Heart, Bell, Search,
    Activity, ArrowRight, Clock, IndianRupee, Package,
    Star, HelpCircle, Zap, Settings, Key,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const roles = [
    {
        id: 'admin', label: 'Hospital Admin', icon: Shield,
        tagline: 'Full hospital operations management',
        description: 'As an Admin, you manage the entire hospital — patients, doctors, appointments, admissions, billing, staff, and reports.',
        credentials: { user: 'apollo', pass: 'apollo' },
        features: [
            { icon: LayoutDashboard, title: 'Dashboard', desc: 'See total patients, revenue, appointments, bed occupancy — all at a glance with charts.' },
            { icon: Users, title: 'Patients', desc: 'Register new patients, view profiles, edit records, and track visit history.' },
            { icon: Calendar, title: 'Appointments', desc: 'Book appointments for patients, select a doctor and time. System prevents double-booking.' },
            { icon: Stethoscope, title: 'Doctors', desc: 'Add doctors to the system with auto-suggested usernames to prevent overlaps.' },
            { icon: Bed, title: 'ADT (admissions)', desc: 'Admit patients, assign beds, transfer wards, and discharge. Track bed occupancy.' },
            { icon: IndianRupee, title: 'Billing ledger', desc: 'Generate OPD/IPD bills in seconds with keyboard shortcuts, discount presets, and payment mode grids.' },
            { icon: Package, title: 'Service rates', desc: 'Set up service catalog with categories, unit prices, and GST. Used in billing.' },
            { icon: UserCog, title: 'Staff & roles', desc: 'Add staff members, type custom roles, and select which pages they can access in the permissions grid.' },
            { icon: Clock, title: 'Attendance logs', desc: 'Clock-in/clock-out logs for employees. View daily attendance, late arrivals, overtime.' },
            { icon: Settings, title: 'Settings', desc: 'Upload hospital logo, set address, phone, registration number, and doctor signature.' },
            { icon: Bell, title: 'Notifications', desc: 'System alerts and reminders — unread count shown in the top bar.' },
        ],
        workflows: [
            {
                title: 'Register a patient & book appointment',
                steps: [
                    'Open "Patients" → click "Register New Patient".',
                    'Fill in name, phone, age, gender, address, weight, and upload a profile photo.',
                    'Click "Save" — a unique patient ID is auto-created.',
                    'Go to "Appointments" → click "Book Appointment".',
                    'Search the patient by mobile number or name, select a doctor, pick date & time.',
                    'Click "Confirm" — it appears in the doctor\'s queue automatically.',
                ],
            },
            {
                title: 'Create a bill (high-speed key shortcuts)',
                steps: [
                    'Press F1 from anywhere (or click "Generate New Bill") to start the billing page.',
                    'Search for a patient using their mobile number. Select them to load their profile.',
                    'On selection, focus shifts automatically to the service search box.',
                    'Type a service keyword (e.g. "cbc") and press Enter to instantly add the first result to the cart.',
                    'Use the +/- stepper buttons next to quantities to adjust consultancy days or stay counts.',
                    'Click a discount preset (0%, 5%, 10%…) and a payment status/mode block.',
                    'Press F8 or click "Generate Bill" to complete checkout and open the print/PDF invoice.',
                ],
            },
            {
                title: 'Add a doctor & generate a unique username',
                steps: [
                    'Go to "Doctors" → click "Add Doctor".',
                    'Fill in name, department, specialization, phone, email.',
                    'Pick one of the generated username suggestions, or type a custom one — duplicates are checked automatically.',
                    'Upload a profile photo.',
                    'Click "Save" — username and password are auto-generated.',
                    'Share credentials with the doctor for their portal login.',
                ],
            },
            {
                title: 'Assign roles & page permissions',
                steps: [
                    'Go to "Staff" → click "Add Staff" or edit an employee.',
                    'Pick a role suggestion (Admin, Doctor, Helpdesk, Nurse…) or type a custom one.',
                    'Open the page-access permissions grid.',
                    'Check or uncheck pages the employee should be able to open.',
                    'Click "Save" to enforce the new permissions immediately.',
                ],
            },
            {
                title: 'Admit a patient',
                steps: [
                    'Go to "ADT" → click "New Admission".',
                    'Search patient, select doctor, choose an available bed.',
                    'Add an admission reason, click "Admit".',
                    'The bed status changes to "Occupied" automatically.',
                    'To discharge: open the patient\'s admission → click "Discharge".',
                ],
            },
        ],
    },
    {
        id: 'doctor', label: 'Doctor', icon: Stethoscope,
        tagline: 'Clinical workspace & patient care',
        description: 'As a Doctor, you have your own clinical portal — manage patient queue, write prescriptions, schedule follow-ups, and update your profile.',
        credentials: { user: 'Auto-generated by Admin', pass: 'One-time password, shared by your admin' },
        features: [
            { icon: Activity, title: 'My workspace', desc: 'Your personal dashboard — today\'s patients, pending consultations, and follow-ups due.' },
            { icon: ClipboardList, title: 'Patient queue', desc: 'Today\'s appointments in order. Mark check-in → start consult → complete.' },
            { icon: Search, title: 'Search patient', desc: 'Find any patient by mobile number, name, or ID. View their full medical history and past prescriptions.' },
            { icon: Pill, title: 'Prescriptions & print', desc: 'Write prescriptions using templates or free text. Syrups auto-provide +/- ML steppers. Vitals include Weight, Height, and Head Circumference (HC). Export PDF or print on A4 letterhead.' },
            { icon: Heart, title: 'Follow-ups', desc: 'Schedule follow-up visits with priority. Track due, overdue, and completed follow-ups.' },
            { icon: UserCog, title: 'Doctor profile & QR', desc: 'Customize your clinician name, qualifications (e.g. MD PAEDIATRICS), department, registration number, and consultation QR code.' },
        ],
        workflows: [
            {
                title: 'See a patient (full flow)',
                steps: [
                    'Open "Patient Queue" — today\'s appointments show automatically.',
                    'Click "Check In" when the patient arrives.',
                    'Click "Start Consult" to begin the visit.',
                    'Click "Prescribe" to open the prescription form (patient is pre-selected).',
                    'Pick a template (fever, UTI, diabetes…) or add medicines manually.',
                    'Add diagnosis, chief complaint, weight/height if needed.',
                    'Click "Save" or "Save & Send to Pharmacy".',
                    'Back in the queue, click "Complete" to finish.',
                ],
            },
            {
                title: 'Write & print a prescription',
                steps: [
                    'Open "Prescriptions" from sidebar or click "Prescribe" on a patient card.',
                    'Enter vitals (Weight, Height, and Head Circumference HC for children).',
                    'Add Chief Complaints and Diagnosis.',
                    'Add medicines: typing "syrup" auto-fills 5ML with +/- buttons. Tablets/SOS can be freely typed.',
                    'Click "Save prescription", then click "Print" or "PDF".',
                    'In Chrome print preview: uncheck "Headers and footers" and check "Background graphics" for clean output.',
                ],
            },
            {
                title: 'Customize Doctor Profile & QR Code',
                steps: [
                    'Click "Doctor profile" in the left sidebar (or under your top-right avatar).',
                    'Edit your Full Name, Qualifications / Degree (e.g. MD PAEDIATRICS), Department, and Registration No.',
                    'Upload or replace your Consultation QR Code (printed at bottom left of prescriptions).',
                    'Click "Save profile" — all changes reflect immediately across the hospital.',
                ],
            },
            {
                title: 'Schedule a follow-up',
                steps: [
                    'Go to "Follow-Ups" → click "Schedule Follow-Up".',
                    'Select the patient, pick a date, set priority (routine/urgent/critical).',
                    'Add reason and care instructions.',
                    'Click "Save" — track it in the follow-up dashboard.',
                ],
            },
        ],
    },
    {
        id: 'helpdesk', label: 'Helpdesk', icon: Headset,
        tagline: 'Patient intake & appointment coordination',
        description: 'As Helpdesk, you handle the front desk — register patients, book appointments, and manage billing.',
        credentials: { user: 'Assigned by Admin', pass: 'Assigned by Admin' },
        features: [
            { icon: LayoutDashboard, title: 'Dashboard', desc: 'Quick view of today\'s appointments and patient counts.' },
            { icon: Users, title: 'Patients', desc: 'Register new patients with weight parameters and upload profile photos.' },
            { icon: Calendar, title: 'Appointments', desc: 'Book and manage patient appointments.' },
            { icon: IndianRupee, title: 'Billing ledger', desc: 'Create bills in seconds using keyboard shortcuts and presets.' },
            { icon: Clock, title: 'Attendance logs', desc: 'Clock in/out for your daily attendance.' },
            { icon: Bell, title: 'Notifications', desc: 'View system alerts and reminders.' },
        ],
        workflows: [
            {
                title: 'Register + book appointment',
                steps: [
                    'Search the patient in "Patients" by mobile number — if found, skip to step 4.',
                    'Click "Register New Patient", fill in details (weight, photo), save.',
                    'Go to "Appointments" → "Book Appointment".',
                    'Select patient, doctor, date & time → confirm.',
                    'Inform the patient of their appointment.',
                ],
            },
        ],
    },
    {
        id: 'staff', label: 'Staff', icon: Users,
        tagline: 'View access based on admin permissions',
        description: 'Staff members see only the pages the Admin has enabled. By default you can view the dashboard and patient list.',
        credentials: { user: 'Assigned by Admin', pass: 'Assigned by Admin' },
        features: [
            { icon: LayoutDashboard, title: 'Dashboard', desc: 'View hospital summary and basic statistics.' },
            { icon: Users, title: 'Patients', desc: 'View patient records (read-only access).' },
            { icon: Bell, title: 'Notifications', desc: 'Receive system alerts and reminders.' },
        ],
        workflows: [
            {
                title: 'View patient info',
                steps: [
                    'Go to "Patients" from the sidebar.',
                    'Search by name, mobile number, or patient code.',
                    'Click a patient to see their full profile — diagnosis timeline and prescription history.',
                ],
            },
        ],
    },
];

const tips = [
    { icon: Clock, text: 'Day & Night Auto-Theme: HMS automatically switches to dark mode during evening/night and light mode during daytime, with manual toggle override anytime.' },
    { icon: Pill, text: 'Syrup +/- Stepper: Syrups automatically provide quick +/- dosage adjustments in ML for paediatric accuracy.' },
    { icon: Zap, text: 'F1/F2 shortcuts let billing staff select patients, add matched services on Enter, and generate invoices in seconds without a mouse.' },
    { icon: Search, text: 'Search works everywhere — press ⌘K or use the top search bar to look up patient profiles instantly by mobile number or name.' },
    { icon: Stethoscope, text: 'Head Circumference (HC): Paediatric prescriptions support HC measurement in cm alongside weight, height, and BMI.' },
    { icon: Shield, text: 'Print Perfection: In Chrome print preview, uncheck "Headers and footers" and check "Background graphics" for clean letterhead printing.' },
];

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card className={cn('overflow-hidden p-0 transition-shadow', open && 'shadow-sm')}>
            <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
                <span className="flex items-center gap-2.5">
                    <ArrowRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
                    <span className="text-sm font-semibold">{title}</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
            <div className={cn('grid transition-all duration-300', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                <div className="overflow-hidden"><div className="px-5 pb-5">{children}</div></div>
            </div>
        </Card>
    );
};

const PortalGuide = () => {
    const [activeRole, setActiveRole] = useState('admin');
    const current = roles.find(r => r.id === activeRole);

    return (
        <div className="space-y-6 pb-10">
            <Card className="overflow-hidden p-0">
                <div className="bg-primary p-6 text-primary-foreground sm:p-8">
                    <div className="mb-2 flex items-center gap-3">
                        <BookOpen className="h-6 w-6" />
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Portal guide</h1>
                            <p className="text-sm text-primary-foreground/70">Trikaar HMS — Hospital Management System</p>
                        </div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
                        This guide explains every feature and how to use it, based on your role. Pick a role below to get started.
                    </p>
                </div>
            </Card>

            <Card className="border-warning/25 bg-warning-subtle/40 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
                    <Star className="h-3.5 w-3.5" /> Quick tips &amp; HMS features
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {tips.map((t, i) => {
                        const Icon = t.icon;
                        return (
                            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-card/70 px-3 py-2.5">
                                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                                <p className="text-[11px] leading-relaxed text-muted-foreground">{t.text}</p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <HelpCircle className="h-4 w-4" /> Select your role
                </h2>
                <div className="flex flex-wrap gap-2">
                    {roles.map(r => {
                        const Icon = r.icon;
                        return (
                            <button key={r.id} onClick={() => setActiveRole(r.id)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                                        activeRole === r.id ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:text-foreground',
                                    )}>
                                <Icon className="h-4 w-4" /> {r.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {current && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-start gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><current.icon className="h-6 w-6" /></span>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold">{current.label}</h2>
                                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{current.tagline}</p>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-lg border bg-muted/30 px-4 py-3">
                            <Key className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Login:</span>
                            <Badge variant="secondary">{current.credentials.user}</Badge>
                            <span className="text-xs text-muted-foreground">Password:</span>
                            <Badge variant="secondary">{current.credentials.pass}</Badge>
                        </div>
                    </Card>

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Zap className="h-3.5 w-3.5" /> What you can do
                        </h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {current.features.map((f, i) => {
                                const Icon = f.icon;
                                return (
                                    <Card key={i} className="p-4">
                                        <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-[18px] w-[18px]" /></span>
                                        <h4 className="text-sm font-semibold">{f.title}</h4>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <ArrowRight className="h-3.5 w-3.5" /> How to (step by step)
                        </h3>
                        <div className="space-y-2">
                            {current.workflows.map((wf, i) => (
                                <Accordion key={i} title={wf.title} defaultOpen={i === 0}>
                                    <div className="ml-1 space-y-2.5">
                                        {wf.steps.map((s, j) => (
                                            <div key={j} className="flex items-start gap-2.5">
                                                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{j + 1}</span>
                                                <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{s}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <p className="pt-4 text-center text-xs text-muted-foreground">Trikaar HMS v1.0 — Hospital Management System</p>
        </div>
    );
};

export default PortalGuide;
