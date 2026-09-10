import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Loader2 } from 'lucide-react';

import PatientSearch from '../../components/PatientSearch';
import { useToast } from '../../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const NewAppointment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Arriving from a patient's chart or straight after registering them: the patient is already
    // known, so don't make reception search for the person they are standing in front of.
    const [formData, setFormData] = useState({
        patientId: searchParams.get('patientId') || '',
        performerId: '',
        appointmentDate: '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patientId) { toast.error('Select a patient first.'); return; }

        setSaving(true);
        try {
            const dateLocal = formData.appointmentDate;
            const dateISO = dateLocal.length === 16 ? `${dateLocal}:00` : dateLocal;
            const selectedDoc = doctors.find(d => String(d.doctorId) === String(formData.performerId));

            const response = await axios.post('/api/Appointment/AddAppointment', {
                patientId: parseInt(formData.patientId),
                performerId: parseInt(formData.performerId),
                performerName: selectedDoc?.fullName || '',
                appointmentDate: dateISO,
                appointmentType: 'New Visit',
            });

            if (response.data.Status === 'OK') {
                // Only claim what actually happened: the appointment row was written. No SMS,
                // WhatsApp or calendar integration exists, and saying otherwise meant reception
                // stopped phoning patients to confirm.
                toast.success('Appointment booked. Remember to confirm with the patient.');
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

    return (
        <div className="mx-auto max-w-2xl">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/appointments')}
                className="mb-4 -ml-2 text-muted-foreground"
            >
                <ArrowLeft /> Back to appointments
            </Button>

            <Card>
                <CardContent className="p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Book appointment</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Choose the patient, clinician and slot.
                            </p>
                        </div>
                        {/* Was pointing at /dashboard/appointments/doctors, which is not a route. */}
                        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/doctors')}>
                            Manage doctors
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PatientSearch
                            onSelect={(id) => setFormData(f => ({ ...f, patientId: id }))}
                            selectedPatientId={formData.patientId}
                            registerThen="appointment"
                        />

                        <div className="space-y-2">
                            <Label htmlFor="doctor">Doctor</Label>
                            <Select
                                value={formData.performerId}
                                onValueChange={(v) => setFormData(f => ({ ...f, performerId: v }))}
                            >
                                <SelectTrigger id="doctor">
                                    <SelectValue placeholder="Select a doctor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                            No active doctors on the roster.
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

                        <div className="space-y-2">
                            <Label htmlFor="when">Date &amp; time</Label>
                            <Input
                                id="when"
                                type="datetime-local"
                                required
                                value={formData.appointmentDate}
                                onChange={(e) => setFormData(f => ({ ...f, appointmentDate: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-5">
                            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/appointments')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving || !formData.patientId || !formData.performerId}>
                                {saving ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
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
