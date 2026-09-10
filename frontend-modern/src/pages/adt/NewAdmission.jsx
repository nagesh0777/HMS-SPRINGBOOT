import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BedDouble } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';
import { useToast } from '../../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const NewAdmission = () => {
    const toast = useToast();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        patientId: searchParams.get('patientId') || '',
        admittingDoctorId: '',
        // Arriving from a free bed on the ward board preselects it, so picking a bed on the
        // board and picking one again in this form aren't two separate decisions.
        bedId: searchParams.get('bedId') || '',
        admissionNotes: '',
    });
    const [beds, setBeds] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchBeds(); fetchDoctors(); }, []);

    const fetchDoctors = async () => {
        try {
            const res = await axios.get('/api/Doctor?isActive=true');
            if (res.data.Results) setDoctors(res.data.Results);
        } catch (err) { console.error(err); }
    };

    const fetchBeds = async () => {
        try {
            const response = await axios.get('/api/Adt/Beds?status=available');
            const list = response.data.Results;
            if (!list) return;
            setBeds(list);

            // A bed carried in from the ward board can be claimed by someone else before this
            // form loads. Drop the stale choice and say so, rather than leaving a bed
            // selected that the server will reject on submit.
            setFormData(prev => {
                if (!prev.bedId || list.some(b => String(b.bedId) === String(prev.bedId))) return prev;
                toast.error('That bed was just taken — pick another.');
                return { ...prev, bedId: '' };
            });
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patientId) { toast.error('Select a patient first.'); return; }
        setSubmitting(true);
        try {
            await axios.post('/api/Admission/Admission', {
                patientId: parseInt(formData.patientId),
                admittingDoctorId: parseInt(formData.admittingDoctorId),
                bedId: parseInt(formData.bedId),
                admissionDate: new Date(),
                admissionStatus: 'admitted',
                admissionNotes: formData.admissionNotes,
            });
            toast.success('Patient admitted successfully.');
            navigate('/dashboard/adt');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.ErrorMessage || 'Failed to admit patient.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/adt')} className="-ml-2 mb-4 text-muted-foreground">
                <ArrowLeft /> Back to ADT
            </Button>

            <Card>
                <CardContent className="p-6 sm:p-8">
                    <h1 className="mb-6 text-xl font-semibold tracking-tight">Admit patient</h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PatientSearch
                            onSelect={(id) => setFormData({ ...formData, patientId: id })}
                            selectedPatientId={formData.patientId}
                            registerThen="admit"
                        />

                        <div>
                            <Label className="mb-1.5 block">Admitting doctor</Label>
                            <Select value={formData.admittingDoctorId} onValueChange={(v) => setFormData({ ...formData, admittingDoctorId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                                <SelectContent>
                                    {doctors.map(doc => (
                                        <SelectItem key={doc.doctorId} value={String(doc.doctorId)}>
                                            {doc.fullName} ({doc.department})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-1.5 block">Select bed</Label>
                            <Select value={formData.bedId} onValueChange={(v) => setFormData({ ...formData, bedId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                                <SelectContent>
                                    {beds.length === 0 ? (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">No available beds.</div>
                                    ) : beds.map(bed => (
                                        <SelectItem key={bed.bedId} value={String(bed.bedId)}>
                                            {bed.ward} - {bed.bedNumber} (₹{bed.pricePerDay}/day)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-1.5 block">Admission notes</Label>
                            <Textarea
                                rows={3} value={formData.admissionNotes}
                                onChange={(e) => setFormData({ ...formData, admissionNotes: e.target.value })}
                                placeholder="Reason for admission…"
                            />
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={submitting || !formData.patientId || !formData.admittingDoctorId || !formData.bedId}>
                            <BedDouble /> {submitting ? 'Admitting…' : 'Admit patient'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default NewAdmission;
