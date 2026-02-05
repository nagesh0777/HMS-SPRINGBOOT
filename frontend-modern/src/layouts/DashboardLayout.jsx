import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    HeartPulse,
    LayoutDashboard,
    Users,
    Calendar,
    Bed,
    Shield,
    LogOut,
    Clock,
    Menu,
    Building,
    X
} from 'lucide-react';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activePath, setActivePath] = useState(window.location.pathname);
    const userRole = localStorage.getItem('role') || 'Staff';
    const userName = localStorage.getItem('userName') || 'System User';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
        { id: 'hospitals', label: 'Hospitals', icon: <Building size={20} />, path: '/dashboard/hospitals' }, // NEW
        { id: 'patients', label: 'Patients', icon: <Users size={20} />, path: '/dashboard/patients' },
        { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments' },
        { id: 'adt', label: 'ADT', icon: <Bed size={20} />, path: '/dashboard/adt' },
        { id: 'staff', label: 'Staff', icon: <Shield size={20} />, path: '/dashboard/staff' },
        { id: 'attendance', label: 'Attendance', icon: <Clock size={20} />, path: '/dashboard/staff/attendance' },
    ];

    const rolePermissions = {
        'SuperAdmin': ['dashboard', 'hospitals'], // SuperAdmin only sees Dashboard & Hospitals
        'Admin': ['dashboard', 'patients', 'appointments', 'adt', 'staff', 'attendance'],
        'Doctor': ['dashboard', 'patients', 'appointments', 'adt'],
        'Helpdesk': ['dashboard', 'patients', 'appointments', 'attendance'],
        'Staff': ['dashboard', 'patients']
    };

    const allowedItems = menuItems.filter(item =>
        (rolePermissions[userRole] || rolePermissions['Staff']).includes(item.id)
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
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

                <nav className="mt-6 px-4 space-y-2">
                    {allowedItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                setActivePath(item.path);
                                navigate(item.path);
                                setIsSidebarOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${activePath === item.path || activePath.startsWith(item.path + '/')
                                ? 'bg-primary-50 text-primary-600 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                                }`}
                        >
                            {item.icon}
                            {item.label}
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

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50/50 md:ml-64 transition-all duration-300">
                {/* Top Header */}
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
        </div>
    );
};

export default DashboardLayout;
