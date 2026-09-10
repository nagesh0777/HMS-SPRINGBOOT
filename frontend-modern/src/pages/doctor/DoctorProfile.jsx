import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Mail, Phone, Clock, Shield, Save, Lock, User,
    Stethoscope, Check, Eye, EyeOff, Key, RefreshCw,
    QrCode, UploadCloud, Trash2, AlertCircle, Loader2, Award,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const DoctorProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
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
        if (e && e.preventDefault) e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.put('/api/DoctorPortal/MyProfile', form);
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Doctor profile updated successfully!' });
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
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'File is too large. Max size is 5MB.' });
            return;
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        fd.append('id', p.doctorId);
        try {
            const res = await axios.post('/api/Files/UploadPhoto', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: successText });
                fetchProfile(false);
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || errorText });
            }
        } catch (err) {
            setMessage({ type: 'error', text: errorText });
        }
    };

    const handleProfilePhotoUpload = (e) => uploadFile(e.target.files[0], 'doctor', 'Profile photo updated.', 'Failed to upload photo.');
    const handleQrUpload = (e) => uploadFile(e.target.files[0], 'doctor_qr', 'Consultation QR code updated.', 'Failed to upload QR code.');

    const handleRemoveQr = async () => {
        try {
            await axios.put('/api/DoctorPortal/MyProfile', { consultationQrPath: '' });
            setMessage({ type: 'success', text: 'Consultation QR removed.' });
            fetchProfile(false);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to remove QR code.' });
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const p = profile || {};

    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Doctor Profile</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Customize your clinician name, qualifications, OPD department, and consultation QR.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => fetchProfile(false)} title="Refresh">
                        <RefreshCw className="h-[18px] w-[18px] text-muted-foreground" />
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Saving…' : 'Save profile'}
                    </Button>
                </div>
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

            {/* Profile Overview Card */}
            <Card className="overflow-hidden p-0">
                <div className="border-b bg-muted/30 p-6">
                    <div className="flex items-center gap-5">
                        <div className="group relative">
                            <Avatar className="h-20 w-20 border">
                                {p.photoPath && <AvatarImage src={p.photoPath} alt="" />}
                                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(form.fullName || p.fullName)}</AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <UploadCloud className="h-5 w-5 text-white" />
                                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
                            </label>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <h2 className="text-xl font-semibold">{form.fullName || p.fullName || 'Doctor'}</h2>
                                {(form.qualifications || p.qualifications) && (
                                    <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
                                        {form.qualifications || p.qualifications}
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {form.department || p.department || 'OPD'}</span>
                                {(form.specialization || p.specialization) && <span>· {form.specialization || p.specialization}</span>}
                                {(form.registrationNumber || p.registrationNumber) && <span className="text-xs text-muted-foreground">· Reg: {form.registrationNumber || p.registrationNumber}</span>}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1"><Key className="h-2.5 w-2.5" /> {p.userName}</Badge>
                                <Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="p-6">
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Doctor's full name
                                </Label>
                                <Input
                                    value={form.fullName}
                                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                                    placeholder="e.g. Dr. MALLIKARJUN KOBAL"
                                    required
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">Appears at top of prescription letterhead &amp; signature.</p>
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <Award className="h-3.5 w-3.5 text-muted-foreground" /> Qualifications / Degree
                                </Label>
                                <Input
                                    value={form.qualifications}
                                    onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
                                    placeholder="e.g. MD PAEDIATRICS (JAIPUR)"
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">Printed next to doctor's name on prescriptions.</p>
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Department
                                </Label>
                                <Input
                                    value={form.department}
                                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                    placeholder="e.g. PAEDIATRICS / OPD"
                                />
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" /> Specialization
                                </Label>
                                <Input
                                    value={form.specialization}
                                    onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                                    placeholder="e.g. PAEDIATRICS"
                                />
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    Medical registration no.
                                </Label>
                                <Input
                                    value={form.registrationNumber}
                                    onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))}
                                    placeholder="e.g. KMC-12345"
                                />
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone number
                                </Label>
                                <Input
                                    type="tel"
                                    value={form.phoneNumber}
                                    onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                    placeholder="98XXXXXXXX"
                                />
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                                </Label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="doctor@hospital.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Shift start
                                    </Label>
                                    <Input
                                        type="time"
                                        value={form.startTime}
                                        onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 flex items-center gap-1 font-medium">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Shift end
                                    </Label>
                                    <Input
                                        type="time"
                                        value={form.endTime}
                                        onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-xs text-muted-foreground">Changes save directly to your account &amp; prescription template.</p>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Saving…' : 'Save profile'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>

            {/* Consultation QR Card */}
            <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Consultation QR code</h3>
                    <Badge variant="secondary">Printed on Rx</Badge>
                </div>

                <div className="flex flex-col items-center gap-6 md:flex-row">
                    {p.consultationQrPath ? (
                        <div className="group relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2">
                            <img src={p.consultationQrPath} alt="QR" className="h-full w-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                <label className="cursor-pointer rounded-md p-2 text-white hover:bg-white/20" title="Replace QR">
                                    <UploadCloud className="h-4 w-4" />
                                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                                </label>
                                <button type="button" onClick={handleRemoveQr} className="rounded-md p-2 text-destructive-foreground hover:bg-destructive/80" title="Remove QR">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="flex h-36 w-36 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 transition-colors">
                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            <span className="mt-2 text-xs font-medium text-muted-foreground text-center px-2">Upload QR code image</span>
                            <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                        </label>
                    )}
                    <div className="space-y-1.5 text-sm">
                        <p className="font-medium">Upload your WhatsApp, Payment, or Teleconsultation QR</p>
                        <p className="text-xs text-muted-foreground">
                            This QR code appears directly at the bottom left of your printed prescriptions so patients can scan it to connect with you.
                        </p>
                        <div className="pt-1">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                                <UploadCloud className="h-3.5 w-3.5" /> Upload new QR
                                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Security / Password */}
            <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                        <Lock className="h-[18px] w-[18px] text-muted-foreground" /> Security &amp; password
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
        </div>
    );
};

export default DoctorProfile;
