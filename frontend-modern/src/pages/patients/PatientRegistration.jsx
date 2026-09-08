import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PatientRegistration = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', gender: '', age: '', phoneNumber: '',
        address: '', email: '', status: 'Outpatient', photoPath: '',
        weight: '', height: '', bloodGroup: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => { if (isEditMode) fetchPatient(); }, [id]);

    const fetchPatient = async () => {
        try {
            const res = await axios.get(`/api/Patient/${id}`);
            if (res.data.Results) {
                const p = res.data.Results;
                setFormData({
                    firstName: p.firstName || '', lastName: p.lastName || '', gender: p.gender || '',
                    age: p.age || '', phoneNumber: p.phoneNumber || '', address: p.address || '',
                    email: p.email || '', status: p.status || 'Outpatient', photoPath: p.photoPath || '',
                    weight: p.weight || '', height: p.height || '', bloodGroup: p.bloodGroup || '',
                });
            }
        } catch (err) {
            console.error('Failed to fetch patient for editing', err);
        } finally {
            setFetching(false);
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.warning('File is too large. Max size is 5MB.'); return; }

        if (isEditMode) {
            setUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file); uploadData.append('type', 'patient'); uploadData.append('id', id);
                const res = await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res.data.Status === 'OK') {
                    setFormData(prev => ({ ...prev, photoPath: res.data.Results.path }));
                    toast.success('Profile photo updated successfully.');
                } else {
                    toast.error(res.data.ErrorMessage || 'Upload failed.');
                }
            } catch (err) {
                toast.error('Failed to upload photo.');
            } finally {
                setUploading(false);
            }
        } else {
            setSelectedPhotoFile(file);
            setPhotoPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(formData.phoneNumber)) {
            toast.warning('Please enter a valid mobile number (10-15 digits).');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                weight: formData.weight !== '' ? parseFloat(formData.weight) : null,
                height: formData.height !== '' ? parseFloat(formData.height) : null,
                bloodGroup: formData.bloodGroup || null,
            };

            if (isEditMode) {
                const res = await axios.put(`/api/Patient/${id}`, payload);
                if (res.data.ErrorMessage) { toast.error(res.data.ErrorMessage); return; }
                toast.success('Patient profile updated successfully.');
                navigate(`/dashboard/patients/${id}`);
            } else {
                const res = await axios.post('/api/Patient', { ...payload, patientNo: 0, isActive: true });
                if (res.data.ErrorMessage) { toast.error(res.data.ErrorMessage || 'Failed to register patient.'); return; }

                if (selectedPhotoFile && res.data.Results?.patientId) {
                    const uploadData = new FormData();
                    uploadData.append('file', selectedPhotoFile); uploadData.append('type', 'patient'); uploadData.append('id', res.data.Results.patientId);
                    await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }

                const newId = res.data.Results?.patientId;
                toast.success('Patient registered successfully.');

                // Reception registers a walk-in *because* the patient needs to be seen now.
                // Landing on the full patient list meant searching straight back for the person
                // just created; `?then=` lets the caller chain into the next step instead, and
                // otherwise we open the new chart rather than the list.
                const then = searchParams.get('then');
                if (newId && then === 'appointment') navigate(`/dashboard/appointments/new?patientId=${newId}`);
                else if (newId && then === 'admit') navigate(`/dashboard/adt/admit?patientId=${newId}`);
                else if (newId) navigate(`/dashboard/patients/${newId}`);
                else navigate('/dashboard/patients');
            }
        } catch (error) {
            console.error('Failed to save patient', error);
            toast.error(error.response?.data?.ErrorMessage || error.message || 'Failed to save patient');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="mx-auto max-w-4xl">
            <Button variant="ghost" size="sm" onClick={() => navigate(isEditMode ? `/dashboard/patients/${id}` : '/dashboard/patients')} className="-ml-2 mb-4 text-muted-foreground">
                <ArrowLeft /> {isEditMode ? 'Back to profile' : 'Back to patient list'}
            </Button>

            <Card>
                <CardContent className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b pb-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><User className="h-5 w-5" /></span>
                        <div>
                            <h1 className="text-lg font-semibold">{isEditMode ? 'Edit patient profile' : 'New patient registration'}</h1>
                            <p className="text-sm text-muted-foreground">
                                {isEditMode ? `Updating information for ${formData.firstName} ${formData.lastName}` : 'Enter patient demographics and clinical details to register them in the system.'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-muted/20 p-6 md:col-span-2">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                                    {(photoPreviewUrl || formData.photoPath) && <AvatarImage src={photoPreviewUrl || formData.photoPath} alt="" />}
                                    <AvatarFallback><User className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                            </div>
                            <div className="text-center">
                                <Label className="inline-flex cursor-pointer items-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent">
                                    {uploading ? 'Uploading…' : (formData.photoPath || photoPreviewUrl ? 'Change photo' : 'Upload photo')}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                                </Label>
                                <p className="mt-2 text-[11px] text-muted-foreground">JPEG or PNG, maximum 5MB</p>
                            </div>
                        </div>

                        <div><Label className="mb-1.5 block">First name</Label><Input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="Enter first name" /></div>
                        <div><Label className="mb-1.5 block">Last name</Label><Input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Enter last name" /></div>

                        <div>
                            <Label className="mb-1.5 block">Gender</Label>
                            <select name="gender" required value={formData.gender} onChange={handleChange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                            </select>
                        </div>
                        <div><Label className="mb-1.5 block">Age (e.g. 25Y)</Label><Input name="age" required value={formData.age} onChange={handleChange} placeholder="e.g. 25Y" /></div>

                        <div><Label className="mb-1.5 block">Phone number</Label><Input type="tel" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} placeholder="Enter mobile number" /></div>
                        <div><Label className="mb-1.5 block">Email address</Label><Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. patient@example.com" /></div>

                        <div><Label className="mb-1.5 block">Weight (kg)</Label><Input type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 72.5" /></div>
                        <div><Label className="mb-1.5 block">Height (cm)</Label><Input type="number" step="0.1" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 175.0" /></div>

                        <div>
                            <Label className="mb-1.5 block">Blood group</Label>
                            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="">Select blood group</option>
                                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Clinical status</Label>
                            <select name="status" value={formData.status} onChange={handleChange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="Outpatient">Outpatient</option>
                                <option value="Inpatient">Inpatient (admitted)</option>
                                <option value="Emergency">Emergency</option>
                                <option value="Discharged">Discharged</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <Label className="mb-1.5 block">Address</Label>
                            <Input name="address" value={formData.address} onChange={handleChange} placeholder="Street address, city" />
                        </div>

                        <div className="mt-2 flex justify-end border-t pt-5 md:col-span-2">
                            <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto">
                                {loading ? <Loader2 className="animate-spin" /> : <Save />} {loading ? 'Saving…' : (isEditMode ? 'Update profile' : 'Register patient')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default PatientRegistration;
