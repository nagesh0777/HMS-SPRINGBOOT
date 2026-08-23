import React, { useState, useEffect, useRef } from 'react';
import {
    Clock, CheckCircle, AlertCircle, Search,
    User as UserIcon, Calendar as CalendarIcon,
    Layout, LogIn, LogOut, FileText, ChevronRight, Users,
    Trash2, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const Attendance = () => {
    const toast = useToast();
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Confirmation Modal States
    const [deleteRecordId, setDeleteRecordId] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [activeStaff, setActiveStaff] = useState([]);
    const [completedRecords, setCompletedRecords] = useState([]);

    // Manual Entry Fields
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualTime, setManualTime] = useState(new Date().toTimeString().slice(0, 5));
    const [manualRemarks, setManualRemarks] = useState('');
    const [isManualEntry, setIsManualEntry] = useState(false);

    const userRole = localStorage.getItem('role') || 'Staff';
    const isProcessing = useRef(false);

    useEffect(() => {
        refreshAllData();
    }, []);

    const refreshAllData = async () => {
        try {
            const [attRes, empRes] = await Promise.all([
                axios.get('/api/Attendance/All'),
                axios.get('/api/Employee/Employees')
            ]);

            if (attRes.data && attRes.data.Status === 'OK' && empRes.data && empRes.data.Status === 'OK') {
                const logs = Array.isArray(attRes.data.Results) ? attRes.data.Results : [];
                const emps = Array.isArray(empRes.data.Results) ? empRes.data.Results : [];
                setEmployees(emps);
                processAttendanceLogic(logs, emps);
            }
        } catch (e) {
            console.error("Data refresh failed", e);
        }
    };

    const processAttendanceLogic = (logs, emps) => {
        if (!emps.length) return;
        const empMap = {};
        emps.forEach(e => empMap[e.employeeId] = e);

        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const active = {};
        const finished = [];

        sortedLogs.forEach(entry => {
            if (!entry || !entry.employeeId) return;
            const empId = entry.employeeId;
            const type = entry.type;
            const timestamp = entry.timestamp;

            if (type === 'ClockIn') {
                active[empId] = entry;
            } else if (type === 'ClockOut') {
                if (active[empId]) {
                    const start = new Date(active[empId].timestamp);
                    const end = new Date(timestamp);
                    const diffMs = end.getTime() - start.getTime();
                    const diffHrs = (diffMs > 0) ? (diffMs / (1000 * 60 * 60)).toFixed(2) : "0.00";

                    if (empMap[empId]) {
                        finished.push({
                            ...empMap[empId],
                            date: start.toLocaleDateString(),
                            in: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            out: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            duration: diffHrs,
                            rawDate: start,
                            idIn: active[empId].attendanceId,
                            idOut: entry.attendanceId
                        });
                    }
                    delete active[empId];
                }
            }
        });

        const activeList = Object.values(active)
            .filter(log => empMap[log.employeeId])
            .map(log => ({
                ...empMap[log.employeeId],
                clockInTime: log.timestamp,
                attendanceId: log.attendanceId
            }));

        setActiveStaff(activeList);
        setCompletedRecords(finished.sort((a, b) => b.rawDate - a.rawDate));
    };

    const formatDateForBackend = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${h}:${min}`;
    };

    const submitAttendance = async (empId, type = null, customTimestamp = null, remarks = "") => {
        if (isProcessing.current && !customTimestamp) return;
        try {
            if (!customTimestamp) isProcessing.current = true;
            setLoading(true);
            setError(null);

            const payload = {
                employeeId: empId,
                type: type || null,
                timestamp: customTimestamp || formatDateForBackend(new Date()),
                remarks: remarks || manualRemarks
            };

            const res = await axios.post('/api/Attendance/ScanRecord', payload);
            if (res.data && res.data.Status === 'OK') {
                setScanResult(res.data.Results);
                refreshAllData();
                if (customTimestamp) {
                    setManualRemarks('');
                    setIsManualEntry(false);
                } else {
                    setSelectedEmployee(null);
                    setSearchQuery('');
                }

                setTimeout(() => {
                    setScanResult(null);
                    isProcessing.current = false;
                }, 3000);
            } else {
                setError(res.data?.ErrorMessage || "Logging failed");
                isProcessing.current = false;
            }
        } catch (err) {
            setError("Server connection failed");
            isProcessing.current = false;
        } finally {
            setLoading(false);
        }
    };

    const deleteRecord = (id) => {
        setDeleteRecordId(id);
    };

    const handleConfirmDeleteRecord = async () => {
        if (!deleteRecordId) return;
        try {
            setLoading(true);
            const res = await axios.delete(`/api/Attendance/${deleteRecordId}`);
            if (res.data && res.data.Status === 'OK') refreshAllData();
            setDeleteRecordId(null);
        } catch (e) { setError("Delete failed"); }
        finally { setLoading(false); }
    };

    const resetSystemData = () => {
        setShowResetConfirm(true);
    };

    const handleConfirmReset = async () => {
        try {
            setLoading(true);
            const res = await axios.delete('/api/Attendance/ClearAll');
            if (res.data && res.data.Status === 'OK') {
                refreshAllData();
                toast.success("Attendance System Reset Successfully.");
            }
            setShowResetConfirm(false);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (!searchQuery?.trim()) {
            setFilteredEmployees([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const filtered = employees.filter(emp => {
            if (!emp) return false;
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            const idMatch = emp.employeeId?.toString().includes(q);
            return fullName.includes(q) || idMatch;
        });
        setFilteredEmployees(filtered.slice(0, 5));
    }, [searchQuery, employees]);

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-20 px-2 md:px-4">
            <header className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="p-5 bg-primary-600 text-white rounded-[1.5rem] shadow-2xl shadow-primary-200">
                        <Clock size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Staff Presence</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manual Attendance Management</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                    <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border border-gray-100 space-y-6 md:space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900">Staff Search</h2>
                            {userRole === 'Admin' && (
                                <button onClick={resetSystemData} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Reset All Data">
                                    <Trash2 size={24} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors" size={24} />
                                <input
                                    type="text"
                                    placeholder="Search Staff by Name or ID..."
                                    className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border-2 border-gray-100 focus:border-primary-500 outline-none font-bold text-lg shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Beautiful Scrollable Directory List */}
                            <div className="max-h-[350px] overflow-y-auto rounded-[2rem] border border-gray-100 bg-gray-50/50 p-2 space-y-2">
                                {employees.filter(emp => emp.role !== 'Doctor').filter(emp => {
                                    if (!searchQuery?.trim()) return true;
                                    const q = searchQuery.toLowerCase();
                                    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                                    return fullName.includes(q) || emp.employeeId?.toString().includes(q);
                                }).map(emp => {
                                    const clockedInRecord = activeStaff.find(a => a.employeeId === emp.employeeId);
                                    const isClockedIn = !!clockedInRecord;
                                    const isSelected = selectedEmployee?.employeeId === emp.employeeId;

                                    return (
                                        <div
                                            key={emp.employeeId}
                                            onClick={() => { setSelectedEmployee(emp); }}
                                            className={`flex items-center justify-between p-3.5 rounded-[1.25rem] transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500/10' 
                                                    : 'bg-white hover:bg-gray-100/50 border-transparent shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                                    <img 
                                                        src={emp.photoPath || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}&background=f3f4f6&color=374151&bold=true`} 
                                                        alt={emp.firstName} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 text-sm truncate">{emp.firstName} {emp.lastName}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">#{emp.employeeId}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-[9px] font-bold text-primary-600 uppercase tracking-wider">{emp.role}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isClockedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                    {isClockedIn ? 'IN' : 'OUT'}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        submitAttendance(emp.employeeId, isClockedIn ? 'ClockOut' : 'ClockIn');
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm transition-all active:scale-95 ${
                                                        isClockedIn 
                                                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' 
                                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                                                    }`}
                                                >
                                                    {isClockedIn ? <LogOut size={10} /> : <LogIn size={10} />}
                                                    {isClockedIn ? 'Out' : 'In'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {employees.filter(emp => emp.role !== 'Doctor').filter(emp => {
                                    if (!searchQuery?.trim()) return true;
                                    const q = searchQuery.toLowerCase();
                                    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                                    return fullName.includes(q) || emp.employeeId?.toString().includes(q);
                                }).length === 0 && (
                                    <div className="py-8 text-center text-gray-400 text-xs font-bold animate-pulse">No staff members found</div>
                                )}
                            </div>
                        </div>

                        {selectedEmployee && (
                            <div className="p-8 bg-gradient-to-br from-primary-50 to-white rounded-[3rem] border-2 border-primary-50 shadow-2xl space-y-8 animate-in zoom-in duration-500">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white shadow-lg overflow-hidden flex items-center justify-center p-0.5 border">
                                            <img 
                                                src={selectedEmployee.photoPath || `https://ui-avatars.com/api/?name=${selectedEmployee.firstName}+${selectedEmployee.lastName}&background=f3f4f6&color=374151&bold=true`} 
                                                alt="avatar" 
                                                className="rounded-xl w-full h-full object-cover" 
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-[0.2em]">#{selectedEmployee.employeeId} • {selectedEmployee.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsManualEntry(!isManualEntry)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isManualEntry ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600'}`}
                                    >
                                        {isManualEntry ? 'CLOSE MANUAL' : 'MANUAL ENTRY'}
                                    </button>
                                </div>

                                {isManualEntry ? (
                                    <div className="space-y-6 bg-white p-6 rounded-[2rem] border border-primary-50 shadow-sm">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary-500 outline-none font-bold"
                                                    value={manualDate}
                                                    onChange={(e) => setManualDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Time</label>
                                                <input
                                                    type="time"
                                                    className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary-500 outline-none font-bold"
                                                    value={manualTime}
                                                    onChange={(e) => setManualTime(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Remarks / Reason</label>
                                            <input
                                                type="text"
                                                placeholder="Reason for manual entry..."
                                                className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-primary-500 outline-none font-bold"
                                                value={manualRemarks}
                                                onChange={(e) => setManualRemarks(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockIn', `${manualDate}T${manualTime}`)}
                                                className="flex-1 h-14 md:h-16 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                                            >
                                                CLOCK-IN
                                            </button>
                                            <button
                                                onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockOut', `${manualDate}T${manualTime}`)}
                                                className="flex-1 h-14 md:h-16 bg-orange-600 text-white rounded-xl md:rounded-2xl font-black text-xs hover:bg-orange-700 transition-all shadow-lg active:scale-95"
                                            >
                                                CLOCK-OUT
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {activeStaff.some(a => a.employeeId === selectedEmployee.employeeId) ? (
                                            <button onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockOut')} className="h-16 md:h-20 bg-orange-600 text-white rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center gap-4 shadow-xl hover:bg-orange-700 transition-all active:scale-95 text-sm md:text-base animate-in fade-in duration-300">
                                                <LogOut size={24} /> CLOCK OUT NOW
                                            </button>
                                        ) : (
                                            <button onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockIn')} className="h-16 md:h-20 bg-blue-600 text-white rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center gap-4 shadow-xl hover:bg-blue-700 transition-all active:scale-95 text-sm md:text-base animate-in fade-in duration-300">
                                                <LogIn size={24} /> CLOCK IN NOW
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                    {scanResult && (
                        <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-2xl flex items-center gap-8 animate-in bounce-in">
                            <CheckCircle size={48} />
                            <div><h3 className="text-2xl font-black uppercase text-white">{scanResult.type} SUCCESS</h3><p className="font-bold opacity-90">ID: #{scanResult.employeeId} at {new Date(scanResult.timestamp).toLocaleTimeString()}</p></div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-500 p-8 rounded-[2.5rem] text-white shadow-2xl flex items-center gap-8 animate-in shake-in">
                            <AlertCircle size={48} />
                            <div><h3 className="text-2xl font-black uppercase text-white">SYSTEM ERROR</h3><p className="font-bold opacity-90">{error}</p></div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-50 bg-emerald-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-emerald-600">
                                <Users size={28} />
                                <h3 className="text-2xl font-black text-gray-900">On-Duty Staff</h3>
                            </div>
                            <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-[10px] font-black">
                                {activeStaff.length} ACTIVE
                            </span>
                        </div>
                        <div className="overflow-auto max-h-[400px]">
                            {activeStaff.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50"><th className="px-8 py-5">Staff</th><th className="px-8 py-5">Shift Start</th><th className="px-8 py-5 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {activeStaff.map(emp => (
                                            <tr key={emp.employeeId} className="hover:bg-emerald-50/20">
                                                <td className="px-8 py-6 font-black text-gray-900">{emp.firstName} {emp.lastName}</td>
                                                <td className="px-8 py-6 font-bold text-emerald-600">{new Date(emp.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                                    <button onClick={() => submitAttendance(emp.employeeId, 'ClockOut')} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all">STOP SHIFT</button>
                                                    <button onClick={() => deleteRecord(emp.attendanceId)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (<div className="py-20 text-center"><p className="text-gray-300 font-black uppercase text-xs">No active staff</p></div>)}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-primary-600"><FileText size={28} /><h3 className="text-2xl font-black text-gray-900">Shift History</h3></div>
                        </div>
                        <div className="overflow-auto max-h-[400px]">
                            {completedRecords.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50"><th className="px-8 py-5">Staff</th><th className="px-8 py-5">Date</th><th className="px-8 py-5">In/Out</th><th className="px-8 py-5 text-right">Hours</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {completedRecords.map((rec, i) => (
                                            <tr key={i} className="hover:bg-primary-50/20">
                                                <td className="px-8 py-6 font-black text-gray-900">{rec.firstName} {rec.lastName}</td>
                                                <td className="px-8 py-6 text-xs text-gray-400 font-bold">{rec.date}</td>
                                                <td className="px-8 py-6 text-xs font-bold">{rec.in} - {rec.out}</td>
                                                <td className="px-8 py-6 text-right flex items-center justify-end gap-4">
                                                    <span className="bg-gray-900 text-white px-3 py-1 rounded-lg text-xs font-black">{rec.duration}h</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => deleteRecord(rec.idIn)} className="p-1 text-gray-300 hover:text-red-400" title="Delete IN"><Trash2 size={12} /></button>
                                                        <button onClick={() => deleteRecord(rec.idOut)} className="p-1 text-gray-300 hover:text-red-400" title="Delete OUT"><Trash2 size={12} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (<div className="py-20 text-center"><p className="text-gray-300 font-black uppercase text-xs">No records today</p></div>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Record Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteRecordId}
                onClose={() => setDeleteRecordId(null)}
                onConfirm={handleConfirmDeleteRecord}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this specific staff shift attendance log? This will permanently affect work hour reports."
                confirmText="Delete Log"
                cancelText="Cancel"
                type="danger"
            />

            {/* Clear All Records Confirmation Modal */}
            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleConfirmReset}
                title="Reset All Attendance Data"
                message="CRITICAL WARNING:\n\nThis administrative action will permanently purge all shift logs, clock-in records, and work hour logs for the entire hospital staff database. This action is irreversible. Continue?"
                confirmText="Permanently Reset"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default Attendance;
