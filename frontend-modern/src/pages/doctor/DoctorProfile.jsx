import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Clock, Shield, Save, Lock,
    Stethoscope, Edit3, Check, Eye, EyeOff, Key, RefreshCw,
    QrCode, UploadCloud, Trash2
} from 'lucide-react';

const DoctorProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        specialization: '', phoneNumber: '', email: '',
        startTime: '09:00', endTime: '17:00',
        qualifications: '', registrationNumber: ''
    });

    // Password change
    const [showPwdForm, setShowPwdForm] = useState(false);
    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/MyProfile');
            if (res.data.Results) {
                setProfile(res.data.Results);
                setForm({
                    specialization: res.data.Results.specialization || '',
                    phoneNumber: res.data.Results.phoneNumber || '',
                    email: res.data.Results.email || '',
                    startTime: res.data.Results.startTime || '09:00',
                    endTime: res.data.Results.endTime || '17:00',
                    qualifications: res.data.Results.qualifications || '',
                    registrationNumber: res.data.Results.registrationNumber || ''
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
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setEditing(false);
                fetchProfile();
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
                newPassword: pwdForm.newPassword
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

    const handleProfilePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'doctor');
        formData.append('id', profile?.doctorId);

        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.post('/api/Files/UploadPhoto', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
                fetchProfile();
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Upload failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to upload profile photo' });
        } finally {
            setSaving(false);
        }
    };

    const handleQrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'doctor_qr');
        formData.append('id', profile?.doctorId);

        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.post('/api/Files/UploadPhoto', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.Status === 'OK') {
                setMessage({ type: 'success', text: 'Consultation QR code uploaded successfully!' });
                fetchProfile();
            } else {
                setMessage({ type: 'error', text: res.data.ErrorMessage || 'Upload failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to upload QR code' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveQr = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await axios.put('/api/DoctorPortal/MyProfile', {
                consultationQrPath: ""
            });
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
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const p = profile || {};

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your profile, availability, and password</p>
                </div>
                <button onClick={fetchProfile}
                    className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Message Banner */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl p-4 text-sm font-medium flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <Shield size={16} />}
                    {message.text}
                </motion.div>
            )}

            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100 overflow-hidden">
                {/* Banner */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-8">
                    <div className="flex items-center gap-5">
                        <div className="relative group w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
                            {p.photoPath ? (
                                <img src={p.photoPath} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-white">{(p.fullName || 'D')[0]}</span>
                            )}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                <UploadCloud size={20} className="text-white animate-pulse" />
                                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" />
                            </label>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{p.fullName || 'Doctor'}</h2>
                            <div className="flex items-center gap-3 mt-1 text-blue-200 text-sm">
                                <span className="flex items-center gap-1"><Shield size={14} /> {p.department || 'OPD'}</span>
                                {p.specialization && <span>• {p.specialization}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur text-white text-xs font-bold rounded-full flex items-center gap-1">
                                    <Key size={10} /> {p.userName}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-200'}`}>
                                    {p.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-5">
                    <form onSubmit={handleSave}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Qualifications (e.g. MD, MBBS)
                                </label>
                                {editing ? (
                                    <input type="text" value={form.qualifications}
                                        onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
                                        placeholder="e.g. MD, DM"
                                        className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                ) : (
                                    <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.qualifications || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Medical Registration No
                                </label>
                                {editing ? (
                                    <input type="text" value={form.registrationNumber}
                                        onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))}
                                        placeholder="e.g. KMC-12345"
                                        className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                ) : (
                                    <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.registrationNumber || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <Stethoscope size={12} className="inline mr-1" /> Specialization
                                </label>
                                {editing ? (
                                    <input type="text" value={form.specialization}
                                        onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                                        placeholder="e.g. Cardiologist"
                                        className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                ) : (
                                    <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.specialization || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <Phone size={12} className="inline mr-1" /> Phone Number
                                </label>
                                {editing ? (
                                    <input type="tel" value={form.phoneNumber}
                                        onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                        placeholder="98XXXXXXXX"
                                        className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                ) : (
                                    <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.phoneNumber || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    <Mail size={12} className="inline mr-1" /> Email
                                </label>
                                {editing ? (
                                    <input type="email" value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="doctor@hospital.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                ) : (
                                    <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.email || '—'}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        <Clock size={12} className="inline mr-1" /> Shift Start
                                    </label>
                                    {editing ? (
                                        <input type="time" value={form.startTime}
                                            onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    ) : (
                                        <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.startTime || '09:00'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        <Clock size={12} className="inline mr-1" /> Shift End
                                    </label>
                                    {editing ? (
                                        <input type="time" value={form.endTime}
                                            onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    ) : (
                                        <p className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">{p.endTime || '17:00'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-5">
                            {editing ? (
                                <>
                                    <button type="submit" disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                        <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" onClick={() => { setEditing(false); fetchProfile(); }}
                                        className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setEditing(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                                    <Edit3 size={16} /> Edit Profile
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </motion.div>

            {/* Change Password Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Lock size={18} className="text-amber-500" /> Security
                    </h3>
                    <button onClick={() => setShowPwdForm(!showPwdForm)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                        {showPwdForm ? 'Cancel' : 'Change Password'}
                    </button>
                </div>

                {showPwdForm ? (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                            <div className="relative">
                                <input type={showOld ? 'text' : 'password'} required value={pwdForm.oldPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))}
                                    placeholder="Enter current password"
                                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button type="button" onClick={() => setShowOld(!showOld)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                                <div className="relative">
                                    <input type={showNew ? 'text' : 'password'} required value={pwdForm.newPassword}
                                        onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                                        placeholder="Min 6 characters"
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                                <input type="password" required value={pwdForm.confirmPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="Repeat new password"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <button type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">
                            <Lock size={16} /> Update Password
                        </button>
                    </form>
                ) : (
                    <p className="text-sm text-gray-500">
                        Your login username is <strong className="text-gray-900">{p.userName}</strong>.
                        Click "Change Password" to update your login credentials.
                    </p>
                )}
            </motion.div>

            {/* Consultation QR Code Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <QrCode className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-900">Consultation QR Code</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 font-semibold rounded-full">Optional</span>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {p.consultationQrPath ? (
                        <div className="relative group w-36 h-36 border border-gray-200 rounded-2xl p-2 bg-gray-50 flex items-center justify-center overflow-hidden">
                            <img src={p.consultationQrPath} alt="Consultation QR Code" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                <label className="p-2 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer text-white transition-colors">
                                    <UploadCloud size={18} />
                                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                                </label>
                                <button onClick={handleRemoveQr} className="p-2 bg-red-600/80 hover:bg-red-600 rounded-xl text-white transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-36 h-36 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-blue-50/20 transition-all group">
                            <UploadCloud className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" size={24} />
                            <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors">Upload QR</span>
                            <span className="text-[10px] text-gray-400 mt-1">PNG or JPG</span>
                            <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                        </label>
                    )}
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <p className="text-sm font-semibold text-gray-700">Add your consultation payment or online clinic QR code.</p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Uploading your QR code makes it convenient for patients to scan and pay or visit your consultation link. 
                            If uploaded, this QR code will be dynamically rendered in the footer of all your printed prescriptions.
                        </p>
                        {p.consultationQrPath && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold mt-2">
                                <Check size={12} /> Active on Printed PDFs
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DoctorProfile;
