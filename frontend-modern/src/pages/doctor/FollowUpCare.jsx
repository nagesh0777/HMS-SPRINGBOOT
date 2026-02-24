import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Calendar, Clock, AlertTriangle, CheckCircle, X,
    FileText, Search, Filter, ChevronDown, Edit3, Heart
} from 'lucide-react';
import { useToast } from '../../components/Toast';

const priorityConfig = {
    routine: { label: 'Routine', color: 'bg-blue-100 text-blue-700', ring: 'ring-blue-200' },
    urgent: { label: 'Urgent', color: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200' },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-700', ring: 'ring-red-200' },
};

const statusConfig = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    missed: { label: 'Missed', color: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

const FollowUpCare = () => {
    const toast = useToast();
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        patientId: '',
        followUpDate: '',
        careInstructions: '',
        treatmentPlan: '',
        reason: '',
        priority: 'routine',
        status: 'scheduled',
    });

    useEffect(() => { fetchFollowUps(); }, []);

    const fetchFollowUps = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/FollowUps');
            if (res.data.Results) setFollowUps(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch follow-ups', e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ patientId: '', followUpDate: '', careInstructions: '', treatmentPlan: '', reason: '', priority: 'routine', status: 'scheduled' });
        setEditingId(null);
    };

    const openEdit = (f) => {
        setForm({
            patientId: f.patientId || '',
            followUpDate: f.followUpDate || '',
            careInstructions: f.careInstructions || '',
            treatmentPlan: f.treatmentPlan || '',
            reason: f.reason || '',
            priority: f.priority || 'routine',
            status: f.status || 'scheduled',
        });
        setEditingId(f.followUpId);
        setShowForm(true);
    };

    const saveFollowUp = async () => {
        if (!form.patientId || !form.followUpDate) {
            toast.warning('Please enter Patient ID and Follow-up Date');
            return;
        }

        try {
            const payload = {
                ...form,
                patientId: parseInt(form.patientId),
            };

            let res;
            if (editingId) {
                res = await axios.put(`/api/DoctorPortal/FollowUps/${editingId}`, payload);
            } else {
                res = await axios.post('/api/DoctorPortal/FollowUps', payload);
            }

            if (res.data.Status === 'OK') {
                setShowForm(false);
                resetForm();
                fetchFollowUps();
            }
        } catch (e) {
            console.error('Failed to save follow-up', e);
        }
    };

    const markStatus = async (id, status) => {
        try {
            const fu = followUps.find(f => f.followUpId === id);
            if (!fu) return;
            await axios.put(`/api/DoctorPortal/FollowUps/${id}`, { ...fu, status });
            setFollowUps(prev => prev.map(f => f.followUpId === id ? { ...f, status } : f));
        } catch (e) {
            console.error('Failed to update status', e);
        }
    };

    const filtered = followUps.filter(f => {
        if (filter !== 'all' && f.status !== filter) return false;
        if (search) {
            const s = search.toLowerCase();
            return (f.patientName || '').toLowerCase().includes(s) || String(f.patientId).includes(s) || (f.reason || '').toLowerCase().includes(s);
        }
        return true;
    });

    const today = new Date().toISOString().split('T')[0];
    const dueToday = followUps.filter(f => f.followUpDate === today && f.status === 'scheduled');
    const overdue = followUps.filter(f => f.followUpDate < today && f.status === 'scheduled');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Follow-Up & Care Planning</h1>
                    <p className="text-sm text-gray-500 mt-1">Schedule follow-ups and manage treatment plans</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(!showForm); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-200 hover:shadow-xl transition-all"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Close' : 'Schedule Follow-Up'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl"><Calendar size={20} /></div>
                        <div>
                            <p className="text-2xl font-black">{dueToday.length}</p>
                            <p className="text-xs text-blue-100 font-medium">Due Today</p>
                        </div>
                    </div>
                </div>
                <div className={`rounded-2xl p-5 text-white shadow-lg ${overdue.length > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={20} /></div>
                        <div>
                            <p className="text-2xl font-black">{overdue.length}</p>
                            <p className="text-xs font-medium opacity-80">Overdue</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-5 text-white shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl"><CheckCircle size={20} /></div>
                        <div>
                            <p className="text-2xl font-black">{followUps.filter(f => f.status === 'completed').length}</p>
                            <p className="text-xs text-emerald-100 font-medium">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100 space-y-5">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Edit3 size={18} className="text-purple-500" />
                                {editingId ? 'Edit Follow-Up' : 'Schedule Follow-Up'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Patient ID *</label>
                                    <input
                                        type="number"
                                        value={form.patientId}
                                        onChange={e => setForm(prev => ({ ...prev, patientId: e.target.value }))}
                                        placeholder="Patient ID"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Follow-Up Date *</label>
                                    <input
                                        type="date"
                                        value={form.followUpDate}
                                        onChange={e => setForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    >
                                        <option value="routine">Routine</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reason for Follow-Up</label>
                                <input
                                    type="text"
                                    value={form.reason}
                                    onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="e.g., Post-surgery review, Lab result follow-up..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    <Heart size={12} className="inline text-red-400 mr-1" /> Care Instructions
                                </label>
                                <textarea
                                    value={form.careInstructions}
                                    onChange={e => setForm(prev => ({ ...prev, careInstructions: e.target.value }))}
                                    placeholder="Diet, exercise, medication reminders, lifestyle changes..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Long-Term Treatment Plan</label>
                                <textarea
                                    value={form.treatmentPlan}
                                    onChange={e => setForm(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                                    placeholder="Outline the long-term treatment strategy, milestones, and goals..."
                                    rows={4}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={saveFollowUp}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
                                >
                                    <CheckCircle size={16} /> {editingId ? 'Update' : 'Schedule'} Follow-Up
                                </button>
                                <button
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by patient, reason..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    {['all', 'scheduled', 'completed', 'missed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${filter === f ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Calendar size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No follow-ups found</p>
                    <p className="text-sm mt-1">Schedule a follow-up to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((fu, i) => {
                        const pc = priorityConfig[fu.priority] || priorityConfig.routine;
                        const sc = statusConfig[fu.status] || statusConfig.scheduled;
                        const isOverdue = fu.followUpDate < today && fu.status === 'scheduled';

                        return (
                            <motion.div
                                key={fu.followUpId || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all hover:shadow-md ${isOverdue ? 'ring-red-200 bg-red-50/50' : 'ring-gray-100'}`}
                            >
                                {isOverdue && <div className="mb-3 flex items-center gap-2 text-xs font-bold text-red-600"><AlertTriangle size={14} /> OVERDUE</div>}

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 p-3 rounded-xl bg-purple-100 text-purple-600">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {fu.patientName || `Patient #${fu.patientId}`}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-0.5">{fu.reason || 'Routine follow-up'}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock size={12} /> {fu.followUpDate}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.color}`}>
                                                    {pc.label}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {fu.status === 'scheduled' && (
                                            <>
                                                <button
                                                    onClick={() => markStatus(fu.followUpId, 'completed')}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                                >
                                                    <CheckCircle size={12} /> Complete
                                                </button>
                                                <button
                                                    onClick={() => markStatus(fu.followUpId, 'missed')}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                                >
                                                    <X size={12} /> Missed
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => openEdit(fu)}
                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {(fu.careInstructions || fu.treatmentPlan) && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                                        {fu.careInstructions && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <Heart size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase">Care Instructions</p>
                                                    <p className="text-gray-600">{fu.careInstructions}</p>
                                                </div>
                                            </div>
                                        )}
                                        {fu.treatmentPlan && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <FileText size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase">Treatment Plan</p>
                                                    <p className="text-gray-600">{fu.treatmentPlan}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FollowUpCare;
