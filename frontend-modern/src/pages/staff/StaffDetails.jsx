import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit, Mail, Phone, Briefcase, MapPin, Calendar, Clock,
    Shield, User, Circle, ShieldCheck, ClipboardList, Info, Lock,
    Power, RefreshCw, Activity, Terminal, Trash2, LogIn, LogOut
} from 'lucide-react';
import axios from 'axios';

const StaffDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState([]);

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'Admin') {
            navigate('/dashboard');
            return;
        }
        fetchStaff();
    }, [id]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const [staffRes, attRes] = await Promise.all([
                axios.get(`/api/Employee/${id}`),
                axios.get('/api/Attendance/All')
            ]);

            if (staffRes.data.Results) {
                setStaff(staffRes.data.Results);
            }

            if (attRes.data.Results) {
                // Filter attendance for this specific staff ID
                const filtered = attRes.data.Results.filter(l => l.employeeId === parseInt(id));
                setAttendance(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }
        } catch (err) {
            console.error("Error fetching staff details", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        if (window.confirm("Are you sure you want to change this user's active status?")) {
            try {
                const updated = { ...staff, isActive: !staff.isActive };
                await axios.put(`/api/Employee/${id}`, updated);
                fetchStaff();
            } catch (error) {
                alert("Failed to update status");
            }
        }
    };

    const handleChangePassword = async () => {
        const newPassword = window.prompt("Enter new password for this user:");
        if (newPassword && newPassword.trim().length > 0) {
            try {
                await axios.put(`/api/Employee/${id}`, { ...staff, password: newPassword });
                alert("Password updated successfully!");
                fetchStaff();
            } catch (error) {
                alert("Failed to update password.");
            }
        }
    };

    const handleDelete = async () => {
        if (window.confirm("CRITICAL: This will permanently delete the staff record and their login account. This action cannot be undone. \n\nAre you sure?")) {
            try {
                await axios.delete(`/api/Employee/${id}`);
                navigate('/dashboard/staff');
            } catch (error) {
                alert("Failed to delete staff member.");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading staff profile...</div>;
    if (!staff) return <div className="p-10 text-center text-red-500 font-bold">Staff member not found.</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header / Actions Sidebar Style */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard/staff')}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Directory
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column: Profile Card & Actions */}
                <div className="space-y-8 lg:col-span-1">
                    {/* 1. Staff Details (TOP SECTION) */}
                    <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-primary-900/5 ring-1 ring-gray-100">
                        <div className="bg-gradient-to-br from-gray-900 to-primary-900 p-8 text-white text-center">
                            <div className="relative mx-auto mb-6 h-32 w-32">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${staff.firstName}+${staff.lastName}&background=random&color=fff&size=128`}
                                    alt=""
                                    className="h-full w-full rounded-2xl border-4 border-white/10 object-cover shadow-2xl"
                                />
                                <div className={`absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-4 border-gray-950 ${staff.status === 'Active' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            </div>
                            <h1 className="text-2xl font-black">{staff.firstName} {staff.lastName}</h1>
                            <p className="mt-1 text-sm font-bold text-primary-300 uppercase tracking-widest">{staff.role}</p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-tighter">
                                ID: #EMP-{staff.employeeId}
                            </div>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="flex items-center gap-3 text-sm">
                                <Briefcase className="text-gray-400" size={18} />
                                <span className="font-semibold text-gray-700">{staff.department}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="text-gray-400" size={18} />
                                <span className="font-semibold text-gray-700">{staff.phoneNumber}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="text-gray-400" size={18} />
                                <span className="font-semibold text-gray-700 truncate">{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className={`h-2 w-2 rounded-full ${staff.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="font-bold uppercase text-[10px] text-gray-500 tracking-widest">
                                    {staff.isActive ? 'System Access Enabled' : 'Access Restricted'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Actions / Controls */}
                    {localStorage.getItem('role') === 'Admin' && (
                        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                            <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-gray-400">Actions & Controls</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => navigate(`/dashboard/staff/edit/${id}`)}
                                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-white hover:shadow-md active:scale-95"
                                >
                                    <Edit size={18} className="text-primary-600" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-white hover:shadow-md active:scale-95"
                                >
                                    <Lock size={18} className="text-blue-600" />
                                    Change Password
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-white hover:shadow-md active:scale-95"
                                >
                                    <RefreshCw size={18} className="text-orange-600" />
                                    Reset Password
                                </button>
                                <button
                                    onClick={handleDeactivate}
                                    className={`flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-sm font-bold transition-all hover:shadow-md active:scale-95 ${staff.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                                        }`}
                                >
                                    <Power size={18} />
                                    {staff.isActive ? 'Deactivate User' : 'Activate User'}
                                </button>
                                <div className="pt-2">
                                    <button
                                        onClick={handleDelete}
                                        className="flex w-full items-center gap-3 rounded-xl border-2 border-red-50 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition-all hover:bg-red-600 hover:text-white hover:shadow-xl active:scale-95"
                                    >
                                        <Trash2 size={18} />
                                        Delete Staff Record
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Detailed Sections */}
                <div className="space-y-8 lg:col-span-2">
                    {/* 2. Login & Access Info */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                        <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-gray-900">
                            <ShieldCheck size={20} className="text-blue-600" />
                            Login & Access Info
                        </h3>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</p>
                                <p className="mt-2 text-lg font-bold text-gray-900">@{staff.userName || 'Not Assigned'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Access Level</p>
                                <span className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black ring-1 ${staff.accessLevel === 'SuperAdmin' ? 'bg-purple-50 text-purple-700 ring-purple-100' :
                                    staff.accessLevel === 'Admin' ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                        'bg-gray-50 text-gray-700 ring-gray-100'
                                    }`}>
                                    <Shield size={14} />
                                    {staff.accessLevel || 'Standard'}
                                </span>
                            </div>

                            {/* Attendance QR Code */}
                            <div className="md:col-span-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Internal ID QR (Attendance)</p>
                                <div className="p-4 bg-white border-2 border-dashed border-gray-100 rounded-3xl inline-block shadow-sm">
                                    <QRCodeCanvas
                                        value={staff.employeeId.toString()}
                                        size={90}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <p className="mt-2 text-[9px] font-bold text-gray-400 italic">Scan for presence tracking</p>
                            </div>

                            <div className="md:col-span-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned Modules</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(staff.assignedModules || 'General Access').split(',').map((mod, idx) => (
                                        <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600">
                                            {mod.trim()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Work Information */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                        <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-gray-900">
                            <Clock size={20} className="text-teal-600" />
                            Work Information
                        </h3>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shift Timing</p>
                                <p className="mt-2 font-bold text-gray-900">{staff.shiftTiming || 'Not Scheduled'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Duty Days</p>
                                <p className="mt-2 font-bold text-gray-900">{staff.dutyDays || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Station / Ward</p>
                                <p className="mt-2 font-bold text-gray-900">{staff.assignedWard || 'Unassigned'}</p>
                            </div>
                        </div>
                    </div>

                    {/* 5. Attendance History */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
                                <Activity size={20} className="text-orange-600" />
                                Recent History
                            </h3>
                            <span className="text-[10px] font-black bg-gray-50 px-2 py-1 rounded-lg text-gray-400 border border-gray-100">
                                {attendance.length} TOTAL LOGS
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {attendance.length > 0 ? attendance.map((log, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-2xl bg-gray-50/50 p-4 ring-1 ring-gray-100 hover:bg-white transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-xl text-white ${log.type === 'ClockIn' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                            {log.type === 'ClockIn' ? <LogIn size={16} /> : <LogOut size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{log.type === 'ClockIn' ? 'Checked In' : 'Checked Out'}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    {log.remarks && (
                                        <div className="text-[10px] bg-white px-2 py-1 rounded-lg text-gray-400 font-bold border border-gray-100">
                                            {log.remarks}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="py-10 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                    No attendance history recorded yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 6. Notes / Remarks */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 border-l-4 border-orange-400">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900">
                            <Info size={20} className="text-orange-600" />
                            Administrative Notes
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-600">
                            {staff.adminNotes || "No administrative remarks for this staff member."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDetails;
