import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    User, AlertTriangle, Shield, FileText, Pill, Clock, ArrowLeft,
    Heart, Activity, MapPin, Phone, Mail, ChevronDown, ChevronUp,
    Search, Stethoscope, Loader2,
} from 'lucide-react';
import ExportButton from '../../components/ExportButton';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const bmiTone = (bmiNum) => {
    if (bmiNum < 18.5) return 'warning';
    if (bmiNum >= 30) return 'destructive';
    if (bmiNum >= 25) return 'warning';
    return 'success';
};

const RECORD_ICON = { lab_result: Activity, diagnosis: Stethoscope, procedure: Stethoscope, default: FileText };
const RECORD_TONE = { lab_result: 'text-warning bg-warning-subtle', diagnosis: 'text-destructive bg-destructive-subtle', procedure: 'text-info bg-info-subtle', default: 'text-info bg-info-subtle' };

const DoctorPatientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [expandedRecord, setExpandedRecord] = useState(null);

    useEffect(() => { if (id) fetchProfile(id); }, [id]);

    const fetchProfile = async (patientId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/DoctorPortal/Patient/${patientId}`);
            if (res.data.Results) setProfile(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch patient', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(searchQuery)}`);
            if (res.data.Results) setSearchResults(res.data.Results);
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setSearching(false);
        }
    };

    if (!id) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Patient lookup</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Search for a patient to view their clinical profile.</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by name, phone or patient code…" className="pl-9"
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={searching}>
                        {searching ? <Loader2 className="animate-spin" /> : <Search />}
                        {searching ? 'Searching…' : 'Search'}
                    </Button>
                </div>

                {searchResults.length > 0 && (
                    <div className="space-y-2">
                        {searchResults.map(p => (
                            <motion.button
                                key={p.patientId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}
                            >
                                <Card className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/40">
                                    <Avatar className="h-11 w-11"><AvatarFallback>{initials(`${p.firstName} ${p.lastName}`)}</AvatarFallback></Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold">{p.firstName} {p.lastName}</p>
                                        <p className="tabular text-xs text-muted-foreground">{p.patientCode || `#${p.patientId}`} · {p.gender} · {p.age} · {p.phoneNumber}</p>
                                    </div>
                                </Card>
                            </motion.button>
                        ))}
                    </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                    <Card><EmptyState icon={User} title="No patients found" description="Try a different search term." /></Card>
                )}
            </div>
        );
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!profile) {
        return <Card><EmptyState icon={User} title="Patient not found" /></Card>;
    }

    const { patient, allergies = [], riskFlags = [], medicalHistory = [], prescriptions = [], followUps = [], activeAdmission } = profile;
    const bmi = patient.height && patient.weight ? (patient.weight / ((patient.height / 100) ** 2)).toFixed(1) : null;

    return (
        <div className="space-y-5">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground">
                <ArrowLeft /> Back
            </Button>

            <Card className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <Avatar className="h-16 w-16 shrink-0 text-lg sm:h-20 sm:w-20 sm:text-2xl">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                                    {patient.firstName} {patient.middleName || ''} {patient.lastName}
                                </h1>
                                <p className="tabular mt-0.5 text-sm text-muted-foreground">{patient.patientCode || `Patient #${patient.patientId}`}</p>
                            </div>
                            {/* The whole record in one file — what a patient asks for when they
                                transfer care, and what a doctor prints for a referral. */}
                            <ExportButton url={`/api/Export/Patient/${patient.patientId}/History`} label="Download full history" />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {patient.gender} · {patient.age}</span>
                            {patient.bloodGroup && <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-destructive" /> {patient.bloodGroup}</span>}
                            {patient.height && <span className="tabular flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> {patient.height} cm</span>}
                            {patient.weight && <span className="tabular flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> {patient.weight} kg</span>}
                            {bmi && <Badge variant={bmiTone(parseFloat(bmi))}>BMI {bmi}</Badge>}
                            {patient.phoneNumber && <span className="tabular flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {patient.phoneNumber}</span>}
                            {patient.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>}
                            {patient.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {patient.address}</span>}
                        </div>
                    </div>

                    {activeAdmission && (
                        <div className="shrink-0 rounded-lg border border-success/30 bg-success-subtle px-4 py-2.5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-success">Currently admitted</p>
                            <p className="mt-0.5 text-sm text-success/90">
                                Bed #{activeAdmission.bedId} · since {new Date(activeAdmission.admissionDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Allergies and risk flags are genuine clinical alerts, so — unlike the rest of
                this monochrome page — they earn colour: a missed allergy is a harm event. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className={cn('p-5', allergies.length > 0 && 'border-destructive/30 bg-destructive-subtle/40')}>
                    <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className={cn('h-[18px] w-[18px]', allergies.length > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                        <h3 className={cn('text-sm font-semibold uppercase tracking-wider', allergies.length > 0 ? 'text-destructive' : 'text-muted-foreground')}>Allergies</h3>
                    </div>
                    {allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {allergies.map((a, i) => <Badge key={i} variant="destructive">{a}</Badge>)}
                        </div>
                    ) : <p className="text-sm text-muted-foreground">No known allergies recorded</p>}
                </Card>

                <Card className={cn('p-5', riskFlags.length > 0 && 'border-warning/30 bg-warning-subtle/40')}>
                    <div className="mb-2 flex items-center gap-2">
                        <Shield className={cn('h-[18px] w-[18px]', riskFlags.length > 0 ? 'text-warning' : 'text-muted-foreground')} />
                        <h3 className={cn('text-sm font-semibold uppercase tracking-wider', riskFlags.length > 0 ? 'text-warning' : 'text-muted-foreground')}>Risk flags</h3>
                    </div>
                    {riskFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {riskFlags.map((f, i) => <Badge key={i} variant="warning">{f}</Badge>)}
                        </div>
                    ) : <p className="text-sm text-muted-foreground">No risk flags</p>}
                </Card>
            </div>

            <Tabs defaultValue="history">
                <TabsList>
                    <TabsTrigger value="history" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Medical history</TabsTrigger>
                    <TabsTrigger value="prescriptions" className="gap-1.5"><Pill className="h-3.5 w-3.5" /> Prescriptions</TabsTrigger>
                    <TabsTrigger value="followups" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Follow-ups</TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-2.5">
                    {medicalHistory.length === 0 ? (
                        <Card><EmptyState icon={FileText} title="No medical records yet" /></Card>
                    ) : medicalHistory.map((record, i) => {
                        const Icon = RECORD_ICON[record.recordType] || RECORD_ICON.default;
                        const tone = RECORD_TONE[record.recordType] || RECORD_TONE.default;
                        const expanded = expandedRecord === record.recordId;
                        return (
                            <Card
                                key={record.recordId || i}
                                onClick={() => setExpandedRecord(expanded ? null : record.recordId)}
                                className="cursor-pointer p-4 transition-colors hover:bg-accent/30"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone)}>
                                            <Icon className="h-[18px] w-[18px]" />
                                        </span>
                                        <div>
                                            <p className="font-medium">{record.title || record.recordType}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(record.createdOn).toLocaleDateString()} · {record.recordType?.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {record.labStatus && <StatusPill status={record.labStatus} />}
                                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </div>
                                {expanded && (
                                    <div className="mt-3 space-y-1.5 border-t pt-3 text-sm text-muted-foreground">
                                        {record.description && <p><strong className="text-foreground">Notes:</strong> {record.description}</p>}
                                        {record.findings && <p><strong className="text-foreground">Findings:</strong> {record.findings}</p>}
                                        {record.labTestName && <p><strong className="text-foreground">Test:</strong> {record.labTestName}</p>}
                                        {record.labResult && <p><strong className="text-foreground">Result:</strong> {record.labResult}</p>}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="prescriptions" className="space-y-2.5">
                    {prescriptions.length === 0 ? (
                        <Card><EmptyState icon={Pill} title="No prescriptions recorded" /></Card>
                    ) : prescriptions.map((rx, i) => (
                        <Card key={rx.prescriptionId || i} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium">{rx.diagnosis || 'Prescription'}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(rx.createdOn).toLocaleDateString()}</p>
                                </div>
                                <StatusPill status={rx.status} />
                            </div>
                            {rx.clinicalNotes && <p className="mt-2 text-sm text-muted-foreground">{rx.clinicalNotes}</p>}
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="followups" className="space-y-2.5">
                    {followUps.length === 0 ? (
                        <Card><EmptyState icon={Clock} title="No follow-ups scheduled" /></Card>
                    ) : followUps.map((f, i) => (
                        <Card key={f.followUpId || i} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium">{f.reason || 'Follow-up visit'}</p>
                                    <p className="tabular text-xs text-muted-foreground">{f.followUpDate} · {f.priority} priority</p>
                                </div>
                                <StatusPill status={f.status} />
                            </div>
                            {f.careInstructions && <p className="mt-2 text-sm text-muted-foreground">{f.careInstructions}</p>}
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DoctorPatientProfile;
