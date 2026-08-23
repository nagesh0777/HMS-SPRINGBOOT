import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Users, Clock, UserPlus, UserCheck, UserX,
    ClipboardList, BarChart2, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import StaffList from './StaffList';
import Attendance from './Attendance';
import EmployeeLogs from './EmployeeLogs';

const TABS = [
    { id: 'directory',   label: 'Staff Directory',  icon: Users,         path: '/dashboard/staff' },
    { id: 'attendance',  label: 'Attendance',        icon: Clock,         path: '/dashboard/staff/attendance' },
    { id: 'logs',        label: 'Activity Logs',     icon: ClipboardList, path: '/dashboard/staff/logs' },
];

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
    <div className={`flex items-center gap-4 rounded-2xl px-6 py-5 ${bg} ring-1 ring-white/10`}>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow-lg`}>
            <Icon size={22} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
        </div>
    </div>
);

const EmployeeManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = localStorage.getItem('role') || 'Staff';

    const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (userRole !== 'Admin') {
            navigate('/dashboard');
            return;
        }
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await axios.get('/api/Employee/Employees');
            if (res.data.Results) {
                const staff = res.data.Results.filter(s => s.role !== 'Doctor');
                setStats({
                    total: staff.length,
                    active: staff.filter(s => s.status === 'Active').length,
                    onLeave: staff.filter(s => s.status !== 'Active').length,
                });
            }
        } catch (e) {
            console.error('Failed to fetch employee stats', e);
        } finally {
            setStatsLoading(false);
        }
    };

    // Determine active tab from URL
    const getActiveTab = () => {
        const p = location.pathname;
        if (p.endsWith('/attendance')) return 'attendance';
        if (p.endsWith('/logs')) return 'logs';
        return 'directory';
    };
    const activeTab = getActiveTab();

    const handleTabChange = (tab) => {
        navigate(tab.path);
    };

    const renderSubView = () => {
        if (activeTab === 'attendance') return <Attendance embedded />;
        if (activeTab === 'logs') return <EmployeeLogs />;
        return <StaffList embedded onStatsRefresh={fetchStats} />;
    };

    return (
        <div className="space-y-0 pb-20">
            {/* ── Hero Banner ────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-8 mb-6">
                {/* Decorative blobs */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary-600/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/70">
                            <BarChart2 size={12} />
                            Employee Management
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                            Workforce Hub
                        </h1>
                        <p className="mt-1 text-sm font-medium text-white/50">
                            Manage staff, track attendance, and monitor activity across all departments.
                        </p>
                    </div>

                    {userRole === 'Admin' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => navigate('/dashboard/staff/attendance')}
                                className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition-all hover:bg-white/20 active:scale-95"
                            >
                                <Clock size={16} />
                                Mark Attendance
                            </button>
                            <button
                                onClick={() => navigate('/dashboard/staff/new')}
                                className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-primary-900/40 transition-all hover:bg-primary-400 hover:-translate-y-0.5 active:scale-95"
                            >
                                <UserPlus size={16} />
                                Add New Staff
                            </button>
                        </div>
                    )}
                </div>

                {/* Stat Cards */}
                <div className="relative z-10 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        icon={Users}
                        label="Total Employees"
                        value={statsLoading ? '...' : stats.total}
                        color="bg-blue-500"
                        bg="bg-white/5"
                    />
                    <StatCard
                        icon={UserCheck}
                        label="Active Staff"
                        value={statsLoading ? '...' : stats.active}
                        color="bg-emerald-500"
                        bg="bg-white/5"
                    />
                    <StatCard
                        icon={UserX}
                        label="On Leave / Inactive"
                        value={statsLoading ? '...' : stats.onLeave}
                        color="bg-orange-500"
                        bg="bg-white/5"
                    />
                </div>
            </div>

            {/* ── Inner Tab Navigation ────────────────────────────────── */}
            <div className="sticky top-[73px] z-10 mb-6 flex items-center gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all duration-200 ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            {isActive && <ChevronRight size={14} className="opacity-60" />}
                        </button>
                    );
                })}
            </div>

            {/* ── Sub-View Content ────────────────────────────────────── */}
            <div className="min-h-[400px]">
                {renderSubView()}
            </div>
        </div>
    );
};

export default EmployeeManagement;
