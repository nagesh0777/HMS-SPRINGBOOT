import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, User, Save, Clock, Search, Edit3, X, Phone, Mail, Stethoscope,
    UserCheck, UserX, ToggleLeft, ToggleRight, Shield, Key,
    AlertTriangle, Wrench, Copy, Lock, Loader2, CheckCircle2, QrCode,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const DEPARTMENTS = ['OPD', 'Cardiology', 'Pediatrics', 'Gynaecology', 'Emergency', 'Orthopedics', 'Dermatology', 'Neurology', 'ENT', 'Ophthalmology', 'General Medicine', 'General Surgery'];
const STATUS_BADGE = { 'On Duty': 'success', 'On Leave': 'warning', 'Off Duty': 'secondary' };

const emptyForm = {
    fullName: '', department: 'OPD', specialization: '', qualifications: '', registrationNumber: '',
    phoneNumber: '', email: '', startTime: '09:00', endTime: '17:00',
    userName: '', password: '', photoPath: '', consultationQrPath: '', status: 'On Duty',
};

const DoctorManagementPage = () => {
    const toast = useToast();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [saving, setSaving] = useState(false);

    const [credentials, setCredentials] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [resetPwdDoctor, setResetPwdDoctor] = useState(null);
    const [resetPwdValue, setResetPwdValue] = useState('');

    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const [selectedQrFile, setSelectedQrFile] = useState(null);
    const [qrPreviewUrl, setQrPreviewUrl] = useState('');
    const [uploadingQr, setUploadingQr] = useState(false);

    const [form, setForm] = useState({ ...emptyForm });

    useEffect(() => { fetchDoctors(); }, []);

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/Doctor');
            if (res.data.Results) setDoctors(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch doctors', e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setSelectedPhotoFile(null); setPhotoPreviewUrl('');
        setSelectedQrFile(null); setQrPreviewUrl('');
    };

    const openEdit = (doc) => {
        setForm({
            fullName: doc.fullName || '', department: doc.department || 'OPD',
            specialization: doc.specialization || '', qualifications: doc.qualifications || '',
            registrationNumber: doc.registrationNumber || '', phoneNumber: doc.phoneNumber || '',
            email: doc.email || '', startTime: doc.startTime || '09:00',
            endTime: doc.endTime || '17:00', userName: doc.userName || '', password: '',
            photoPath: doc.photoPath || '', consultationQrPath: doc.consultationQrPath || '', status: doc.status || 'On Duty',
        });
        setEditingId(doc.doctorId);
        setShowForm(true);
        setSelectedPhotoFile(null); setPhotoPreviewUrl('');
        setSelectedQrFile(null); setQrPreviewUrl('');
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('File is too large. Max size is 5MB.'); return; }

        if (editingId) {
            setUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file); uploadData.append('type', 'doctor'); uploadData.append('id', editingId);
                const res = await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res.data.Status === 'OK') {
                    setForm(prev => ({ ...prev, photoPath: res.data.Results.path }));
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

    const handleQrChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('File is too large. Max size is 5MB.'); return; }

        if (editingId) {
            setUploadingQr(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file); uploadData.append('type', 'doctor_qr'); uploadData.append('id', editingId);
                const res = await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (res.data.Status === 'OK') {
                    setForm(prev => ({ ...prev, consultationQrPath: res.data.Results.path }));
                    toast.success('Consultation QR code updated successfully.');
                } else {
                    toast.error(res.data.ErrorMessage || 'Upload failed.');
                }
            } catch (err) {
                toast.error('Failed to upload QR code.');
            } finally {
                setUploadingQr(false);
            }
        } else {
            setSelectedQrFile(file);
            setQrPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveQr = () => {
        setSelectedQrFile(null); setQrPreviewUrl('');
        setForm(prev => ({ ...prev, consultationQrPath: '' }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim()) { toast.error('Doctor name is required'); return; }
        setSaving(true);
        try {
            const res = editingId
                ? await axios.put(`/api/Doctor/${editingId}`, form)
                : await axios.post('/api/Doctor', form);

            if (res.data.Status === 'Failed') {
                toast.error(res.data.ErrorMessage || 'Operation failed');
                setSaving(false);
                return;
            }

            const newId = res.data.Results?.doctor?.doctorId;
            if (!editingId && selectedPhotoFile && newId) {
                const uploadData = new FormData();
                uploadData.append('file', selectedPhotoFile); uploadData.append('type', 'doctor'); uploadData.append('id', newId);
                await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            if (!editingId && selectedQrFile && newId) {
                const uploadData = new FormData();
                uploadData.append('file', selectedQrFile); uploadData.append('type', 'doctor_qr'); uploadData.append('id', newId);
                await axios.post('/api/Files/UploadPhoto', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            setShowForm(false);
            resetForm();
            fetchDoctors();

            if (!editingId && res.data.Results?.loginUsername) {
                setCredentials({ username: res.data.Results.loginUsername, password: res.data.Results.loginPassword });
            } else {
                toast.success(editingId ? 'Doctor updated successfully' : 'Doctor created successfully');
            }
        } catch (e) {
            console.error('Save failed', e);
            toast.error('Failed to save doctor');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = (doc) => {
        const newStatus = !doc.isActive;
        setConfirm({
            title: newStatus ? 'Activate doctor' : 'Deactivate doctor',
            message: `${newStatus ? 'Activate' : 'Deactivate'} ${doc.fullName}? ${!newStatus ? 'They will not be able to log in.' : ''}`,
            confirmLabel: newStatus ? 'Activate' : 'Deactivate',
            danger: !newStatus,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await axios.put(`/api/Doctor/${doc.doctorId}/ToggleStatus`);
                    fetchDoctors();
                    toast.success(`${doc.fullName} ${newStatus ? 'activated' : 'deactivated'}`);
                } catch (e) { toast.error('Failed to change status'); }
            },
        });
    };

    const handleResetPassword = async () => {
        if (!resetPwdDoctor) return;
        try {
            const res = await axios.put(`/api/Doctor/${resetPwdDoctor.doctorId}/ResetPassword`, { password: resetPwdValue });
            if (res.data.Status === 'OK') toast.success(`Password reset for ${resetPwdDoctor.fullName}`);
            else toast.error(res.data.ErrorMessage || 'Reset failed');
        } catch (e) { toast.error('Failed to reset password'); }
        setResetPwdDoctor(null); setResetPwdValue('');
    };

    const handleRepair = () => {
        setConfirm({
            title: 'Repair doctor accounts',
            message: 'This creates login accounts for all doctors without one. Each gets a one-time password shown after it runs — share them directly.',
            confirmLabel: 'Repair all',
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const res = await axios.post('/api/Doctor/Repair');
                    if (res.data.Results) toast.success(res.data.Results);
                    fetchDoctors();
                } catch (e) { toast.error('Failed to repair doctor accounts'); }
            },
        });
    };

    const filteredDoctors = doctors.filter(d => {
        if (filter === 'active' && !d.isActive) return false;
        if (filter === 'inactive' && d.isActive) return false;
        if (filter === 'no-login' && d.employeeId) return false;
        if (search) {
            const q = search.toLowerCase();
            return (d.fullName || '').toLowerCase().includes(q) || (d.department || '').toLowerCase().includes(q) ||
                (d.specialization || '').toLowerCase().includes(q) || (d.userName || '').toLowerCase().includes(q);
        }
        return true;
    });

    const totalCount = doctors.length;
    const activeCount = doctors.filter(d => d.isActive).length;
    const inactiveCount = doctors.filter(d => !d.isActive).length;
    const noLoginCount = doctors.filter(d => !d.employeeId).length;

    const autoUsername = form.fullName ? (form.fullName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'doctor') : '';
    const usernameSuggestions = (() => {
        if (!form.fullName) return [];
        const parts = form.fullName.trim().toLowerCase().split(' ').map(p => p.replace(/[^a-z0-9]/g, ''));
        const first = parts[0] || '';
        const last = parts[parts.length - 1] !== first ? parts[parts.length - 1] : '';
        const options = [];
        if (first) {
            if (last) { options.push(`${first}.${last}`, `${first}_${last}`, `${first}${last}`); }
            else { options.push(first, `${first}123`); }
        }
        return [...new Set(options)].filter(o => o !== form.userName);
    })();

    return (
        <div className="space-y-5">
            <PageHeader
                title="Doctors"
                description="Manage doctor profiles, credentials and availability."
                icon={Stethoscope}
                actions={
                    <>
                        {noLoginCount > 0 && (
                            <Button variant="outline" onClick={handleRepair} className="border-warning/40 text-warning hover:bg-warning-subtle">
                                <Wrench /> Repair ({noLoginCount})
                            </Button>
                        )}
                        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
                            {showForm ? <X /> : <Plus />} {showForm ? 'Close' : 'Add doctor'}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Total" value={totalCount} icon={Stethoscope} />
                <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
                <StatCard label="Inactive" value={inactiveCount} icon={UserX} />
                <StatCard label="No login" value={noLoginCount} icon={AlertTriangle} tone={noLoginCount > 0 ? 'warning' : 'neutral'} />
            </div>

            {noLoginCount > 0 && (
                <Card className="flex items-center gap-3 border-warning/30 bg-warning-subtle p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                    <div>
                        <p className="text-sm font-semibold text-warning">{noLoginCount} doctor(s) without login accounts</p>
                        <p className="text-xs text-warning/80">Click <strong>Repair</strong> to create accounts — each gets a one-time password shown after it runs.</p>
                    </div>
                </Card>
            )}

            <AnimatePresence initial={false}>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Card className="p-0">
                            <form onSubmit={handleSave} className="space-y-5 p-6">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {editingId ? 'Edit doctor' : 'New doctor'}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-muted/20 p-5">
                                        <div className="relative">
                                            <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                                                {(photoPreviewUrl || form.photoPath) && <AvatarImage src={photoPreviewUrl || form.photoPath} alt="" />}
                                                <AvatarFallback><User className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
                                            </Avatar>
                                            {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
                                        </div>
                                        <Label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent">
                                            {uploading ? 'Uploading…' : (form.photoPath || photoPreviewUrl ? 'Change photo' : 'Upload photo')}
                                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">JPEG or PNG, maximum 5MB</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-muted/20 p-5">
                                        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-4 border-background bg-muted shadow-md">
                                            {uploadingQr && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
                                            {(qrPreviewUrl || form.consultationQrPath) ? (
                                                <img src={qrPreviewUrl || form.consultationQrPath} alt="QR preview" className="h-full w-full bg-background object-contain" />
                                            ) : <QrCode className="h-7 w-7 text-muted-foreground" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent">
                                                {uploadingQr ? 'Uploading…' : (form.consultationQrPath || qrPreviewUrl ? 'Change QR' : 'Upload QR')}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleQrChange} disabled={uploadingQr} />
                                            </Label>
                                            {(form.consultationQrPath || qrPreviewUrl) && (
                                                <Button type="button" variant="outline" size="sm" onClick={handleRemoveQr} className="text-destructive hover:bg-destructive-subtle">Remove</Button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">JPEG or PNG, maximum 5MB</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div><Label className="mb-1.5 block">Full name</Label><Input required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Enter doctor full name" /></div>
                                    <div>
                                        <Label className="mb-1.5 block">Department</Label>
                                        <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div><Label className="mb-1.5 block">Specialization</Label><Input value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="e.g. PAEDIATRICS" /></div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div><Label className="mb-1.5 block">Qualifications / Degree</Label><Input value={form.qualifications} onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))} placeholder="e.g. MD PAEDIATRICS (JAIPUR)" /></div>
                                    <div><Label className="mb-1.5 block">Medical Registration No.</Label><Input value={form.registrationNumber} onChange={e => setForm(p => ({ ...p, registrationNumber: e.target.value }))} placeholder="e.g. KMC-12345" /></div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                                    <div><Label className="mb-1.5 block">Phone</Label><Input type="tel" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="Enter phone number" /></div>
                                    <div><Label className="mb-1.5 block">Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Enter email address" /></div>
                                    <div><Label className="mb-1.5 block">Shift start</Label><Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} /></div>
                                    <div><Label className="mb-1.5 block">Shift end</Label><Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} /></div>
                                    <div>
                                        <Label className="mb-1.5 block">Status</Label>
                                        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                            <option value="On Duty">On Duty</option><option value="Off Duty">Off Duty</option><option value="On Leave">On Leave</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Key className="h-3 w-3" /> Login credentials
                                    </p>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="mb-1.5 block">Username <span className="font-normal text-muted-foreground">(auto-generated if blank)</span></Label>
                                            <Input
                                                value={form.userName}
                                                onChange={e => setForm(p => ({ ...p, userName: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                                                placeholder={autoUsername || 'doctor.name'}
                                            />
                                            {!editingId && !form.userName && form.fullName && (
                                                <p className="mt-1 text-[11px] text-muted-foreground">Will auto-create as: <strong className="text-foreground">{autoUsername}</strong></p>
                                            )}
                                            {usernameSuggestions.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {usernameSuggestions.map(opt => (
                                                        <button key={opt} type="button" onClick={() => setForm(p => ({ ...p, userName: opt }))}
                                                                className="rounded border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent">
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block">Password {!editingId && <span className="font-normal text-muted-foreground">(leave blank to generate one)</span>}</Label>
                                            <Input
                                                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                                placeholder={editingId ? 'Leave blank to keep current' : 'Leave blank to generate a one-time password'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? 'Saving…' : (editingId ? 'Update doctor' : 'Create doctor')}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
                                </div>
                            </form>
                        </Card>

                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, department, specialization or username…" className="pl-9" />
                </div>
                <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
                    {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive'], ['no-login', 'No login']].map(([key, label]) => (
                        <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}
                                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filter === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : filteredDoctors.length === 0 ? (
                <Card><EmptyState icon={Stethoscope} title="No doctors found" description="Try adjusting your search, or add a new doctor." /></Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredDoctors.map((doc, i) => (
                        <motion.div key={doc.doctorId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                            <Card className={cn('overflow-hidden p-0', !doc.isActive && 'opacity-70')}>
                                <div className="flex items-center gap-3 bg-muted/30 px-5 py-4">
                                    <Avatar className="h-11 w-11 shrink-0">
                                        {doc.photoPath && <AvatarImage src={doc.photoPath} alt="" />}
                                        <AvatarFallback className="bg-primary text-primary-foreground">{initials(doc.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-semibold">{doc.fullName}</h3>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Stethoscope className="h-3 w-3" /> {doc.department}{doc.specialization && ` · ${doc.specialization}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <Badge variant={doc.isActive ? 'success' : 'destructive'}>{doc.isActive ? 'Active' : 'Inactive'}</Badge>
                                        {doc.status && <Badge variant={STATUS_BADGE[doc.status] || 'secondary'}>{doc.status}</Badge>}
                                    </div>
                                </div>

                                <div className="space-y-1.5 px-5 py-3 text-xs text-muted-foreground">
                                    {doc.phoneNumber && <p className="tabular flex items-center gap-2"><Phone className="h-3 w-3" /> {doc.phoneNumber}</p>}
                                    {doc.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 shrink-0" /> {doc.email}</p>}
                                    {(doc.startTime || doc.endTime) && <p className="tabular flex items-center gap-2"><Clock className="h-3 w-3" /> {doc.startTime || '09:00'} – {doc.endTime || '17:00'}</p>}
                                    {doc.employeeId ? (
                                        <p className="flex items-center gap-1.5 text-info"><Key className="h-3 w-3" /> {doc.userName || 'linked'}</p>
                                    ) : (
                                        <p className="flex items-center gap-1.5 text-warning"><AlertTriangle className="h-3 w-3" /> No login</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 border-t px-5 py-3">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}><Edit3 /> Edit</Button>
                                    {doc.employeeId && (
                                        <Button variant="ghost" size="sm" onClick={() => setResetPwdDoctor(doc)} className="text-warning hover:bg-warning-subtle">
                                            <Lock /> Reset pwd
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(doc)}
                                            className={cn('ml-auto', doc.isActive ? 'text-destructive hover:bg-destructive-subtle' : 'text-success hover:bg-success-subtle')}>
                                        {doc.isActive ? <ToggleRight /> : <ToggleLeft />} {doc.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* New-doctor credentials */}
            <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
                <DialogContent className="sm:max-w-sm">
                    <div className="flex flex-col items-center text-center">
                        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle text-success"><CheckCircle2 className="h-7 w-7" /></span>
                        <DialogTitle>Doctor created successfully</DialogTitle>
                        <DialogDescription className="mt-1">Share these login credentials with the doctor.</DialogDescription>
                    </div>

                    {credentials && (
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                                <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Username</p><p className="font-mono text-base font-semibold">{credentials.username}</p></div>
                                <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(credentials.username)} title="Copy username"><Copy className="h-4 w-4" /></Button>
                            </div>
                            <div className="border-t" />
                            <div className="flex items-center justify-between">
                                <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Password</p><p className="font-mono text-base font-semibold">{credentials.password}</p></div>
                                <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(credentials.password)} title="Copy password"><Copy className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle p-3 text-xs text-warning">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The doctor will be prompted to change their password on first login.
                    </div>

                    <DialogFooter className="sm:flex-col sm:gap-2">
                        <Button variant="outline" className="w-full" onClick={() => credentials && navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`)}>
                            <Copy /> Copy both to clipboard
                        </Button>
                        <Button className="w-full" onClick={() => setCredentials(null)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generic confirm (activate/deactivate, repair) */}
            <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirm?.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirm?.onConfirm(); }}
                            className={confirm?.danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                        >
                            {confirm?.confirmLabel || 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset password */}
            <Dialog open={!!resetPwdDoctor} onOpenChange={(o) => { if (!o) { setResetPwdDoctor(null); setResetPwdValue(''); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Lock className="h-[18px] w-[18px] text-warning" /> Reset password</DialogTitle>
                        <DialogDescription>
                            Resetting password for <strong className="text-foreground">{resetPwdDoctor?.fullName}</strong>
                            {resetPwdDoctor?.userName && <span> ({resetPwdDoctor.userName})</span>}
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="mb-1.5 block">New password</Label>
                        <Input value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} placeholder="Leave blank to generate a one-time password" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setResetPwdDoctor(null); setResetPwdValue(''); }}>Cancel</Button>
                        <Button onClick={handleResetPassword} className="bg-warning text-warning-foreground hover:bg-warning/90">Reset password</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorManagementPage;
