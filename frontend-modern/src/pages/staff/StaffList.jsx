import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Phone, MoreHorizontal, UserCheck, UserX, Camera } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const StaffList = () => {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'Admin') {
            navigate('/dashboard');
            return;
        }
        fetchStaff();
    }, []);

    useEffect(() => {
        if (activeTab === 'Logs') {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Employees');
            if (res.data.Results) {
                setStaffList(res.data.Results);
            }
        } catch (err) {
            console.error("Failed to fetch staff", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoadingLogs(true);
            const res = await axios.get('/api/Employee/Logs');
            if (res.data.Results) {
                setLogs(res.data.Results);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const roles = ['All', 'Helpdesk', 'Staff', 'Admin', 'Logs'];

    // Exclude Doctors - they have their own Doctor Management page
    const nonDoctorStaff = staffList.filter(s => s.role !== 'Doctor');

    const filteredStaff = nonDoctorStaff.filter(s => {
        const matchesSearch = (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = (activeTab === 'All' || activeTab === 'Logs') ? true : s.role === activeTab;
        return matchesSearch && matchesTab;
    });

    const userRole = localStorage.getItem('role') || 'Staff';

    const getStats = (role) => staffList.filter(s => s.role === role).length;

    const renderLogs = () => (
        <div className="space-y-4">
            {loadingLogs ? (
                <div className="py-20 text-center text-gray-400 font-bold">Fetching system logs...</div>
            ) : logs.length > 0 ? logs.map((log) => (
                <div key={log.logId} className="flex items-start gap-4 rounded-2xl bg-gray-50/50 p-4 ring-1 ring-gray-100 transition-all hover:bg-white hover:shadow-md">
                    <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-black text-[10px] ${log.action === 'DELETED' ? 'bg-red-100 text-red-700' :
                        log.action === 'CREATED' ? 'bg-green-100 text-green-700' :
                            log.action === 'STATUS_CHANGED' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                        }`}>
                        {log.action.substring(0, 3)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-gray-900">{log.employeeName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {new Date(log.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mt-0.5">{log.details}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Performed by: {log.performedBy}</p>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="py-20 text-center text-gray-400">No activity logs found.</div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Management</h1>
                    <p className="text-sm font-medium text-gray-500">Directory of hospital personnel categorized by roles and powers.</p>
                </div>
                {userRole === 'Admin' && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard/staff/qr')}
                            className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-6 py-3 font-black text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:-translate-y-1 active:scale-95"
                        >
                            <Camera size={20} className="text-primary-600" />
                            Staff QRs
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/staff/new')}
                            className="flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 font-black text-white shadow-xl shadow-gray-200 transition-all hover:bg-black hover:-translate-y-1 active:scale-95"
                        >
                            <UserPlus size={20} />
                            Add New Staff
                        </button>
                    </div>
                )}
            </div>

            {/* Role Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200">
                {roles.map(role => (
                    <button
                        key={role}
                        onClick={() => setActiveTab(role)}
                        className={`relative px-6 py-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === role ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {role}s
                        {(role !== 'All' && role !== 'Logs') && <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{getStats(role)}</span>}
                        {activeTab === role && (
                            <div className="absolute bottom-0 left-0 h-1 w-full bg-primary-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="p-4 md:p-6 pb-0">
                    {activeTab !== 'Logs' && (
                        <div className="mb-4 md:mb-8 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black" size={20} />
                                <input
                                    type="text"
                                    placeholder={`Search through ${activeTab}s...`}
                                    className="w-full rounded-2xl border-none bg-gray-50 pl-12 pr-4 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'Logs' ? renderLogs() : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
                                    <th className="px-6 py-4">Name & ID</th>
                                    <th className="px-6 py-4">Role / Dept</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-10 text-center">Loading staff records...</td></tr>
                                ) : filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                                    <tr key={staff.employeeId} className="group hover:bg-gray-50/50 transition-all">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md ring-2 ring-gray-100 transition-transform group-hover:scale-110">
                                                    <img src={`https://ui-avatars.com/api/?name=${staff.firstName}+${staff.lastName}&background=f3f4f6&color=374151&bold=true`} alt="" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">{staff.firstName} {staff.lastName}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">#EMP-{staff.employeeId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1.5">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${staff.role === 'Admin' ? 'bg-purple-50 text-purple-700 ring-purple-100' :
                                                    staff.role === 'Doctor' ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                                        staff.role === 'Helpdesk' ? 'bg-orange-50 text-orange-700 ring-orange-100' :
                                                            'bg-gray-50 text-gray-700 ring-gray-100'
                                                    }`}>
                                                    {staff.role}
                                                </span>
                                                <p className="text-[11px] font-bold text-gray-400">{staff.department}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1.5 text-[11px] font-bold">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Phone size={14} className="text-primary-500" />
                                                    {staff.phoneNumber}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <Mail size={14} />
                                                    {staff.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${staff.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${staff.status === 'Active' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                {staff.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <button
                                                onClick={() => navigate(`/dashboard/staff/${staff.employeeId}`)}
                                                className="rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-900 hover:text-white hover:ring-gray-900"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <UserX size={48} className="opacity-20" />
                                                <p className="text-sm">No staff members found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffList;
