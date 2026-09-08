import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, Clock, CreditCard, Activity, ArrowLeft, Bed, ClipboardList, Briefcase, Pill, FileText, CheckCircle2, ArrowRightCircle, Check } from 'lucide-react';
import axios from 'axios';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [admissions, setAdmissions] = useState([]);
    const [medicalHistory, setMedicalHistory] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [existingBills, setExistingBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'dossier'

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Aggregated Patient Profile
            const profileRes = await axios.get(`/api/DoctorPortal/Patient/${id}`);
            if (profileRes.data.Results) {
                const data = profileRes.data.Results;
                setPatient(data.patient);
                setMedicalHistory(data.medicalHistory || []);
                setPrescriptions(data.prescriptions || []);
            } else {
                // Fallback if portal fails
                const patRes = await axios.get(`/api/Patient/${id}`);
                if (patRes.data.Results) {
                    setPatient(patRes.data.Results);
                }
            }

            // 2. Fetch Appointments (Recent)
            const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
            const apptRes = await axios.get(`/api/Appointment/Appointments?FromDate=${twoYearsAgo.toISOString()}&ToDate=${nextYear.toISOString()}`);
            if (apptRes.data.Results) {
                const filtered = apptRes.data.Results.filter(a => String(a.patientId) === String(id));
                setAppointments(filtered);
            }

            // 3. Fetch Admissions
            const admRes = await axios.get(`/api/Admission/AdmittedPatients?admissionStatus=admitted`);
            if (admRes.data.Results) {
                const filtered = admRes.data.Results.filter(a => String(a.patientId) === String(id));
                setAdmissions(filtered);
            }

            // 4. Fetch Billing Records
            try {
                const billingHistoryRes = await axios.get(`/api/Billing/PatientHistory/${id}`);
                if (billingHistoryRes.data.Results?.existingBills) {
                    setExistingBills(billingHistoryRes.data.Results.existingBills);
                }
            } catch (billingErr) {
                console.error("Billing history currently offline", billingErr);
            }

        } catch (err) {
            console.error("Error fetching patient details:", err);
        } finally {
            setLoading(false);
        }
    };

    // Compiles registrations, consultations, scripts, billing checkouts, payments, and wards chronologically
    const generateTimeline = () => {
        const list = [];

        // 1. Patient Registration Setup
        if (patient && patient.createdOn) {
            list.push({
                type: 'registration',
                date: new Date(patient.createdOn),
                title: 'Patient Account Registered',
                desc: `${patient.firstName} ${patient.lastName} was registered in the database. Weight: ${patient.weight || 'N/A'} kg.`,
                icon: <User size={16} />,
                colorClass: 'bg-blue-500 text-white ring-blue-100',
                badgeText: 'Registration'
            });
        }

        // 2. Appointments
        appointments.forEach(a => {
            list.push({
                type: 'appointment',
                date: new Date(a.appointmentDate),
                title: `Appointment ${a.appointmentStatus.toUpperCase()}`,
                desc: `OPD Consultation with Dr. ${a.performerName || `Staff #${a.performerId}`}.`,
                status: a.appointmentStatus,
                icon: <Calendar size={16} />,
                colorClass: a.appointmentStatus === 'completed' ? 'bg-green-500 text-white ring-green-100' : 'bg-sky-500 text-white ring-sky-100',
                badgeText: 'OPD Slot'
            });
        });

        // 3. Admissions
        admissions.forEach(adm => {
            list.push({
                type: 'admission',
                date: new Date(adm.admissionDate),
                title: 'Hospital Ward Admission',
                desc: `Admitted as inpatient to Bed #${adm.bedId} under clinical ward supervisor.`,
                icon: <Bed size={16} />,
                colorClass: 'bg-teal-500 text-white ring-teal-100',
                badgeText: 'IPD Ward'
            });
            if (adm.dischargeDate) {
                list.push({
                    type: 'discharge',
                    date: new Date(adm.dischargeDate),
                    title: 'Discharged from Ward',
                    desc: `Discharged from Bed #${adm.bedId} following clinical recovery clearance.`,
                    icon: <CheckCircle2 size={16} />,
                    colorClass: 'bg-indigo-600 text-white ring-indigo-100',
                    badgeText: 'IPD Discharge'
                });
            }
        });

        // 4. Clinical History (Diagnoses)
        medicalHistory.filter(r => r.recordType !== 'lab_result').forEach(h => {
            list.push({
                type: 'diagnosis',
                date: new Date(h.createdOn),
                title: h.title || 'Clinical Consultation',
                desc: h.description || 'Clinical assessment conducted.',
                findings: h.findings,
                icon: <ClipboardList size={16} />,
                colorClass: 'bg-indigo-500 text-white ring-indigo-100',
                badgeText: 'Assessment'
            });
        });

        // 5. Prescriptions
        prescriptions.forEach(p => {
            let meds = [];
            try { meds = p.medicines ? JSON.parse(p.medicines) : []; } catch (e) {}
            list.push({
                type: 'prescription',
                date: new Date(p.createdOn),
                title: 'Prescription Issued',
                desc: `Clinical Rx formulated. Diagnosis: ${p.diagnosis || 'General Assessment'}.`,
                medicines: meds,
                clinicalNotes: p.clinicalNotes,
                icon: <Pill size={16} />,
                colorClass: 'bg-emerald-500 text-white ring-emerald-100',
                badgeText: 'Clinical Rx'
            });
        });

        // 6. Bills
        existingBills.forEach(b => {
            list.push({
                type: 'bill',
                date: new Date(b.createdAt),
                title: `Invoice Generated (${b.billNumber})`,
                desc: `Subtotal: ₹${b.subtotal} · Grand Total: ₹${b.grandTotal} (Payment Status: ${b.paymentStatus}).`,
                status: b.paymentStatus,
                icon: <FileText size={16} />,
                colorClass: 'bg-amber-500 text-white ring-amber-100',
                badgeText: 'Invoice'
            });

            // 7. Payments
            if (b.paymentStatus === 'Paid' || b.paymentStatus === 'Partial') {
                list.push({
                    type: 'payment',
                    date: new Date(b.createdAt),
                    title: `Transaction Confirmed`,
                    desc: `Cleared ₹${b.paidAmount || b.grandTotal} via ${b.paymentMode || 'Cash'}. Invoice cleared successfully.`,
                    icon: <CreditCard size={16} />,
                    colorClass: 'bg-emerald-600 text-white ring-emerald-200',
                    badgeText: 'Payment'
                });
            }
        });

        // Sort descending (newest first)
        return list.sort((x, y) => y.date.getTime() - x.date.getTime());
    };

    if (loading) return <div className="flex h-64 items-center justify-center">Loading patient records...</div>;
    if (!patient) return <div className="p-8 text-center text-red-500">Patient profile not found.</div>;

    const isActiveAdmission = admissions.length > 0;
    const timelineItems = generateTimeline();

    return (
        <div className="space-y-8 pb-10">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard/patients')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Patients
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/dashboard/patients/edit/${id}`)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                    >
                        Edit Profile
                    </button>
                    <button
                        onClick={() => navigate(`/dashboard/appointments/new?patientId=${id}`)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                    >
                        Book Appointment
                    </button>
                    {!isActiveAdmission && (
                        <button
                            onClick={() => navigate(`/dashboard/adt/admit?patientId=${id}`)}
                            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95 transition-all"
                        >
                            Admit Patient
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Overview Banner */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-850 p-8 text-white">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md overflow-hidden border border-white/10 shadow-lg">
                            {patient.photoPath ? (
                                <img src={patient.photoPath} alt="Patient" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-extrabold tracking-tight">{patient.firstName} {patient.lastName}</h1>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 uppercase tracking-wider ${
                                    patient.status === 'Inpatient' ? 'bg-teal-400/20 text-teal-100 ring-teal-400/30' :
                                    patient.status === 'Emergency' ? 'bg-rose-400/20 text-rose-100 ring-rose-400/30' :
                                    patient.status === 'Discharged' ? 'bg-gray-400/20 text-gray-100 ring-gray-400/30' :
                                    'bg-blue-400/20 text-blue-100 ring-blue-400/30' // Outpatient
                                }`}>
                                    {patient.status || 'Outpatient'}
                                </span>
                                {isActiveAdmission && patient.status !== 'Inpatient' && (
                                    <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-teal-400/30">
                                        CURRENTLY ADMITTED
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-blue-100 font-semibold">#{patient.patientCode} &bull; {patient.gender} &bull; {patient.age} Yrs {patient.weight ? ` &bull; ${patient.weight} kg` : ''}</p>
                            <div className="mt-4 flex flex-wrap gap-5 text-sm text-blue-50/90 font-medium">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} />
                                    {patient.phoneNumber}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    {patient.address}
                                </div>
                                {patient.email && (
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} />
                                        {patient.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                    <div className="p-6 text-center bg-gray-50/20">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Visits</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{appointments.length + admissions.length}</p>
                    </div>
                    <div className="p-6 text-center bg-gray-50/20">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Clinical Records</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">
                            {medicalHistory.filter(r => r.recordType !== 'lab_result').length}
                        </p>
                    </div>
                    <div className="p-6 text-center bg-gray-50/20">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Prescriptions</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{prescriptions.length}</p>
                    </div>
                </div>
            </div>

            {/* Journey View Switcher Tab bar */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full border border-gray-200/50 max-w-[360px]">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Patient Journey Timeline
                </button>
                <button
                    onClick={() => setActiveTab('dossier')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'dossier' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Clinical Dossier
                </button>
            </div>

            {/* ─── TAB 1: Patient Journey Timeline (Node Graph) ─── */}
            {activeTab === 'timeline' && (
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                    <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5 mb-2">
                        <Activity size={18} className="text-blue-600" />
                        Patient Journey Node Graph
                    </h3>
                    <p className="text-xs text-gray-400 mb-8">Unified chronological audit trail of consultations, operations, prescriptions, and payments.</p>

                    {timelineItems.length > 0 ? (
                        <div className="relative border-l border-gray-200 ml-4 pl-8 space-y-8 pb-4">
                            {timelineItems.map((item, idx) => (
                                <div key={idx} className="relative transition-all hover:translate-x-1 duration-200">
                                    {/* Dotted Node Point */}
                                    <span className={`absolute -left-[48px] top-1.5 flex h-9 w-9 items-center justify-center rounded-xl ring-4 ring-white shadow-md ${item.colorClass}`}>
                                        {item.icon}
                                    </span>

                                    {/* Timeline Card */}
                                    <div className="rounded-xl border border-gray-100 bg-slate-50/50 p-4 space-y-2.5 max-w-[800px] shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                                                <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                                                    {new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                item.type === 'prescription' ? 'bg-emerald-50 text-emerald-700' :
                                                item.type === 'bill' ? 'bg-amber-50 text-amber-700' :
                                                item.type === 'payment' ? 'bg-green-50 text-green-700' :
                                                item.type === 'admission' ? 'bg-teal-50 text-teal-700' :
                                                item.type === 'registration' ? 'bg-blue-50 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.badgeText}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>

                                        {/* Medicines layout expansion */}
                                        {item.type === 'prescription' && item.medicines && item.medicines.length > 0 && (
                                            <div className="mt-3 bg-white border border-gray-100 p-3 rounded-lg space-y-2">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prescribed Medications</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {item.medicines.map((m, mIdx) => (
                                                        <div key={mIdx} className="bg-slate-50/50 p-2.5 rounded-md border border-slate-100 space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-gray-950">{m.name}</span>
                                                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-black">{m.timing}</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 font-semibold">Dosage: {m.dosage} &bull; Freq: {m.frequency} &bull; Days: {m.duration}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Diagnosis details expansion */}
                                        {item.type === 'diagnosis' && item.findings && (
                                            <p className="text-[11px] text-indigo-700 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50">
                                                <strong>Findings:</strong> {item.findings}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">No active journey trail discovered for this patient.</div>
                    )}
                </div>
            )}

            {/* ─── TAB 2: Detailed Clinical Dossier ─── */}
            {activeTab === 'dossier' && (
                <div className="space-y-8">
                    {/* Appointments and ADT Admissions */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* Recent Appointments */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
                                <Calendar size={20} className="text-blue-600" />
                                Appointment History
                            </h3>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                {appointments.length > 0 ? appointments.map((appt) => (
                                    <div key={appt.appointmentId} className="flex items-center justify-between rounded-xl border border-gray-50 bg-gray-50/30 p-4 transition-all hover:bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <div className="rounded-lg bg-white p-2 text-blue-650 shadow-sm border border-slate-100">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">Dr. {appt.performerName || `Staff #${appt.performerId}`}</p>
                                                <p className="text-xs text-gray-500 font-semibold">{new Date(appt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${appt.appointmentStatus === 'booked' ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                            appt.appointmentStatus === 'completed' ? 'bg-green-50 text-green-700 ring-green-100' :
                                                'bg-gray-50 text-gray-700 ring-gray-105'
                                            }`}>
                                            {appt.appointmentStatus}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center text-sm text-gray-400">No appointment records found.</div>
                                )}
                            </div>
                        </div>

                        {/* Admission Details */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
                                <Bed size={20} className="text-teal-650" />
                                Admission Status
                            </h3>
                            {isActiveAdmission ? (
                                <div className="rounded-xl bg-teal-50 p-6 border border-teal-100 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Current Location</p>
                                            <h4 className="mt-1 text-xl font-bold text-teal-900">Ward A &bull; Bed #{admissions[0].bedId}</h4>
                                        </div>
                                        <div className="rounded-full bg-white p-2.5 text-teal-600 shadow-sm border border-teal-100">
                                            <Activity size={24} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-t border-teal-200/50 pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-teal-600 uppercase">Admitted On</p>
                                            <p className="text-xs font-bold text-teal-900">{new Date(admissions[0].admissionDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-teal-600 uppercase">Status</p>
                                            <p className="text-xs font-bold text-teal-900">Stable</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="mb-4 rounded-full bg-gray-50 p-4 text-gray-300">
                                        <Bed size={48} />
                                    </div>
                                    <p className="text-sm text-gray-550">Patient is currently not admitted to any ward bed.</p>
                                    <button
                                        onClick={() => navigate(`/dashboard/adt/admit?patientId=${id}`)}
                                        className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700"
                                    >
                                        Process New Admission
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Clinical History & Prescriptions */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* Clinical Consultations */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
                                <ClipboardList size={20} className="text-indigo-600" />
                                Consultations & Diagnoses
                            </h3>
                            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                                {medicalHistory.filter(r => r.recordType !== 'lab_result').length > 0 ? (
                                    medicalHistory
                                        .filter(r => r.recordType !== 'lab_result')
                                        .map((rec) => (
                                            <div key={rec.recordId} className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm">{rec.title || 'Clinical Consultation'}</h4>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                                            Recorded: {new Date(rec.createdOn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </p>
                                                    </div>
                                                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 capitalize">
                                                        {rec.recordType}
                                                    </span>
                                                </div>
                                                {rec.description && (
                                                    <p className="text-xs text-gray-600 leading-relaxed bg-white border border-gray-100 p-2.5 rounded-lg">
                                                        {rec.description}
                                                    </p>
                                                )}
                                                {rec.findings && (
                                                    <div className="text-xs text-gray-500 font-normal">
                                                        <span className="font-semibold text-gray-700">Clinical Findings:</span> {rec.findings}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-100 rounded-xl bg-gray-50/20">No consultations discovered.</div>
                                )}
                            </div>
                        </div>

                        {/* Prescriptions */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6">
                                <Pill size={20} className="text-emerald-600" />
                                Active Prescriptions
                            </h3>
                            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                                {prescriptions.length > 0 ? (
                                    prescriptions.map((rx) => {
                                        let meds = [];
                                        try { meds = rx.medicines ? JSON.parse(rx.medicines) : []; } catch (e) {}
                                        return (
                                            <div key={rx.prescriptionId} className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm">
                                                            Diagnosis: {rx.diagnosis || 'General Assessment'}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                                            Prescribed: {new Date(rx.createdOn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {rx.clinicalNotes && (
                                                    <p className="text-xs text-gray-650 italic bg-white border border-gray-100 p-2.5 rounded-lg">
                                                        &ldquo;{rx.clinicalNotes}&rdquo;
                                                    </p>
                                                )}
                                                {meds.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Prescribed Medications</p>
                                                        <div className="grid grid-cols-1 gap-1.5">
                                                            {meds.map((m, idx) => (
                                                                <div key={idx} className="text-xs text-gray-700 bg-white border border-gray-150 p-2.5 rounded-lg space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-bold text-gray-950">{m.name}</span>
                                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                            {m.timing || 'After food'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5 font-medium">
                                                                        <span>Dosage: <strong>{m.dosage}</strong></span>
                                                                        <span>&bull;</span>
                                                                        <span>Freq: {m.frequency}</span>
                                                                        <span>&bull;</span>
                                                                        <span>Duration: {m.duration} Days</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400">No drugs listed in prescription.</p>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-100 rounded-xl bg-gray-50/20">No active prescriptions discovered.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDetails;
