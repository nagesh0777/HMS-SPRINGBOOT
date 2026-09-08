import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, ShieldCheck, Clock, Info, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const ROLE_SUGGESTIONS = ['Admin', 'Doctor', 'Helpdesk', 'Staff', 'Nurse', 'Technician'];

// Single source of truth for page permissions. The previous version had two separate
// checkbox lists editing the same `assignedModules` field with different id sets and
// no visual link between them — a change in one didn't obviously reflect in the other.
const MODULES = [
    { id: 'Patients', label: 'Patient management', desc: 'Register patients, edit clinical details & view lists' },
    { id: 'Appointments', label: 'Appointments', desc: 'Schedule, book and dispatch appointments' },
    { id: 'ADT', label: 'ADT ward tracking', desc: 'Admit, discharge, transfer and monitor bed layouts' },
    { id: 'Billing', label: 'Billing & invoices', desc: 'Generate bills, process payments, view statements' },
    { id: 'Notifications', label: 'Notifications', desc: 'View notifications' },
    { id: 'Attendance', label: 'Attendance', desc: 'Mark & view attendance' },
    { id: 'Doctors', label: 'Doctor directory', desc: 'Add/edit doctor profiles, availability, reset passwords' },
    { id: 'Staff', label: 'Workforce & attendance', desc: 'Manage employees, schedules and the presence widget' },
    { id: 'Services', label: 'Service catalog', desc: 'Service rates & catalog' },
    { id: 'Settings', label: 'System configuration', desc: 'Hospital settings, backups and global constants' },
    { id: 'AICopilot', label: 'AI chatbot access', desc: 'Allow global access to the AI Copilot panel' },
];

const FieldError = ({ error }) => (error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null);

const StaffForm = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', role: 'Staff', department: 'General',
        phoneNumber: '', email: '', userName: '', password: '',
        accessLevel: 'Standard', assignedModules: '', shiftTiming: '', dutyDays: '',
        assignedWard: '', status: 'Active', adminNotes: '', isActive: true, photoPath: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'Admin') { navigate('/dashboard'); return; }
        if (isEditMode) fetchStaff();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchStaff = async () => {
        try {
            const res = await axios.get(`/api/Employee/${id}`);
            if (res.data.Results) setFormData(res.data.Results);
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (formData.phoneNumber) {
            const phonePlain = formData.phoneNumber.replace(/\D/g, '');
            if (phonePlain.length < 10 || phonePlain.length > 15) newErrors.phoneNumber = 'Phone should be 10–15 digits';
        }
        if (!isEditMode) {
            if (!formData.userName.trim() || formData.userName.length < 4) newErrors.userName = 'Username must be at least 4 characters';
            if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        } else if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
            newErrors.password = 'New password must be at least 6 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.warning('File is too large. Max size is 5MB.'); return; }

        if (isEditMode) {
            setUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file);
                uploadData.append('type', 'employee');
                uploadData.append('id', id);
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        if (errors[name]) setErrors({ ...errors, [name]: '' });
    };

    const currentModules = (formData.assignedModules || '').split(',').map(m => m.trim()).filter(Boolean);
    const toggleModule = (moduleId) => {
        const updated = currentModules.includes(moduleId)
            ? currentModules.filter(m => m !== moduleId)
            : [...currentModules, moduleId];
        setFormData({ ...formData, assignedModules: updated.join(',') });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const res = isEditMode
                ? await axios.put(`/api/Employee/${id}`, formData)
                : await axios.post('/api/Employee', formData);

            if (res.data?.Status === 'OK') {
                if (!isEditMode && selectedPhotoFile && res.data.Results?.employeeId) {
                    const uploadData = new FormData();
                    uploadData.append('file', selectedPhotoFile);
                    uploadData.append('type', 'employee');
                    uploadData.append('id', res.data.Results.employeeId);
                    await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
                navigate(isEditMode ? `/dashboard/staff/${id}` : '/dashboard/staff');
            } else {
                toast.error(res.data?.ErrorMessage || 'Could not save staff record.');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.ErrorMessage || error.response?.data?.message || 'Server connection failed.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-10">
            <Button variant="ghost" size="sm" onClick={() => navigate(isEditMode ? `/dashboard/staff/${id}` : '/dashboard/staff')} className="-ml-2 text-muted-foreground">
                <ArrowLeft /> {isEditMode ? 'Back to profile' : 'Back to directory'}
            </Button>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b pb-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><User className="h-5 w-5" /></span>
                        <div>
                            <h1 className="text-lg font-semibold">{isEditMode ? 'Edit staff profile' : 'New staff registration'}</h1>
                            <p className="text-sm text-muted-foreground">Personal and professional information for the staff record.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

                        <div>
                            <Label className="mb-1.5 block">First name</Label>
                            <Input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="Enter first name" className={cn(errors.firstName && 'border-destructive')} />
                            <FieldError error={errors.firstName} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Last name</Label>
                            <Input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Enter last name" className={cn(errors.lastName && 'border-destructive')} />
                            <FieldError error={errors.lastName} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Role</Label>
                            <Input name="role" required value={formData.role} onChange={handleChange} placeholder="Enter role (e.g. Nurse)" className={cn(errors.role && 'border-destructive')} />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {ROLE_SUGGESTIONS.map(sug => (
                                    <button key={sug} type="button" onClick={() => setFormData(prev => ({ ...prev, role: sug }))}
                                            className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors', formData.role === sug ? 'border-foreground bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent')}>
                                        {sug}
                                    </button>
                                ))}
                            </div>
                            <FieldError error={errors.role} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Department</Label>
                            <Input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Cardiology" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Phone number</Label>
                            <Input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Enter phone number" className={cn(errors.phoneNumber && 'border-destructive')} />
                            <FieldError error={errors.phoneNumber} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Official email</Label>
                            <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" className={cn(errors.email && 'border-destructive')} />
                            <FieldError error={errors.email} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Status</Label>
                            <select name="status" value={formData.status} onChange={handleChange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option>Active</option><option>On Leave</option><option>Suspended</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b pb-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ShieldCheck className="h-5 w-5" /></span>
                        <div>
                            <h2 className="text-lg font-semibold">Login &amp; access info</h2>
                            <p className="text-sm text-muted-foreground">Account credentials and module permissions.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <Label className="mb-1.5 block">Username</Label>
                            <Input name="userName" value={formData.userName} onChange={handleChange} placeholder="e.g. alex.smith" className={cn(errors.userName && 'border-destructive')} />
                            <FieldError error={errors.userName} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Login password</Label>
                            <Input
                                type="password" name="password" value={formData.password} onChange={handleChange}
                                placeholder={isEditMode ? '•••••••• (leave blank to keep current)' : 'Enter login password'}
                                required={!isEditMode} className={cn(errors.password && 'border-destructive')}
                            />
                            <FieldError error={errors.password} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Access level</Label>
                            <select name="accessLevel" value={formData.accessLevel} onChange={handleChange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option>Standard</option><option>Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-6">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <Label className="block">Page access permissions</Label>
                                <p className="mt-0.5 text-xs text-muted-foreground">Without any selection, staff only see the Dashboard.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, assignedModules: MODULES.map(m => m.id).join(',') })}>Select all</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, assignedModules: '' })}>Deselect all</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {MODULES.map(mod => {
                                const isChecked = currentModules.includes(mod.id);
                                return (
                                    <div key={mod.id} onClick={() => toggleModule(mod.id)}
                                         className={cn('flex cursor-pointer select-none items-start gap-3 rounded-lg border p-3 transition-colors', isChecked ? 'border-foreground/30 bg-accent/40' : 'hover:bg-accent/20')}>
                                        <Checkbox checked={isChecked} onCheckedChange={() => toggleModule(mod.id)} className="mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium leading-tight">{mod.label}</p>
                                            <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">{mod.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3 border-b pb-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Clock className="h-5 w-5" /></span>
                        <div>
                            <h2 className="text-lg font-semibold">Work information</h2>
                            <p className="text-sm text-muted-foreground">Shift timings and station assignments.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div><Label className="mb-1.5 block">Shift timing</Label><Input name="shiftTiming" value={formData.shiftTiming} onChange={handleChange} placeholder="e.g. 09:00 AM - 05:00 PM" /></div>
                        <div><Label className="mb-1.5 block">Duty days</Label><Input name="dutyDays" value={formData.dutyDays} onChange={handleChange} placeholder="e.g. Mon, Tue, Wed" /></div>
                        <div><Label className="mb-1.5 block">Assigned ward / OPD</Label><Input name="assignedWard" value={formData.assignedWard} onChange={handleChange} /></div>
                    </div>
                </Card>

                <Card className="space-y-5 p-6 sm:p-8">
                    <div className="flex items-center gap-3 border-b pb-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Info className="h-5 w-5" /></span>
                        <div>
                            <h2 className="text-lg font-semibold">Notes &amp; flags</h2>
                            <p className="text-sm text-muted-foreground">Administrative remarks and special warnings.</p>
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Admin notes</Label>
                        <Textarea name="adminNotes" rows={4} value={formData.adminNotes} onChange={handleChange} placeholder="Enter any administrative notes or special permissions…" />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                        <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(v) => setFormData(f => ({ ...f, isActive: v }))} />
                        <Label htmlFor="isActive" className="cursor-pointer">System access enabled</Label>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/staff')}>Cancel</Button>
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? <Loader2 className="animate-spin" /> : <Save />} {loading ? 'Saving…' : (isEditMode ? 'Update record' : 'Create staff member')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default StaffForm;
