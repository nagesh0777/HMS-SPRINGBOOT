import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AICopilotPanel from '../components/AICopilotPanel';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
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
    ExternalLink,
    Receipt,
    Settings2,
    Package,
    TrendingUp,
    Database,
    ChevronLeft,
    ChevronRight,
    History
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
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const [activePath, setActivePath] = useState(window.location.pathname);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', isCollapsed);
    }, [isCollapsed]);

    const userRole = localStorage.getItem('role') || 'Staff';
    const userName = localStorage.getItem('userName') || 'System User';
    const isOwnerAdmin = userName.trim().toLowerCase() === 'nagesh';
    const effectiveRole = isOwnerAdmin ? 'SuperAdmin' : userRole;
    const subscriptionModules = (localStorage.getItem('subscriptionModules') || '').split(',').map(m => m.trim()).filter(Boolean);

    // Appointment popup notification (Doctor role only)
    const [apptPopup, setApptPopup] = useState(null);
    const apptPopupTimer = useRef(null);

    useEffect(() => {
        if (effectiveRole !== 'Doctor') return;
        const handler = (e) => {
            const { count, patientName, appointmentType, time } = e.detail;
            clearTimeout(apptPopupTimer.current);
            setApptPopup({ count, patientName, appointmentType, time });
            apptPopupTimer.current = setTimeout(() => setApptPopup(null), 10000);
        };
        window.addEventListener('new-appointment', handler);
        return () => {
            window.removeEventListener('new-appointment', handler);
            clearTimeout(apptPopupTimer.current);
        };
    }, [effectiveRole]);

    // Global Patient Command Search Pad
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Register Key Listener on Mount
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'F2') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Fetch matching patients with debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data?.Results || []);
            } catch (err) {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);
    const hasAiAccess = () => {
        if (effectiveRole === 'SuperAdmin') return true;
        if (subscriptionModules.includes('AI Copilot')) return true;
        const modules = localStorage.getItem('assignedModules') || '';
        return modules.split(',').map(m => m.trim()).includes('AICopilot');
    };

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

    const getMenuGroups = () => {
        if (effectiveRole === 'Doctor') {
            return [
                {
                    title: 'Clinical Workspace',
                    items: [
                        { id: 'doctor-dashboard', label: 'My Workspace', icon: <Activity size={20} />, path: '/dashboard/doctor' },
                        { id: 'doctor-queue', label: 'Patient Queue', icon: <ClipboardList size={20} />, path: '/dashboard/doctor/queue' },
                        { id: 'doctor-history', label: 'Treated History', icon: <History size={20} />, path: '/dashboard/doctor/history' },
                        { id: 'doctor-prescriptions', label: 'Prescriptions', icon: <Pill size={20} />, path: '/dashboard/doctor/prescriptions' },
                        { id: 'doctor-followups', label: 'Follow-Ups', icon: <UserCog size={20} />, path: '/dashboard/doctor/followups' },
                    ]
                },
                {
                    title: 'Ward Management',
                    items: [
                        { id: 'adt', label: 'ADT & Ward', icon: <Bed size={20} />, path: '/dashboard/adt' },
                    ]
                },
                {
                    title: 'Reference & Profile',
                    items: [
                        { id: 'doctor-profile', label: 'My Profile', icon: <User size={20} />, path: '/dashboard/doctor/profile' },
                        { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, path: '/dashboard/notifications' },
                        { id: 'portal-guide', label: 'Help & Guide', icon: <BookOpen size={20} />, path: '/dashboard/guide' },
                    ]
                }
            ];
        }

        return [
            {
                title: 'Core Workflow',
                items: [
                    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
                    { id: 'patients', label: 'Patients', icon: <Users size={20} />, path: '/dashboard/patients' },
                    { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments' },
                    { id: 'adt', label: 'ADT & Ward', icon: <Bed size={20} />, path: '/dashboard/adt' },
                ]
            },
            {
                title: 'Finance & Services',
                items: [
                    { id: 'billing', label: 'Billing', icon: <Receipt size={20} />, path: '/dashboard/billing' },
                    { id: 'service-catalog', label: 'Service Rates', icon: <Package size={20} />, path: '/dashboard/services' },
                ]
            },
            {
                title: 'Workforce',
                items: [
                    { id: 'doctors', label: 'Doctor Roster', icon: <Stethoscope size={20} />, path: '/dashboard/doctors' },
                    { id: 'employee-management', label: 'Employee Management', icon: <Shield size={20} />, path: '/dashboard/staff' },
                ]
            },
            {
                title: 'Doctor Workspace',
                items: [
                    { id: 'doctor-dashboard', label: 'My Workspace', icon: <Activity size={20} />, path: '/dashboard/doctor' },
                    { id: 'doctor-queue', label: 'Patient Queue', icon: <ClipboardList size={20} />, path: '/dashboard/doctor/queue' },
                    { id: 'doctor-history', label: 'Treated History', icon: <History size={20} />, path: '/dashboard/doctor/history' },
                    { id: 'doctor-prescriptions', label: 'Prescriptions', icon: <Pill size={20} />, path: '/dashboard/doctor/prescriptions' },
                    { id: 'doctor-followups', label: 'Follow-Ups', icon: <UserCog size={20} />, path: '/dashboard/doctor/followups' },
                ]
            },
            {
                title: 'Administration',
                items: [
                    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, path: '/dashboard/notifications' },
                    { id: 'hospital-settings', label: 'Settings', icon: <Settings2 size={20} />, path: '/dashboard/settings' },
                    { id: 'hospitals', label: 'Hospital Network', icon: <Building size={20} />, path: '/dashboard/hospitals' },
                    { id: 'portal-guide', label: 'Help & Guide', icon: <BookOpen size={20} />, path: '/dashboard/guide' },
                ]
            }
        ];
    };

    const menuGroups = getMenuGroups();

    const rolePermissions = {
        'SuperAdmin': ['dashboard', 'hospitals', 'portal-guide'],
        'Admin': ['dashboard', 'patients', 'appointments', 'doctors', 'adt', 'billing', 'service-catalog', 'employee-management', 'notifications', 'hospital-settings', 'portal-guide'],
        'Doctor': ['doctor-dashboard', 'doctor-queue', 'doctor-history', 'doctor-prescriptions', 'doctor-followups', 'adt', 'notifications', 'portal-guide', 'doctor-profile'],
        'Helpdesk': ['dashboard', 'patients', 'appointments', 'billing', 'employee-management', 'notifications', 'portal-guide'],
        'Staff': ['dashboard', 'patients', 'notifications', 'portal-guide']
    };

    const getEffectivePermissions = () => {
        const basePerms = rolePermissions[effectiveRole] || rolePermissions['Staff'];
        if (effectiveRole === 'SuperAdmin') return basePerms;

        if ((effectiveRole === 'Admin' || effectiveRole === 'Doctor') && subscriptionModules.length > 0) {
            const planAllowed = subscriptionModules.map(m => m.toLowerCase());
            const moduleMap = {
                'dashboard': 'dashboard',
                'patients': 'patients',
                'appointments': 'appointments',
                'doctor queue': 'doctor-queue',
                'prescriptions': 'doctor-prescriptions',
                'billing': 'billing',
                'service catalog': 'service-catalog',
                'staff': 'employee-management',
                'adt': 'adt',
                'beds': 'adt',
                'notifications': 'notifications',
            };
            const result = ['dashboard', 'portal-guide', 'notifications', 'hospital-settings', 'doctors', 'doctor-profile', 'doctor-history'];
            planAllowed.forEach(mod => {
                if (moduleMap[mod]) result.push(moduleMap[mod]);
            });
            if (planAllowed.includes('doctor queue')) result.push('doctor-dashboard');
            return basePerms.filter(perm => [...new Set(result)].includes(perm));
        }

        if (effectiveRole === 'Admin' || effectiveRole === 'Doctor') return basePerms;
        const modules = localStorage.getItem('assignedModules');
        if (!modules || !modules.trim()) return ['dashboard', 'portal-guide'];
        const allowed = modules.split(',').map(m => m.trim().toLowerCase());
        const moduleMap = {
            'patients': 'patients', 'appointments': 'appointments', 'adt': 'adt',
            'doctors': 'doctors', 'staff': 'employee-management', 'attendance': 'employee-management',
            'billing': 'billing', 'service catalog': 'service-catalog', 'services': 'service-catalog',
            'notifications': 'notifications',
            'settings': 'hospital-settings',
        };
        const result = ['dashboard', 'portal-guide'];
        allowed.forEach(mod => { if (moduleMap[mod]) result.push(moduleMap[mod]); });
        return result;
    };

    const effectivePerms = getEffectivePermissions();

    const getBottomNavItems = () => {
        if (effectiveRole === 'Doctor') return [
            { id: 'doctor-dashboard', label: 'Home', icon: <Activity size={22} />, path: '/dashboard/doctor' },
            { id: 'doctor-queue', label: 'Queue', icon: <ClipboardList size={22} />, path: '/dashboard/doctor/queue' },
            { id: 'doctor-prescriptions', label: 'Rx', icon: <Pill size={22} />, path: '/dashboard/doctor/prescriptions' },
            { id: 'doctor-followups', label: 'Follow-Up', icon: <UserCog size={22} />, path: '/dashboard/doctor/followups' },
            { id: 'doctor-profile', label: 'Profile', icon: <User size={22} />, path: '/dashboard/doctor/profile' },
        ];
        if (effectiveRole === 'Admin' || effectiveRole === 'SuperAdmin') return [
            { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={22} />, path: '/dashboard' },
            { id: 'patients', label: 'Patients', icon: <Users size={22} />, path: '/dashboard/patients' },
            { id: 'appointments', label: 'Appts', icon: <Calendar size={22} />, path: '/dashboard/appointments' },
            { id: 'billing', label: 'Billing', icon: <Receipt size={22} />, path: '/dashboard/billing' },
            { id: 'hospital-settings', label: 'Settings', icon: <Settings2 size={22} />, path: '/dashboard/settings' },
        ];
        // Helpdesk / Staff
        return [
            { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={22} />, path: '/dashboard' },
            { id: 'patients', label: 'Patients', icon: <Users size={22} />, path: '/dashboard/patients' },
            { id: 'appointments', label: 'Appts', icon: <Calendar size={22} />, path: '/dashboard/appointments' },
            { id: 'notifications', label: 'Alerts', icon: <Bell size={22} />, path: '/dashboard/notifications' },
            { id: 'portal-guide', label: 'Help', icon: <BookOpen size={22} />, path: '/dashboard/guide' },
        ];
    };

    const bottomNavItems = getBottomNavItems();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('doctorId');
        localStorage.removeItem('employeeId');
        localStorage.removeItem('hospitalId');
        localStorage.removeItem('assignedModules');
        localStorage.removeItem('subscriptionPlan');
        localStorage.removeItem('subscriptionStatus');
        localStorage.removeItem('subscriptionModules');
        navigate('/login');
    };

    const panelNotifications = notifications.slice(0, 8);
    const panelUnread = notifications.filter(n => !n.isRead).length;

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-[49] bg-slate-900 shadow-2xl transition-all duration-300 ease-in-out md:translate-x-0 ${
                isCollapsed ? 'w-20' : 'w-64'
            } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center px-4' : 'justify-between px-6'} h-20 border-b border-slate-800`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 text-white overflow-hidden whitespace-nowrap">
                            <HeartPulse className="h-8 w-8 text-blue-400 flex-shrink-0" />
                            <span className="text-xl font-bold tracking-tight">Trikaar HMS</span>
                        </div>
                    )}
                    {isCollapsed && (
                        <HeartPulse className="h-8 w-8 text-blue-400 flex-shrink-0" />
                    )}
                    <button 
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="mt-4 px-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                    {menuGroups.map((group, idx) => {
                        const visibleItems = group.items.filter(item => effectivePerms.includes(item.id));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={idx}>
                                {isCollapsed ? (
                                    <div className="border-t border-slate-800/80 my-4 first:mt-0" />
                                ) : (
                                    <h3 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map((item) => {
                                        const isActive = activePath === item.path ||
                                        (item.path !== '/dashboard' && activePath.startsWith(item.path));
                                        return (
                                            <button
                                                key={item.path}
                                                onClick={() => {
                                                    setActivePath(item.path);
                                                    navigate(item.path);
                                                    setIsSidebarOpen(false);
                                                }}
                                                title={isCollapsed ? item.label : undefined}
                                                className={`flex items-center rounded-lg py-2.5 transition-all duration-200 ${
                                                    isCollapsed ? 'w-full justify-center px-0' : 'w-full gap-3 px-3 text-sm font-medium'
                                                } ${
                                                    isActive
                                                        ? 'bg-blue-600/10 text-blue-400 shadow-[inset_2px_0_0_0_#3b82f6]'
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                }`}
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    {item.icon}
                                                    {isCollapsed && item.id === 'notifications' && unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 animate-pulse" />
                                                    )}
                                                </div>
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="truncate">{item.label}</span>
                                                        {item.id === 'notifications' && unreadCount > 0 && (
                                                            <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                                                {unreadCount > 99 ? '99+' : unreadCount}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="absolute bottom-8 left-0 w-full px-3 text-center">
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Sign Out" : undefined}
                        className={`flex items-center rounded-xl bg-red-50 py-3 text-red-600 transition-colors hover:bg-red-100 ${
                            isCollapsed ? 'w-full justify-center px-0' : 'w-full gap-3 px-4 text-sm font-bold'
                        }`}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            <main className={`flex-1 overflow-y-auto bg-gray-50/50 transition-all duration-300 ${
                isCollapsed ? 'md:ml-20' : 'md:ml-64'
            }`}>
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-2 md:py-4 backdrop-blur-md md:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            className="rounded-lg bg-gray-50 p-2 text-gray-600 md:hidden"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 md:text-2xl leading-tight">Trikaar HMS</h2>
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
                        <button
                            onClick={() => {
                                if (effectiveRole === 'Doctor') {
                                    setActivePath('/dashboard/doctor/profile');
                                    navigate('/dashboard/doctor/profile');
                                }
                            }}
                            className={`h-10 w-10 overflow-hidden rounded-xl border-2 border-white shadow-md ring-2 ring-gray-100 transition-all ${
                                effectiveRole === 'Doctor' ? 'cursor-pointer hover:scale-105 hover:ring-blue-400' : 'cursor-default'
                            }`}
                            title={effectiveRole === 'Doctor' ? 'My Profile' : undefined}
                        >
                            <img src={`https://ui-avatars.com/api/?name=${userName}&background=0D8ABC&color=fff&bold=true`} alt="User" className="w-full h-full object-cover" />
                        </button>
                    </div>
                </header>

                <div className="p-3 md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-stretch h-16">
                    {bottomNavItems.map((item) => {
                        const isActive = activePath === item.path ||
                            (item.path !== '/dashboard' && activePath.startsWith(item.path));
                        const isAllowed = effectivePerms.includes(item.id);
                        if (!isAllowed) return null;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    setActivePath(item.path);
                                    navigate(item.path);
                                    setIsSidebarOpen(false);
                                }}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 relative ${
                                    isActive
                                        ? 'text-blue-600'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                                )}
                                <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-[10px] font-bold tracking-tight leading-none ${
                                    isActive ? 'text-blue-600' : 'text-gray-400'
                                }`}>{item.label}</span>
                                {item.id === 'notifications' && unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1/4 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                )}
                            </button>
                        );
                    })}
                    {/* More/Menu button to open sidebar */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Menu size={22} />
                        <span className="text-[10px] font-bold tracking-tight leading-none">More</span>
                    </button>
                </div>
                {/* iOS safe area padding */}
                <div className="h-safe-area-inset-bottom bg-white" style={{ height: 'env(safe-area-inset-bottom)' }} />
            </nav>

            {hasAiAccess() && <AICopilotPanel />}

            {/* Quick Search Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                    >
                        {/* Backdrop Click */}
                        <div className="absolute inset-0" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} />

                        {/* Search Window */}
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden relative z-10 p-6 flex flex-col space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                                    <Stethoscope className="text-blue-500" size={17} />
                                    Clinician Command Search Pad
                                </h3>
                                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-950 rounded-xl transition-all">
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Search Box Input */}
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Type Patient Name, Mobile or Code..."
                                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all shadow-xs"
                                    autoFocus
                                />
                            </div>

                            {/* Results Panel */}
                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                                {searching ? (
                                    <div className="flex justify-center items-center py-10">
                                        <div className="w-8 h-8 border-4 border-slate-250 border-t-blue-500 rounded-full animate-spin" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(p => (
                                        <div key={p.patientId} className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-3 rounded-2xl transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-600 font-extrabold text-sm flex-shrink-0">
                                                    {(p.firstName || '?')[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs">{p.firstName} {p.lastName}</p>
                                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                        {p.patientCode || `#${p.patientId}`} &bull; {p.gender} &bull; {p.phoneNumber} {p.age ? `&bull; Age ${p.age}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                        navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}`);
                                                    }}
                                                    className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 text-[10px] font-black text-white rounded-xl shadow-sm transition-all"
                                                >
                                                    <Pill size={11} />
                                                    Start Rx
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                        navigate(`/dashboard/doctor/patient/${p.patientId}`);
                                                    }}
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-[10px] font-bold rounded-xl transition-all"
                                                >
                                                    Profile
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : searchQuery.length > 1 ? (
                                    <p className="text-center text-xs text-slate-400 py-10 font-medium">No matches found for "{searchQuery}"</p>
                                ) : (
                                    <p className="text-center text-xs text-slate-400 py-10 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        Type above to trigger rapid patient lookup...
                                    </p>
                                )}
                            </div>

                            {/* Help Banner footer */}
                            <div className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                <span>Shortcut: <kbd className="px-1 py-0.5 border border-slate-200 bg-white rounded text-slate-700 font-extrabold shadow-sm">CMD+K</kbd> or <kbd className="px-1 py-0.5 border border-slate-200 bg-white rounded text-slate-700 font-extrabold shadow-sm">F2</kbd></span>
                                <span>Press <kbd className="px-1 py-0.5 border border-slate-200 bg-white rounded text-slate-700 font-extrabold shadow-sm">ESC</kbd> to close</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Appointment Popup Notification (Doctor only) */}
            <AnimatePresence>
                {apptPopup && (
                    <motion.div
                        initial={{ opacity: 0, x: -80, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -80, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        className="fixed bottom-20 left-4 md:bottom-6 md:left-[17rem] z-50 w-80 max-w-[calc(100vw-2rem)]"
                    >
                        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
                            {/* Green accent top bar */}
                            <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                            <div className="p-4 flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center">
                                    <Stethoscope size={18} className="text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                        <p className="text-xs font-black text-green-400 uppercase tracking-wider">New Patient Queued</p>
                                    </div>
                                    <p className="font-bold text-white text-sm mt-1 truncate">
                                        {apptPopup.count > 1 ? `${apptPopup.count} new appointments` : apptPopup.patientName}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        {apptPopup.appointmentType}
                                        {apptPopup.time && ` • ${new Date(apptPopup.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setApptPopup(null)}
                                    className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="px-4 pb-3 flex gap-2">
                                <button
                                    onClick={() => { setApptPopup(null); navigate('/dashboard/doctor/queue'); setActivePath('/dashboard/doctor/queue'); }}
                                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-black rounded-xl transition-colors"
                                >
                                    View Queue
                                </button>
                                <button
                                    onClick={() => setApptPopup(null)}
                                    className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
