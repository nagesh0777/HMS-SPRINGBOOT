import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Briefcase, Phone, Mail, ShieldCheck, Clock, MapPin, ClipboardList, Info } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../components/Toast';

const StaffForm = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        role: 'Staff',
        department: 'General',
        phoneNumber: '',
        email: '',
        userName: '',
        password: '',
        accessLevel: 'Standard',
        assignedModules: '',
        shiftTiming: '',
        dutyDays: '',
        assignedWard: '',
        status: 'Active',
        adminNotes: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'Admin') {
            navigate('/dashboard');
        }

        if (isEditMode) {
            fetchStaff();
        }
    }, [id]);

    const fetchStaff = async () => {
        try {
            const res = await axios.get(`/api/Employee/${id}`);
            if (res.data.Results) {
                setFormData(res.data.Results);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";

        if (formData.phoneNumber) {
            const phonePlain = formData.phoneNumber.replace(/\D/g, '');
            if (phonePlain.length < 10 || phonePlain.length > 15) {
                newErrors.phoneNumber = "Phone should be 10-15 digits";
            }
        }

        if (!isEditMode) {
            if (!formData.userName.trim() || formData.userName.length < 4) {
                newErrors.userName = "Username must be at least 4 characters";
            }
            if (!formData.password || formData.password.length < 6) {
                newErrors.password = "Password must be at least 6 characters";
            }
        } else {
            // In edit mode, if password is provided, it must be >= 6 chars
            if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
                newErrors.password = "New password must be at least 6 characters";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        // Clear error when user changes field
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            let res;
            if (isEditMode) {
                res = await axios.put(`/api/Employee/${id}`, formData);
            } else {
                res = await axios.post('/api/Employee', formData);
            }

            if (res.data && res.data.Status === "OK") {
                if (isEditMode) {
                    navigate(`/dashboard/staff/${id}`);
                } else {
                    navigate('/dashboard/staff');
                }
            } else {
                toast.error(res.data?.ErrorMessage || "Could not save staff record.");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.ErrorMessage || error.response?.data?.message || "Server connection failed.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <button
                onClick={() => isEditMode ? navigate(`/dashboard/staff/${id}`) : navigate('/dashboard/staff')}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-all"
            >
                <ArrowLeft size={16} />
                {isEditMode ? 'Back to Profile' : 'Back to Directory'}
            </button>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Info */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-6">
                        <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Staff Profile' : 'New Staff Registration'}</h1>
                            <p className="text-sm text-gray-500">Provide personal and professional information for the staff record.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.firstName ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="e.g. John"
                            />
                            {errors.firstName && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.lastName ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="e.g. Doe"
                            />
                            {errors.lastName && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.lastName}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                            >
                                <option>Admin</option>
                                <option>Doctor</option>
                                <option>Helpdesk</option>
                                <option>Staff</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Department</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                placeholder="e.g. Cardiology"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.phoneNumber ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="e.g. +1 234 567 890"
                            />
                            {errors.phoneNumber && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.phoneNumber}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Official Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.email ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="e.g. john.doe@hospital.com"
                            />
                            {errors.email && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                            >
                                <option>Active</option>
                                <option>On Leave</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Login & Access Info */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-6">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Login & Access Info</h2>
                            <p className="text-sm text-gray-500">Manage account credentials and module permissions.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Username</label>
                            <input
                                type="text"
                                name="userName"
                                value={formData.userName}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.userName ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="e.g. jdoe123"
                            />
                            {errors.userName && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.userName}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Login Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.password ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder={isEditMode ? "•••••••• (Leave blank to keep current)" : "Enter login password"}
                                required={!isEditMode}
                            />
                            {errors.password && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.password}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Access Level</label>
                            <select
                                name="accessLevel"
                                value={formData.accessLevel}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                            >
                                <option>Standard</option>
                                <option>Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Assigned Modules (Comma separated)</label>
                            <input
                                type="text"
                                name="assignedModules"
                                value={formData.assignedModules}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                placeholder="e.g. Patients, Appointments, ADT"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Work Information */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-6">
                        <div className="rounded-2xl bg-teal-50 p-3 text-teal-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Work Information</h2>
                            <p className="text-sm text-gray-500">Shift timings and station assignments.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Shift Timing</label>
                            <input
                                type="text"
                                name="shiftTiming"
                                value={formData.shiftTiming}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                placeholder="e.g. 09:00 AM - 05:00 PM"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Duty Days</label>
                            <input
                                type="text"
                                name="dutyDays"
                                value={formData.dutyDays}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                placeholder="e.g. Mon, Tue, Wed"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Assigned Ward / OPD</label>
                            <input
                                type="text"
                                name="assignedWard"
                                value={formData.assignedWard}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Notes & Flags */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-6">
                        <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
                            <Info size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Notes & Flags</h2>
                            <p className="text-sm text-gray-500">Administrative remarks and special warnings.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Admin Notes</label>
                            <textarea
                                name="adminNotes"
                                rows="4"
                                value={formData.adminNotes}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all resize-none"
                                placeholder="Enter any administrative notes or special permissions..."
                            ></textarea>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <input
                                type="checkbox"
                                name="isActive"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-bold text-gray-700 uppercase tracking-tight cursor-pointer">
                                System Access Enabled
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 p-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/staff')}
                        className="px-8 py-3 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 rounded-2xl bg-gray-900 px-12 py-3 font-black text-white shadow-xl shadow-gray-200 transition-all hover:bg-black hover:-translate-y-1 active:scale-95 disabled:bg-gray-400"
                    >
                        <Save size={20} />
                        {loading ? 'Saving...' : (isEditMode ? 'Update Record' : 'Create Staff Member')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffForm;
