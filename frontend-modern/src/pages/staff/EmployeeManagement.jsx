import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Clock, UserPlus, UserCheck, UserX, ClipboardList } from 'lucide-react';
import axios from 'axios';
import StaffList from './StaffList';
import Attendance from './Attendance';
import EmployeeLogs from './EmployeeLogs';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'directory', label: 'Staff directory', icon: Users, path: '/dashboard/staff' },
    { id: 'attendance', label: 'Attendance', icon: Clock, path: '/dashboard/staff/attendance' },
    { id: 'logs', label: 'Activity logs', icon: ClipboardList, path: '/dashboard/staff/logs' },
];

const EmployeeManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = localStorage.getItem('role') || 'Staff';

    const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (userRole !== 'Admin') { navigate('/dashboard'); return; }
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const getActiveTab = () => {
        const p = location.pathname;
        if (p.endsWith('/attendance')) return 'attendance';
        if (p.endsWith('/logs')) return 'logs';
        return 'directory';
    };
    const activeTab = getActiveTab();

    const renderSubView = () => {
        if (activeTab === 'attendance') return <Attendance embedded />;
        if (activeTab === 'logs') return <EmployeeLogs />;
        return <StaffList embedded onStatsRefresh={fetchStats} />;
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Staff"
                description="Manage staff, track attendance and monitor activity across all departments."
                icon={Users}
                actions={
                    userRole === 'Admin' && (
                        <>
                            <Button variant="outline" onClick={() => navigate('/dashboard/staff/attendance')}><Clock /> Mark attendance</Button>
                            <Button onClick={() => navigate('/dashboard/staff/new')}><UserPlus /> Add new staff</Button>
                        </>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total employees" value={statsLoading ? '—' : stats.total} icon={Users} loading={statsLoading} />
                <StatCard label="Active staff" value={statsLoading ? '—' : stats.active} icon={UserCheck} tone="success" loading={statsLoading} />
                <StatCard label="On leave / inactive" value={statsLoading ? '—' : stats.onLeave} icon={UserX} tone={stats.onLeave > 0 ? 'warning' : 'neutral'} loading={statsLoading} />
            </div>

            <div className="sticky top-[57px] z-10 flex items-center gap-1 rounded-lg border bg-background/95 p-1 backdrop-blur">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => navigate(tab.path)}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}>
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    );
                })}
            </div>

            <div>{renderSubView()}</div>
        </div>
    );
};

export default EmployeeManagement;
