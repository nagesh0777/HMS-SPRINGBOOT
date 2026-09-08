import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, User, Calendar, Bed, Shield, LogOut, Clock, Menu,
    Building, Stethoscope, Pill, ClipboardList, Search, Activity, Bell, UserCog,
    BookOpen, Check, CheckCheck, AlertTriangle, FlaskConical, Settings, Zap,
    Receipt, Settings2, Package, ChevronLeft, ChevronRight, History, X,
} from 'lucide-react';

import AICopilotPanel from '../components/AICopilotPanel';
import { CommandDialog, CommandInput, CommandList, CommandEmpty } from '@/components/ui/command-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo, LogoLockup } from '@/components/app/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { EmptyState } from '@/components/app/empty-state';
import { cn } from '@/lib/utils';

/** Notification kinds carry clinical weight, so each gets a tone rather than a raw colour. */
const notifTypeConfig = {
    appointment_reminder: { icon: Calendar, tone: 'text-info' },
    lab_result: { icon: FlaskConical, tone: 'text-warning' },
    follow_up: { icon: Clock, tone: 'text-info' },
    emergency: { icon: AlertTriangle, tone: 'text-destructive' },
    system: { icon: Settings, tone: 'text-muted-foreground' },
    default: { icon: Bell, tone: 'text-muted-foreground' },
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    // Previously this was a useState seeded from window.location.pathname and updated only
    // inside click handlers, so browser back/forward left the wrong item highlighted.
    // Reading the router's location keeps the sidebar honest however navigation happened.
    const location = useLocation();
    const activePath = location.pathname;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(
        () => localStorage.getItem('sidebar-collapsed') === 'true',
    );
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', isCollapsed);
    }, [isCollapsed]);

    // Close the mobile drawer whenever the route changes.
    useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

    const userRole = localStorage.getItem('role') || 'Staff';
    const userName = localStorage.getItem('userName') || 'System User';
    const isOwnerAdmin = userName.trim().toLowerCase() === 'nagesh';
    const effectiveRole = isOwnerAdmin ? 'SuperAdmin' : userRole;
    const subscriptionModules = (localStorage.getItem('subscriptionModules') || '')
        .split(',').map(m => m.trim()).filter(Boolean);

    // ---- Appointment popup (Doctor only) ----
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

    // ---- Global patient search ----
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Only the open shortcut is ours — the dialog handles Escape itself.
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'F2') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data?.Results || []);
            } catch {
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

    // ---- Notifications ----
    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await axios.get('/api/Notifications/UnreadCount');
                if (res.data.Results) setUnreadCount(res.data.Results.unread || 0);
            } catch { /* silent — a failed poll should not interrupt clinical work */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

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

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await axios.put(`/api/Notifications/${id}/Read`);
            setNotifications(prev => prev.map(n => (n.notificationId === id ? { ...n, isRead: true } : n)));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error('Failed to mark as read', err); }
    };

    const markAllRead = async (e) => {
        if (e) e.stopPropagation();
        try {
            await axios.put('/api/Notifications/ReadAll');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { console.error('Failed to mark all read', err); }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    // ---- Navigation model (unchanged) ----
    const getMenuGroups = () => {
        if (effectiveRole === 'Doctor') {
            return [
                { title: 'Clinical Workspace', items: [
                    { id: 'doctor-dashboard', label: 'My Workspace', icon: Activity, path: '/dashboard/doctor' },
                    { id: 'doctor-queue', label: 'Patient Queue', icon: ClipboardList, path: '/dashboard/doctor/queue' },
                    { id: 'doctor-history', label: 'Treated History', icon: History, path: '/dashboard/doctor/history' },
                    { id: 'doctor-prescriptions', label: 'Prescriptions', icon: Pill, path: '/dashboard/doctor/prescriptions' },
                    { id: 'doctor-followups', label: 'Follow-Ups', icon: UserCog, path: '/dashboard/doctor/followups' },
                ]},
                { title: 'Ward Management', items: [
                    { id: 'adt', label: 'ADT & Ward', icon: Bed, path: '/dashboard/adt' },
                ]},
                { title: 'Reference & Profile', items: [
                    { id: 'doctor-profile', label: 'My Profile', icon: User, path: '/dashboard/doctor/profile' },
                    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/dashboard/notifications' },
                    { id: 'portal-guide', label: 'Help & Guide', icon: BookOpen, path: '/dashboard/guide' },
                ]},
            ];
        }
        return [
            { title: 'Core Workflow', items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
                { id: 'patients', label: 'Patients', icon: Users, path: '/dashboard/patients' },
                { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/dashboard/appointments' },
                { id: 'adt', label: 'ADT & Ward', icon: Bed, path: '/dashboard/adt' },
            ]},
            { title: 'Finance & Services', items: [
                { id: 'billing', label: 'Billing', icon: Receipt, path: '/dashboard/billing' },
                { id: 'service-catalog', label: 'Service Rates', icon: Package, path: '/dashboard/services' },
            ]},
            { title: 'Workforce', items: [
                { id: 'doctors', label: 'Doctor Roster', icon: Stethoscope, path: '/dashboard/doctors' },
                { id: 'employee-management', label: 'Employee Management', icon: Shield, path: '/dashboard/staff' },
            ]},
            { title: 'Doctor Workspace', items: [
                { id: 'doctor-dashboard', label: 'My Workspace', icon: Activity, path: '/dashboard/doctor' },
                { id: 'doctor-queue', label: 'Patient Queue', icon: ClipboardList, path: '/dashboard/doctor/queue' },
                { id: 'doctor-history', label: 'Treated History', icon: History, path: '/dashboard/doctor/history' },
                { id: 'doctor-prescriptions', label: 'Prescriptions', icon: Pill, path: '/dashboard/doctor/prescriptions' },
                { id: 'doctor-followups', label: 'Follow-Ups', icon: UserCog, path: '/dashboard/doctor/followups' },
            ]},
            { title: 'Administration', items: [
                { id: 'notifications', label: 'Notifications', icon: Bell, path: '/dashboard/notifications' },
                { id: 'hospital-settings', label: 'Settings', icon: Settings2, path: '/dashboard/settings' },
                { id: 'hospitals', label: 'Hospital Network', icon: Building, path: '/dashboard/hospitals' },
                { id: 'portal-guide', label: 'Help & Guide', icon: BookOpen, path: '/dashboard/guide' },
            ]},
        ];
    };

    const menuGroups = getMenuGroups();

    const rolePermissions = {
        SuperAdmin: ['dashboard', 'hospitals', 'portal-guide'],
        Admin: ['dashboard', 'patients', 'appointments', 'doctors', 'adt', 'billing', 'service-catalog', 'employee-management', 'notifications', 'hospital-settings', 'portal-guide'],
        Doctor: ['doctor-dashboard', 'doctor-queue', 'doctor-history', 'doctor-prescriptions', 'doctor-followups', 'adt', 'notifications', 'portal-guide', 'doctor-profile'],
        Helpdesk: ['dashboard', 'patients', 'appointments', 'billing', 'employee-management', 'notifications', 'portal-guide'],
        Staff: ['dashboard', 'patients', 'notifications', 'portal-guide'],
    };

    const getEffectivePermissions = () => {
        const basePerms = rolePermissions[effectiveRole] || rolePermissions.Staff;
        if (effectiveRole === 'SuperAdmin') return basePerms;

        if ((effectiveRole === 'Admin' || effectiveRole === 'Doctor') && subscriptionModules.length > 0) {
            const planAllowed = subscriptionModules.map(m => m.toLowerCase());
            const moduleMap = {
                dashboard: 'dashboard', patients: 'patients', appointments: 'appointments',
                'doctor queue': 'doctor-queue', prescriptions: 'doctor-prescriptions',
                billing: 'billing', 'service catalog': 'service-catalog', staff: 'employee-management',
                adt: 'adt', beds: 'adt', notifications: 'notifications',
            };
            const result = ['dashboard', 'portal-guide', 'notifications', 'hospital-settings', 'doctors', 'doctor-profile', 'doctor-history'];
            planAllowed.forEach(mod => { if (moduleMap[mod]) result.push(moduleMap[mod]); });
            if (planAllowed.includes('doctor queue')) result.push('doctor-dashboard');
            return basePerms.filter(perm => [...new Set(result)].includes(perm));
        }

        if (effectiveRole === 'Admin' || effectiveRole === 'Doctor') return basePerms;
        const modules = localStorage.getItem('assignedModules');
        if (!modules || !modules.trim()) return ['dashboard', 'portal-guide'];
        const allowed = modules.split(',').map(m => m.trim().toLowerCase());
        const moduleMap = {
            patients: 'patients', appointments: 'appointments', adt: 'adt',
            doctors: 'doctors', staff: 'employee-management', attendance: 'employee-management',
            billing: 'billing', 'service catalog': 'service-catalog', services: 'service-catalog',
            notifications: 'notifications', settings: 'hospital-settings',
        };
        const result = ['dashboard', 'portal-guide'];
        allowed.forEach(mod => { if (moduleMap[mod]) result.push(moduleMap[mod]); });
        return result;
    };

    const effectivePerms = getEffectivePermissions();

    const getBottomNavItems = () => {
        if (effectiveRole === 'Doctor') return [
            { id: 'doctor-dashboard', label: 'Home', icon: Activity, path: '/dashboard/doctor' },
            { id: 'doctor-queue', label: 'Queue', icon: ClipboardList, path: '/dashboard/doctor/queue' },
            { id: 'doctor-prescriptions', label: 'Rx', icon: Pill, path: '/dashboard/doctor/prescriptions' },
            { id: 'doctor-followups', label: 'Follow-Up', icon: UserCog, path: '/dashboard/doctor/followups' },
            { id: 'doctor-profile', label: 'Profile', icon: User, path: '/dashboard/doctor/profile' },
        ];
        if (effectiveRole === 'Admin' || effectiveRole === 'SuperAdmin') return [
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
            { id: 'patients', label: 'Patients', icon: Users, path: '/dashboard/patients' },
            { id: 'appointments', label: 'Appts', icon: Calendar, path: '/dashboard/appointments' },
            { id: 'billing', label: 'Billing', icon: Receipt, path: '/dashboard/billing' },
            { id: 'hospital-settings', label: 'Settings', icon: Settings2, path: '/dashboard/settings' },
        ];
        return [
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
            { id: 'patients', label: 'Patients', icon: Users, path: '/dashboard/patients' },
            { id: 'appointments', label: 'Appts', icon: Calendar, path: '/dashboard/appointments' },
            { id: 'notifications', label: 'Alerts', icon: Bell, path: '/dashboard/notifications' },
            { id: 'portal-guide', label: 'Help', icon: BookOpen, path: '/dashboard/guide' },
        ];
    };

    const bottomNavItems = getBottomNavItems();

    const handleLogout = () => {
        ['token', 'role', 'userName', 'doctorId', 'employeeId', 'hospitalId',
         'assignedModules', 'subscriptionPlan', 'subscriptionStatus', 'subscriptionModules']
            .forEach(k => localStorage.removeItem(k));
        navigate('/login');
    };

    const isItemActive = (path) =>
        activePath === path || (path !== '/dashboard' && activePath.startsWith(path));

    const panelNotifications = notifications.slice(0, 8);
    const panelUnread = notifications.filter(n => !n.isRead).length;

    /* ---------------- Sidebar ---------------- */
    const SidebarNav = ({ collapsed = false, onNavigate }) => (
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
            {menuGroups.map((group, idx) => {
                const visibleItems = group.items.filter(item => effectivePerms.includes(item.id));
                if (visibleItems.length === 0) return null;

                return (
                    <div key={idx}>
                        {collapsed ? (
                            <div className="mx-2 mb-2 border-t border-sidebar-border first:hidden" />
                        ) : (
                            <h3 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {group.title}
                            </h3>
                        )}
                        <div className="space-y-0.5">
                            {visibleItems.map((item) => {
                                const Icon = item.icon;
                                const active = isItemActive(item.path);
                                const showDot = item.id === 'notifications' && unreadCount > 0;

                                const button = (
                                    <button
                                        key={item.path}
                                        onClick={() => { navigate(item.path); onNavigate?.(); }}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'relative flex w-full items-center rounded-md py-2 text-sm transition-colors',
                                            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
                                            active
                                                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                                        )}
                                    >
                                        <span className="relative flex items-center justify-center">
                                            <Icon className="h-[18px] w-[18px] shrink-0" />
                                            {collapsed && showDot && (
                                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                                            )}
                                        </span>
                                        {!collapsed && (
                                            <>
                                                <span className="truncate">{item.label}</span>
                                                {showDot && (
                                                    <span className="tabular ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                );

                                // Collapsed rail has no labels, so the tooltip is the only affordance.
                                return collapsed ? (
                                    <Tooltip key={item.path}>
                                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                                        <TooltipContent side="right">{item.label}</TooltipContent>
                                    </Tooltip>
                                ) : button;
                            })}
                        </div>
                    </div>
                );
            })}
        </nav>
    );

    const SidebarFooter = ({ collapsed = false }) => (
        <div className="border-t border-sidebar-border p-3">
            <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                    'w-full text-muted-foreground hover:bg-destructive-subtle hover:text-destructive',
                    collapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-2',
                )}
            >
                <LogOut className="h-[18px] w-[18px]" />
                {!collapsed && <span>Sign out</span>}
            </Button>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
                    isCollapsed ? 'w-16' : 'w-60',
                )}
            >
                <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border', isCollapsed ? 'justify-center px-2' : 'justify-between px-4')}>
                    {isCollapsed ? <Logo variant="mark" className="h-7 w-7" /> : <LogoLockup />}
                    {!isCollapsed && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setIsCollapsed(true)} aria-label="Collapse sidebar">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {isCollapsed && (
                    <div className="flex justify-center border-b border-sidebar-border py-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => setIsCollapsed(false)} aria-label="Expand sidebar">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <SidebarNav collapsed={isCollapsed} />
                <SidebarFooter collapsed={isCollapsed} />
            </aside>

            {/* Mobile drawer — Radix Sheet, so focus is trapped and Escape closes it. */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetContent side="left" className="flex w-64 flex-col bg-sidebar p-0" hideClose>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
                        <LogoLockup />
                        <Button variant="ghost" size="icon-sm" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <SidebarNav onNavigate={() => setIsSidebarOpen(false)} />
                    <SidebarFooter />
                </SheetContent>
            </Sheet>

            {/* Main column */}
            <div className={cn('flex min-w-0 flex-1 flex-col transition-[margin] duration-200', isCollapsed ? 'md:ml-16' : 'md:ml-60')}>
                <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open menu">
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="md:hidden"><Logo variant="mark" className="h-6 w-6" /></div>

                    {/* Search opener. On desktop it shows the shortcut so the hotkey is discoverable
                        rather than folklore; on mobile it collapses to an icon. */}
                    <Button
                        variant="outline"
                        onClick={() => setIsSearchOpen(true)}
                        className="ml-auto h-9 gap-2 px-2.5 text-muted-foreground md:ml-0 md:mr-auto md:w-64 md:justify-start md:px-3"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden md:inline">Search patients…</span>
                        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-sans text-[10px] font-medium md:inline">⌘K</kbd>
                    </Button>

                    <div className="flex items-center gap-0.5">
                        <ThemeToggle />

                        <Popover
                            open={notifOpen}
                            onOpenChange={(o) => { setNotifOpen(o); if (o) fetchNotifications(); }}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
                                    <Bell className="h-[18px] w-[18px]" />
                                    {unreadCount > 0 && (
                                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0">
                                <div className="flex items-center justify-between border-b px-4 py-2.5">
                                    <p className="text-sm font-semibold">Notifications</p>
                                    {panelUnread > 0 && (
                                        <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 gap-1.5 px-2 text-xs">
                                            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                                        </Button>
                                    )}
                                </div>

                                <div className="max-h-[380px] overflow-y-auto overscroll-contain scrollbar-thin">
                                    {notifLoading ? (
                                        <div className="flex justify-center py-10">
                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                                        </div>
                                    ) : panelNotifications.length === 0 ? (
                                        <EmptyState
                                            icon={Bell}
                                            title="You're all caught up"
                                            description="New alerts will appear here."
                                            className="py-10"
                                        />
                                    ) : (
                                        panelNotifications.map((n, i) => {
                                            const tc = notifTypeConfig[n.type] || notifTypeConfig.default;
                                            const NIcon = tc.icon;
                                            return (
                                                <button
                                                    key={n.notificationId || i}
                                                    onClick={() => { if (!n.isRead) markAsRead(n.notificationId); }}
                                                    className={cn(
                                                        'group flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/50',
                                                        !n.isRead && 'bg-accent/30',
                                                    )}
                                                >
                                                    <NIcon className={cn('mt-0.5 h-4 w-4 shrink-0', tc.tone)} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className={cn('truncate text-[13px]', n.isRead ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground')}>
                                                                {n.title}
                                                            </span>
                                                            {n.priority === 'urgent' && <Zap className="h-3 w-3 shrink-0 text-destructive" />}
                                                            {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" />}
                                                        </span>
                                                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                                                        <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.createdOn)}</span>
                                                    </span>
                                                    {!n.isRead && (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => markAsRead(n.notificationId, e)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') markAsRead(n.notificationId, e); }}
                                                            aria-label="Mark as read"
                                                            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {panelNotifications.length > 0 && (
                                    <div className="border-t p-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => { setNotifOpen(false); navigate('/dashboard/notifications'); }}
                                        >
                                            View all notifications
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="ml-1 h-9 gap-2 px-1.5 md:pr-2.5">
                                    <Avatar className="h-7 w-7">
                                        <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                                            {initials(userName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden text-left md:block">
                                        <span className="block max-w-[120px] truncate text-xs font-medium capitalize leading-tight">{userName}</span>
                                        <span className="block text-[10px] leading-tight text-muted-foreground">{userRole}</span>
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="truncate text-sm font-medium capitalize">{userName}</p>
                                    <p className="text-xs text-muted-foreground">{userRole}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {effectiveRole === 'Doctor' && (
                                    <DropdownMenuItem onSelect={() => navigate('/dashboard/doctor/profile')} className="gap-2">
                                        <User className="h-4 w-4" /> My profile
                                    </DropdownMenuItem>
                                )}
                                {effectivePerms.includes('hospital-settings') && (
                                    <DropdownMenuItem onSelect={() => navigate('/dashboard/settings')} className="gap-2">
                                        <Settings2 className="h-4 w-4" /> Settings
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => navigate('/dashboard/guide')} className="gap-2">
                                    <BookOpen className="h-4 w-4" /> Help &amp; guide
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                                    <LogOut className="h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className="mx-auto max-w-[1600px] p-4 pb-24 md:p-6 md:pb-8">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-safe md:hidden">
                <div className="flex h-16 items-stretch">
                    {bottomNavItems.filter(i => effectivePerms.includes(i.id)).map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
                                    active ? 'text-foreground' : 'text-muted-foreground',
                                )}
                            >
                                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-foreground" />}
                                <span className="relative">
                                    <Icon className="h-[22px] w-[22px]" />
                                    {item.id === 'notifications' && unreadCount > 0 && (
                                        <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                                    )}
                                </span>
                                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground"
                    >
                        <Menu className="h-[22px] w-[22px]" />
                        <span className="text-[10px] font-medium leading-none">More</span>
                    </button>
                </div>
            </nav>

            {hasAiAccess() && <AICopilotPanel />}

            {/* Patient command palette */}
            <CommandDialog
                open={isSearchOpen}
                onOpenChange={(open) => { setIsSearchOpen(open); if (!open) setSearchQuery(''); }}
                label="Patient search"
            >
                <CommandInput
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search patient by name, mobile or code…"
                />
                <CommandList>
                    {searching ? (
                        <div className="flex justify-center py-10">
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                        </div>
                    ) : searchResults.length > 0 ? (
                        searchResults.map(p => (
                            <div key={p.patientId} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{initials(`${p.firstName} ${p.lastName}`)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{p.firstName} {p.lastName}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {p.patientCode || `#${p.patientId}`} · {p.gender} · {p.phoneNumber}{p.age ? ` · Age ${p.age}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setIsSearchOpen(false); setSearchQuery('');
                                            navigate(`/dashboard/doctor/prescriptions?patientId=${p.patientId}&patientName=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}`);
                                        }}
                                    >
                                        <Pill /> Start Rx
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setIsSearchOpen(false); setSearchQuery('');
                                            navigate(`/dashboard/doctor/patient/${p.patientId}`);
                                        }}
                                    >
                                        Profile
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : searchQuery.length > 1 ? (
                        <CommandEmpty>No patient matches &ldquo;{searchQuery}&rdquo;</CommandEmpty>
                    ) : (
                        <CommandEmpty>Start typing to look up a patient</CommandEmpty>
                    )}
                </CommandList>
                <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
                    <span>
                        <kbd className="rounded border bg-background px-1.5 py-0.5 font-medium text-foreground">⌘K</kbd>
                        {' / '}
                        <kbd className="rounded border bg-background px-1.5 py-0.5 font-medium text-foreground">F2</kbd> to open
                    </span>
                    <span><kbd className="rounded border bg-background px-1.5 py-0.5 font-medium text-foreground">Esc</kbd> to close</span>
                </div>
            </CommandDialog>

            {/* New appointment toast (Doctor only) */}
            <AnimatePresence>
                {apptPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                        className="fixed bottom-20 left-4 z-40 w-80 max-w-[calc(100vw-2rem)] md:bottom-6 md:left-[16.5rem]"
                    >
                        <div className="overflow-hidden rounded-lg border bg-card shadow-lg">
                            <div className="flex items-start gap-3 p-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success">
                                    <Stethoscope className="h-[18px] w-[18px]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-success">New patient queued</p>
                                    <p className="mt-0.5 truncate text-sm font-medium">
                                        {apptPopup.count > 1 ? `${apptPopup.count} new appointments` : apptPopup.patientName}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {apptPopup.appointmentType}
                                        {apptPopup.time && ` · ${new Date(apptPopup.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon-sm" onClick={() => setApptPopup(null)} aria-label="Dismiss">
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div className="flex gap-2 border-t p-2">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => { setApptPopup(null); navigate('/dashboard/doctor/queue'); }}
                                >
                                    View queue
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setApptPopup(null)}>Dismiss</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
