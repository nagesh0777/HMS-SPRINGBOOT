import React, { useState, useEffect } from 'react';
import { Search, Mail, Phone, UserX } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../../components/ui/Skeleton';

/**
 * StaffList — Pure staff directory table.
 * When `embedded` is true (used inside EmployeeManagement hub),
 * the standalone page header/actions are omitted.
 */
const StaffList = ({ embedded = false, onStatsRefresh }) => {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        if (!embedded) {
            const userRole = localStorage.getItem('role');
            if (userRole !== 'Admin') {
                navigate('/dashboard');
                return;
            }
        }
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Employees');
            if (res.data.Results) {
                setStaffList(res.data.Results);
                if (onStatsRefresh) onStatsRefresh();
            }
        } catch (err) {
            console.error('Failed to fetch staff', err);
        } finally {
            setLoading(false);
        }
    };

    const roles = ['All', 'Helpdesk', 'Staff', 'Admin'];

    // Exclude Doctors — they have their own Doctor Management page
    const nonDoctorStaff = staffList.filter(s => s.role !== 'Doctor');

    const filteredStaff = nonDoctorStaff.filter(s => {
        const matchesSearch =
            (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'All' ? true : s.role === activeTab;
        return matchesSearch && matchesTab;
    });

    const getStats = (role) => staffList.filter(s => s.role === role).length;

    return (
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            {/* Role filter tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/30 px-4 md:px-6">
                {roles.map(role => (
                    <button
                        key={role}
                        onClick={() => setActiveTab(role)}
                        className={`relative px-5 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === role ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {role === 'All' ? 'All Staff' : `${role}s`}
                        {role !== 'All' && (
                            <span className="ml-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
                                {getStats(role)}
                            </span>
                        )}
                        {activeTab === role && (
                            <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-primary-600" />
                        )}
                    </button>
                ))}
            </div>

            {/* Search bar */}
            <div className="border-b border-gray-50 p-4 md:p-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'All' ? 'all staff' : activeTab + 's'}...`}
                        className="w-full rounded-2xl border-none bg-gray-50 pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                            <th className="px-6 py-4">Name & ID</th>
                            <th className="px-6 py-4">Role / Dept</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <Skeleton variant="circular" className="h-11 w-11 flex-shrink-0" animation="shimmer" />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton variant="text" className="h-4 w-32" animation="shimmer" />
                                                <Skeleton variant="text" className="h-3 w-20" animation="shimmer" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5"><Skeleton variant="text" className="h-4 w-24" animation="shimmer" /></td>
                                    <td className="px-6 py-5"><Skeleton variant="text" className="h-4 w-28" animation="shimmer" /></td>
                                    <td className="px-6 py-5"><Skeleton variant="rectangular" className="h-6 w-20 rounded-full" animation="shimmer" /></td>
                                    <td className="px-6 py-5 text-right"><Skeleton variant="rectangular" className="h-8 w-24 ml-auto rounded-xl" animation="shimmer" /></td>
                                </tr>
                            ))
                        ) : filteredStaff.length > 0 ? (
                            filteredStaff.map((staff) => (
                                <tr key={staff.employeeId} className="group hover:bg-gray-50/60 transition-all">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md ring-2 ring-gray-100 transition-transform group-hover:scale-110">
                                                <img
                                                    src={staff.photoPath || `https://ui-avatars.com/api/?name=${staff.firstName}+${staff.lastName}&background=f3f4f6&color=374151&bold=true`}
                                                    alt="Staff"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">
                                                    {staff.firstName} {staff.lastName}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                                                    #EMP-{staff.employeeId}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1.5">
                                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${
                                                staff.role === 'Admin'    ? 'bg-purple-50 text-purple-700 ring-purple-100' :
                                                staff.role === 'Doctor'   ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                                staff.role === 'Helpdesk' ? 'bg-orange-50 text-orange-700 ring-orange-100' :
                                                                            'bg-gray-50 text-gray-700 ring-gray-100'
                                            }`}>
                                                {staff.role}
                                            </span>
                                            <p className="text-[11px] font-bold text-gray-400">{staff.department}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5 text-[11px] font-bold">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone size={13} className="text-primary-500" />
                                                {staff.phoneNumber || '—'}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Mail size={13} />
                                                {staff.email || '—'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                            staff.status === 'Active' ? 'bg-green-100 text-green-700' :
                                            staff.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                                                staff.status === 'Active' ? 'bg-green-500' :
                                                staff.status === 'On Leave' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                            {staff.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => navigate(`/dashboard/staff/${staff.employeeId}`)}
                                            className="rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-900 hover:text-white hover:ring-gray-900"
                                        >
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-300">
                                        <UserX size={48} />
                                        <p className="text-sm font-bold">No staff members found.</p>
                                        <p className="text-xs">Try adjusting your search or filter.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StaffList;
