import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Phone, AlertTriangle, CheckCircle, Clock,
    User, Search, RefreshCw, Zap, Stethoscope, Pill, FileText, UserCheck, X,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const statusConfig = {
    initiated: { label: 'Scheduled', tone: 'info', next: 'CheckedIn', nextLabel: 'Check in', nextIcon: UserCheck },
    booked: { label: 'Booked', tone: 'info', next: 'CheckedIn', nextLabel: 'Check in', nextIcon: UserCheck },
    CheckedIn: { label: 'Checked in', tone: 'warning', next: 'InConsultation', nextLabel: 'Start consult', nextIcon: Play },
    InConsultation: { label: 'In consultation', tone: 'success', next: 'Completed', nextLabel: 'Complete', nextIcon: CheckCircle },
    Completed: { label: 'Completed', tone: 'neutral', next: null },
    Cancelled: { label: 'Cancelled', tone: 'critical', next: null },
};

const TONE_PILL = {
    info: 'bg-info-subtle text-info',
    warning: 'bg-warning-subtle text-warning',
    success: 'bg-success-subtle text-success',
    neutral: 'bg-muted text-muted-foreground',
    critical: 'bg-destructive-subtle text-destructive',
};
const TONE_DOT = { info: 'bg-info', warning: 'bg-warning', success: 'bg-success', neutral: 'bg-muted-foreground', critical: 'bg-destructive' };
const NEXT_BUTTON = {
    InConsultation: 'bg-success text-success-foreground hover:bg-success/90',
    Completed: 'bg-info text-info-foreground hover:bg-info/90',
    CheckedIn: 'bg-warning-subtle text-warning hover:bg-warning-subtle/70',
};

const FILTERS = [
    { key: 'active', label: 'Active' },
    { key: 'all', label: 'All' },
    { key: 'initiated', label: 'Scheduled' },
    { key: 'CheckedIn', label: 'Checked in' },
    { key: 'InConsultation', label: 'Consulting' },
    { key: 'Completed', label: 'Done' },
];

const DoctorQueue = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null);
    const [newAlert, setNewAlert] = useState(null);
    const knownIdsRef = useRef(new Set());
    const isFirstFetch = useRef(true);

    const fetchQueue = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/Queue');
            const results = res.data.Results || [];

            if (isFirstFetch.current) {
                results.forEach(a => knownIdsRef.current.add(a.appointmentId));
                isFirstFetch.current = false;
            } else {
                const newAppts = results.filter(a => !knownIdsRef.current.has(a.appointmentId));
                if (newAppts.length > 0) {
                    newAppts.forEach(a => knownIdsRef.current.add(a.appointmentId));
                    const first = newAppts[0];
                    const name = `${first.firstName || ''} ${first.lastName || ''}`.trim() || `Patient #${first.patientId}`;
                    window.dispatchEvent(new CustomEvent('new-appointment', {
                        detail: { count: newAppts.length, patientName: name, appointmentType: first.appointmentType || 'New Visit', time: first.appointmentDate },
                    }));
                    setNewAlert({ name, count: newAppts.length, type: first.appointmentType || 'New Visit' });
                    setTimeout(() => setNewAlert(null), 8000);
                }
            }
            setQueue(results);
        } catch (e) {
            console.error('Failed to load queue', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        // Poll every 10s for near-real-time updates — the queue is the one screen a
        // doctor leaves open all shift, so it has to notice a new booking on its own.
        const interval = setInterval(() => fetchQueue(true), 10000);
        return () => clearInterval(interval);
    }, [fetchQueue]);

    const updateStatus = async (appointmentId, newStatus, patientName) => {
        setUpdating(appointmentId);
        try {
            await axios.put(`/api/DoctorPortal/Queue/${appointmentId}/Status`, { status: newStatus });
            setQueue(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, appointmentStatus: newStatus } : a));
            toast.success(`${patientName} → ${statusConfig[newStatus]?.label || newStatus}`);
        } catch (e) {
            console.error('Failed to update status', e);
            toast.error('Failed to update status');
        } finally {
            setUpdating(null);
        }
    };

    const filteredQueue = queue.filter(a => {
        if (filter === 'active' && (a.appointmentStatus === 'Completed' || a.appointmentStatus === 'Cancelled')) return false;
        if (filter !== 'all' && filter !== 'active' && a.appointmentStatus !== filter) return false;
        if (search) {
            const s = search.toLowerCase();
            const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            return name.includes(s) || (a.patientCode || '').toLowerCase().includes(s) || String(a.patientId).includes(s);
        }
        return true;
    });

    // Emergency first, then by clinical stage, then by appointment time.
    const statusOrder = { InConsultation: 0, CheckedIn: 1, initiated: 2, booked: 2, Completed: 3, Cancelled: 4 };
    const sorted = [...filteredQueue].sort((a, b) => {
        const aE = a.appointmentType?.toLowerCase().includes('emergency') ? -100 : 0;
        const bE = b.appointmentType?.toLowerCase().includes('emergency') ? -100 : 0;
        const aO = (statusOrder[a.appointmentStatus] ?? 3) + aE;
        const bO = (statusOrder[b.appointmentStatus] ?? 3) + bE;
        if (aO !== bO) return aO - bO;
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });

    const counts = {
        total: queue.length,
        waiting: queue.filter(a => ['initiated', 'booked', 'CheckedIn'].includes(a.appointmentStatus)).length,
        inConsult: queue.filter(a => a.appointmentStatus === 'InConsultation').length,
        completed: queue.filter(a => a.appointmentStatus === 'Completed').length,
    };

    return (
        <div className="space-y-5">
            <AnimatePresence>
                {newAlert && (
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                        <Card className="flex items-center gap-3 border-success/30 bg-success-subtle p-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success text-success-foreground">
                                <Stethoscope className="h-[18px] w-[18px]" />
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-success">New patient in queue</p>
                                <p className="text-xs text-success/80">
                                    {newAlert.count > 1 ? `${newAlert.count} new appointments` : newAlert.name} · {newAlert.type}
                                </p>
                            </div>
                            <button onClick={() => setNewAlert(null)} className="shrink-0 rounded-md p-1.5 text-success hover:bg-success/10">
                                <X className="h-4 w-4" />
                            </button>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <PageHeader
                title="Patient queue"
                icon={Clock}
                description={
                    <>
                        Today's appointments · <span className="tabular font-medium text-foreground">{counts.waiting}</span> waiting,{' '}
                        <span className="tabular font-medium text-success">{counts.inConsult}</span> in consultation,{' '}
                        <span className="tabular font-medium text-foreground">{counts.completed}</span> completed
                    </>
                }
                actions={
                    <Button variant="outline" onClick={() => fetchQueue()} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: 'Total', value: counts.total },
                    { label: 'Waiting', value: counts.waiting },
                    { label: 'Active', value: counts.inConsult },
                    { label: 'Done', value: counts.completed },
                ].map(s => (
                    <Card key={s.label} className="p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                        <p className="tabular mt-0.5 text-2xl font-semibold">{s.value}</p>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient name or ID…" className="pl-9" />
                </div>
                <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg border p-0.5 scrollbar-hide">
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
                                className={cn(
                                    'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                    filter === f.key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : sorted.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={User}
                        title="No patients in queue"
                        description="Patients will appear here when appointments are booked for today."
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {sorted.map((appt, index) => {
                            const isEmergency = appt.appointmentType?.toLowerCase().includes('emergency');
                            const isActive = appt.appointmentStatus === 'InConsultation';
                            const sc = statusConfig[appt.appointmentStatus] || statusConfig.initiated;
                            const NextIcon = sc.nextIcon;
                            const patientName = `${appt.firstName || ''} ${appt.lastName || ''}`.trim() || `Patient #${appt.patientId}`;

                            return (
                                <motion.div key={appt.appointmentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -40 }} transition={{ delay: index * 0.02 }}>
                                    <Card className={cn(
                                        'relative overflow-hidden p-4',
                                        isEmergency ? 'border-destructive/40 bg-destructive-subtle/40' : isActive && 'border-success/40 bg-success-subtle/30',
                                    )}>
                                        {(isEmergency || isActive) && (
                                            <div className={cn('absolute inset-x-0 top-0 h-0.5', isEmergency ? 'bg-destructive' : 'bg-success')} />
                                        )}

                                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                            <div className={cn(
                                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-semibold',
                                                isEmergency ? 'bg-destructive text-destructive-foreground' : isActive ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                                            )}>
                                                {isEmergency ? <Zap className="h-5 w-5" /> : isActive ? <Stethoscope className="h-[18px] w-[18px]" /> : index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-semibold">{patientName}</h4>
                                                    {isEmergency && (
                                                        <span className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive-foreground">
                                                            <AlertTriangle className="h-2.5 w-2.5" /> Emergency
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                    <span className="tabular">{appt.patientCode || `#${appt.patientId}`}</span>
                                                    {appt.gender && <><span>·</span><span>{appt.gender}</span></>}
                                                    {appt.age && <><span>·</span><span>Age {appt.age}</span></>}
                                                    {appt.contactNumber && <><span>·</span><span className="tabular flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {appt.contactNumber}</span></>}
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', TONE_PILL[sc.tone])}>
                                                        <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[sc.tone])} /> {sc.label}
                                                    </span>
                                                    <span className="tabular flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {appt.appointmentType && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{appt.appointmentType}</span>
                                                    )}
                                                </div>
                                                {appt.reason && (
                                                    <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                                                        <strong className="text-foreground">Reason:</strong> {appt.reason}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap">
                                                {sc.next && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateStatus(appt.appointmentId, sc.next, patientName)}
                                                        disabled={updating === appt.appointmentId}
                                                        className={NEXT_BUTTON[sc.next]}
                                                    >
                                                        {updating === appt.appointmentId ? <RefreshCw className="animate-spin" /> : <NextIcon />}
                                                        {sc.nextLabel}
                                                    </Button>
                                                )}
                                                {(appt.appointmentStatus === 'InConsultation' || appt.appointmentStatus === 'Completed') && (
                                                    <Button variant="secondary" size="sm" onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${appt.patientId}&patientName=${encodeURIComponent(patientName)}`)}>
                                                        <Pill /> Prescribe
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/doctor/patient/${appt.patientId}`)} className="text-muted-foreground">
                                                    <FileText /> Details
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default DoctorQueue;
