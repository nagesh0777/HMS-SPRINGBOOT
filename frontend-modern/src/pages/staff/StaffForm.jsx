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
        isActive: true,
        photoPath: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

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

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.warning("File is too large. Max size is 5MB.");
            return;
        }

        if (isEditMode) {
            setUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file);
                uploadData.append('type', 'employee');
                uploadData.append('id', id);
                const res = await axios.post('/api/Files/UploadPhoto', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.Status === 'OK') {
                    setFormData(prev => ({ ...prev, photoPath: res.data.Results.path }));
                    toast.success("Profile photo updated successfully.");
                } else {
                    toast.error(res.data.ErrorMessage || "Upload failed.");
                }
            } catch (err) {
                toast.error("Failed to upload photo.");
            } finally {
                setUploading(false);
            }
        } else {
            setSelectedPhotoFile(file);
            setPhotoPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleModuleToggle = (moduleId) => {
        const currentModules = (formData.assignedModules || '')
            .split(',')
            .map(m => m.trim())
            .filter(Boolean);
        
        let newModules;
        if (currentModules.includes(moduleId)) {
            newModules = currentModules.filter(m => m !== moduleId);
        } else {
            newModules = [...currentModules, moduleId];
        }
        
        setFormData(prev => ({
            ...prev,
            assignedModules: newModules.join(', ')
        }));
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
                // Upload photo now if selected
                if (!isEditMode && selectedPhotoFile && res.data.Results?.employeeId) {
                    const newId = res.data.Results.employeeId;
                    const uploadData = new FormData();
                    uploadData.append('file', selectedPhotoFile);
                    uploadData.append('type', 'employee');
                    uploadData.append('id', newId);
                    await axios.post('/api/Files/UploadPhoto', uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

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
                        {/* Photo Upload Widget */}
                        <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all gap-4">
                            <div className="relative group w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
                                {uploading ? (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">Uploading...</div>
                                ) : null}
                                {photoPreviewUrl || formData.photoPath ? (
                                    <img src={photoPreviewUrl || formData.photoPath} alt="Staff Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-gray-400" />
                                )}
                            </div>
                            <div className="text-center">
                                <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">
                                    {uploading ? 'Uploading Photo...' : (formData.photoPath || photoPreviewUrl ? 'Change Profile Photo' : 'Upload Profile Photo')}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                                </label>
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">JPEG or PNG, maximum 5MB</p>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.firstName ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="Enter first name"
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
                                placeholder="Enter last name"
                            />
                            {errors.lastName && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.lastName}</p>}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">Role *</label>
                            <input
                                type="text"
                                name="role"
                                required
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 ${errors.role ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/10'}`}
                                placeholder="Enter role (e.g. Nurse)"
                            />
                            {/* Suggestions */}
                            <div className="mt-2 space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Suggestions:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Admin', 'Doctor', 'Helpdesk', 'Staff', 'Nurse', 'Technician'].map(sug => (
                                        <button
                                            key={sug}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, role: sug }))}
                                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                                formData.role === sug 
                                                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm' 
                                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {errors.role && <p className="mt-1 text-xs font-bold text-red-500 px-1">{errors.role}</p>}
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
                                placeholder="Enter phone number"
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
                                placeholder="Enter email address"
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
                                <option>Suspended</option>
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
                                placeholder="e.g. alex.smith"
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
                            <label className="mb-3 block text-[10px] font-black uppercase text-gray-400">Page Access Permissions</label>
                            <p className="text-xs text-gray-400 mb-3">Select pages this staff member can access. Without any selection, staff will only see Dashboard.</p>
                            <div className="flex gap-2 mb-3">
                                <button type="button" onClick={() => setFormData({ ...formData, assignedModules: 'Patients,Appointments,ADT,Billing,Notifications,Attendance' })}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">Select All</button>
                                <button type="button" onClick={() => setFormData({ ...formData, assignedModules: '' })}
                                    className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">Deselect All</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {[
                                    { id: 'Patients', label: 'Patients', desc: 'View & manage patients' },
                                    { id: 'Appointments', label: 'Appointments', desc: 'Schedule & manage appointments' },
                                    { id: 'ADT', label: 'ADT (Admissions)', desc: 'Admit, discharge, transfer' },
                                    { id: 'Billing', label: 'Billing', desc: 'Bills & invoices' },
                                    { id: 'Notifications', label: 'Notifications', desc: 'View notifications' },
                                    { id: 'Attendance', label: 'Attendance', desc: 'Mark & view attendance' },
                                    { id: 'Doctors', label: 'Doctors', desc: 'Doctor management' },
                                    { id: 'Staff', label: 'Staff', desc: 'Staff directory' },
                                    { id: 'Services', label: 'Service Catalog', desc: 'Service rates & catalog' },
                                    { id: 'Settings', label: 'Settings', desc: 'Hospital settings' },
                                    { id: 'AICopilot', label: 'AI Chatbot Access', desc: 'Allow global AI Chatbot Panel' },
                                ].map(mod => {
                                    const currentModules = (formData.assignedModules || '').split(',').map(m => m.trim()).filter(Boolean);
                                    const isChecked = currentModules.includes(mod.id);
                                    return (
                                        <button key={mod.id} type="button"
                                            onClick={() => {
                                                const updated = isChecked
                                                    ? currentModules.filter(m => m !== mod.id)
                                                    : [...currentModules, mod.id];
                                                setFormData({ ...formData, assignedModules: updated.join(',') });
                                            }}
                                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${isChecked
                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                                            <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                                {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${isChecked ? 'text-blue-700' : 'text-gray-700'}`}>{mod.label}</p>
                                                <p className="text-[10px] text-gray-400">{mod.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
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

                {/* 5. Page Permissions & Features */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                    <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-6">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Page Permissions & Features</h2>
                            <p className="text-sm text-gray-500">Configure access levels and module permissions for this employee.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'Patients', label: 'Patient Management', desc: 'Register patients, edit clinical details & view lists' },
                            { id: 'Doctors', label: 'Doctor Directory', desc: 'Add/edit doctor profiles, availability, reset passwords' },
                            { id: 'Staff', label: 'Workforce & Attendance', desc: 'Manage employees, schedules, and presence widget' },
                            { id: 'Appointments', label: 'Appointments', desc: 'Schedule, book, and dispatch appointments' },
                            { id: 'Billing', label: 'Billing & Invoices', desc: 'Generate bills, process payments, view statements' },
                            { id: 'ADT', label: 'ADT Ward Tracking', desc: 'Admit, discharge, transfer and monitor bed layouts' },
                            { id: 'Settings', label: 'System Configuration', desc: 'System settings, backups and global constants' },
                            { id: 'AICopilot', label: 'AI Chatbot Access', desc: 'Allow global access to Owner Copilot & Staff Agent' }
                        ].map(mod => {
                            const isChecked = (formData.assignedModules || '').split(',').map(m => m.trim()).includes(mod.id);
                            return (
                                <div 
                                    key={mod.id} 
                                    onClick={() => handleModuleToggle(mod.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                                        isChecked 
                                            ? 'bg-blue-50/30 border-blue-500 shadow-sm ring-1 ring-blue-500/10' 
                                            : 'bg-white hover:bg-gray-50/50 border-gray-200'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // toggled via parent div click
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 text-sm leading-tight">{mod.label}</p>
                                        <p className="text-[11px] text-gray-400 mt-1 leading-normal">{mod.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
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
