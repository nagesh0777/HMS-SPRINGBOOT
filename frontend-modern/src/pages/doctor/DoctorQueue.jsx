import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Phone, AlertTriangle, CheckCircle, Clock,
    User, Search, RefreshCw, ChevronRight, Zap,
    Stethoscope, Pill, FileText, UserCheck, X
} from 'lucide-react';

const statusFlow = ['initiated', 'booked', 'CheckedIn', 'InConsultation', 'Completed'];
const statusConfig = {
    initiated: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 ring-blue-200', dot: 'bg-blue-500', next: 'CheckedIn', nextLabel: 'Check In', nextIcon: <UserCheck size={13} /> },
    booked: { label: 'Booked', color: 'bg-blue-100 text-blue-700 ring-blue-200', dot: 'bg-blue-500', next: 'CheckedIn', nextLabel: 'Check In', nextIcon: <UserCheck size={13} /> },
    CheckedIn: { label: 'Checked In', color: 'bg-amber-100 text-amber-700 ring-amber-200', dot: 'bg-amber-500', next: 'InConsultation', nextLabel: 'Start Consult', nextIcon: <Play size={13} /> },
    InConsultation: { label: 'In Consultation', color: 'bg-green-100 text-green-700 ring-green-200', dot: 'bg-green-500', next: 'Completed', nextLabel: 'Complete', nextIcon: <CheckCircle size={13} /> },
    Completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400', next: null },
    Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600 ring-red-200', dot: 'bg-red-400', next: null },
};

const Toast = ({ message, type, onClose }) => (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
        {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
        {message}
        <button onClick={onClose} className="ml-2 hover:opacity-80"><X size={14} /></button>
    </motion.div>
);

const DoctorQueue = () => {
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // Default to active (not completed)
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/Queue');
            if (res.data.Results) setQueue(res.data.Results);
        } catch (e) {
            console.error('Failed to load queue', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); const interval = setInterval(fetchQueue, 30000); return () => clearInterval(interval); }, []);

    const updateStatus = async (appointmentId, newStatus, patientName) => {
        setUpdating(appointmentId);
        try {
            await axios.put(`/api/DoctorPortal/Queue/${appointmentId}/Status`, { status: newStatus });
            setQueue(prev => prev.map(a =>
                a.appointmentId === appointmentId ? { ...a, appointmentStatus: newStatus } : a
            ));
            const sc = statusConfig[newStatus];
            showToast(`${patientName} → ${sc?.label || newStatus}`);
        } catch (e) {
            console.error('Failed to update status', e);
            showToast('Failed to update status', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const filteredQueue = queue.filter(a => {
        if (filter === 'active' && (a.appointmentStatus === 'Completed' || a.appointmentStatus === 'Cancelled')) return false;
        if (filter !== 'all' && filter !== 'active' && a.appointmentStatus !== filter) return false;
        if (search) {
            const s = search.toLowerCase();
            const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            return name.includes(s) || (a.patientCode || '').toLowerCase().includes(s) || String(a.patientId).includes(s);
        }
        return true;
    });

    // Sort: emergency first, then InConsultation, then CheckedIn, then initiated, then Completed
    const statusOrder = { InConsultation: 0, CheckedIn: 1, initiated: 2, booked: 2, Completed: 3, Cancelled: 4 };
    const sorted = [...filteredQueue].sort((a, b) => {
        const aE = a.appointmentType?.toLowerCase().includes('emergency') ? -100 : 0;
        const bE = b.appointmentType?.toLowerCase().includes('emergency') ? -100 : 0;
        const aO = (statusOrder[a.appointmentStatus] ?? 3) + aE;
        const bO = (statusOrder[b.appointmentStatus] ?? 3) + bE;
        if (aO !== bO) return aO - bO;
        return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });

    const counts = {
        total: queue.length,
        waiting: queue.filter(a => a.appointmentStatus === 'initiated' || a.appointmentStatus === 'booked' || a.appointmentStatus === 'CheckedIn').length,
        inConsult: queue.filter(a => a.appointmentStatus === 'InConsultation').length,
        completed: queue.filter(a => a.appointmentStatus === 'Completed').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Patient Queue</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Today's appointments • <strong>{counts.waiting}</strong> waiting, <strong className="text-green-600">{counts.inConsult}</strong> in consultation, <strong>{counts.completed}</strong> completed
                    </p>
                </div>
                <button onClick={fetchQueue} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: counts.total, color: 'from-blue-500 to-blue-700' },
                    { label: 'Waiting', value: counts.waiting, color: 'from-amber-500 to-orange-600' },
                    { label: 'Active', value: counts.inConsult, color: 'from-green-500 to-emerald-600' },
                    { label: 'Done', value: counts.completed, color: 'from-gray-400 to-gray-600' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} px-4 py-3 text-white`}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">{s.label}</p>
                        <p className="text-2xl font-black">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Search by patient name or ID..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    {[
                        { key: 'active', label: 'Active' },
                        { key: 'all', label: 'All' },
                        { key: 'initiated', label: 'Scheduled' },
                        { key: 'CheckedIn', label: 'Checked In' },
                        { key: 'InConsultation', label: 'Consulting' },
                        { key: 'Completed', label: 'Done' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === f.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Queue List */}
            {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <User size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-semibold text-gray-500">No patients in queue</p>
                    <p className="text-sm mt-1">Patients will appear here when appointments are booked for today</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {sorted.map((appt, index) => {
                            const isEmergency = appt.appointmentType?.toLowerCase().includes('emergency');
                            const sc = statusConfig[appt.appointmentStatus] || statusConfig['initiated'];
                            const isActive = appt.appointmentStatus === 'InConsultation';
                            const patientName = `${appt.firstName || ''} ${appt.lastName || ''}`.trim() || `Patient #${appt.patientId}`;

                            return (
                                <motion.div
                                    key={appt.appointmentId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all hover:shadow-md ${isEmergency ? 'ring-red-300 bg-red-50/30' :
                                        isActive ? 'ring-green-300 bg-green-50/20' :
                                            'ring-gray-100'
                                        }`}
                                >
                                    {isEmergency && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                                    )}
                                    {isActive && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                                    )}

                                    <div className="p-5">
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            {/* Queue position */}
                                            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg ${isEmergency ? 'bg-red-500 text-white' :
                                                isActive ? 'bg-green-500 text-white' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {isEmergency ? <Zap size={20} /> : isActive ? <Stethoscope size={18} /> : index + 1}
                                            </div>

                                            {/* Patient Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-gray-900">{patientName}</h4>
                                                    {isEmergency && (
                                                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                                                            <AlertTriangle size={10} /> Emergency
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                                    <span>{appt.patientCode || `#${appt.patientId}`}</span>
                                                    {appt.gender && <><span>•</span><span>{appt.gender}</span></>}
                                                    {appt.age && <><span>•</span><span>Age: {appt.age}</span></>}
                                                    {appt.contactNumber && <><span>•</span><span><Phone size={10} className="inline" /> {appt.contactNumber}</span></>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${sc.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                                        {sc.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        <Clock size={12} className="inline mr-1" />
                                                        {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {appt.appointmentType && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                                            {appt.appointmentType}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                                {/* Status progression button */}
                                                {sc.next && (
                                                    <button
                                                        onClick={() => updateStatus(appt.appointmentId, sc.next, patientName)}
                                                        disabled={updating === appt.appointmentId}
                                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${sc.next === 'InConsultation' ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-200' :
                                                            sc.next === 'Completed' ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm shadow-blue-200' :
                                                                'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                            }`}
                                                    >
                                                        {updating === appt.appointmentId ? (
                                                            <RefreshCw size={13} className="animate-spin" />
                                                        ) : sc.nextIcon}
                                                        {sc.nextLabel}
                                                    </button>
                                                )}

                                                {/* Write Prescription — show during or after consultation */}
                                                {(appt.appointmentStatus === 'InConsultation' || appt.appointmentStatus === 'Completed') && (
                                                    <button
                                                        onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${appt.patientId}&patientName=${encodeURIComponent(patientName)}`)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                                                    >
                                                        <Pill size={13} /> Prescribe
                                                    </button>
                                                )}

                                                {/* View Patient Profile */}
                                                <button
                                                    onClick={() => navigate(`/dashboard/doctor/patient/${appt.patientId}`)}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors"
                                                    title="View Patient Profile"
                                                >
                                                    <FileText size={13} /> Details
                                                </button>
                                            </div>
                                        </div>

                                        {/* Reason / Notes */}
                                        {appt.reason && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                                <strong className="text-gray-600">Reason:</strong> {appt.reason}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default DoctorQueue;
