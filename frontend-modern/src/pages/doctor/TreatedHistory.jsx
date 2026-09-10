import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Search, Calendar, RefreshCw, Pill, FileText, Clock,
    ChevronLeft, ChevronRight, History,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const QUICK_RANGES = [
    { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { start: d, end: d }; } },
    { label: 'Yesterday', getValue: () => { const y = new Date(); y.setDate(y.getDate() - 1); const d = y.toISOString().split('T')[0]; return { start: d, end: d }; } },
    { label: 'Last 7 days', getValue: () => { const s = new Date(); s.setDate(s.getDate() - 7); return { start: s.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }; } },
    { label: 'Clear filters', getValue: () => ({ start: '', end: '' }), isClear: true },
];

const TreatedHistory = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('Completed');

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;
    const searchDebounce = useRef(null);

    const fetchHistory = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.append('searchQuery', searchQuery);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (status) params.append('status', status);

            const res = await axios.get(`/api/DoctorPortal/TreatedHistory?${params.toString()}`);
            setHistory(res.data.Results || []);
            setCurrentPage(1);
        } catch (e) {
            console.error('Failed to load treated history', e);
            toast.error('Could not fetch history data.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, startDate, endDate, status, toast]);

    useEffect(() => {
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => fetchHistory(), searchQuery ? 300 : 0);
        return () => clearTimeout(searchDebounce.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, startDate, endDate, status]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const currentRecords = history.slice(indexOfLastRecord - recordsPerPage, indexOfLastRecord);
    const totalPages = Math.ceil(history.length / recordsPerPage);

    const patientName = (a) => `${a.firstName || ''} ${a.lastName || ''}`.trim() || `Patient #${a.patientId}`;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Consultation log"
                description="Every consultation recorded under your profile — filter by patient, date or status."
                icon={History}
                actions={
                    <Button variant="outline" onClick={() => fetchHistory()} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                }
            />

            <Card className="space-y-4 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter records</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Patient name, code, contact…" className="pl-9" />
                    </div>
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-9" />
                    </div>
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-9" />
                    </div>
                    <select
                        value={status} onChange={(e) => setStatus(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="all">All statuses</option>
                        <option value="Completed">Completed</option>
                        <option value="InConsultation">In consultation</option>
                        <option value="CheckedIn">Checked in</option>
                        <option value="initiated">Scheduled</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick ranges:</span>
                    {QUICK_RANGES.map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            onClick={() => {
                                const val = btn.getValue();
                                setStartDate(val.start);
                                setEndDate(val.end);
                                if (btn.isClear) { setSearchQuery(''); setStatus('Completed'); }
                            }}
                            className={
                                btn.isClear
                                    ? 'rounded-md border border-destructive/30 bg-destructive-subtle px-2.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive-subtle/70'
                                    : 'rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-accent'
                            }
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </Card>

            <Card className="overflow-hidden">
                {loading ? (
                    <div className="space-y-3 p-4">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState
                        icon={History}
                        title="No consultation records found"
                        description="Try widening your date range or clearing the status filter."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Date &amp; time</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead className="hidden md:table-cell">Demographics</TableHead>
                                        <TableHead className="hidden lg:table-cell">Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden xl:table-cell">Reason</TableHead>
                                        <TableHead className="pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentRecords.map((appt) => {
                                        const name = patientName(appt);
                                        const dateObj = new Date(appt.appointmentDate);
                                        return (
                                            <TableRow key={appt.appointmentId}>
                                                <TableCell className="pl-6">
                                                    <p className="font-medium">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    <p className="tabular mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-2.5 w-2.5" /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback></Avatar>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{name}</p>
                                                            <p className="tabular truncate text-xs text-muted-foreground">{appt.patientCode || `#${appt.patientId}`}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden text-muted-foreground md:table-cell">
                                                    <p>{appt.age ? `Age ${appt.age}` : 'Age —'} · {appt.gender || '—'}</p>
                                                    <p className="tabular text-xs">{appt.contactNumber || 'No contact'}</p>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <Badge variant={appt.appointmentType?.toLowerCase().includes('emergency') ? 'destructive' : 'secondary'}>
                                                        {appt.appointmentType || 'Regular'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell><StatusPill status={appt.appointmentStatus} /></TableCell>
                                                <TableCell className="hidden max-w-xs truncate text-muted-foreground xl:table-cell">{appt.reason || '—'}</TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <Button size="sm" onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${appt.patientId}&patientName=${encodeURIComponent(name)}`)}>
                                                            <Pill /> Prescribe
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/doctor/patient/${appt.patientId}`)}>
                                                            <FileText /> Profile
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <span className="text-xs text-muted-foreground">
                                    Page <span className="tabular font-medium text-foreground">{currentPage}</span> of{' '}
                                    <span className="tabular font-medium text-foreground">{totalPages}</span>{' '}
                                    ({history.length} records)
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default TreatedHistory;
