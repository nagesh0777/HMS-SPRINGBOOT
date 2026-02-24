import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    HeartPulse,
    LayoutDashboard,
    Users,
    User,
    Calendar,
    Bed,
    Shield,
    LogOut,
    Clock,
    Menu,
    Building,
    X,
    Stethoscope,
    Pill,
    ClipboardList,
    Search,
    Activity,
    Bell,
    FileText,
    UserCog,
    BookOpen,
    Check,
    CheckCheck,
    AlertTriangle,
    FlaskConical,
    Settings,
    Zap,
    ExternalLink
} from 'lucide-react';

const notifTypeConfig = {
    appointment_reminder: { icon: <Calendar size={14} />, color: '#3b82f6', bg: '#eff6ff' },
    lab_result: { icon: <FlaskConical size={14} />, color: '#f59e0b', bg: '#fffbeb' },
    follow_up: { icon: <Clock size={14} />, color: '#8b5cf6', bg: '#f5f3ff' },
    emergency: { icon: <AlertTriangle size={14} />, color: '#ef4444', bg: '#fef2f2' },
    system: { icon: <Settings size={14} />, color: '#6b7280', bg: '#f9fafb' },
    default: { icon: <Bell size={14} />, color: '#3b82f6', bg: '#eff6ff' },
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activePath, setActivePath] = useState(window.location.pathname);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef(null);
    const userRole = localStorage.getItem('role') || 'Staff';
    const userName = localStorage.getItem('userName') || 'System User';

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await axios.get('/api/Notifications/UnreadCount');
                if (res.data.Results) setUnreadCount(res.data.Results.unread || 0);
            } catch (e) { /* silent */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [notifOpen]);

    const fetchNotifications = async () => {
        setNotifLoading(true);
        try {
            const res = await axios.get('/api/Notifications');
            if (res.data.Results) setNotifications(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        } finally {
            setNotifLoading(false);
        }
    };

    const toggleNotifPanel = () => {
        if (!notifOpen) fetchNotifications();
        setNotifOpen(!notifOpen);
    };

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await axios.put(`/api/Notifications/${id}/Read`);
            setNotifications(prev => prev.map(n =>
                n.notificationId === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { console.error('Failed to mark as read', e); }
    };

    const markAllRead = async (e) => {
        if (e) e.stopPropagation();
        try {
            await axios.put('/api/Notifications/ReadAll');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) { console.error('Failed to mark all read', e); }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
        { id: 'hospitals', label: 'Hospitals', icon: <Building size={20} />, path: '/dashboard/hospitals' },
        { id: 'patients', label: 'Patients', icon: <Users size={20} />, path: '/dashboard/patients' },
        { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments' },
        { id: 'adt', label: 'ADT', icon: <Bed size={20} />, path: '/dashboard/adt' },
        { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={20} />, path: '/dashboard/doctors' },
        { id: 'staff', label: 'Staff', icon: <Shield size={20} />, path: '/dashboard/staff' },
        { id: 'attendance', label: 'Attendance', icon: <Clock size={20} />, path: '/dashboard/staff/attendance' },
        { id: 'audit-log', label: 'Audit Trail', icon: <FileText size={20} />, path: '/dashboard/audit-log' },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, path: '/dashboard/notifications' },
        // Doctor Self-Service
        { id: 'doctor-dashboard', label: 'My Workspace', icon: <Activity size={20} />, path: '/dashboard/doctor' },
        { id: 'doctor-queue', label: 'Patient Queue', icon: <ClipboardList size={20} />, path: '/dashboard/doctor/queue' },
        { id: 'doctor-patient', label: 'Search Patient', icon: <Search size={20} />, path: '/dashboard/doctor/patient' },
        { id: 'doctor-prescriptions', label: 'Prescriptions', icon: <Pill size={20} />, path: '/dashboard/doctor/prescriptions' },
        { id: 'doctor-followups', label: 'Follow-Ups', icon: <UserCog size={20} />, path: '/dashboard/doctor/followups' },
        { id: 'doctor-profile', label: 'My Profile', icon: <User size={20} />, path: '/dashboard/doctor/profile' },
        // Portal Guide (all roles)
        { id: 'portal-guide', label: 'Portal Guide', icon: <BookOpen size={20} />, path: '/dashboard/guide' },
    ];

    const rolePermissions = {
        'SuperAdmin': ['dashboard', 'hospitals', 'portal-guide'],
        'Admin': ['dashboard', 'patients', 'appointments', 'adt', 'doctors', 'staff', 'attendance', 'audit-log', 'notifications', 'portal-guide'],
        'Doctor': ['doctor-dashboard', 'doctor-queue', 'doctor-patient', 'doctor-prescriptions', 'doctor-followups', 'doctor-profile', 'adt', 'notifications', 'portal-guide'],
        'Helpdesk': ['dashboard', 'patients', 'appointments', 'attendance', 'notifications', 'portal-guide'],
        'Staff': ['dashboard', 'patients', 'notifications', 'portal-guide']
    };

    const allowedItems = menuItems.filter(item =>
        (rolePermissions[userRole] || rolePermissions['Staff']).includes(item.id)
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('doctorId');
        localStorage.removeItem('employeeId');
        navigate('/login');
    };

    const panelNotifications = notifications.slice(0, 8);
    const panelUnread = notifications.filter(n => !n.isRead).length;

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-primary-600">
                        <HeartPulse className="h-8 w-8" />
                        <span className="text-xl font-bold tracking-tight">Trikaar EMR</span>
                    </div>
                    <button className="md:hidden p-2 text-gray-400" onClick={() => setIsSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="mt-6 px-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                    {allowedItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                setActivePath(item.path);
                                navigate(item.path);
                                setIsSidebarOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${activePath === item.path || (item.path !== '/dashboard' && activePath.startsWith(item.path + '/'))
                                ? 'bg-primary-50 text-primary-600 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                            {item.id === 'notifications' && unreadCount > 0 && (
                                <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-8 left-0 w-full px-4 text-center">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-gray-50/50 md:ml-64 transition-all duration-300">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur-md md:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            className="rounded-lg bg-gray-50 p-2 text-gray-600 md:hidden"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 md:text-2xl leading-tight">EMR System</h2>
                            <p className="hidden text-xs text-gray-500 md:block">Welcome back, {userName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Notification Bell + Dropdown */}
                        <div className="relative" ref={notifRef}>
                            <button
                                id="notification-bell-btn"
                                onClick={toggleNotifPanel}
                                className={`relative p-2 rounded-xl transition-all duration-200 ${notifOpen ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown Panel */}
                            {notifOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                                    style={{
                                        animation: 'notifSlideIn 0.2s ease-out',
                                        zIndex: 50,
                                    }}
                                >
                                    {/* Panel Header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex items-center gap-2">
                                            <Bell size={18} className="text-blue-600" />
                                            <span className="text-sm font-bold text-gray-900">Notifications</span>
                                            {panelUnread > 0 && (
                                                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                                                    {panelUnread} new
                                                </span>
                                            )}
                                        </div>
                                        {panelUnread > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-100"
                                            >
                                                <CheckCheck size={13} /> Mark all read
                                            </button>
                                        )}
                                    </div>

                                    {/* Panel Body */}
                                    <div className="max-h-[400px] overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'thin' }}>
                                        {notifLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : panelNotifications.length === 0 ? (
                                            <div className="text-center py-12 px-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                                    <Bell size={20} className="text-gray-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-500">No notifications yet</p>
                                                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                                            </div>
                                        ) : (
                                            panelNotifications.map((n, i) => {
                                                const tc = notifTypeConfig[n.type] || notifTypeConfig.default;
                                                return (
                                                    <div
                                                        key={n.notificationId || i}
                                                        className={`group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 border-b border-gray-50 last:border-0 ${n.isRead
                                                                ? 'bg-white hover:bg-gray-50'
                                                                : 'bg-blue-50/40 hover:bg-blue-50/70'
                                                            }`}
                                                        onClick={() => {
                                                            if (!n.isRead) markAsRead(n.notificationId);
                                                        }}
                                                    >
                                                        {/* Icon */}
                                                        <div
                                                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                                                            style={{ backgroundColor: tc.bg, color: tc.color }}
                                                        >
                                                            {tc.icon}
                                                        </div>
                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className={`text-xs leading-snug truncate ${n.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                                                                    {n.title}
                                                                </p>
                                                                {n.priority === 'urgent' && <Zap size={10} className="text-red-500 flex-shrink-0" />}
                                                                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                                <Clock size={9} /> {timeAgo(n.createdOn)}
                                                            </p>
                                                        </div>
                                                        {/* Mark read button */}
                                                        {!n.isRead && (
                                                            <button
                                                                onClick={(e) => markAsRead(n.notificationId, e)}
                                                                className="flex-shrink-0 p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Mark as read"
                                                            >
                                                                <Check size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Panel Footer */}
                                    {panelNotifications.length > 0 && (
                                        <div className="border-t border-gray-100">
                                            <button
                                                onClick={() => {
                                                    setNotifOpen(false);
                                                    setActivePath('/dashboard/notifications');
                                                    navigate('/dashboard/notifications');
                                                }}
                                                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                View All Notifications <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-gray-900 leading-none capitalize">{userName}</p>
                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{userRole}</p>
                        </div>
                        <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white shadow-md ring-2 ring-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=${userName}&background=0D8ABC&color=fff&bold=true`} alt="User" />
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Notification dropdown animation */}
            <style>{`
                @keyframes notifSlideIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;
