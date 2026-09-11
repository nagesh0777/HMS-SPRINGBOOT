import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, CalendarPlus, Loader2, Calendar, Clock, CheckCircle2,
    ChevronLeft, ChevronRight, Sun, Sunset, Moon, Sparkles
} from 'lucide-react';

import PatientSearch from '../../components/PatientSearch';
import { useToast } from '../../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Helper to get formatted date string (YYYY-MM-DD)
const getDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Helper to get default next slot time (e.g. next hour, "10:00")
const getDefaultTimeStr = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    const hh = String(d.getHours()).padStart(2, '0');
    return `${hh}:00`;
};

// Clinic slots grouped by time of day
const TIME_SLOTS = {
    morning: [
        { label: '09:00 AM', value: '09:00' },
        { label: '09:30 AM', value: '09:30' },
        { label: '10:00 AM', value: '10:00' },
        { label: '10:30 AM', value: '10:30' },
        { label: '11:00 AM', value: '11:00' },
        { label: '11:30 AM', value: '11:30' },
    ],
    afternoon: [
        { label: '12:00 PM', value: '12:00' },
        { label: '12:30 PM', value: '12:30' },
        { label: '01:00 PM', value: '13:00' },
        { label: '02:00 PM', value: '14:00' },
        { label: '02:30 PM', value: '14:30' },
        { label: '03:00 PM', value: '15:00' },
        { label: '03:30 PM', value: '15:30' },
    ],
    evening: [
        { label: '04:00 PM', value: '16:00' },
        { label: '04:30 PM', value: '16:30' },
        { label: '05:00 PM', value: '17:00' },
        { label: '05:30 PM', value: '17:30' },
        { label: '06:00 PM', value: '18:00' },
        { label: '06:30 PM', value: '18:30' },
        { label: '07:00 PM', value: '19:00' },
    ],
};

const NewAppointment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Default to today and the next round hour
    const [selectedDate, setSelectedDate] = useState(() => getDateStr(0));
    const [selectedTime, setSelectedTime] = useState(() => getDefaultTimeStr());
    const [showCalendarView, setShowCalendarView] = useState(false);

    // Calendar view month navigation
    const [viewMonthOffset, setViewMonthOffset] = useState(0);

    const dateInputRef = useRef(null);
    const timeInputRef = useRef(null);

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

    // Calendar grid calculations
    const calendarDays = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + viewMonthOffset;
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const monthName = firstDayOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

        const days = [];
        // Empty cells for alignment
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const padM = String(firstDayOfMonth.getMonth() + 1).padStart(2, '0');
            const padD = String(d).padStart(2, '0');
            const dateStr = `${firstDayOfMonth.getFullYear()}-${padM}-${padD}`;
            const isPast = dateStr < getDateStr(0);
            days.push({ dayNumber: d, dateStr, isPast });
        }

        return { monthName, days };
    }, [viewMonthOffset]);

    const handleDateInputClick = () => {
        if (dateInputRef.current) {
            try {
                if (typeof dateInputRef.current.showPicker === 'function') {
                    dateInputRef.current.showPicker();
                } else {
                    dateInputRef.current.focus();
                }
            } catch {
                dateInputRef.current.focus();
            }
        }
    };

    const handleTimeInputClick = () => {
        if (timeInputRef.current) {
            try {
                if (typeof timeInputRef.current.showPicker === 'function') {
                    timeInputRef.current.showPicker();
                } else {
                    timeInputRef.current.focus();
                }
            } catch {
                timeInputRef.current.focus();
            }
        }
    };

    // Parse hour / minute for manual select
    const { currentHour12, currentMinute, currentAmPm } = useMemo(() => {
        if (!selectedTime) return { currentHour12: '10', currentMinute: '00', currentAmPm: 'AM' };
        const [hStr, mStr] = selectedTime.split(':');
        const h = parseInt(hStr || '10', 10);
        const m = mStr || '00';
        const isPm = h >= 12;
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        return {
            currentHour12: String(h12).padStart(2, '0'),
            currentMinute: m,
            currentAmPm: isPm ? 'PM' : 'AM'
        };
    }, [selectedTime]);

    const setCustomTime = (h12, min, amPm) => {
        let hour = parseInt(h12, 10);
        if (amPm === 'PM' && hour < 12) hour += 12;
        if (amPm === 'AM' && hour === 12) hour = 0;
        const hh = String(hour).padStart(2, '0');
        const mm = String(min).padStart(2, '0');
        setSelectedTime(`${hh}:${mm}`);
    };

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
                                Select patient, clinician, and preferred time slot.
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

                        {/* 3. Appointment Date & Time Section */}
                        <div className="space-y-4 rounded-xl border bg-muted/15 p-4 sm:p-5">
                            <div className="flex items-center justify-between border-b pb-3">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span>Date &amp; Time Selection</span>
                                </Label>
                                {previewStr ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Slot Ready</span>
                                    </span>
                                ) : (
                                    <span className="text-xs text-amber-600 font-medium">Select a slot</span>
                                )}
                            </div>

                            {/* Section A: Date Selector */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 text-primary" /> Step 1: Select Day
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setShowCalendarView(v => !v)}
                                        className="h-6 text-xs text-primary hover:text-primary/80"
                                    >
                                        {showCalendarView ? 'Hide calendar grid' : '📅 Show calendar grid'}
                                    </Button>
                                </div>

                                {/* Quick Day Presets */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {[
                                        { label: 'Today', offset: 0 },
                                        { label: 'Tomorrow', offset: 1 },
                                        { label: 'In 2 Days', offset: 2 },
                                        { label: 'In 3 Days', offset: 3 },
                                        { label: 'Next Week', offset: 7 },
                                    ].map(item => {
                                        const dStr = getDateStr(item.offset);
                                        const isSelected = selectedDate === dStr;
                                        return (
                                            <Button
                                                key={item.label}
                                                type="button"
                                                size="sm"
                                                variant={isSelected ? 'default' : 'outline'}
                                                onClick={() => setSelectedDate(dStr)}
                                                className={cn(
                                                    'h-8 text-xs px-3 rounded-full font-medium transition-all',
                                                    isSelected ? 'shadow-xs' : 'hover:bg-accent'
                                                )}
                                            >
                                                {item.label}
                                                <span className={cn('ml-1 text-[10px] opacity-75', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                                                    ({new Date(dStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </div>

                                {/* Expandable Month Calendar Grid */}
                                {showCalendarView && (
                                    <div className="rounded-lg border bg-card p-3 shadow-xs mt-2 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                disabled={viewMonthOffset <= 0}
                                                onClick={() => setViewMonthOffset(v => Math.max(0, v - 1))}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-xs font-bold text-foreground">
                                                {calendarDays.monthName}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                disabled={viewMonthOffset >= 3}
                                                onClick={() => setViewMonthOffset(v => v + 1)}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-1">
                                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {calendarDays.days.map((d, idx) => {
                                                if (!d) return <div key={`empty-${idx}`} className="h-7" />;
                                                const isSelected = selectedDate === d.dateStr;
                                                const isToday = d.dateStr === todayStr;

                                                return (
                                                    <button
                                                        key={d.dateStr}
                                                        type="button"
                                                        disabled={d.isPast}
                                                        onClick={() => setSelectedDate(d.dateStr)}
                                                        className={cn(
                                                            'h-7 rounded-md text-xs font-medium transition-colors flex items-center justify-center relative',
                                                            d.isPast && 'opacity-30 cursor-not-allowed text-muted-foreground',
                                                            !d.isPast && !isSelected && 'hover:bg-muted text-foreground',
                                                            isToday && !isSelected && 'border border-primary text-primary font-bold',
                                                            isSelected && 'bg-primary text-primary-foreground font-bold shadow-xs'
                                                        )}
                                                    >
                                                        {d.dayNumber}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Date Input Field */}
                                <div className="pt-1">
                                    <div className="relative flex items-center">
                                        <Input
                                            ref={dateInputRef}
                                            id="appointmentDate"
                                            type="date"
                                            required
                                            min={todayStr}
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="h-10 cursor-pointer font-medium pr-10 bg-background"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDateInputClick}
                                            className="absolute right-2.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                            title="Open date picker"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Time Selector */}
                            <div className="space-y-3 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-primary" /> Step 2: Select Time Slot
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Active: <strong className="text-foreground">{selectedTime || '--:--'}</strong>
                                    </span>
                                </div>

                                {/* Slot Groups */}
                                <div className="space-y-2.5">
                                    {/* Morning Slots */}
                                    <div>
                                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                                            <Sun className="h-3 w-3 text-amber-500" /> Morning Slots
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {TIME_SLOTS.morning.map(slot => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => setSelectedTime(slot.value)}
                                                    className={cn(
                                                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                                                        selectedTime === slot.value
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                            : 'bg-background hover:bg-accent text-foreground'
                                                    )}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Afternoon Slots */}
                                    <div>
                                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                                            <Sunset className="h-3 w-3 text-orange-500" /> Afternoon Slots
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {TIME_SLOTS.afternoon.map(slot => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => setSelectedTime(slot.value)}
                                                    className={cn(
                                                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                                                        selectedTime === slot.value
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                            : 'bg-background hover:bg-accent text-foreground'
                                                    )}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Evening Slots */}
                                    <div>
                                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                                            <Moon className="h-3 w-3 text-indigo-500" /> Evening Slots
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {TIME_SLOTS.evening.map(slot => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => setSelectedTime(slot.value)}
                                                    className={cn(
                                                        'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                                                        selectedTime === slot.value
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                            : 'bg-background hover:bg-accent text-foreground'
                                                    )}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Time Selector (Dropdowns & Direct Input) */}
                                <div className="pt-2 border-t flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">Custom Time:</span>
                                    {/* Hour */}
                                    <select
                                        value={currentHour12}
                                        onChange={(e) => setCustomTime(e.target.value, currentMinute, currentAmPm)}
                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                                    >
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    <span className="text-xs font-bold text-muted-foreground">:</span>
                                    {/* Minute */}
                                    <select
                                        value={['00','15','30','45'].includes(currentMinute) ? currentMinute : '00'}
                                        onChange={(e) => setCustomTime(currentHour12, e.target.value, currentAmPm)}
                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                                    >
                                        {['00','10','15','20','30','40','45','50'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    {/* AM/PM */}
                                    <div className="flex rounded-md border overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setCustomTime(currentHour12, currentMinute, 'AM')}
                                            className={cn(
                                                'h-8 px-2.5 text-xs font-semibold transition-colors',
                                                currentAmPm === 'AM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-foreground'
                                            )}
                                        >
                                            AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomTime(currentHour12, currentMinute, 'PM')}
                                            className={cn(
                                                'h-8 px-2.5 text-xs font-semibold transition-colors',
                                                currentAmPm === 'PM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent text-foreground'
                                            )}
                                        >
                                            PM
                                        </button>
                                    </div>

                                    {/* Direct Time Input */}
                                    <div className="relative ml-auto flex items-center">
                                        <Input
                                            ref={timeInputRef}
                                            id="appointmentTime"
                                            type="time"
                                            required
                                            value={selectedTime}
                                            onChange={(e) => setSelectedTime(e.target.value)}
                                            className="h-8 w-28 text-xs cursor-pointer font-medium bg-background"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Human-readable Preview */}
                            {previewStr && (
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs flex items-center gap-2.5 mt-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <span className="text-muted-foreground">Scheduled for: </span>
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
