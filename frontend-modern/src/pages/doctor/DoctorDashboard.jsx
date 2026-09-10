import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Search, AlertTriangle, Pill, Stethoscope, Calculator, Info,
    Loader2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DUTY_OPTIONS = [
    { value: 'Available', dot: 'bg-success' },
    { value: 'On Rounds', dot: 'bg-warning' },
    { value: 'In Surgery', dot: 'bg-destructive' },
    { value: 'Away', dot: 'bg-muted-foreground' },
];

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

    const [calcTab, setCalcTab] = useState('bmi');
    const [height, setHeight] = useState(170);
    const [weight, setWeight] = useState(70);
    const [gfrAge, setGfrAge] = useState(60);
    const [gfrWeight, setGfrWeight] = useState(70);
    const [gfrCreatinine, setGfrCreatinine] = useState(1.1);
    const [gfrGender, setGfrGender] = useState('Male');
    const [pedWeight, setPedWeight] = useState(12);
    const [pedDrug, setPedDrug] = useState('para');

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
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}>
                    Profile
                </Button>
                <Button size="sm" className="text-xs" onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(patientName(p))}`)}>
                    <Pill className="mr-1.5 h-3.5 w-3.5" /> Prescribe
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
                                Patient directory &amp; clinical gateway
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Search patients to view their medical profile or write prescriptions.
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

                                    </div>

                {/* ══ Right: clinical calculators ══ */}
                <div className="space-y-6">
                    

                    <Card className="p-5">
                        <div className="mb-4 border-b pb-3">
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Calculator className="h-4 w-4 text-muted-foreground" /> Rounds calculator suite
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Bedside calculators for BMI / BSA, GFR renal dosing, and pediatric suspension.
                            </p>
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
