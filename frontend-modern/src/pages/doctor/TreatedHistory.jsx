import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Calendar, RefreshCw, User, FileText, Pill,
    CheckCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, History
} from 'lucide-react';
import { useToast } from '../../components/Toast';

const statusConfig = {
    initiated: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
    booked: { label: 'Booked', color: 'bg-blue-100 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
    CheckedIn: { label: 'Checked In', color: 'bg-amber-100 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
    InConsultation: { label: 'Consulting', color: 'bg-green-100 text-green-700 ring-green-200', dot: 'bg-green-500' },
    Completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 ring-emerald-250', dot: 'bg-emerald-500' },
    Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-650 ring-red-200', dot: 'bg-red-500' },
};

const TreatedHistory = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('Completed'); // default to Completed

    // Data State
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    const searchDebounce = useRef(null);

    // Fetch Treated History from API
    const fetchHistory = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.append('searchQuery', searchQuery);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (status) params.append('status', status);

            const res = await axios.get(`/api/DoctorPortal/TreatedHistory?${params.toString()}`);
            setHistory(res.data.Results || []);
            setCurrentPage(1); // Reset page on query change
        } catch (e) {
            console.error('Failed to load treated history', e);
            toast.error('Could not fetch history data.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, startDate, endDate, status, toast]);

    // Fetch on filter changes (with search debouncing)
    useEffect(() => {
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            fetchHistory();
        }, searchQuery ? 300 : 0);

        return () => clearTimeout(searchDebounce.current);
    }, [searchQuery, startDate, endDate, status, fetchHistory]);

    // Pagination Logic
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = history.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(history.length / recordsPerPage);

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const patientName = (a) => `${a.firstName || ''} ${a.lastName || ''}`.trim() || `Patient #${a.patientId}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <History size={28} className="text-teal-600" />
                        Treated Patient History
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and filter all clinical consultations and treated patients recorded under your profile.
                    </p>
                </div>
                <button
                    onClick={() => fetchHistory()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Advanced Filters Panel */}
            <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-0.5">Filter Records</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search filter */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Patient name, code, contact..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50/50 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Start Date filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 text-gray-400" size={16} />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50/50 focus:bg-white transition-all text-gray-600"
                        />
                    </div>

                    {/* End Date filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 text-gray-400" size={16} />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50/50 focus:bg-white transition-all text-gray-600"
                        />
                    </div>

                    {/* Status filter */}
                    <div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50/50 focus:bg-white transition-all text-gray-700 cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Completed">Completed</option>
                            <option value="InConsultation">In Consultation</option>
                            <option value="CheckedIn">Checked In</option>
                            <option value="initiated">Scheduled</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Quick Date Shortcuts */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100/60">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide self-center mr-1">Quick ranges:</span>
                    {[
                        { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { start: d, end: d }; } },
                        { label: 'Yesterday', getValue: () => { const y = new Date(); y.setDate(y.getDate() - 1); const d = y.toISOString().split('T')[0]; return { start: d, end: d }; } },
                        { label: 'Last 7 Days', getValue: () => { const s = new Date(); s.setDate(s.getDate() - 7); return { start: s.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }; } },
                        { label: 'Clear Filters', getValue: () => ({ start: '', end: '' }), isClear: true }
                    ].map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            onClick={() => {
                                const val = btn.getValue();
                                setStartDate(val.start);
                                setEndDate(val.end);
                                if (btn.isClear) {
                                    setSearchQuery('');
                                    setStatus('Completed');
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                btn.isClear 
                                ? 'bg-red-50 text-red-650 hover:bg-red-100 border-red-100'
                                : 'bg-slate-50 hover:bg-slate-100 text-gray-600 border-gray-100'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List / Table Area */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-3xl shadow-sm ring-1 ring-gray-100">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-gray-400 font-semibold">Loading Treated History...</p>
                    </div>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm ring-1 ring-gray-100">
                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <History size={28} />
                    </div>
                    <p className="font-extrabold text-gray-800 text-base">No consultation records found</p>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-sm mx-auto">
                        Try adjusting your search queries, date pickers, or status filters.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Card List (hidden on md+) */}
                    <div className="md:hidden space-y-3">
                        {currentRecords.map((appt) => {
                            const sc = statusConfig[appt.appointmentStatus] || statusConfig['initiated'];
                            const name = patientName(appt);
                            const dateObj = new Date(appt.appointmentDate);
                            return (
                                <div key={appt.appointmentId} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-base flex-shrink-0">
                                                {name[0] || 'P'}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm">{name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{appt.patientCode || `#${appt.patientId}`}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ${sc.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                            {sc.label}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Date</p>
                                            <p className="font-semibold text-gray-700">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Age / Gender</p>
                                            <p className="font-semibold text-gray-700">{appt.age ? `${appt.age} yrs` : '—'} / {appt.gender || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Type</p>
                                            <p className="font-semibold text-gray-700">{appt.appointmentType || 'Regular'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Contact</p>
                                            <p className="font-semibold text-gray-700">{appt.contactNumber || '—'}</p>
                                        </div>
                                    </div>
                                    {appt.reason && <p className="text-xs text-gray-500 italic truncate">"{appt.reason}"</p>}
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${appt.patientId}&patientName=${encodeURIComponent(name)}`)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all active:scale-95">
                                            <Pill size={13} /> Prescribe
                                        </button>
                                        <button onClick={() => navigate(`/dashboard/doctor/patient/${appt.patientId}`)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all">
                                            <FileText size={13} /> Profile
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table (hidden on mobile) */}
                    <div className="hidden md:block bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Date &amp; Time</th>
                                        <th className="px-6 py-4">Patient Profile</th>
                                        <th className="px-6 py-4">Demographics</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Reason / Notes</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-xs">
                                    {currentRecords.map((appt) => {
                                        const sc = statusConfig[appt.appointmentStatus] || statusConfig['initiated'];
                                        const name = patientName(appt);
                                        const dateObj = new Date(appt.appointmentDate);
                                        return (
                                            <tr key={appt.appointmentId} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="font-bold text-gray-800">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1"><Clock size={10} />{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center text-teal-600 font-black text-sm flex-shrink-0">{name[0] || 'P'}</div>
                                                        <div><p className="font-black text-gray-800 leading-snug">{name}</p><p className="text-[10px] text-gray-400 mt-0.5 font-mono">{appt.patientCode || `#${appt.patientId}`}</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600"><p className="font-semibold">{appt.age ? `Age ${appt.age}` : 'Age —'} • {appt.gender || '—'}</p><p className="text-[10px] text-gray-400 mt-0.5">{appt.contactNumber || 'No contact'}</p></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${appt.appointmentType?.toLowerCase().includes('emergency') ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>{appt.appointmentType || 'Regular'}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ring-1 uppercase tracking-wide ${sc.color}`}><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}</span></td>
                                                <td className="px-6 py-4 max-w-xs"><p className="font-medium text-gray-700 truncate">{appt.reason || '—'}</p></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => navigate(`/dashboard/doctor/prescriptions?patientId=${appt.patientId}&patientName=${encodeURIComponent(name)}`)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 rounded-xl text-[10px] font-black transition-all active:scale-95"><Pill size={11} />Prescribe</button>
                                                        <button onClick={() => navigate(`/dashboard/doctor/patient/${appt.patientId}`)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-150 border border-gray-100 rounded-xl text-[10px] font-black transition-all"><FileText size={11} />Profile</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 bg-white rounded-2xl shadow-xs ring-1 ring-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Page {currentPage} of {totalPages} ({history.length} records)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TreatedHistory;
