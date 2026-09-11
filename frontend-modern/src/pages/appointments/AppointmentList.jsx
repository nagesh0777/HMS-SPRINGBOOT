import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, CalendarClock, Ban, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../components/Toast';
import ExportButton from '../../components/ExportButton';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/** `datetime-local` wants YYYY-MM-DDTHH:MM in *local* time, so toISOString is wrong here. */
const toLocalInput = (value) => {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reschedulingApt, setReschedulingApt] = useState(null);
    const [cancellingApt, setCancellingApt] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const doctorId = localStorage.getItem('doctorId');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            let url = `/api/Appointment/Appointments?FromDate=${today.toISOString()}&ToDate=${nextMonth.toISOString()}`;
            if (doctorId) url += `&performerId=${doctorId}`;

            const response = await axios.get(url);
            if (response.data.Results) setAppointments(response.data.Results);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    const confirmCancel = async () => {
        if (!cancellingApt) return;
        setSaving(true);
        try {
            const patientName = `${cancellingApt.firstName || ''} ${cancellingApt.lastName || ''}`.trim()
                || `Patient #${cancellingApt.patientId}`;
            const res = await axios.put(`/api/Appointment/${cancellingApt.appointmentId}/Cancel`);
            if (res.data.Status === 'OK') {
                toast.success(`Appointment for ${patientName} has been cancelled.`);
                setCancellingApt(null);
                fetchAppointments();
            } else {
                toast.error(res.data.ErrorMessage || 'Unable to process appointment cancellation.');
            }
        } catch (err) {
            console.error('Failed to cancel appointment', err);
            toast.error('An error occurred while trying to cancel the appointment.');
        } finally {
            setSaving(false);
        }
    };

    const openReschedule = (apt) => {
        setReschedulingApt(apt);
        const d = new Date(apt.appointmentDate);
        const pad = (n) => String(n).padStart(2, '0');
        setRescheduleDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setRescheduleTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };

    const handleReschedule = async (e) => {
        e.preventDefault();
        if (!rescheduleDate || !rescheduleTime) {
            toast.error("Please pick both date and time");
            return;
        }
        setSaving(true);
        try {
            const patientName = `${reschedulingApt.firstName} ${reschedulingApt.lastName}`;
            const res = await axios.put(`/api/Appointment/${reschedulingApt.appointmentId}/Reschedule`, {
                appointmentDate: `${rescheduleDate}T${rescheduleTime}:00`,
            });
            if (res.data.Status === 'OK') {
                toast.success(`Rescheduled ${patientName}'s appointment.`);
                setReschedulingApt(null);
                fetchAppointments();
            } else {
                toast.error(res.data.ErrorMessage || 'This slot is unavailable or conflicts with another booking.');
            }
        } catch (err) {
            console.error('Failed to reschedule', err);
            toast.error('Failed to update appointment. Please check for scheduling conflicts.');
        } finally {
            setSaving(false);
        }
    };

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const todayIso = new Date().toISOString().slice(0, 10);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Appointments"
                description="Clinician schedules and patient visits for the next month."
                icon={Calendar}
                actions={
                    <>
                        {/* Month-to-date by default: the range the front desk actually reconciles. */}
                        <ExportButton
                            url={`/api/Export/Appointments?from=${monthStart}&to=${todayIso}`}
                            label="Export"
                        />
                        <Button onClick={() => navigate('/dashboard/appointments/new')}>
                            <Plus /> Book appointment
                        </Button>
                    </>
                }
            />

            <Card className="overflow-hidden">
                {loading ? (
                    <div className="space-y-3 p-4">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                ) : appointments.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No upcoming appointments"
                        description="Nothing is booked between today and next month."
                        action={
                            <Button size="sm" onClick={() => navigate('/dashboard/appointments/new')}>
                                <Plus /> Book appointment
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Date &amp; time</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead className="hidden md:table-cell">Doctor</TableHead>
                                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map((apt) => {
                                    const patientName = `${apt.firstName || ''} ${apt.lastName || ''}`.trim()
                                        || `Patient #${apt.patientId}`;
                                    const status = apt.appointmentStatus || '';
                                    const isCancelled = status.toLowerCase() === 'cancelled';
                                    const isDone = status.toLowerCase() === 'completed';
                                    const when = new Date(apt.appointmentDate);

                                    return (
                                        <TableRow key={apt.appointmentId} className={cn(isCancelled && 'opacity-60')}>
                                            <TableCell className="pl-6">
                                                <p className={cn('font-medium', isCancelled && 'line-through')}>
                                                    {when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className={cn('tabular text-xs text-muted-foreground', isCancelled && 'line-through')}>
                                                    {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className={cn('font-medium', isCancelled && 'line-through')}>{patientName}</p>
                                                <p className="tabular text-xs text-muted-foreground">
                                                    {apt.patientCode || `#${apt.patientId}`}
                                                </p>
                                            </TableCell>
                                            <TableCell className="hidden text-muted-foreground md:table-cell">
                                                Dr. {apt.performerName || `Staff #${apt.performerId}`}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge variant="secondary">{apt.appointmentType || 'New visit'}</Badge>
                                            </TableCell>
                                            <TableCell><StatusPill status={status} /></TableCell>
                                            <TableCell className="pr-6 text-right">
                                                {!isCancelled && !isDone ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" onClick={() => openReschedule(apt)}>
                                                            <CalendarClock /> Reschedule
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setCancellingApt(apt)}
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Ban /> Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Reschedule — Radix Dialog, so focus is trapped and Escape closes it. */}
            <Dialog open={!!reschedulingApt} onOpenChange={(o) => !o && setReschedulingApt(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reschedule appointment</DialogTitle>
                        <DialogDescription>
                            {reschedulingApt && (
                                <>
                                    {reschedulingApt.firstName} {reschedulingApt.lastName} with Dr.{' '}
                                    {reschedulingApt.performerName || `Staff #${reschedulingApt.performerId}`}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReschedule} className="space-y-4">
                        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                            {/* Day Presets */}
                            <div>
                                <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">New Date</Label>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {[
                                        { l: "Today", off: 0 },
                                        { l: "Tomorrow", off: 1 },
                                        { l: "In 2 Days", off: 2 },
                                    ].map(b => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + b.off);
                                        const pad = (n) => String(n).padStart(2, "0");
                                        const val = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                                        return (
                                            <Button
                                                key={b.l}
                                                type="button"
                                                size="xs"
                                                variant={rescheduleDate === val ? "default" : "outline"}
                                                onClick={() => setRescheduleDate(val)}
                                                className="h-6 text-[11px] px-2 rounded-full"
                                            >
                                                {b.l}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Input
                                    type="date"
                                    required
                                    min={todayIso}
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className="h-9 bg-background"
                                />
                            </div>

                            {/* Time Slots */}
                            <div>
                                <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">New Time Slot</Label>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {["09:00", "10:00", "11:30", "14:00", "16:00", "17:30"].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setRescheduleTime(t)}
                                            className={cn(
                                                "rounded border px-2 py-0.5 text-xs font-medium transition-colors",
                                                rescheduleTime === t
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background hover:bg-accent text-foreground"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <Input
                                    type="time"
                                    required
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="h-9 bg-background"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReschedulingApt(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="animate-spin mr-1.5" />}
                                Save new time
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Cancellation is destructive and irreversible, so it gets an AlertDialog:
                no click-outside dismissal, and the confirm button is not the default focus. */}
            <AlertDialog open={!!cancellingApt} onOpenChange={(o) => !o && setCancellingApt(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {cancellingApt && (
                                <>
                                    The booking for{' '}
                                    <span className="font-medium text-foreground">
                                        {cancellingApt.firstName} {cancellingApt.lastName}
                                    </span>{' '}
                                    will be marked cancelled and the patient removed from active duty schedules.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Keep booking</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmCancel(); }}
                            disabled={saving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {saving && <Loader2 className="animate-spin" />}
                            Cancel appointment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AppointmentList;
