import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, Plus, Search, MapPin, CheckCircle, XCircle } from 'lucide-react';

const Hospitals = () => {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        adminUsername: '',
        adminPassword: '',
        isActive: true
    });

    useEffect(() => {
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const res = await axios.get('/api/SuperAdmin/Hospitals');
            if (res.data.Results) {
                setHospitals(res.data.Results);
            }
        } catch (error) {
            console.error("Failed to fetch hospitals", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (hospital) => {
        setIsEditing(true);
        setSelectedHospital(hospital);
        setFormData({
            name: hospital.name,
            address: hospital.address,
            contactNumber: hospital.contactNumber,
            email: hospital.email,
            adminUsername: '',
            adminPassword: '',
            isActive: hospital.isActive
        });
        setShowModal(true);
    };

    const handleManage = (hospital) => {
        setSelectedHospital(hospital);
        setShowDetailsModal(true);
    };

    const [errors, setErrors] = useState({});

    const validateHospital = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Hospital name is required";
        if (!formData.contactNumber.trim()) {
            newErrors.contactNumber = "Contact number is required";
        } else {
            const phonePlain = formData.contactNumber.replace(/\D/g, '');
            if (phonePlain.length < 10 || phonePlain.length > 15) {
                newErrors.contactNumber = "Contact should be 10-15 digits";
            }
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";

        if (!isEditing) {
            if (!formData.adminUsername.trim() || formData.adminUsername.length < 4) {
                newErrors.adminUsername = "Username must be at least 4 characters";
            }
            if (!formData.adminPassword || formData.adminPassword.length < 6) {
                newErrors.adminPassword = "Password must be at least 6 characters";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateCredentials = () => {
        const newErrors = {};
        if (!credentialData.newUsername.trim() || credentialData.newUsername.length < 4) {
            newErrors.newUsername = "Username must be at least 4 characters";
        }
        if (!credentialData.newPassword || credentialData.newPassword.length < 6) {
            newErrors.newPassword = "Password must be at least 6 characters";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateHospital()) return;

        try {
            let res;
            if (isEditing && selectedHospital) {
                res = await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}`, formData);
            } else {
                res = await axios.post('/api/SuperAdmin/Hospitals', formData);
            }

            if (res.data.ErrorMessage) {
                alert(res.data.ErrorMessage);
            } else {
                fetchHospitals();
                setShowModal(false);
                setIsEditing(false);
                setSelectedHospital(null);
                setFormData({ name: '', address: '', contactNumber: '', email: '', adminUsername: '', adminPassword: '', isActive: true });
                setErrors({});
                alert(isEditing ? "Hospital updated successfully!" : "Hospital added successfully!");
            }
        } catch (error) {
            console.error("Error saving hospital", error);
            alert(error.response?.data?.ErrorMessage || "Failed to save hospital");
        }
    };

    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentialData, setCredentialData] = useState({ newUsername: '', newPassword: '' });

    const handleResetCredentials = (hospital) => {
        setSelectedHospital(hospital);
        setCredentialData({ newUsername: '', newPassword: '' });
        setErrors({});
        setShowCredentialsModal(true);
    };

    const submitCredentials = async (e) => {
        e.preventDefault();
        if (!validateCredentials()) return;

        try {
            const res = await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}/UpdateCredentials`, credentialData);
            if (res.data.ErrorMessage) {
                alert(res.data.ErrorMessage);
            } else {
                alert("Credentials updated successfully!");
                setShowCredentialsModal(false);
                setErrors({});
            }
        } catch (error) {
            alert(error.response?.data?.ErrorMessage || error.response?.data?.message || "Failed to update credentials");
        }
    };

    return (
        <div className="space-y-6 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hospital Fleet</h1>
                    <p className="text-gray-500 font-medium">Global management of all registered health institutions.</p>
                </div>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setSelectedHospital(null);
                        setFormData({ name: '', address: '', contactNumber: '', email: '', adminUsername: '', adminPassword: '', isActive: true });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 font-bold"
                >
                    <Plus size={20} />
                    Onboard Hospital
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-24 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Deploying modules...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {hospitals.map((hospital) => (
                        <div key={hospital.hospitalId} className="group bg-white rounded-[2.5rem] shadow-sm ring-1 ring-gray-100 p-8 transition-all hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-4 bg-gray-50 rounded-2xl text-gray-900 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Building size={28} />
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${hospital.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {hospital.isActive ? 'Active' : 'Offline'}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-gray-900 mb-2">{hospital.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-6">
                                <MapPin size={16} className="text-blue-500" />
                                {hospital.address || 'Global/Remote'}
                            </div>

                            <div className="space-y-3 bg-gray-50/50 p-6 rounded-3xl mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-black tracking-tighter uppercase text-[10px]">Contact</span>
                                    <span className="font-bold text-gray-700">{hospital.contactNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-black tracking-tighter uppercase text-[10px]">Email</span>
                                    <span className="font-bold text-gray-700 truncate ml-4 max-w-[150px]">{hospital.email || '-'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => handleManage(hospital)}
                                    className="px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all active:scale-95"
                                >
                                    Analytics
                                </button>
                                <button
                                    onClick={() => handleEdit(hospital)}
                                    className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Modify
                                </button>
                                <button
                                    onClick={() => handleResetCredentials(hospital)}
                                    className="col-span-2 mt-1 px-4 py-3 text-xs font-black uppercase tracking-widest text-purple-600 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-all active:scale-95 border border-purple-100"
                                >
                                    Reset Credentials
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isEditing ? 'Update Profile' : 'New Onboarding'}</h3>
                                <p className="text-sm text-gray-500 font-medium">Configure hospital metadata and access.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Institutional Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full rounded-2xl border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Heartland Medical Center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Physical Address</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-2xl border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Main St, Sector 12"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Inbound Contact</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-2xl border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            placeholder="+1 234..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Direct Email</label>
                                        <input
                                            type="email"
                                            className="w-full rounded-2xl border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold shadow-inner focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="admin@hosp.com"
                                        />
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-[2rem] border border-blue-100">
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                className="sr-only peer"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </div>
                                        <label htmlFor="isActive" className="text-xs font-black text-blue-900 uppercase tracking-tighter">
                                            Fleet Status (Active/Offline)
                                        </label>
                                    </div>
                                )}

                                {!isEditing && (
                                    <div className="bg-gray-900 rounded-[2.5rem] p-8 mt-4 shadow-2xl">
                                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-6 text-center">Security Initialization</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-2">Master Username</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full rounded-xl bg-white/10 border-none px-5 py-3 text-sm font-bold text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                    value={formData.adminUsername}
                                                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                                                    placeholder="apollo_root"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-2">Secure Password</label>
                                                <input
                                                    required
                                                    type="password"
                                                    className="w-full rounded-xl bg-white/10 border-none px-5 py-3 text-sm font-bold text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                    value={formData.adminPassword}
                                                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-8 py-4 border-2 border-gray-100 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-4 bg-blue-600 rounded-2xl text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                                >
                                    {isEditing ? 'Confirm Update' : 'Initialize Fleet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Credentials Modal */}
            {showCredentialsModal && selectedHospital && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-purple-900 tracking-tight text-center">Reset Access</h3>
                                <p className="text-xs text-purple-600 font-black uppercase tracking-widest text-center mt-1">{selectedHospital.name}</p>
                            </div>
                            <button onClick={() => setShowCredentialsModal(false)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-purple-100 text-purple-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={submitCredentials} className="p-10 space-y-6">
                            <div className="bg-gray-900 rounded-[2rem] p-8 shadow-2xl">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">New Master Username</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full rounded-xl bg-white/10 border-none px-5 py-4 text-sm font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-purple-500 transition-all outline-none shadow-inner"
                                            value={credentialData.newUsername}
                                            onChange={(e) => setCredentialData({ ...credentialData, newUsername: e.target.value })}
                                            placeholder="new_admin_uid"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">New Secure Password</label>
                                        <input
                                            required
                                            type="password"
                                            className="w-full rounded-xl bg-white/10 border-none px-5 py-4 text-sm font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-purple-500 transition-all outline-none shadow-inner"
                                            value={credentialData.newPassword}
                                            onChange={(e) => setCredentialData({ ...credentialData, newPassword: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCredentialsModal(false)}
                                    className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-4 bg-purple-600 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all active:scale-95"
                                >
                                    Re-key Security
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal remains same but with updated styling if needed - skipping for brevity as main task is credentials */}
            {showDetailsModal && selectedHospital && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedHospital.name}</h3>
                                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">Institutional Intelligence</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition-all">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-10">
                            <div className="grid grid-cols-2 gap-8 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Global Status</label>
                                    <div className="font-black text-green-600 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> ONLINE
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Registration</label>
                                    <p className="font-bold text-gray-900">{new Date(selectedHospital.createdOn).toDateString()}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Physical HQ</label>
                                    <p className="font-bold text-gray-900">{selectedHospital.address || 'Not Disclosed'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Primary Contact</label>
                                    <p className="font-bold text-gray-900">{selectedHospital.contactNumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Official Email</label>
                                    <p className="font-bold text-gray-900 truncate">{selectedHospital.email}</p>
                                </div>
                            </div>

                            <div className="mt-10">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 pl-2">Subscription Architecture</h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-gray-900 p-6 rounded-[2rem] text-center shadow-xl">
                                        <p className="text-xl font-black text-white">Enterprise</p>
                                        <p className="text-[8px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">Licence</p>
                                    </div>
                                    <div className="bg-blue-600 p-6 rounded-[2rem] text-center shadow-xl">
                                        <p className="text-xl font-black text-white">Active</p>
                                        <p className="text-[8px] text-blue-100 font-black uppercase tracking-[0.2em] mt-1">Health</p>
                                    </div>
                                    <div className="bg-gray-100 p-6 rounded-[2rem] text-center">
                                        <p className="text-xl font-black text-gray-900">Life</p>
                                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Validity</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-10 py-6 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-8 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hospitals;
