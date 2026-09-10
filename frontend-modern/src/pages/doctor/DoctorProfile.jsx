import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Mail, Phone, Clock, Shield, Save, Lock, User,
    Stethoscope, Edit3, Check, Eye, EyeOff, Key, RefreshCw,
    QrCode, UploadCloud, Trash2, AlertCircle, Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const FIELD = ({ label, icon: Icon, editing, children, value }) => (
    <div>
        <Label className="mb-1.5 flex items-center gap-1">
            {Icon && <Icon className="h-3 w-3" />} {label}
        </Label>
        {editing ? children : <p className="rounded-md bg-muted/40 px-3 py-2.5 text-sm">{value || '—'}</p>}
    </div>
);

const DoctorProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        fullName: '', department: 'OPD', specialization: '', phoneNumber: '', email: '',
        startTime: '09:00', endTime: '17:00',
        qualifications: '', registrationNumber: '',
    });

    const [showPwdForm, setShowPwdForm] = useState(false);
    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);

    useEffect(() => { fetchProfile(true); }, []);

    const fetchProfile = async (initial = false) => {
        if (initial) setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/MyProfile');
            if (res.data.Results) {
                const r = res.data.Results;
                setProfile(r);
                setForm({
                    fullName: r.fullName || '',
                    department: r.department || 'OPD',
                    specialization: r.specialization || '',
                    phoneNumber: r.phoneNumber || '',
                    email: r.email || '',
                    startTime: r.startTime || '09:00',
                    endTime: r.endTime || '17:00',
                    qualifications: r.qualifications || '',
                    registrationNumber: r.registrationNumber || '',
                });
            }
        } catch (e) {
            console.error('Failed to fetch profile', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.put('/api/DoctorPortal/MyProfile', form);
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Doctor profile updated successfully!' });
                setEditing(false);
                await fetchProfile(false);
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Update failed' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage(null);
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
            return;
        }
        try {
            const res = await axios.put('/api/DoctorPortal/ChangePassword', {
                oldPassword: pwdForm.oldPassword,
                newPassword: pwdForm.newPassword,
            });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setShowPwdForm(false);
                setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Password change failed' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to change password' });
        }
    };

    const uploadFile = async (file, type, successText, errorText) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('id', profile?.doctorId);
        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.post('/api/Files/UploadPhoto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: successText });
                fetchProfile();
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Upload failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: errorText });
        } finally {
            setSaving(false);
        }
    };

    const handleProfilePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file, 'doctor', 'Profile photo updated successfully!', 'Failed to upload profile photo');
    };
    const handleQrUpload = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file, 'doctor_qr', 'Consultation QR code uploaded successfully!', 'Failed to upload QR code');
    };

    const handleRemoveQr = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.put('/api/DoctorPortal/MyProfile', { consultationQrPath: '' });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Consultation QR code removed successfully!' });
                fetchProfile();
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Failed to remove QR code' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to remove QR code' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const p = profile || {};

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">My profile</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage your profile, availability and password.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchProfile} className="text-muted-foreground">
                    <RefreshCw className="h-[18px] w-[18px]" />
                </Button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    role="alert" aria-live="polite"
                    className={cn(
                        'flex items-center gap-2 rounded-lg border p-3.5 text-sm font-medium',
                        message.type === 'success' ? 'border-success/30 bg-success-subtle text-success' : 'border-destructive/30 bg-destructive-subtle text-destructive',
                    )}
                >
                    {message.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {message.text}
                </motion.div>
            )}

            <Card className="overflow-hidden p-0">
                <div className="border-b bg-muted/30 p-6">
                    <div className="flex items-center gap-5">
                        <div className="group relative">
                            <Avatar className="h-20 w-20 border">
                                {p.photoPath && <AvatarImage src={p.photoPath} alt="" />}
                                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(p.fullName)}</AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <UploadCloud className="h-5 w-5 text-white" />
                                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
                            </label>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-xl font-semibold">{p.fullName || 'Doctor'}</h2>
                                {p.qualifications && <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{p.qualifications}</span>}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {p.department || 'OPD'}</span>
                                {p.specialization && <span>· {p.specialization}</span>}
                                {p.registrationNumber && <span className="text-xs text-muted-foreground">· Reg: {p.registrationNumber}</span>}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1"><Key className="h-2.5 w-2.5" /> {p.userName}</Badge>
                                <Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FIELD label="Doctor's full name" icon={User} editing={editing} value={p.fullName}>
                                <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Dr. Firstname Lastname" required />
                            </FIELD>
                            <FIELD label="Qualifications / Degree" editing={editing} value={p.qualifications}>
                                <Input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} placeholder="e.g. MD PAEDIATRICS (JAIPUR)" />
                            </FIELD>
                            <FIELD label="Department" icon={Shield} editing={editing} value={p.department}>
                                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Paediatrics / OPD" />
                            </FIELD>
                            <FIELD label="Specialization" icon={Stethoscope} editing={editing} value={p.specialization}>
                                <Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. PAEDIATRICS" />
                            </FIELD>
                            <FIELD label="Medical registration no." editing={editing} value={p.registrationNumber}>
                                <Input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="e.g. KMC-12345" />
                            </FIELD>
                            <FIELD label="Phone number" icon={Phone} editing={editing} value={p.phoneNumber}>
                                <Input type="tel" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="98XXXXXXXX" />
                            </FIELD>
                            <FIELD label="Email" icon={Mail} editing={editing} value={p.email}>
                                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="doctor@hospital.com" />
                            </FIELD>
                            <div className="grid grid-cols-2 gap-3">
                                <FIELD label="Shift start" icon={Clock} editing={editing} value={p.startTime || '09:00'}>
                                    <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                                </FIELD>
                                <FIELD label="Shift end" icon={Clock} editing={editing} value={p.endTime || '17:00'}>
                                    <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                                </FIELD>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {editing ? (
                                <>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? 'Saving…' : 'Save changes'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => { setEditing(false); fetchProfile(); }}>Cancel</Button>
                                </>
                            ) : (
                                <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                                    <Edit3 /> Edit profile
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </Card>

            <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                        <Lock className="h-[18px] w-[18px] text-muted-foreground" /> Security
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPwdForm(!showPwdForm)}>
                        {showPwdForm ? 'Cancel' : 'Change password'}
                    </Button>
                </div>

                {showPwdForm ? (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">Current password</Label>
                            <div className="relative">
                                <Input
                                    type={showOld ? 'text' : 'password'} required value={pwdForm.oldPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))}
                                    placeholder="Enter current password" className="pr-10"
                                />
                                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <Label className="mb-1.5 block">New password</Label>
                                <div className="relative">
                                    <Input
                                        type={showNew ? 'text' : 'password'} required value={pwdForm.newPassword}
                                        onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                                        placeholder="Min 6 characters" className="pr-10"
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Confirm password</Label>
                                <Input
                                    type="password" required value={pwdForm.confirmPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="Repeat new password"
                                />
                            </div>
                        </div>
                        <Button type="submit"><Lock /> Update password</Button>
                    </form>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Your login username is <strong className="text-foreground">{p.userName}</strong>. Click "Change password" to update your login credentials.
                    </p>
                )}
            </Card>

            <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Consultation QR code</h3>
                    <Badge variant="secondary">Optional</Badge>
                </div>

                <div className="flex flex-col items-center gap-6 md:flex-row">
                    {p.consultationQrPath ? (
                        <div className="group relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2">
                            <img src={p.consultationQrPath} alt="Consultation QR code" className="h-full w-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <label className="cursor-pointer rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20">
                                    <UploadCloud className="h-[18px] w-[18px]" />
                                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                                </label>
                                <button onClick={handleRemoveQr} className="rounded-lg bg-destructive/80 p-2 text-white transition-colors hover:bg-destructive">
                                    <Trash2 className="h-[18px] w-[18px]" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="group flex h-36 w-36 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 transition-colors hover:border-foreground/30 hover:bg-accent/30">
                            <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">Upload QR</span>
                            <span className="mt-1 text-[10px] text-muted-foreground">PNG or JPG</span>
                            <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                        </label>
                    )}
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <p className="text-sm font-medium">Add your consultation payment or online clinic QR code.</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Uploading a QR code makes it convenient for patients to scan and pay or visit your consultation link.
                            If uploaded, it renders in the footer of all your printed prescriptions.
                        </p>
                        {p.consultationQrPath && (
                            <Badge variant="success" className="mt-1 gap-1"><Check className="h-3 w-3" /> Active on printed PDFs</Badge>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DoctorProfile;
