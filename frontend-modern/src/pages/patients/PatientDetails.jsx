import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, MapPin, Calendar, Clock, CreditCard, Activity, ArrowLeft,
    Bed, ClipboardList, Pill, FileText, CheckCircle2, Loader2,
} from 'lucide-react';
import axios from 'axios';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const STATUS_BADGE = { Inpatient: 'info', Emergency: 'destructive', Discharged: 'secondary' };
const TIMELINE_TONE = {
    registration: 'text-info bg-info-subtle',
    appointment: 'text-info bg-info-subtle',
    admission: 'text-success bg-success-subtle',
    discharge: 'text-info bg-info-subtle',
    diagnosis: 'text-warning bg-warning-subtle',
    prescription: 'text-success bg-success-subtle',
    bill: 'text-warning bg-warning-subtle',
    payment: 'text-success bg-success-subtle',
};
const TIMELINE_BADGE = {
    registration: 'info', appointment: 'info', admission: 'success', discharge: 'info',
    diagnosis: 'warning', prescription: 'success', bill: 'warning', payment: 'success',
};

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

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const profileRes = await axios.get(`/api/DoctorPortal/Patient/${id}`);
            if (profileRes.data.Results) {
                const data = profileRes.data.Results;
                setPatient(data.patient);
                setMedicalHistory(data.medicalHistory || []);
                setPrescriptions(data.prescriptions || []);
            } else {
                const patRes = await axios.get(`/api/Patient/${id}`);
                if (patRes.data.Results) setPatient(patRes.data.Results);
            }

            const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
            const apptRes = await axios.get(`/api/Appointment/Appointments?FromDate=${twoYearsAgo.toISOString()}&ToDate=${nextYear.toISOString()}`);
            if (apptRes.data.Results) setAppointments(apptRes.data.Results.filter(a => String(a.patientId) === String(id)));

            const admRes = await axios.get('/api/Admission/AdmittedPatients?admissionStatus=admitted');
            if (admRes.data.Results) setAdmissions(admRes.data.Results.filter(a => String(a.patientId) === String(id)));

            try {
                const billingHistoryRes = await axios.get(`/api/Billing/PatientHistory/${id}`);
                if (billingHistoryRes.data.Results?.existingBills) setExistingBills(billingHistoryRes.data.Results.existingBills);
            } catch (billingErr) {
                console.error('Billing history currently offline', billingErr);
            }
        } catch (err) {
            console.error('Error fetching patient details:', err);
        } finally {
            setLoading(false);
        }
    };

    // Compiles registrations, consultations, scripts, billing checkouts, payments and wards chronologically.
    const generateTimeline = () => {
        const list = [];

        if (patient?.createdOn) {
            list.push({
                type: 'registration', date: new Date(patient.createdOn),
                title: 'Patient account registered',
                desc: `${patient.firstName} ${patient.lastName} was registered in the database.${patient.weight ? ` Weight: ${patient.weight} kg.` : ''}`,
                icon: User, badgeText: 'Registration',
            });
        }
        appointments.forEach(a => {
            list.push({
                type: 'appointment', date: new Date(a.appointmentDate),
                title: `Appointment ${a.appointmentStatus?.toUpperCase()}`,
                desc: `OPD consultation with Dr. ${a.performerName || `Staff #${a.performerId}`}.`,
                icon: Calendar, badgeText: 'OPD slot',
            });
        });
        admissions.forEach(adm => {
            list.push({
                type: 'admission', date: new Date(adm.admissionDate),
                title: 'Hospital ward admission',
                desc: `Admitted as inpatient to Bed #${adm.bedId} under clinical ward supervisor.`,
                icon: Bed, badgeText: 'IPD ward',
            });
            if (adm.dischargeDate) {
                list.push({
                    type: 'discharge', date: new Date(adm.dischargeDate),
                    title: 'Discharged from ward',
                    desc: `Discharged from Bed #${adm.bedId} following clinical recovery clearance.`,
                    icon: CheckCircle2, badgeText: 'IPD discharge',
                });
            }
        });
        medicalHistory.filter(r => r.recordType !== 'lab_result').forEach(h => {
            list.push({
                type: 'diagnosis', date: new Date(h.createdOn),
                title: h.title || 'Clinical consultation', desc: h.description || 'Clinical assessment conducted.',
                findings: h.findings, icon: ClipboardList, badgeText: 'Assessment',
            });
        });
        prescriptions.forEach(p => {
            let meds = [];
            try { meds = p.medicines ? JSON.parse(p.medicines) : []; } catch (e) { }
            list.push({
                type: 'prescription', date: new Date(p.createdOn), title: 'Prescription issued',
                desc: `Diagnosis: ${p.diagnosis || 'General assessment'}.`,
                medicines: meds, icon: Pill, badgeText: 'Clinical Rx',
            });
        });
        existingBills.forEach(b => {
            list.push({
                type: 'bill', date: new Date(b.createdAt), title: `Invoice generated (${b.billNumber})`,
                desc: `Subtotal: ₹${b.subtotal} · Grand total: ₹${b.grandTotal} (${b.paymentStatus}).`,
                icon: FileText, badgeText: 'Invoice',
            });
            if (b.paymentStatus === 'Paid' || b.paymentStatus === 'Partial') {
                list.push({
                    type: 'payment', date: new Date(b.createdAt), title: 'Transaction confirmed',
                    desc: `Cleared ₹${b.paidAmount || b.grandTotal} via ${b.paymentMode || 'Cash'}.`,
                    icon: CreditCard, badgeText: 'Payment',
                });
            }
        });

        return list.sort((x, y) => y.date.getTime() - x.date.getTime());
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!patient) return <Card><EmptyState title="Patient profile not found" /></Card>;

    const isActiveAdmission = admissions.length > 0;
    const timelineItems = generateTimeline();

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/patients')} className="-ml-2 w-fit text-muted-foreground">
                    <ArrowLeft /> Back to patients
                </Button>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(`/dashboard/patients/edit/${id}`)}>Edit profile</Button>
                    <Button variant="outline" onClick={() => navigate(`/dashboard/appointments/new?patientId=${id}`)}>Book appointment</Button>
                    {!isActiveAdmission && (
                        <Button onClick={() => navigate(`/dashboard/adt/admit?patientId=${id}`)}>Admit patient</Button>
                    )}
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="bg-primary p-6 text-primary-foreground sm:p-8">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                        <Avatar className="h-20 w-20 border border-white/20 bg-white/10 sm:h-24 sm:w-24">
                            {patient.photoPath && <AvatarImage src={patient.photoPath} alt="" />}
                            <AvatarFallback className="bg-transparent"><User className="h-10 w-10" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{patient.firstName} {patient.lastName}</h1>
                                <Badge variant={STATUS_BADGE[patient.status] || 'secondary'} className="uppercase">{patient.status || 'Outpatient'}</Badge>
                                {isActiveAdmission && patient.status !== 'Inpatient' && <Badge variant="success" className="uppercase">Currently admitted</Badge>}
                            </div>
                            <p className="tabular mt-1.5 text-sm text-primary-foreground/80">
                                #{patient.patientCode} · {patient.gender} · {patient.age} yrs{patient.weight ? ` · ${patient.weight} kg` : ''}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-primary-foreground/80">
                                <span className="tabular flex items-center gap-2"><Phone className="h-4 w-4" /> {patient.phoneNumber}</span>
                                {patient.address && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {patient.address}</span>}
                                {patient.email && <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {patient.email}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                    {[
                        { label: 'Total visits', value: appointments.length + admissions.length },
                        { label: 'Clinical records', value: medicalHistory.filter(r => r.recordType !== 'lab_result').length },
                        { label: 'Active prescriptions', value: prescriptions.length },
                    ].map(s => (
                        <div key={s.label} className="p-5 text-center">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                            <p className="tabular mt-1 text-2xl font-semibold">{s.value}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Tabs defaultValue="timeline">
                <TabsList>
                    <TabsTrigger value="timeline">Patient journey</TabsTrigger>
                    <TabsTrigger value="dossier">Clinical dossier</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                    <Card className="p-6">
                        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                            <Activity className="h-4 w-4 text-muted-foreground" /> Journey timeline
                        </h3>
                        <p className="mb-6 text-xs text-muted-foreground">Chronological trail of consultations, admissions, prescriptions and payments.</p>

                        {timelineItems.length > 0 ? (
                            <div className="relative ml-4 space-y-6 border-l pl-8">
                                {timelineItems.map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={idx} className="relative">
                                            <span className={cn('absolute -left-[46px] top-0.5 flex h-8 w-8 items-center justify-center rounded-lg ring-4 ring-background', TIMELINE_TONE[item.type])}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="max-w-[800px] space-y-2 rounded-lg border bg-muted/20 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold">{item.title}</h4>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">{item.date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                    </div>
                                                    <Badge variant={TIMELINE_BADGE[item.type] || 'secondary'}>{item.badgeText}</Badge>
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>

                                                {item.type === 'prescription' && item.medicines?.length > 0 && (
                                                    <div className="mt-3 space-y-2 rounded-md border bg-card p-3">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prescribed medications</p>
                                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                            {item.medicines.map((m, mIdx) => (
                                                                <div key={mIdx} className="rounded-md border bg-muted/20 p-2.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-semibold">{m.name}</span>
                                                                        <Badge variant="warning">{m.timing}</Badge>
                                                                    </div>
                                                                    <p className="mt-1 text-[11px] text-muted-foreground">Dosage: {m.dosage} · Freq: {m.frequency} · Days: {m.duration}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {item.type === 'diagnosis' && item.findings && (
                                                    <p className="rounded-md border border-info/25 bg-info-subtle px-2.5 py-1.5 text-[11px] text-info">
                                                        <strong>Findings:</strong> {item.findings}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState icon={Activity} title="No journey recorded for this patient" />
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="dossier" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card className="p-6">
                            <h3 className="mb-5 flex items-center gap-2 text-base font-semibold"><Calendar className="h-[18px] w-[18px] text-muted-foreground" /> Appointment history</h3>
                            <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                                {appointments.length > 0 ? appointments.map((appt) => (
                                    <div key={appt.appointmentId} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Clock className="h-4 w-4" /></span>
                                            <div>
                                                <p className="font-medium">Dr. {appt.performerName || `Staff #${appt.performerId}`}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(appt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </div>
                                        <StatusPill status={appt.appointmentStatus} />
                                    </div>
                                )) : <EmptyState icon={Calendar} title="No appointment records found" />}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="mb-5 flex items-center gap-2 text-base font-semibold"><Bed className="h-[18px] w-[18px] text-muted-foreground" /> Admission status</h3>
                            {isActiveAdmission ? (
                                <div className="space-y-4 rounded-lg border border-success/30 bg-success-subtle p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-success">Current location</p>
                                            <h4 className="mt-1 text-lg font-semibold">Bed #{admissions[0].bedId}</h4>
                                        </div>
                                        <span className="rounded-full bg-card p-2.5 text-success shadow-sm"><Activity className="h-5 w-5" /></span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-t border-success/20 pt-3">
                                        <div><p className="text-[10px] font-semibold uppercase text-success">Admitted on</p><p className="text-xs font-medium">{new Date(admissions[0].admissionDate).toLocaleDateString()}</p></div>
                                        <div><p className="text-[10px] font-semibold uppercase text-success">Status</p><p className="text-xs font-medium">Stable</p></div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Bed}
                                    title="Not currently admitted"
                                    action={<Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/adt/admit?patientId=${id}`)}>Process new admission</Button>}
                                />
                            )}
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card className="p-6">
                            <h3 className="mb-5 flex items-center gap-2 text-base font-semibold"><ClipboardList className="h-[18px] w-[18px] text-muted-foreground" /> Consultations &amp; diagnoses</h3>
                            <div className="max-h-[450px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                                {medicalHistory.filter(r => r.recordType !== 'lab_result').length > 0 ? (
                                    medicalHistory.filter(r => r.recordType !== 'lab_result').map((rec) => (
                                        <div key={rec.recordId} className="space-y-2 rounded-lg border bg-muted/20 p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-sm font-semibold">{rec.title || 'Clinical consultation'}</h4>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(rec.createdOn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                </div>
                                                <Badge variant="info" className="capitalize">{rec.recordType}</Badge>
                                            </div>
                                            {rec.description && <p className="rounded-md border bg-card p-2.5 text-xs leading-relaxed text-muted-foreground">{rec.description}</p>}
                                            {rec.findings && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Findings:</span> {rec.findings}</p>}
                                        </div>
                                    ))
                                ) : <EmptyState icon={ClipboardList} title="No consultations recorded" />}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="mb-5 flex items-center gap-2 text-base font-semibold"><Pill className="h-[18px] w-[18px] text-muted-foreground" /> Active prescriptions</h3>
                            <div className="max-h-[450px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                                {prescriptions.length > 0 ? prescriptions.map((rx) => {
                                    let meds = [];
                                    try { meds = rx.medicines ? JSON.parse(rx.medicines) : []; } catch (e) { }
                                    return (
                                        <div key={rx.prescriptionId} className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                            <div>
                                                <h4 className="text-sm font-semibold">Diagnosis: {rx.diagnosis || 'General assessment'}</h4>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(rx.createdOn).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                            {rx.clinicalNotes && <p className="rounded-md border bg-card p-2.5 text-xs italic text-muted-foreground">&ldquo;{rx.clinicalNotes}&rdquo;</p>}
                                            {meds.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prescribed medications</p>
                                                    {meds.map((m, idx) => (
                                                        <div key={idx} className="space-y-1 rounded-md border bg-card p-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold">{m.name}</span>
                                                                <Badge variant="warning">{m.timing || 'After food'}</Badge>
                                                            </div>
                                                            <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                                                                <span>Dosage: <strong className="text-foreground">{m.dosage}</strong></span>
                                                                <span>· Freq: {m.frequency}</span>
                                                                <span>· Duration: {m.duration} days</span>
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-[11px] text-muted-foreground">No drugs listed in prescription.</p>}
                                        </div>
                                    );
                                }) : <EmptyState icon={Pill} title="No active prescriptions" />}
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PatientDetails;
