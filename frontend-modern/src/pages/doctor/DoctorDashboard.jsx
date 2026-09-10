import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, AlertTriangle, User, Pill, Plus, X, ChevronRight,
    Stethoscope, RefreshCw, UserCheck, Calculator, Mic, Info,
    ShieldCheck as VerifiedIcon, Send, Loader2, Maximize2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
    'Amiodarone', 'Clarithromycin', 'Simvastatin', 'Antacid', 'Lithium', 'Methotrexate',
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

const DUTY_OPTIONS = [
    { value: 'Available', dot: 'bg-success' },
    { value: 'On Rounds', dot: 'bg-warning' },
    { value: 'In Surgery', dot: 'bg-destructive' },
    { value: 'Away', dot: 'bg-muted-foreground' },
];

const PRIORITY_BADGE = { HIGH: 'destructive', MEDIUM: 'warning', LOW: 'success' };

/** Free-text drug entry with suggestions — a full combobox is overkill for a field this
 *  narrow, and doctors are typing fast enough that suggestions must not steal focus. */
const AutocompleteInput = ({ value, onChange, placeholder }) => {
    const [open, setOpen] = useState(false);
    const suggestions = value.length > 1
        ? MEDICINE_DB.filter(m => m.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
        : [];

    return (
        <div className="relative">
            <Input
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder={placeholder}
                autoComplete="off"
                className="h-8 text-xs"
            />
            {open && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md scrollbar-thin">
                    {suggestions.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={() => { onChange(s); setOpen(false); }}
                            className="w-full px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const bmiCategory = (val) => {
    if (val < 18.5) return { label: 'Underweight', tone: 'info' };
    if (val < 25) return { label: 'Normal weight', tone: 'success' };
    if (val < 30) return { label: 'Overweight', tone: 'warning' };
    return { label: 'Obese', tone: 'destructive' };
};

const gfrLevel = (val) => {
    if (val >= 90) return { label: 'Normal / G1', tone: 'success', dose: 'Standard dosing. No adjustment needed.' };
    if (val >= 60) return { label: 'Mild impairment / G2', tone: 'success', dose: 'Standard dosing. Monitor creatinine.' };
    if (val >= 30) return { label: 'Moderate impairment / G3', tone: 'warning', dose: 'Caution: consider 25–50% dose reduction for renal-cleared medications.' };
    return { label: 'Severe impairment / G4-G5', tone: 'destructive', dose: 'Renal dosing alert: reduce dose by 50–75% or switch to alternative clearance drug.' };
};

const TONE_TEXT = { success: 'text-success', warning: 'text-warning', destructive: 'text-destructive', info: 'text-info' };
const TONE_BG = { success: 'bg-success-subtle border-success/20', warning: 'bg-warning-subtle border-warning/20', destructive: 'bg-destructive-subtle border-destructive/20', info: 'bg-info-subtle border-info/20' };

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const userName = localStorage.getItem('userName') || 'Doctor';

    const [dashData, setDashData] = useState({ appointmentsToday: 0, activeAdmissions: 0, pendingLabResults: 0, followUpsDueToday: 0, emergencyCount: 0, followUps: [] });
    const [queue, setQueue] = useState([]);
    const [dutyStatus, setDutyStatus] = useState('Available');

    const [ptQuery, setPtQuery] = useState('');
    const [ptResults, setPtResults] = useState([]);
    const [ptSearching, setPtSearching] = useState(false);
    const searchDebounce = useRef(null);

    const [scribeOpen, setScribeOpen] = useState(false);
    const [scribeRecording, setScribeRecording] = useState(false);

    const [calcTab, setCalcTab] = useState('bmi');
    const [height, setHeight] = useState(170);
    const [weight, setWeight] = useState(70);
    const [gfrAge, setGfrAge] = useState(60);
    const [gfrWeight, setGfrWeight] = useState(70);
    const [gfrCreatinine, setGfrCreatinine] = useState(1.1);
    const [gfrGender, setGfrGender] = useState('Male');
    const [pedWeight, setPedWeight] = useState(12);
    const [pedDrug, setPedDrug] = useState('para');

    const [rxOpen, setRxOpen] = useState(false);
    const [rxPatientQuery, setRxPatientQuery] = useState('');
    const [rxPatientResults, setRxPatientResults] = useState([]);
    const [rxPatient, setRxPatient] = useState(null);
    const [rxDiagnosis, setRxDiagnosis] = useState('');
    const [rxMedicines, setRxMedicines] = useState([{ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }]);
    const [rxNotes, setRxNotes] = useState('');
    const [rxSubmitting, setRxSubmitting] = useState(false);
    const rxDebounce = useRef(null);

    const [reminders, setReminders] = useState(() => {
        try {
            const s = localStorage.getItem(`dr_notes_${userName}`);
            return s ? JSON.parse(s) : [
                { id: 1, text: 'Perform clinical round reviews in ICU ward', checked: false, priority: 'HIGH' },
                { id: 2, text: 'Sign off pending lab reports for Aarav Patel', checked: false, priority: 'MEDIUM' },
                { id: 3, text: 'Finalize prescription for inpatient discharge', checked: false, priority: 'LOW' },
            ];
        } catch { return []; }
    });
    const [newReminder, setNewReminder] = useState('');
    const [reminderPriority, setReminderPriority] = useState('MEDIUM');

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
        }
    };

    useEffect(() => { loadWorkspace(); }, []);
    useEffect(() => { localStorage.setItem(`dr_notes_${userName}`, JSON.stringify(reminders)); }, [reminders, userName]);

    // Auto-populate the calculators from whichever patient is loaded into Quick Rx, so
    // rounds do not require re-keying height/weight/age that is already on file.
    useEffect(() => {
        if (!rxPatient) return;
        const pHeight = rxPatient.height || 170;
        const pWeight = rxPatient.weight || 70;
        let pAge = 35;
        if (rxPatient.age) {
            const clean = String(rxPatient.age).toUpperCase().replace('Y', '').trim();
            pAge = parseInt(clean) || 35;
        }
        const pGender = rxPatient.gender === 'Female' ? 'Female' : 'Male';

        setHeight(pHeight); setWeight(pWeight);
        setGfrAge(pAge); setGfrWeight(pWeight); setGfrGender(pGender);
        setPedWeight(pWeight);
        toast.info(`Rounds calculators synced for ${rxPatient.firstName} (${pGender}, ${pAge}y, ${pWeight}kg)`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rxPatient]);

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

    const openQuickRx = (p) => {
        setRxPatient(p);
        setRxPatientQuery('');
        setRxOpen(true);
        setRxDiagnosis('');
        setRxNotes('');
        setRxMedicines([{ name: '', dosage: '', frequency: 'Once daily', duration: '5 days', instructions: '' }]);
        toast.success(`Loaded direct prescription pad for ${p.firstName}`);
    };

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
                // Same status the full composer writes. This pad used to save 'active', so an
                // identical prescription carried a different status depending only on which
                // screen the doctor happened to use, splitting the record for anything
                // downstream that reads it.
                status: 'finalized',
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

    /**
     * Hand the half-written pad over to the full composer. The draft travels through
     * sessionStorage rather than the URL because medicines are a list, and it is cleared
     * on read so a later visit doesn't resurrect someone else's consultation.
     */
    const continueInFullRx = () => {
        if (!rxPatient) { toast.error('Please select a patient.'); return; }
        sessionStorage.setItem('rx-draft', JSON.stringify({
            patientId: rxPatient.patientId,
            diagnosis: rxDiagnosis,
            clinicalNotes: rxNotes,
            medicines: rxMedicines.filter(m => m.name.trim()),
        }));
        navigate(`/dashboard/doctor/prescriptions?patientId=${rxPatient.patientId}`
            + `&patientName=${encodeURIComponent(`${rxPatient.firstName} ${rxPatient.lastName}`)}&draft=1`);
    };

    const loadRxTemplate = (tpl) => {
        setRxDiagnosis(tpl.name);
        setRxMedicines(tpl.medicines.map(m => ({ ...m })));
        toast.success(`Loaded "${tpl.name}" template`);
    };

    /** Simulated voice-to-text: fills the pad from a canned transcript rather than a real
     *  ASR round trip, so this is clearly a demo aid, not a claim of live dictation. */
    const runScribeTemplate = (type) => {
        setScribeRecording(true);
        toast.info('AI Scribe listening... compiling speech transcript');

        setTimeout(() => {
            setScribeRecording(false);
            setScribeOpen(false);
            if (type === 'cardio') {
                setRxDiagnosis('Essential Hypertension');
                setRxNotes('62yo male presented for standard cardiology review. Blood pressure recorded at 154/96 mmHg, pulse 88 bpm. Reports mild morning headaches. Kidney/renal panel is clear.');
                setRxMedicines([
                    { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing', instructions: 'In the morning, check BP twice weekly' },
                    { name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily', duration: '30 days', instructions: 'At bedtime, lipid control' },
                ]);
                toast.success('AI Scribe populated: Cardiology Consultation Report');
            } else if (type === 'cough') {
                setRxDiagnosis('Pediatric Allergic Bronchitis');
                setRxNotes('5yo female with recurring dry allergic cough, worse during nocturnal hours. SpO2 98% on room air, mild bilateral wheeze. Chest clear of infection.');
                setRxMedicines([
                    { name: 'Montelukast', dosage: '5mg', frequency: 'Once daily', duration: '10 days', instructions: 'Chewable tablet at bedtime' },
                    { name: 'Cetirizine', dosage: '5mg/5mL Syrup', frequency: 'Once daily', duration: '5 days', instructions: '2.5mL at bedtime for cough' },
                ]);
                toast.success('AI Scribe populated: Pediatric Allergic Cough Report');
            } else if (type === 'gastric') {
                setRxDiagnosis('Acid Peptic Disease / GERD');
                setRxNotes('34yo female complains of burning epigastric discomfort, exacerbated by empty stomach and spicy foods. Relieved transiently by antacids.');
                setRxMedicines([
                    { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily', duration: '14 days', instructions: 'Before breakfast, empty stomach' },
                    { name: 'Domperidone', dosage: '10mg', frequency: 'Three times daily', duration: '7 days', instructions: '15 minutes before meals' },
                ]);
                toast.success('AI Scribe populated: Adult Gastritis Report');
            }
        }, 1500);
    };

    const bmiVal = Number((weight / Math.pow(height / 100, 2)).toFixed(1));
    const bsaVal = Math.sqrt((height * weight) / 3600).toFixed(2);

    const runGfrCalc = () => {
        let crCl = ((140 - gfrAge) * gfrWeight) / (72 * gfrCreatinine);
        if (gfrGender === 'Female') crCl *= 0.85;
        return Number(crCl.toFixed(1));
    };
    const gfrVal = runGfrCalc();

    const getPedDose = () => {
        if (pedDrug === 'para') {
            const doseMg = pedWeight * 15;
            return { mg: doseMg.toFixed(0), ml: ((doseMg * 5) / 120).toFixed(1), freq: 'Every 4–6 hours as needed (max 4 times daily)', drugName: 'Paracetamol suspension (120mg/5mL)' };
        }
        const doseMg = pedWeight * 10;
        return { mg: doseMg.toFixed(0), ml: ((doseMg * 5) / 100).toFixed(1), freq: 'Every 6–8 hours as needed (max 3 times daily)', drugName: 'Ibuprofen suspension (100mg/5mL)' };
    };
    const pedDose = getPedDose();

    const inConsultation = queue.filter(a => a.appointmentStatus === 'InConsultation');
    const waiting = queue.filter(a => ['initiated', 'booked', 'CheckedIn'].includes(a.appointmentStatus));
    const patientName = (a) => `${a.firstName || ''} ${a.lastName || ''}`.trim() || `Patient #${a.patientId}`;

    /** One patient card, reused for both search-result and quick-access lists so the
     *  three actions (profile, prescribe, quick Rx) behave identically everywhere. */
    const PatientActionCard = ({ p, badge }) => (
        <Card className="flex flex-col gap-3 p-3.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>{initials(patientName(p))}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{patientName(p)}</p>
                        <p className="tabular truncate text-xs text-muted-foreground">
                            {p.patientCode || `#${p.patientId}`} · {p.gender || '—'} · Age {p.age || '—'}
                        </p>
                    </div>
                </div>
                {badge}
            </div>
            <div className="grid grid-cols-3 gap-1.5 border-t pt-3">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}>
                    Profile
                </Button>
                <Button size="sm" className="text-xs" onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(patientName(p))}`)}>
                    Prescribe
                </Button>
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => openQuickRx(p)}>
                    Quick Rx
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* ── Greeting & duty status ── */}
            <Card className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                            <Badge variant="secondary" className="gap-1.5 font-normal">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live workspace
                            </Badge>
                            <Select value={dutyStatus} onValueChange={(v) => { setDutyStatus(v); toast.success(`Clinical status updated to: ${v}`); }}>
                                <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full border-dashed px-2.5 text-xs font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DUTY_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>
                                            <span className="flex items-center gap-2">
                                                <span className={cn('h-1.5 w-1.5 rounded-full', o.dot)} /> {o.value}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {userName}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { label: 'Waiting', value: waiting.length },
                            { label: 'In consult', value: inConsultation.length },
                            { label: 'Follow-ups', value: dashData.followUpsDueToday },
                        ].map(s => (
                            <div key={s.label} className="min-w-[76px] rounded-lg border bg-muted/40 px-3 py-2.5 text-center">
                                <p className="tabular text-xl font-semibold">{s.value}</p>
                                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* ══ Left/centre: patient gateway + quick Rx ══ */}
                <div className="space-y-6 xl:col-span-2">
                    <Card className="p-5 sm:p-6">
                        <div className="mb-4 border-b pb-4">
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                Patient registry &amp; direct Rx gateway
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Search the hospital directory to open a chart or start prescribing directly.
                            </p>
                        </div>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            {ptSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                            <Input
                                value={ptQuery}
                                onChange={e => handlePatientSearch(e.target.value)}
                                placeholder="Search by name, patient code or mobile…"
                                className="h-11 pl-9"
                            />
                        </div>

                        <div className="mt-4">
                            {ptQuery.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {ptResults.length > 0 ? ptResults.map(p => <PatientActionCard key={p.patientId} p={p} />)
                                        : !ptSearching && (
                                            <div className="col-span-2 rounded-lg border border-dashed p-8 text-center">
                                                <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-warning" />
                                                <p className="text-sm text-muted-foreground">No records match your search.</p>
                                            </div>
                                        )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Quick access — active patients
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {queue.slice(0, 4).map(p => (
                                            <PatientActionCard
                                                key={p.patientId}
                                                p={p}
                                                badge={
                                                    <Badge variant={p.appointmentStatus === 'InConsultation' ? 'success' : 'secondary'} className="shrink-0">
                                                        {p.appointmentStatus === 'InConsultation' ? 'Active' : 'Scheduled'}
                                                    </Badge>
                                                }
                                            />
                                        ))}
                                        {queue.length === 0 && (
                                            <div className="col-span-2 rounded-lg border border-dashed p-10 text-center">
                                                <Stethoscope className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">No active clinic patients scheduled for rounds today.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── Quick Rx pad ── */}
                    <Card className="overflow-hidden p-0">
                        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                            <button onClick={() => setRxOpen(v => !v)} className="flex flex-1 items-center gap-3 text-left">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Send className="h-4 w-4" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold">Quick prescription pad</span>
                                    <span className="block text-xs text-muted-foreground">Write and send a prescription without leaving this page</span>
                                </span>
                                <ChevronRight className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform', rxOpen && 'rotate-90')} />
                            </button>
                            <Button variant="outline" size="sm" onClick={() => setScribeOpen(v => !v)} className="shrink-0 gap-1.5">
                                <Mic className="h-3.5 w-3.5" /> AI scribe
                            </Button>
                        </div>

                        <AnimatePresence initial={false}>
                            {scribeOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b bg-muted/30">
                                    <div className="space-y-3 p-5">
                                        <div className="flex items-center justify-between">
                                            <p className="flex items-center gap-2 text-xs font-semibold">
                                                <Mic className="h-3.5 w-3.5" /> AI clinical scribe (demo)
                                            </p>
                                            <button onClick={() => setScribeOpen(false)} className="text-muted-foreground hover:text-foreground">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            Choose a sample transcript to simulate voice dictation — it fills the diagnosis, notes and medicine grid below.
                                        </p>
                                        {scribeRecording ? (
                                            <div className="flex items-center justify-center gap-2.5 py-4 text-xs font-medium text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Transcribing consult notes…
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                {[
                                                    ['cardio', 'Cardiology report', 'Adult hypertension review'],
                                                    ['cough', 'Allergic cough', 'Pediatric asthma/cough'],
                                                    ['gastric', 'Gastritis report', 'GERD & empty stomach'],
                                                ].map(([key, title, sub]) => (
                                                    <button key={key} type="button" onClick={() => runScribeTemplate(key)}
                                                            className="rounded-md border bg-card p-2.5 text-left transition-colors hover:border-foreground/30 hover:bg-accent">
                                                        <p className="text-xs font-semibold">{title}</p>
                                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence initial={false}>
                            {rxOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                    <div className="space-y-4 p-5">
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 1 — Patient</p>
                                            {rxPatient ? (
                                                <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                                                    <div>
                                                        <p className="text-sm font-medium">{rxPatient.firstName} {rxPatient.lastName}</p>
                                                        <p className="tabular text-xs text-muted-foreground">
                                                            {rxPatient.patientCode || `#${rxPatient.patientId}`} · Age {rxPatient.age} · {rxPatient.gender}{rxPatient.weight ? ` · ${rxPatient.weight}kg` : ''}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => { setRxPatient(null); setRxPatientQuery(''); }} className="p-1 text-muted-foreground hover:text-destructive">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                    <Input value={rxPatientQuery} onChange={e => handleRxPatientSearch(e.target.value)}
                                                           placeholder="Search registered patients…" className="h-9 pl-8 text-xs" />
                                                    {rxPatientResults.length > 0 && (
                                                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md scrollbar-thin">
                                                            {rxPatientResults.map(p => (
                                                                <button key={p.patientId}
                                                                        onClick={() => {
                                                                            setRxPatient({
                                                                                patientId: p.patientId, firstName: p.firstName, lastName: p.lastName,
                                                                                patientCode: p.patientCode, age: p.age, gender: p.gender,
                                                                                phoneNumber: p.phoneNumber, height: p.height, weight: p.weight,
                                                                            });
                                                                            setRxPatientQuery(''); setRxPatientResults([]);
                                                                        }}
                                                                        className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-accent">
                                                                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-xs font-medium">{p.firstName} {p.lastName}</p>
                                                                        <p className="tabular truncate text-[11px] text-muted-foreground">
                                                                            {p.patientCode} · {p.gender} · Age {p.age} · {p.phoneNumber}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 2 — Diagnosis</p>
                                            <Input value={rxDiagnosis} onChange={e => setRxDiagnosis(e.target.value)}
                                                   placeholder="e.g. Acute Viral URI, Essential Hypertension, GERD…" className="h-9 text-xs" />
                                        </div>

                                        <div>
                                            <p className="mb-1.5 text-xs text-muted-foreground">Quick load template:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {QUICK_TEMPLATES.map(tpl => (
                                                    <button key={tpl.id} onClick={() => loadRxTemplate(tpl)}
                                                            className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-accent">
                                                        {tpl.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 3 — Medicines</p>
                                                <button onClick={() => setRxMedicines(p => [...p, { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }])}
                                                        className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-accent">
                                                    <Plus className="h-3 w-3" /> Add drug
                                                </button>
                                            </div>
                                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                                                {rxMedicines.map((med, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5">
                                                        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
                                                            <AutocompleteInput value={med.name} placeholder="Drug name"
                                                                onChange={v => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, name: v } : m))} />
                                                            <Input value={med.dosage} placeholder="Dosage" className="h-8 text-xs"
                                                                onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, dosage: e.target.value } : m))} />
                                                            <select value={med.frequency}
                                                                onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, frequency: e.target.value } : m))}
                                                                className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                                                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                                                            </select>
                                                            <select value={med.duration}
                                                                onChange={e => setRxMedicines(p => p.map((m, i) => i === idx ? { ...m, duration: e.target.value } : m))}
                                                                className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                                                {DURATIONS.map(d => <option key={d}>{d}</option>)}
                                                            </select>
                                                        </div>
                                                        {rxMedicines.length > 1 && (
                                                            <button onClick={() => setRxMedicines(p => p.filter((_, i) => i !== idx))}
                                                                    className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive">
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <Input value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                                                   placeholder="Clinical notes & warnings…" className="h-9 flex-1 text-xs" />
                                            {/* This pad covers a simple OPD case. The moment one needs allergy
                                                warnings, tests, advice or a follow-up date, the doctor had to
                                                abandon it and retype everything in the full composer. */}
                                            <Button variant="outline" onClick={continueInFullRx} disabled={rxSubmitting} className="shrink-0">
                                                <Maximize2 /> Full prescription
                                            </Button>
                                            <Button onClick={handleRxSubmit} disabled={rxSubmitting} className="shrink-0">
                                                {rxSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                                                {rxSubmitting ? 'Sending…' : 'Send prescription'}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>

                {/* ══ Right: reminders + calculators ══ */}
                <div className="space-y-6">
                    <Card className="p-5">
                        <h3 className="mb-4 flex items-center gap-2 border-b pb-3 text-sm font-semibold">
                            <UserCheck className="h-4 w-4 text-muted-foreground" /> My shift reminders
                        </h3>

                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                            {reminders.map(rem => (
                                <div key={rem.id} className={cn(
                                    'flex items-center gap-2.5 rounded-md border p-2.5',
                                    rem.checked && 'opacity-50',
                                )}>
                                    <Checkbox
                                        checked={rem.checked}
                                        onCheckedChange={() => {
                                            setReminders(reminders.map(r => r.id === rem.id ? { ...r, checked: !r.checked } : r));
                                            if (!rem.checked) toast.success(`Completed: ${rem.text}`);
                                        }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('truncate text-[13px] font-medium', rem.checked && 'text-muted-foreground line-through')}>
                                            {rem.text}
                                        </p>
                                        {!rem.checked && (
                                            <Badge variant={PRIORITY_BADGE[rem.priority]} className="mt-1 text-[9px]">
                                                {rem.priority}
                                            </Badge>
                                        )}
                                    </div>
                                    <button onClick={() => { setReminders(p => p.filter(r => r.id !== rem.id)); toast.warning('Task removed from shift notes.'); }}
                                            className="shrink-0 p-1 text-muted-foreground hover:text-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {reminders.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No reminders yet.</p>}
                        </div>

                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!newReminder.trim()) return;
                            setReminders(p => [...p, { id: Date.now(), text: newReminder.trim(), checked: false, priority: reminderPriority }]);
                            toast.success(`Reminder added: ${newReminder.trim()}`);
                            setNewReminder(''); setReminderPriority('MEDIUM');
                        }} className="mt-4 space-y-2 border-t pt-4">
                            <div className="flex gap-2">
                                <Input value={newReminder} onChange={e => setNewReminder(e.target.value)}
                                       placeholder="Add clinical shift task…" className="h-9 flex-1 text-xs" />
                                <Button type="submit" size="icon" className="h-9 w-9 shrink-0"><Plus className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority:</span>
                                <div className="flex flex-1 gap-1.5">
                                    {['HIGH', 'MEDIUM', 'LOW'].map(prio => (
                                        <button key={prio} type="button" onClick={() => setReminderPriority(prio)}
                                                className={cn(
                                                    'flex-1 rounded-md border py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors',
                                                    reminderPriority === prio
                                                        ? prio === 'HIGH' ? 'border-destructive bg-destructive text-destructive-foreground'
                                                        : prio === 'MEDIUM' ? 'border-warning bg-warning text-warning-foreground'
                                                        : 'border-success bg-success text-success-foreground'
                                                        : 'border-input bg-secondary text-muted-foreground',
                                                )}>
                                            {prio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </Card>

                    <Card className="p-5">
                        <div className="mb-4 border-b pb-3">
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Calculator className="h-4 w-4 text-muted-foreground" /> Rounds calculator suite
                            </h3>
                            {rxPatient ? (
                                <Badge variant="success" className="mt-2 gap-1.5">
                                    <VerifiedIcon className="h-3 w-3" /> Synced: {rxPatient.firstName} {rxPatient.weight ? `(${rxPatient.weight}kg)` : ''}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="mt-2 gap-1.5 text-muted-foreground">
                                    <Info className="h-3 w-3" /> Manual mode — select a patient to sync
                                </Badge>
                            )}
                        </div>

                        <Tabs value={calcTab} onValueChange={setCalcTab}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="bmi">BMI / BSA</TabsTrigger>
                                <TabsTrigger value="gfr">GFR / Renal</TabsTrigger>
                                <TabsTrigger value="ped">Pediatric</TabsTrigger>
                            </TabsList>

                            <TabsContent value="bmi" className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                        <span>Height: {height} cm</span>
                                        <span>Weight: {weight} kg</span>
                                    </div>
                                    <input type="range" min="40" max="220" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full accent-foreground" />
                                    <input type="range" min="3" max="150" value={weight} onChange={e => setWeight(parseInt(e.target.value))} className="w-full accent-foreground" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 border-t pt-3">
                                    <div className="rounded-md border bg-muted/30 p-2.5 text-center">
                                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">BMI</p>
                                        <p className="tabular mt-1 text-base font-semibold">{bmiVal}</p>
                                        <Badge variant={bmiCategory(bmiVal).tone} className="mt-1.5">{bmiCategory(bmiVal).label}</Badge>
                                    </div>
                                    <div className="flex flex-col justify-center rounded-md border bg-muted/30 p-2.5 text-center">
                                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Body surface area</p>
                                        <p className="tabular mt-1 text-base font-semibold">{bsaVal} m²</p>
                                        <p className="mt-1.5 text-[10px] text-muted-foreground">Mosteller formula</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="gfr" className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Age (years)</label>
                                        <Input type="number" value={gfrAge} onChange={e => setGfrAge(parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Weight (kg)</label>
                                        <Input type="number" value={gfrWeight} onChange={e => setGfrWeight(parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Creatinine (mg/dL)</label>
                                        <Input type="number" step="0.1" value={gfrCreatinine} onChange={e => setGfrCreatinine(parseFloat(e.target.value) || 0.1)} className="h-8 text-xs" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Gender</label>
                                        <select value={gfrGender} onChange={e => setGfrGender(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3 text-center">
                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Creatinine clearance (GFR)</p>
                                    <p className="tabular mt-1 text-lg font-semibold">{gfrVal} mL/min</p>
                                    <div className={cn('mt-2 rounded-md border p-2 text-left text-[11px] leading-normal', TONE_BG[gfrLevel(gfrVal).tone])}>
                                        <p className={cn('mb-0.5 text-xs font-semibold', TONE_TEXT[gfrLevel(gfrVal).tone])}>{gfrLevel(gfrVal).label}</p>
                                        <p className="text-muted-foreground">{gfrLevel(gfrVal).dose}</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="ped" className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Child weight: {pedWeight} kg</p>
                                    <input type="range" min="3" max="45" value={pedWeight} onChange={e => setPedWeight(parseInt(e.target.value))} className="w-full accent-foreground" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setPedDrug('para')}
                                            className={cn('rounded-md border py-1.5 text-xs font-medium', pedDrug === 'para' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                                        Paracetamol
                                    </button>
                                    <button type="button" onClick={() => setPedDrug('ibu')}
                                            className={cn('rounded-md border py-1.5 text-xs font-medium', pedDrug === 'ibu' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                                        Ibuprofen
                                    </button>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Calculated liquid suspension dose</p>
                                    <div className="flex items-baseline justify-between border-b pb-2">
                                        <span className="text-xs font-medium">{pedDose.drugName}</span>
                                        <span className="tabular text-base font-semibold">{pedDose.ml} mL <span className="text-xs font-normal text-muted-foreground">({pedDose.mg} mg)</span></span>
                                    </div>
                                    <p className="mt-2 flex items-start gap-1.5 rounded-md border border-success/20 bg-success-subtle p-1.5 text-[11px] leading-normal text-success">
                                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span><strong>Dose regimen:</strong> {pedDose.freq}</span>
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
