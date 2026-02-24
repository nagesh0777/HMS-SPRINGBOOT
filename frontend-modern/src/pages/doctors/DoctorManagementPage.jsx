import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, User, Save, Clock, Search, Edit3, X, Check,
    Phone, Mail, Stethoscope, UserCheck, UserX,
    ToggleLeft, ToggleRight, Eye, Shield, Key,
    AlertTriangle, Wrench, Copy, Lock, RefreshCw, CheckCircle
} from 'lucide-react';

const DEPARTMENTS = ['OPD', 'Cardiology', 'Pediatrics', 'Gynaecology', 'Emergency', 'Orthopedics', 'Dermatology', 'Neurology', 'ENT', 'Ophthalmology', 'General Medicine', 'General Surgery'];

// Toast Notification Component
const Toast = ({ message, type, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold ${type === 'success' ? 'bg-green-600 text-white' :
                type === 'error' ? 'bg-red-600 text-white' :
                    'bg-blue-600 text-white'
            }`}>
        {type === 'success' ? <CheckCircle size={18} /> : type === 'error' ? <AlertTriangle size={18} /> : <Shield size={18} />}
        {message}
        <button onClick={onClose} className="ml-2 hover:opacity-80"><X size={14} /></button>
    </motion.div>
);

// Credentials Modal Component
const CredentialsModal = ({ credentials, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900">Doctor Created Successfully!</h2>
                <p className="text-sm text-gray-500 mt-1">Share these login credentials with the doctor</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</p>
                        <p className="text-lg font-black text-gray-900 font-mono">{credentials.username}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(credentials.username); }}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Copy username">
                        <Copy size={16} className="text-gray-500" />
                    </button>
                </div>
                <div className="border-t border-gray-200"></div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</p>
                        <p className="text-lg font-black text-gray-900 font-mono">{credentials.password}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(credentials.password); }}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Copy password">
                        <Copy size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    The doctor will be prompted to change password on first login
                </p>
            </div>

            <button onClick={() => { navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`); }}
                className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 mb-3">
                <Copy size={16} /> Copy Both to Clipboard
            </button>
            <button onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                Done
            </button>
        </motion.div>
    </motion.div>
);

// Confirm Dialog
const ConfirmDialog = ({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
            <div className="flex gap-3 mt-5">
                <button onClick={onCancel}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <button onClick={onConfirm}
                    className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors ${confirmColor || 'bg-red-600 hover:bg-red-700'}`}>
                    {confirmLabel || 'Confirm'}
                </button>
            </div>
        </motion.div>
    </motion.div>
);

// Reset Password Dialog
const ResetPasswordDialog = ({ doctor, onClose, onReset }) => {
    const [pwd, setPwd] = useState('');
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Lock size={18} className="text-amber-500" /> Reset Password
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Resetting password for <strong>{doctor.fullName}</strong>
                    {doctor.userName && <span className="text-gray-400"> ({doctor.userName})</span>}
                </p>
                <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                    <input type="text" value={pwd} onChange={e => setPwd(e.target.value)}
                        placeholder="Leave blank for default (pass123)"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onReset(pwd || 'pass123')}
                        className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">
                        Reset Password
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const DoctorManagementPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [saving, setSaving] = useState(false);

    // UI state
    const [toast, setToast] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [resetPwdDoctor, setResetPwdDoctor] = useState(null);

    const emptyForm = {
        fullName: '', department: 'OPD', specialization: '',
        phoneNumber: '', email: '', startTime: '09:00', endTime: '17:00',
        userName: '', password: ''
    };
    const [form, setForm] = useState({ ...emptyForm });

    const showToast = useCallback((text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

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
    };

    const openEdit = (doc) => {
        setForm({
            fullName: doc.fullName || '', department: doc.department || 'OPD',
            specialization: doc.specialization || '', phoneNumber: doc.phoneNumber || '',
            email: doc.email || '', startTime: doc.startTime || '09:00',
            endTime: doc.endTime || '17:00', userName: doc.userName || '', password: ''
        });
        setEditingId(doc.doctorId);
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim()) { showToast('Doctor name is required', 'error'); return; }
        setSaving(true);

        try {
            let res;
            if (editingId) {
                res = await axios.put(`/api/Doctor/${editingId}`, form);
            } else {
                res = await axios.post('/api/Doctor', form);
            }
            if (res.data.Status === 'Failed') {
                showToast(res.data.ErrorMessage || 'Operation failed', 'error');
                setSaving(false);
                return;
            }
            setShowForm(false);
            resetForm();
            fetchDoctors();

            if (!editingId && res.data.Results?.loginUsername) {
                // Show credentials modal for new doctors
                setCredentials({
                    username: res.data.Results.loginUsername,
                    password: res.data.Results.loginPassword
                });
            } else {
                showToast(editingId ? 'Doctor updated successfully' : 'Doctor created successfully');
            }
        } catch (e) {
            console.error('Save failed', e);
            showToast('Failed to save doctor', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = (doc) => {
        const newStatus = !doc.isActive;
        setConfirm({
            title: newStatus ? 'Activate Doctor' : 'Deactivate Doctor',
            message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${doc.fullName}? ${!newStatus ? 'They will not be able to login.' : ''}`,
            confirmLabel: newStatus ? 'Activate' : 'Deactivate',
            confirmColor: newStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await axios.put(`/api/Doctor/${doc.doctorId}/ToggleStatus`);
                    fetchDoctors();
                    showToast(`${doc.fullName} ${newStatus ? 'activated' : 'deactivated'}`);
                } catch (e) {
                    showToast('Failed to change status', 'error');
                }
            }
        });
    };

    const handleResetPassword = async (password) => {
        if (!resetPwdDoctor) return;
        try {
            const res = await axios.put(`/api/Doctor/${resetPwdDoctor.doctorId}/ResetPassword`, { password });
            if (res.data.Status === 'OK') {
                showToast(`Password reset for ${resetPwdDoctor.fullName}`);
            } else {
                showToast(res.data.ErrorMessage || 'Reset failed', 'error');
            }
        } catch (e) {
            showToast('Failed to reset password', 'error');
        }
        setResetPwdDoctor(null);
    };

    const handleRepair = () => {
        setConfirm({
            title: 'Repair Doctor Accounts',
            message: 'This will create login accounts for all doctors without one. Username format: dr.firstname, password: pass123. Continue?',
            confirmLabel: 'Repair All',
            confirmColor: 'bg-amber-600 hover:bg-amber-700',
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const res = await axios.post('/api/Doctor/Repair');
                    if (res.data.Results) showToast(res.data.Results);
                    fetchDoctors();
                } catch (e) {
                    showToast('Failed to repair doctor accounts', 'error');
                }
            }
        });
    };

    const filteredDoctors = doctors.filter(d => {
        if (filter === 'active' && !d.isActive) return false;
        if (filter === 'inactive' && d.isActive) return false;
        if (filter === 'no-login' && d.employeeId) return false;
        if (search) {
            const q = search.toLowerCase();
            return (d.fullName || '').toLowerCase().includes(q) ||
                (d.department || '').toLowerCase().includes(q) ||
                (d.specialization || '').toLowerCase().includes(q) ||
                (d.userName || '').toLowerCase().includes(q);
        }
        return true;
    });

    const totalCount = doctors.length;
    const activeCount = doctors.filter(d => d.isActive).length;
    const inactiveCount = doctors.filter(d => !d.isActive).length;
    const noLoginCount = doctors.filter(d => !d.employeeId).length;

    // Auto-generated username preview
    const autoUsername = form.fullName
        ? `dr.${form.fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'doctor'}`
        : '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Doctor Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage doctor profiles, credentials, and availability</p>
                </div>
                <div className="flex items-center gap-2">
                    {noLoginCount > 0 && (
                        <button onClick={handleRepair}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 hover:bg-amber-100 transition-all">
                            <Wrench size={16} /> Repair ({noLoginCount})
                        </button>
                    )}
                    <button
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
                    >
                        {showForm ? <X size={16} /> : <Plus size={16} />}
                        {showForm ? 'Close' : 'Add Doctor'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: totalCount, color: 'from-blue-500 to-blue-700', icon: <Stethoscope size={18} /> },
                    { label: 'Active', value: activeCount, color: 'from-green-500 to-emerald-600', icon: <UserCheck size={18} /> },
                    { label: 'Inactive', value: inactiveCount, color: 'from-gray-400 to-gray-600', icon: <UserX size={18} /> },
                    { label: 'No Login', value: noLoginCount, color: noLoginCount > 0 ? 'from-amber-500 to-orange-600' : 'from-gray-300 to-gray-400', icon: <AlertTriangle size={18} /> },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.color} p-4 text-white`}>
                        <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wider">
                            {s.icon} {s.label}
                        </div>
                        <p className="text-3xl font-black mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Warning: orphaned doctors */}
            {noLoginCount > 0 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">{noLoginCount} doctor(s) without login accounts</p>
                        <p className="text-xs text-amber-600 mt-0.5">Click <strong>Repair</strong> to auto-create login credentials (username: dr.firstname, password: pass123)</p>
                    </div>
                </div>
            )}

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleSave} className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 p-6 space-y-5">
                            <div className="flex items-center gap-2 text-blue-700 font-bold">
                                {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                                {editingId ? 'Edit Doctor' : 'New Doctor'}
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
                                    <input type="text" value={form.fullName} required
                                        onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                                        placeholder="Dr. Priya Sharma"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department *</label>
                                    <select value={form.department}
                                        onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Specialization</label>
                                    <input type="text" value={form.specialization}
                                        onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))}
                                        placeholder="e.g. Interventional Cardiology"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                            </div>

                            {/* Contact + Timing */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                    <input type="tel" value={form.phoneNumber}
                                        onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
                                        placeholder="98XXXXXXXX"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                    <input type="email" value={form.email}
                                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                        placeholder="doctor@hospital.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shift Start</label>
                                    <input type="time" value={form.startTime}
                                        onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shift End</label>
                                    <input type="time" value={form.endTime}
                                        onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                                </div>
                            </div>

                            {/* Login Credentials */}
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                    <Key size={12} /> Login Credentials
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            Username <span className="text-gray-400 font-normal">(auto-generated if blank)</span>
                                        </label>
                                        <input type="text" value={form.userName}
                                            onChange={e => setForm(p => ({ ...p, userName: e.target.value }))}
                                            placeholder={autoUsername || 'dr.firstname'}
                                            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        {!editingId && !form.userName && form.fullName && (
                                            <p className="text-[11px] text-blue-500 mt-1 font-medium">
                                                Will auto-create as: <strong>{autoUsername}</strong>
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            Password <span className="text-gray-400 font-normal">{!editingId ? '(default: pass123)' : ''}</span>
                                        </label>
                                        <input type="text" value={form.password}
                                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                            placeholder={editingId ? 'Leave blank to keep current' : 'Leave blank for default (pass123)'}
                                            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                    {saving ? 'Saving...' : (editingId ? 'Update Doctor' : 'Create Doctor')}
                                </button>
                                <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-4 top-3 text-gray-400" />
                    <input type="text" placeholder="Search by name, department, specialization, or username..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'active', label: 'Active' },
                        { key: 'inactive', label: 'Inactive' },
                        { key: 'no-login', label: 'No Login' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Doctor Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Stethoscope size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-gray-500">No doctors found</p>
                    <p className="text-sm mt-1">Try adjusting your search or add a new doctor</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDoctors.map((doc, i) => (
                        <motion.div
                            key={doc.doctorId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-all overflow-hidden ${!doc.isActive ? 'opacity-70' : ''}`}
                        >
                            {/* Card Header */}
                            <div className={`px-5 py-4 flex items-center gap-4 ${doc.isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-gray-50'}`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white ${doc.isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                                    {(doc.fullName || 'D')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{doc.fullName}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span className="flex items-center gap-1"><Stethoscope size={11} /> {doc.department}</span>
                                        {doc.specialization && <span className="text-gray-400">• {doc.specialization}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${doc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {doc.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {doc.employeeId ? (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                                            <Key size={9} /> {doc.userName || 'linked'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                                            <AlertTriangle size={9} /> No login
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="px-5 py-3 space-y-1.5">
                                {doc.phoneNumber && (
                                    <p className="flex items-center gap-2 text-xs text-gray-500">
                                        <Phone size={12} className="text-gray-400" /> {doc.phoneNumber}
                                    </p>
                                )}
                                {doc.email && (
                                    <p className="flex items-center gap-2 text-xs text-gray-500 truncate">
                                        <Mail size={12} className="text-gray-400" /> {doc.email}
                                    </p>
                                )}
                                {(doc.startTime || doc.endTime) && (
                                    <p className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock size={12} className="text-gray-400" /> {doc.startTime || '09:00'} – {doc.endTime || '17:00'}
                                    </p>
                                )}
                            </div>

                            {/* Card Actions */}
                            <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2">
                                <button onClick={() => openEdit(doc)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Edit3 size={12} /> Edit
                                </button>
                                {doc.employeeId && (
                                    <button onClick={() => setResetPwdDoctor(doc)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                                        <Lock size={12} /> Reset Pwd
                                    </button>
                                )}
                                <button onClick={() => toggleStatus(doc)}
                                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${doc.isActive
                                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                                        }`}>
                                    {doc.isActive ? <><ToggleRight size={12} /> Deactivate</> : <><ToggleLeft size={12} /> Activate</>}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modals & Overlays */}
            <AnimatePresence>
                {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}
                {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
                {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
                {resetPwdDoctor && <ResetPasswordDialog doctor={resetPwdDoctor} onClose={() => setResetPwdDoctor(null)} onReset={handleResetPassword} />}
            </AnimatePresence>
        </div>
    );
};

export default DoctorManagementPage;
