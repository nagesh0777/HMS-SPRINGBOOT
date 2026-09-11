import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Loader2, Calendar, Clock, CheckCircle2 } from 'lucide-react';

import PatientSearch from '../../components/PatientSearch';
import { useToast } from '../../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Helper to get formatted date string (YYYY-MM-DD)
const getDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Standard clinic time slots for quick 1-click selection
const TIME_OPTIONS = [
    { label: '09:00 AM', value: '09:00' },
    { label: '09:30 AM', value: '09:30' },
    { label: '10:00 AM', value: '10:00' },
    { label: '10:30 AM', value: '10:30' },
    { label: '11:00 AM', value: '11:00' },
    { label: '11:30 AM', value: '11:30' },
    { label: '12:00 PM', value: '12:00' },
    { label: '12:30 PM', value: '12:30' },
    { label: '01:00 PM', value: '13:00' },
    { label: '01:30 PM', value: '13:30' },
    { label: '02:00 PM', value: '14:00' },
    { label: '02:30 PM', value: '14:30' },
    { label: '03:00 PM', value: '15:00' },
    { label: '03:30 PM', value: '15:30' },
    { label: '04:00 PM', value: '16:00' },
    { label: '04:30 PM', value: '16:30' },
    { label: '05:00 PM', value: '17:00' },
    { label: '05:30 PM', value: '17:30' },
    { label: '06:00 PM', value: '18:00' },
    { label: '06:30 PM', value: '18:30' },
    { label: '07:00 PM', value: '19:00' },
    { label: '07:30 PM', value: '19:30' },
    { label: '08:00 PM', value: '20:00' },
];

const NewAppointment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Default to today and next round morning/afternoon slot
    const [selectedDate, setSelectedDate] = useState(() => getDateStr(0));
    const [selectedTime, setSelectedTime] = useState(() => {
        const d = new Date();
        const nextHour = d.getHours() + 1;
        const clampedHour = Math.min(Math.max(nextHour, 9), 18);
        return `${String(clampedHour).padStart(2, '0')}:00`;
    });

    const [formData, setFormData] = useState({
        patientId: searchParams.get('patientId') || '',
        performerId: '',
    });
    const [doctors, setDoctors] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await axios.get('/api/Doctor?isActive=true');
                if (res.data.Results) setDoctors(res.data.Results);
            } catch (err) {
                console.error('No doctors found', err);
            }
        };
        fetchDoctors();
    }, []);

    // Format human-readable preview
    const previewStr = useMemo(() => {
        if (!selectedDate || !selectedTime) return null;
        try {
            const dt = new Date(`${selectedDate}T${selectedTime}:00`);
            if (isNaN(dt.getTime())) return null;
            return dt.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }) + ' at ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return null;
        }
    }, [selectedDate, selectedTime]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patientId) {
            toast.error('Select a patient first.');
            return;
        }
        if (!formData.performerId) {
            toast.error('Select an on-duty doctor.');
            return;
        }
        if (!selectedDate || !selectedTime) {
            toast.error('Please select both appointment date and time.');
            return;
        }

        setSaving(true);
        try {
            const dateISO = `${selectedDate}T${selectedTime}:00`;
            const selectedDoc = doctors.find(d => String(d.doctorId) === String(formData.performerId));

            const response = await axios.post('/api/Appointment/AddAppointment', {
                patientId: parseInt(formData.patientId),
                performerId: parseInt(formData.performerId),
                performerName: selectedDoc?.fullName || '',
                appointmentDate: dateISO,
                appointmentType: 'New Visit',
            });

            if (response.data.Status === 'OK') {
                toast.success('Appointment booked successfully!');
                navigate('/dashboard/appointments');
            } else {
                toast.error(response.data.ErrorMessage || 'Booking failed');
            }
        } catch (error) {
            console.error('Failed to book appointment', error);
            toast.error('Failed to book appointment. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const todayStr = getDateStr(0);

    return (
        <div className="mx-auto max-w-2xl pb-12">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/appointments')}
                className="mb-4 -ml-2 text-muted-foreground"
            >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to appointments
            </Button>

            <Card className="shadow-sm border">
                <CardContent className="p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Book appointment</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Select patient, clinician, date and time.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/doctors')}>
                            Manage doctors
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 1. Patient Search */}
                        <PatientSearch
                            onSelect={(id) => setFormData(f => ({ ...f, patientId: id }))}
                            selectedPatientId={formData.patientId}
                            registerThen="appointment"
                        />

                        {/* 2. Doctor Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="doctor" className="font-semibold">Doctor / Clinician</Label>
                            <Select
                                value={formData.performerId}
                                onValueChange={(v) => setFormData(f => ({ ...f, performerId: v }))}
                            >
                                <SelectTrigger id="doctor" className="h-10">
                                    <SelectValue placeholder="Select an on-duty doctor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            No active doctors found on the roster.
                                        </div>
                                    ) : (
                                        doctors.map(doc => (
                                            <SelectItem key={doc.doctorId} value={String(doc.doctorId)}>
                                                {doc.fullName}{doc.department ? ` · ${doc.department}` : ''}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Simple & Quick Date and Time Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border bg-muted/20 p-4">
                            {/* Appointment Date */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="appointmentDate" className="font-semibold flex items-center gap-1.5 text-sm">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span>Date</span>
                                    </Label>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(getDateStr(0))}
                                            className="text-[11px] font-medium text-primary hover:underline px-1"
                                        >
                                            Today
                                        </button>
                                        <span className="text-[11px] text-muted-foreground">·</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(getDateStr(1))}
                                            className="text-[11px] font-medium text-primary hover:underline px-1"
                                        >
                                            Tomorrow
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    id="appointmentDate"
                                    type="date"
                                    required
                                    min={todayStr}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                                    className="h-10 cursor-pointer font-medium bg-background text-sm"
                                />
                            </div>

                            {/* Appointment Time */}
                            <div className="space-y-2">
                                <Label htmlFor="appointmentTime" className="font-semibold flex items-center gap-1.5 text-sm">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>Time</span>
                                </Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                                            <SelectTrigger id="appointmentTime" className="h-10 bg-background text-sm">
                                                <SelectValue placeholder="Select slot" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {TIME_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input
                                        type="time"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                                        className="h-10 w-28 text-xs cursor-pointer font-medium bg-background"
                                        title="Or select custom time"
                                    />
                                </div>
                            </div>

                            {/* Live Confirmation Preview */}
                            {previewStr && (
                                <div className="sm:col-span-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <span className="text-muted-foreground">Booking for: </span>
                                        <strong className="text-emerald-800 dark:text-emerald-200 font-semibold">{previewStr}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-2 border-t pt-5">
                            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/appointments')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving || !formData.patientId || !formData.performerId}>
                                {saving ? <Loader2 className="animate-spin mr-1.5" /> : <CalendarPlus className="mr-1.5" />}
                                Confirm booking
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default NewAppointment;
