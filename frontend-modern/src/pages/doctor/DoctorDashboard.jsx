import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, AlertTriangle, CheckCircle, Clock, Zap, Play, User,
    FileText, Pill, ArrowRight, Plus, Trash2, Send, ChevronRight,
    Activity, HeartPulse, Check, X, ShieldAlert, ChevronDown,
    ChevronUp, Stethoscope, Calendar, RefreshCw, UserCheck, Calculator,
    Mic, Info, Thermometer, ShieldCheck as VerifiedIcon, KeyRound
} from 'lucide-react';
import { useToast } from '../../components/Toast';

const MEDICINE_DB = [
    'Amoxicillin', 'Azithromycin', 'Paracetamol', 'Ibuprofen', 'Cetirizine',
    'Metformin', 'Omeprazole', 'Amlodipine', 'Atorvastatin', 'Losartan',
    'Ciprofloxacin', 'Levofloxacin', 'Doxycycline', 'Prednisone', 'Pantoprazole',
    'Levothyroxine', 'Lisinopril', 'Hydrochlorothiazide', 'Clopidogrel',
    'Aspirin', 'Diclofenac', 'Tramadol', 'Gabapentin', 'Sertraline', 'Fluoxetine',
    'Ranitidine', 'Domperidone', 'Ondansetron', 'Salbutamol', 'Budesonide',
    'Metronidazole', 'Acyclovir', 'Clindamycin', 'Rabeprazole', 'Montelukast',
    'Fexofenadine', 'Loperamide', 'ORS', 'Vitamin D3', 'Vitamin B12',
    'Iron Supplement', 'Calcium', 'Folic Acid', 'Warfarin', 'Digoxin',
    'Amiodarone', 'Clarithromycin', 'Simvastatin', 'Antacid', 'Lithium', 'Methotrexate'
];

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Before meals', 'After meals', 'At bedtime', 'Every 8 hours', 'Every 12 hours'];
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '30 days', 'Ongoing'];

const QUICK_TEMPLATES = [
    { id: 'cold', name: 'Common Cold / Flu', medicines: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Three times daily', duration: '3 days', instructions: 'After meals' },
        { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '5 days', instructions: 'At bedtime' },
    ]},
    { id: 'gastritis', name: 'Gastritis / GERD', medicines: [
        { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily', duration: '14 days', instructions: 'Before breakfast, empty stomach' },
        { name: 'Domperidone', dosage: '10mg', frequency: 'Three times daily', duration: '7 days', instructions: 'Before meals' },
    ]},
    { id: 'uti', name: 'UTI', medicines: [
        { name: 'Ciprofloxacin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', instructions: 'With water, avoid antacids' },
        { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '3 days', instructions: 'For fever/pain' },
    ]},
    { id: 'diarrhea', name: 'Acute Diarrhea', medicines: [
        { name: 'ORS', dosage: '1 packet', frequency: 'As needed', duration: '3 days', instructions: 'Dissolve in 1L boiled water' },
        { name: 'Metronidazole', dosage: '400mg', frequency: 'Three times daily', duration: '5 days', instructions: 'After meals' },
    ]},
    { id: 'allergy', name: 'Allergy / Urticaria', medicines: [
        { name: 'Fexofenadine', dosage: '120mg', frequency: 'Once daily', duration: '7 days', instructions: 'Before meals' },
        { name: 'Montelukast', dosage: '10mg', frequency: 'Once daily', duration: '7 days', instructions: 'At bedtime' },
    ]},
];

// Autocomplete dropdown component
const AutocompleteInput = ({ value, onChange, placeholder, className }) => {
    const [open, setOpen] = useState(false);
    const suggestions = value.length > 1
        ? MEDICINE_DB.filter(m => m.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
        : [];

    return (
        <div className="relative">
            <input
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {open && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-0.5 max-h-40 overflow-y-auto">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={() => { onChange(s); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-gray-800 font-medium transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Doctor Workspace
const DoctorDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const userName = localStorage.getItem('userName') || 'Doctor';

    // ── Core Data ──
    const [dashData, setDashData] = useState({ appointmentsToday: 0, activeAdmissions: 0, pendingLabResults: 0, followUpsDueToday: 0, emergencyCount: 0, followUps: [] });
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Doctor Availability Status ──
    const [dutyStatus, setDutyStatus] = useState("Available");

    // ── Patient Search (Main Gateway Panel) ──
    const [ptQuery, setPtQuery] = useState('');
    const [ptResults, setPtResults] = useState([]);
    const [ptSearching, setPtSearching] = useState(false);
    const searchDebounce = useRef(null);

    // ── AI Clinical Scribe ──
    const [scribeOpen, setScribeOpen] = useState(false);
    const [scribeRecording, setScribeRecording] = useState(false);

    // ── Clinical Calculators State ──
    const [calcTab, setCalcTab] = useState("bmi");
    // BMI/BSA
    const [height, setHeight] = useState(170);
    const [weight, setWeight] = useState(70);
    // GFR
    const [gfrAge, setGfrAge] = useState(60);
    const [gfrWeight, setGfrWeight] = useState(70);
    const [gfrCreatinine, setGfrCreatinine] = useState(1.1);
    const [gfrGender, setGfrGender] = useState("Male");
    // Pediatric suspension
    const [pedWeight, setPedWeight] = useState(12);
    const [pedDrug, setPedDrug] = useState("para"); // para (Paracetamol) vs ibu (Ibuprofen)

    // ── Quick Rx Pad ──
    const [rxOpen, setRxOpen] = useState(false);
    const [rxPatientQuery, setRxPatientQuery] = useState('');
    const [rxPatientResults, setRxPatientResults] = useState([]);
    const [rxPatient, setRxPatient] = useState(null);
    const [rxDiagnosis, setRxDiagnosis] = useState('');
    const [rxMedicines, setRxMedicines] = useState([{ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }]);
    const [rxNotes, setRxNotes] = useState('');
    const [rxSubmitting, setRxSubmitting] = useState(false);
    const rxDebounce = useRef(null);

    // ── Reminders ──
    const [reminders, setReminders] = useState(() => {
        try {
            const s = localStorage.getItem(`dr_notes_${userName}`);
            return s ? JSON.parse(s) : [
                { id: 1, text: "Perform clinical round reviews in ICU ward", checked: false, priority: "HIGH" },
                { id: 2, text: "Sign off pending lab reports for Aarav Patel", checked: false, priority: "MEDIUM" },
                { id: 3, text: "Finalize prescription for inpatient discharge", checked: false, priority: "LOW" }
            ];
        }
        catch { return []; }
    });
    const [newReminder, setNewReminder] = useState('');
    const [reminderPriority, setReminderPriority] = useState("MEDIUM"); // HIGH, MEDIUM, LOW

    // ── Fetch Dashboard & Queue on mount ──
    const loadWorkspace = async () => {
        try {
            const [dashRes, queueRes] = await Promise.all([
                axios.get('/api/DoctorPortal/Dashboard'),
                axios.get('/api/DoctorPortal/Queue'),
            ]);
            if (dashRes.data?.Results) setDashData(dashRes.data.Results);
            if (queueRes.data?.Results) setQueue(queueRes.data.Results);
        } catch (e) {
            console.error('Dashboard load error', e);
            toast.error('Could not load workspace data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkspace();
    }, []);

    useEffect(() => {
        localStorage.setItem(`dr_notes_${userName}`, JSON.stringify(reminders));
    }, [reminders]);

    // ── AUTOMATED CLINICAL CALCULATORS CONTEXT SYNC EFFECT ──
    useEffect(() => {
        if (rxPatient) {
            // Auto-populate height, weight, age, and gender from selected patient profile to save time
            const pHeight = rxPatient.height || 170;
            const pWeight = rxPatient.weight || 70;
            
            // Extract numeric age
            let pAge = 35;
            if (rxPatient.age) {
                const clean = rxPatient.age.toUpperCase().replace("Y", "").trim();
                pAge = parseInt(clean) || 35;
            }

            const pGender = rxPatient.gender === "Female" ? "Female" : "Male";

            setHeight(pHeight);
            setWeight(pWeight);
            setGfrAge(pAge);
            setGfrWeight(pWeight);
            setGfrGender(pGender);
            setPedWeight(pWeight);

            toast.info(`⚡ Rounds calculators automated for: ${rxPatient.firstName} (${pGender}, ${pAge}Y, ${pWeight}kg)`);
        }
    }, [rxPatient]);

    // ── Patient Search ──
    const handlePatientSearch = useCallback((q) => {
        setPtQuery(q);
        clearTimeout(searchDebounce.current);
        if (!q.trim()) { setPtResults([]); return; }
        searchDebounce.current = setTimeout(async () => {
            setPtSearching(true);
            try {
                const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(q)}`);
                setPtResults(res.data?.Results?.slice(0, 6) || []);
            } catch { setPtResults([]); }
            finally { setPtSearching(false); }
        }, 350);
    }, []);

    // ── Quick Rx Patient Search ──
    const handleRxPatientSearch = useCallback((q) => {
        setRxPatientQuery(q);
        setRxPatient(null);
        clearTimeout(rxDebounce.current);
        if (!q.trim()) { setRxPatientResults([]); return; }
        rxDebounce.current = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(q)}`);
                setRxPatientResults(res.data?.Results?.slice(0, 5) || []);
            } catch { setRxPatientResults([]); }
        }, 350);
    }, []);

    // ── Quick Rx Submit ──
    const handleRxSubmit = async () => {
        if (!rxPatient) { toast.error('Please select a patient.'); return; }
        if (!rxDiagnosis.trim()) { toast.error('Please enter a diagnosis.'); return; }
        const validMeds = rxMedicines.filter(m => m.name.trim());
        if (validMeds.length === 0) { toast.error('Add at least one medicine.'); return; }

        setRxSubmitting(true);
        try {
            await axios.post('/api/DoctorPortal/Prescriptions', {
                patientId: rxPatient.patientId,
                diagnosis: rxDiagnosis,
                clinicalNotes: rxNotes,
                medicines: JSON.stringify(validMeds),
                status: 'active',
            });
            toast.success(`Prescription sent for ${rxPatient.firstName} ${rxPatient.lastName}`);
            setRxPatient(null); setRxPatientQuery(''); setRxDiagnosis(''); setRxNotes('');
            setRxMedicines([{ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }]);
            setRxOpen(false);
            loadWorkspace();
        } catch {
            toast.error('Failed to send prescription. Please try again.');
        } finally {
            setRxSubmitting(false);
        }
    };

    const loadRxTemplate = (tpl) => {
        setRxDiagnosis(tpl.name);
        setRxMedicines(tpl.medicines.map(m => ({ ...m })));
        toast.success(`Loaded "${tpl.name}" template`);
    };

    // ── AI Scribe Simulator ──
    const runScribeTemplate = (type) => {
        setScribeRecording(true);
        toast.info("AI Scribe listening... compiling speech transcript");

        setTimeout(() => {
            setScribeRecording(false);
            setScribeOpen(false);

            if (type === "cardio") {
                setRxDiagnosis("Essential Hypertension");
                setRxNotes("62yo male presented for standard cardiology review. Blood pressure recorded at 154/96 mmHg, pulse 88 bpm. Reports mild morning headaches. Kidney/renal panel is clear.");
                setRxMedicines([
                    { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "Ongoing", instructions: "In the morning, check BP twice weekly" },
                    { name: "Atorvastatin", dosage: "10mg", frequency: "Once daily", duration: "30 days", instructions: "At bedtime, lipid control" }
                ]);
                toast.success("AI Scribe populated: Cardiology Consultation Report");
            } else if (type === "cough") {
                setRxDiagnosis("Pediatric Allergic Bronchitis");
                setRxNotes("5yo female with recurring dry allergic cough, worse during nocturnal hours. SpO2 98% on room air, mild bilateral wheeze. Chest clear of infection.");
                setRxMedicines([
                    { name: "Montelukast", dosage: "5mg", frequency: "Once daily", duration: "10 days", instructions: "Chewable tablet at bedtime" },
                    { name: "Cetirizine", dosage: "5mg/5mL Syrup", frequency: "Once daily", duration: "5 days", instructions: "2.5mL at bedtime for cough" }
                ]);
                toast.success("AI Scribe populated: Pediatric Allergic Cough Report");
            } else if (type === "gastric") {
                setRxDiagnosis("Acid Peptic Disease / GERD");
                setRxNotes("34yo female complains of burning epigastric discomfort, exacerbated by empty stomach and spicy foods. Relieved transiently by antacids.");
                setRxMedicines([
                    { name: "Pantoprazole", dosage: "40mg", frequency: "Once daily", duration: "14 days", instructions: "Before breakfast, empty stomach" },
                    { name: "Domperidone", dosage: "10mg", frequency: "Three times daily", duration: "7 days", instructions: "15 minutes before meals" }
                ]);
                toast.success("AI Scribe populated: Adult Gastritis Report");
            }
        }, 1500);
    };

    // ── Calculators Math ──
    const bmiVal = (weight / Math.pow(height / 100, 2)).toFixed(1);
    const bsaVal = Math.sqrt((height * weight) / 3600).toFixed(2);
    const getBmiCategory = (val) => {
        if (val < 18.5) return { label: "Underweight", color: "bg-blue-500 text-white" };
        if (val < 25) return { label: "Normal Weight", color: "bg-emerald-500 text-white" };
        if (val < 30) return { label: "Overweight", color: "bg-amber-500 text-white" };
        return { label: "Obese", color: "bg-rose-500 text-white" };
    };

    const runGfrCalc = () => {
        let crCl = ((140 - gfrAge) * gfrWeight) / (72 * gfrCreatinine);
        if (gfrGender === "Female") {
            crCl = crCl * 0.85;
        }
        return crCl.toFixed(1);
    };
    const gfrVal = runGfrCalc();
    const getGfrLevel = (val) => {
        if (val >= 90) return { label: "Normal / G1", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dose: "Standard dosing. No adjustment needed." };
        if (val >= 60) return { label: "Mild Impairment / G2", color: "text-green-600 bg-green-50 border-green-200", dose: "Standard dosing. Monitor creatinine." };
        if (val >= 30) return { label: "Moderate Impairment / G3", color: "text-amber-600 bg-amber-50 border-amber-200", dose: "Caution needed. Consider 25-50% dose reduction for renal-cleared medications." };
        return { label: "Severe Impairment / G4-G5", color: "text-rose-600 bg-rose-50 border-rose-200", dose: "Renal Dosing Alert: Reduce dose by 50-75% or switch to alternative clearance drug." };
    };

    const getPedDose = () => {
        if (pedDrug === "para") {
            const doseMg = pedWeight * 15;
            const doseMl = (doseMg * 5) / 120;
            return { mg: doseMg.toFixed(0), ml: doseMl.toFixed(1), freq: "Every 4-6 hours as needed (Max 4 times daily)", drugName: "Paracetamol Suspension (120mg/5mL)" };
        } else {
            const doseMg = pedWeight * 10;
            const doseMl = (doseMg * 5) / 100;
            return { mg: doseMg.toFixed(0), ml: doseMl.toFixed(1), freq: "Every 6-8 hours as needed (Max 3 times daily)", drugName: "Ibuprofen Suspension (100mg/5mL)" };
        }
    };
    const pedDose = getPedDose();

    const inConsultation = queue.filter(a => a.appointmentStatus === 'InConsultation');
    const waiting = queue.filter(a => ['initiated', 'booked', 'CheckedIn'].includes(a.appointmentStatus));
    const emergencies = queue.filter(a => a.appointmentType?.toLowerCase().includes('emergency'));
    const patientName = (a) => `${a.firstName || ''} ${a.lastName || ''}`.trim() || `Patient #${a.patientId}`;

    return (
        <div className="space-y-6">
            
            {/* ── 1. GREETING BANNER WITH DUTY STATUS PLANNER & URGENT ALERTS ── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-900 p-7 text-white shadow-xl border border-teal-500/20">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-4 right-8"><HeartPulse size={180} className="text-emerald-400" /></div>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-emerald-200 text-xs font-semibold flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                                <Activity size={13} /> Live Clinical Workspace
                            </span>
                            
                            {/* Glowing Availability Duty Status Picker */}
                            <div className="relative">
                                <select
                                    value={dutyStatus}
                                    onChange={(e) => {
                                        setDutyStatus(e.target.value);
                                        toast.success(`Clinical status updated to: ${e.target.value}`);
                                    }}
                                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-[#0f172a]/60 text-white cursor-pointer focus:outline-none transition-all duration-300 ${
                                        dutyStatus === "Available" ? "border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                                        dutyStatus === "On Rounds" ? "border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                                        dutyStatus === "In Surgery" ? "border-rose-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                        "border-white/20"
                                    }`}
                                >
                                    <option value="Available" className="text-slate-900 font-extrabold">🟢 Available</option>
                                    <option value="On Rounds" className="text-slate-900 font-extrabold">🟡 On Rounds</option>
                                    <option value="In Surgery" className="text-slate-900 font-extrabold">🔴 In Surgery</option>
                                    <option value="Away" className="text-slate-900 font-extrabold">⚫ Off Duty</option>
                                </select>
                            </div>
                        </div>

                        <h1 className="text-2xl font-black">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Dr. {userName}</h1>
                        <p className="mt-1 text-teal-200 text-xs max-w-lg">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>


                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                            { label: 'Waiting', value: waiting.length, color: 'bg-amber-400/20 text-amber-100' },
                            { label: 'In Consult', value: inConsultation.length, color: 'bg-emerald-400/20 text-emerald-100 border border-emerald-500/10' },
                            { label: 'Follow-Ups', value: dashData.followUpsDueToday, color: 'bg-purple-400/20 text-purple-100' }
                        ].map(s => (
                            <div key={s.label} className={`px-4 py-2.5 rounded-2xl text-center min-w-[70px] ${s.color}`}>
                                <p className="text-xl font-black">{s.value}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider opacity-90 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ── 2. MAIN WORKSPACE CONTENT GRID (3 COLUMNS) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ══ LEFT + CENTER (2/3): Direct Patient Rx Registry Hub & Quick Rx Pad ══ */}
                <div className="xl:col-span-2 space-y-6">

                    {/* ── HERO COMPONENT: PATIENT REGISTRY & DIRECT Rx SEARCH GATEWAY ── */}
                    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-150 p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                    <Search className="text-teal-600" size={20} />
                                    Patient Registry & Direct Rx Gateway
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">Search the registered hospital directory to find patients and start prescribing directly</p>
                            </div>
                        </div>

                        {/* Live Search Input */}
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            {ptSearching && <RefreshCw className="absolute right-4 top-3.5 text-teal-600 animate-spin" size={18} />}
                            <input
                                value={ptQuery}
                                onChange={e => handlePatientSearch(e.target.value)}
                                placeholder="Search active patient database by name, ID code, or mobile number..."
                                className="w-full pl-12 pr-10 py-3.5 text-xs border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50/50 focus:bg-white transition-all font-semibold"
                            />
                        </div>

                        {/* Direct Prescribing Grid */}
                        <div>
                            {ptQuery.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {ptResults.length > 0 ? ptResults.map(p => (
                                        <div key={p.patientId} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50/10 transition-all flex flex-col justify-between gap-3.5 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                                                    <User size={18} className="text-teal-700" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-gray-900 truncate">{p.firstName} {p.lastName}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{p.patientCode} · Age {p.age} · {p.gender} · {p.phoneNumber}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                                                <button onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}
                                                    className="py-2 text-[10px] font-black text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors">
                                                    EMR Profile
                                                </button>
                                                <button onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}`)}
                                                    className="py-2 text-[10px] font-black text-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-sm active:scale-95">
                                                    Prescribe
                                                </button>
                                                <button onClick={() => {
                                                    setRxPatient(p);
                                                    setRxPatientQuery('');
                                                    setRxOpen(true);
                                                    setPtQuery('');
                                                    setPtResults([]);
                                                    toast.success(`Loaded Rx Workspace for ${p.firstName}`);
                                                }}
                                                    className="py-2 text-[10px] font-black text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                                                    Quick Rx
                                                </button>
                                            </div>
                                        </div>
                                    )) : !ptSearching && (
                                        <div className="col-span-2 py-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <AlertTriangle className="mx-auto mb-2 text-amber-500" size={24} />
                                            <p className="text-xs font-bold text-gray-500">No records match your search query.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pl-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📋 Quick Access Active Patients</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {queue.slice(0, 4).map(p => {
                                            const isConsulting = p.appointmentStatus === 'InConsultation';
                                            return (
                                                <div key={p.patientId} className="p-4 bg-slate-50/60 border border-slate-150 rounded-2xl hover:border-teal-400 hover:bg-teal-50/5 transition-all flex flex-col justify-between gap-3.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                                                <User size={18} className="text-indigo-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-gray-900">{patientName(p)}</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">{p.patientCode || `#${p.patientId}`} · Age {p.age || '30'} · {p.gender || 'M'}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2.5 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wide ${
                                                            isConsulting ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {isConsulting ? 'Active' : 'Scheduled'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gray-100/60 pt-3">
                                                        <button onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}
                                                            className="py-2 text-[10px] font-bold text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors">
                                                            Profile
                                                        </button>
                                                        <button onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(patientName(p))}`)}
                                                            className="py-2 text-[10px] font-black text-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-sm active:scale-95">
                                                            Prescribe
                                                        </button>
                                                        <button onClick={() => {
                                                            const matched = {
                                                                patientId: p.patientId,
                                                                firstName: p.firstName,
                                                                lastName: p.lastName,
                                                                patientCode: p.patientCode,
                                                                age: p.age,
                                                                gender: p.gender,
                                                                phoneNumber: p.contactNumber,
                                                                height: p.height,
                                                                weight: p.weight
                                                            };
                                                            setRxPatient(matched);
                                                            setRxPatientQuery('');
                                                            setRxOpen(true);
                                                            setRxDiagnosis('');
                                                            setRxNotes('');
                                                            setRxMedicines([{ name: '', dosage: '', frequency: 'Once daily', duration: '5 days', instructions: '' }]);
                                                            toast.success(`Loaded direct prescription pad for ${patientName(p)}`);
                                                        }}
                                                            className="py-2 text-[10px] font-bold text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                                                            Quick Rx
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {queue.length === 0 && (
                                            <div className="col-span-2 py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-slate-50/20">
                                                <Stethoscope className="mx-auto mb-2 text-gray-300 animate-pulse" size={28} />
                                                <p className="text-xs font-semibold text-gray-500">No active clinic patients scheduled for rounds today.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── QUICK PRESCRIPTION PAD WITH AI CLINICAL SCRIBE ── */}
                    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-150 overflow-hidden">
                        <div className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors border-b border-gray-150">
                            <button onClick={() => setRxOpen(v => !v)} className="flex items-center gap-2 flex-1 text-left">
                                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                                    <Send size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold text-gray-900">Quick Prescription Pad</p>
                                    <p className="text-[10px] text-gray-400">Write prescriptions directly and securely bypassing complex steps</p>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => setScribeOpen(v => !v)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all shadow-sm active:scale-95 animate-pulse"
                            >
                                <Mic size={12} className="text-purple-600" />
                                AI Clinical Scribe
                            </button>
                        </div>

                        {/* AI Scribe Drawer Popover */}
                        <AnimatePresence>
                            {scribeOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-purple-950/5 border-b border-purple-200 p-5 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mic className="text-purple-700 animate-bounce" size={16} />
                                            <p className="text-xs font-black text-purple-900">AI Medical Command Center</p>
                                        </div>
                                        <button onClick={() => setScribeOpen(false)} className="text-purple-400 hover:text-purple-700">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-purple-700 leading-relaxed">
                                        Select a quick clinical speech transcript below to simulate voice-to-text dictation. The AI Scribe will automatically parse the diagnosis, write clinical notes, and fill the medication grid.
                                    </p>
                                    {scribeRecording ? (
                                        <div className="flex items-center justify-center gap-3 py-4 text-xs font-bold text-purple-700">
                                            <RefreshCw className="animate-spin text-purple-600" size={16} />
                                            AI Scribe transcribing consult notes...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => runScribeTemplate("cardio")}
                                                className="p-2.5 bg-white border border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 text-left transition-all"
                                            >
                                                <p className="text-[10px] font-black text-purple-900">🫀 Cardiology Report</p>
                                                <p className="text-[8px] text-purple-600 mt-1 truncate">Adult hypertension review</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => runScribeTemplate("cough")}
                                                className="p-2.5 bg-white border border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 text-left transition-all"
                                            >
                                                <p className="text-[10px] font-black text-purple-900">👶 Allergic Cough</p>
                                                <p className="text-[8px] text-purple-600 mt-1 truncate">Pediatric asthma/cough</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => runScribeTemplate("gastric")}
                                                className="p-2.5 bg-white border border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 text-left transition-all"
                                            >
                                                <p className="text-[10px] font-black text-purple-900">🧪 Gastritis Report</p>
                                                <p className="text-[8px] text-purple-600 mt-1 truncate">GERD & empty stomach notes</p>
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {rxOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }} className="overflow-hidden border-t border-gray-100 px-6 pb-6 pt-4 space-y-4">

                                    {/* Step 1: Select Patient */}
                                    <div>
                                        <label className="text-[11px] font-black text-gray-500 uppercase mb-1.5 block">Step 1 — Select Patient</label>
                                        {rxPatient ? (
                                            <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                                                <div>
                                                    <p className="text-xs font-black text-indigo-900">{rxPatient.firstName} {rxPatient.lastName}</p>
                                                    <p className="text-[10px] text-indigo-600">{rxPatient.patientCode || `#${rxPatient.patientId}`} · Age {rxPatient.age} · {rxPatient.gender} · {rxPatient.weight ? `${rxPatient.weight}kg` : ''}</p>
                                                </div>
                                                <button onClick={() => { setRxPatient(null); setRxPatientQuery(''); }}
                                                    className="p-1 text-indigo-400 hover:text-red-500 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                                <input
                                                    value={rxPatientQuery}
                                                    onChange={e => handleRxPatientSearch(e.target.value)}
                                                    placeholder="Search registered patients by name or ID..."
                                                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 focus:bg-white transition-all"
                                                />
                                                {rxPatientResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-0.5 max-h-48 overflow-y-auto">
                                                        {rxPatientResults.map(p => (
                                                            <button key={p.patientId}
                                                                onClick={() => {
                                                                    setRxPatient({
                                                                        patientId: p.patientId,
                                                                        firstName: p.firstName,
                                                                        lastName: p.lastName,
                                                                        patientCode: p.patientCode,
                                                                        age: p.age,
                                                                        gender: p.gender,
                                                                        phoneNumber: p.phoneNumber,
                                                                        height: p.height,
                                                                        weight: p.weight
                                                                    });
                                                                    setRxPatientQuery('');
                                                                    setRxPatientResults([]);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-colors text-left border-b border-gray-50 last:border-0">
                                                                <User size={14} className="text-gray-400 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-800">{p.firstName} {p.lastName}</p>
                                                                    <p className="text-[10px] text-gray-400">{p.patientCode} · {p.gender} · Age {p.age} · Phone: {p.phoneNumber} · Weight: {p.weight ? `${p.weight}kg` : '—'}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 2: Diagnosis */}
                                    <div>
                                        <label className="text-[11px] font-black text-gray-500 uppercase mb-1.5 block">Step 2 — Diagnosis</label>
                                        <input
                                            value={rxDiagnosis}
                                            onChange={e => setRxDiagnosis(e.target.value)}
                                            placeholder="e.g. Acute Viral URI, Essential Hypertension, GERD..."
                                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 focus:bg-white transition-all"
                                        />
                                    </div>

                                    {/* Quick templates */}
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">Quick load template:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_TEMPLATES.map(tpl => (
                                                <button key={tpl.id} onClick={() => loadRxTemplate(tpl)}
                                                    className="px-2.5 py-1 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                                                    {tpl.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Step 3: Medicines */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[11px] font-black text-gray-500 uppercase">Step 3 — Medicines</label>
                                            <button onClick={() => setRxMedicines(p => [...p, { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }])}
                                                className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold hover:bg-purple-100 transition-colors">
                                                <Plus size={11} /> Add Drug
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {rxMedicines.map((med, idx) => (
                                                <div key={idx} className="flex gap-2 items-start p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        <AutocompleteInput
                                                            value={med.name}
                                                            onChange={v => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, name: v } : m))}
                                                            placeholder="Drug name"
                                                            className="w-full px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                                        />
                                                        <input value={med.dosage}
                                                            onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, dosage: e.target.value } : m))}
                                                            placeholder="Dosage (e.g. 500mg)"
                                                            className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white" />
                                                        <select value={med.frequency}
                                                            onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, frequency: e.target.value } : m))}
                                                            className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white">
                                                            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                                                        </select>
                                                        <select value={med.duration}
                                                            onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, duration: e.target.value } : m))}
                                                            className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white">
                                                            {DURATIONS.map(d => <option key={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    {rxMedicines.length > 1 && (
                                                        <button onClick={() => setRxMedicines(p => p.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes & Submit */}
                                    <div className="flex gap-3 items-start">
                                        <input value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                                            placeholder="Clinical notes & warnings..."
                                            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 focus:bg-white transition-all" />
                                        <button onClick={handleRxSubmit} disabled={rxSubmitting}
                                            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 disabled:opacity-60 transition-all shadow-md shadow-purple-200 active:scale-95">
                                            {rxSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                            {rxSubmitting ? 'Sending...' : 'Send Prescription'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

                {/* ══ RIGHT (1/3): GFR/Renal rounds calculators, Upgraded Shift Reminders ══ */}
                <div className="space-y-6">

                    {/* ── UPGRADED SHIFT REMINDERS (With Priority, Glows) ── */}
                    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-150 p-5 border border-indigo-50/50">
                        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                            <UserCheck className="text-teal-600" size={17} />
                            My Shift Reminders
                        </h3>

                        {/* Tasks List */}
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {reminders.map(rem => (
                                <div key={rem.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                    rem.checked ? 'opacity-50 bg-gray-50 border-gray-100' : 
                                    rem.priority === "HIGH" ? 'bg-rose-500/5 border-rose-200 shadow-sm shadow-rose-500/5' : 
                                    'bg-white border-gray-200 shadow-sm'
                                }`}>
                                    <input type="checkbox" checked={rem.checked}
                                        onChange={() => {
                                            const updated = reminders.map(r => r.id === rem.id ? { ...r, checked: !r.checked } : r);
                                            setReminders(updated);
                                            if (!rem.checked) {
                                                toast.success(`Completed: ${rem.text}`);
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" />
                                    
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[11px] font-semibold flex-1 leading-snug block truncate ${rem.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                            {rem.text}
                                        </span>
                                        {!rem.checked && (
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${
                                                rem.priority === "HIGH" ? "bg-red-100 text-red-700 animate-pulse" :
                                                rem.priority === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                                                "bg-green-100 text-green-700"
                                            }`}>
                                                {rem.priority} Priority
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => {
                                        setReminders(p => p.filter(r => r.id !== rem.id));
                                        toast.warning("Task removed from shift notes.");
                                    }}
                                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {reminders.length === 0 && <p className="text-[11px] text-gray-400 text-center py-4">No reminders yet.</p>}
                        </div>

                        {/* Add Task Form with Priority Dropdown */}
                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!newReminder.trim()) return;
                            setReminders(p => [...p, { id: Date.now(), text: newReminder.trim(), checked: false, priority: reminderPriority }]);
                            toast.success(`Reminder added: ${newReminder.trim()}`);
                            setNewReminder('');
                            setReminderPriority("MEDIUM");
                        }}
                            className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                            
                            <div className="flex gap-2">
                                <input value={newReminder} onChange={e => setNewReminder(e.target.value)}
                                    placeholder="Add clinical shift task..."
                                    className="flex-1 px-3 py-2 text-[11px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 focus:bg-white transition-all font-semibold" />
                                
                                <button type="submit" className="w-9 h-9 flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white active:scale-95 transition-all flex-shrink-0 shadow-sm shadow-teal-100">
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Set Priority:</span>
                                <div className="flex gap-1.5 flex-1">
                                    {["HIGH", "MEDIUM", "LOW"].map((prio) => (
                                        <button
                                            key={prio}
                                            type="button"
                                            onClick={() => setReminderPriority(prio)}
                                            className={`flex-1 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider text-center transition-all ${
                                                reminderPriority === prio 
                                                    ? prio === "HIGH" ? "bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/20"
                                                    : prio === "MEDIUM" ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/20"
                                                    : "bg-green-500 border-green-500 text-white shadow-sm shadow-green-500/20"
                                                    : "bg-slate-50 border-gray-200 text-gray-500"
                                            }`}
                                        >
                                            {prio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* ── AUTOMATED ROUNDS CLINICAL CALCULATOR SUITE ── */}
                    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-150 p-5 border border-indigo-50">
                        <div className="border-b border-gray-100 pb-3 mb-4">
                            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                <Calculator className="text-teal-600 animate-pulse" size={17} />
                                Rounds Calculator Suite
                            </h3>
                            
                            {/* Automated Sync Indicator Badge */}
                            {rxPatient ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/50 mt-2 tracking-wider animate-pulse">
                                    <VerifiedIcon size={10} className="text-emerald-600" />
                                    Sync: {rxPatient.firstName} ({rxPatient.weight ? `${rxPatient.weight}kg` : 'Vitals'} loaded)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase text-gray-400 bg-gray-50 border border-gray-100 mt-2 tracking-wider">
                                    <Info size={10} />
                                    Manual Mode (Select patient to sync)
                                </span>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
                            {["bmi", "gfr", "ped"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setCalcTab(t)}
                                    className={`flex-1 text-[10px] font-black uppercase py-2 rounded-lg transition-all ${
                                        calcTab === t ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
                                    }`}
                                >
                                    {t === "bmi" ? "BMI / BSA" : t === "gfr" ? "GFR / Renal" : "Pediatric"}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {calcTab === "bmi" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-gray-600">
                                        <span>Height: {height} cm</span>
                                        <span>Weight: {weight} kg</span>
                                    </div>
                                    <input type="range" min="40" max="220" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                                    <input type="range" min="3" max="150" value={weight} onChange={e => setWeight(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">BMI Score</p>
                                        <p className="text-base font-black text-gray-800 mt-1">{bmiVal}</p>
                                        <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 ${getBmiCategory(bmiVal).color}`}>
                                            {getBmiCategory(bmiVal).label}
                                        </span>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-center flex flex-col justify-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Body Surf Area</p>
                                        <p className="text-base font-black text-gray-800 mt-1">{bsaVal} m²</p>
                                        <span className="text-[8px] text-gray-400 font-bold mt-1.5">Mosteller Formula</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {calcTab === "gfr" && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                                    <div>
                                        <label className="block mb-1">Age (Years)</label>
                                        <input type="number" value={gfrAge} onChange={e => setGfrAge(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block mb-1">Weight (Kg)</label>
                                        <input type="number" value={gfrWeight} onChange={e => setGfrWeight(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                                    <div>
                                        <label className="block mb-1">Creatinine (mg/dL)</label>
                                        <input type="number" step="0.1" value={gfrCreatinine} onChange={e => setGfrCreatinine(parseFloat(e.target.value) || 0.1)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block mb-1">Gender</label>
                                        <select value={gfrGender} onChange={e => setGfrGender(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold">
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border border-gray-100 rounded-2xl mt-2 text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Creatinine Clearance (GFR)</p>
                                    <p className="text-lg font-black text-indigo-900 mt-1">{gfrVal} mL/min</p>
                                    <div className={`mt-2 p-2 rounded-lg border text-[9px] font-bold leading-normal text-left ${getGfrLevel(gfrVal).color}`}>
                                        <p className="font-extrabold text-[10px] mb-0.5">{getGfrLevel(gfrVal).label}</p>
                                        <p className="opacity-95">{getGfrLevel(gfrVal).dose}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {calcTab === "ped" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-gray-600">
                                        <span>Child Weight: {pedWeight} kg</span>
                                    </div>
                                    <input type="range" min="3" max="45" value={pedWeight} onChange={e => setPedWeight(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                                    <button type="button" onClick={() => setPedDrug("para")} className={`py-1.5 rounded-lg border text-center ${pedDrug === "para" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-200"}`}>
                                        Paracetamol
                                    </button>
                                    <button type="button" onClick={() => setPedDrug("ibu")} className={`py-1.5 rounded-lg border text-center ${pedDrug === "ibu" ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 border-gray-200"}`}>
                                        Ibuprofen
                                    </button>
                                </div>
                                <div className="p-3 bg-slate-50 border border-gray-150 rounded-2xl">
                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Calculated Liquid Suspension Dose</p>
                                    <div className="flex items-baseline justify-between border-b border-gray-100 pb-2 mb-2">
                                        <span className="text-[10px] font-extrabold text-indigo-900">{pedDose.drugName}</span>
                                        <span className="text-base font-black text-indigo-900">{pedDose.ml} mL <span className="text-[10px] font-bold text-gray-400">({pedDose.mg} mg)</span></span>
                                    </div>
                                    <p className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-1.5 leading-normal flex items-start gap-1">
                                        <Info size={10} className="flex-shrink-0 mt-0.5" />
                                        <span><strong>Dose Regimen:</strong> {pedDose.freq}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>



        </div>
    );
};

export default DoctorDashboard;
