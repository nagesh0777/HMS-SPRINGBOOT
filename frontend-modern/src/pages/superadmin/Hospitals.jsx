import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Building, Plus, Search, MapPin, CheckCircle, XCircle, 
    BadgeIndianRupee, CreditCard, Sparkles, RefreshCw, Calendar, 
    Sliders, Tag, Trash2, Edit3, Key, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const PLAN_PRICES = {
    STANDARD: { monthly: 1999, yearly: 19999, name: 'Standard' },
    PREMIUM: { monthly: 4999, yearly: 49999, name: 'Premium' }
};

const Hospitals = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' or 'promos'
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDeletePromo, setConfirmDeletePromo] = useState(null);

    // Form State for Hospital & Subscription
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        adminUsername: '',
        adminPassword: '',
        isActive: true,
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'active',
        billingCycle: 'monthly',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Reset Credentials Form State
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentialData, setCredentialData] = useState({ newUsername: '', newPassword: '' });

    // Promo Codes Management State
    const [promos, setPromos] = useState(() => {
        try {
            const cached = localStorage.getItem('trikaar_platform_promocodes');
            return cached ? JSON.parse(cached) : [
                { id: '1', code: 'WELCOME', type: 'Free Month', value: '1 Month', desc: 'Trikaar SaaS launch promo code. Gives 1 month 100% free.', active: true },
                { id: '2', code: 'NAGESH50', type: 'Discount', value: '50% Off', desc: 'Nagesh exclusive platform partner discount.', active: true },
                { id: '3', code: 'EARLYBIRD', type: 'Discount', value: '20% Off', desc: 'Early bird sign-up promotional discount.', active: true }
            ];
        } catch {
            return [];
        }
    });
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoForm, setPromoForm] = useState({ code: '', type: 'Discount', value: '', desc: '', active: true });

    useEffect(() => {
        fetchHospitals();
    }, []);

    useEffect(() => {
        localStorage.setItem('trikaar_platform_promocodes', JSON.stringify(promos));
    }, [promos]);

    const fetchHospitals = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/SuperAdmin/Hospitals');
            if (res.data.Results) {
                setHospitals(res.data.Results);
            }
        } catch (error) {
            console.error("Failed to fetch hospitals", error);
            toast.error("Could not load hospital fleet.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Platform Dashboard SaaS Metrics
    const metrics = useMemo(() => {
        let mrr = 0;
        let activeSubs = 0;
        let pendingPayments = 0;

        hospitals.forEach(h => {
            const status = (h.subscriptionStatus || 'active').toLowerCase();
            const plan = (h.subscriptionPlan || 'PREMIUM').toUpperCase();
            const cycle = (h.billingCycle || 'monthly').toLowerCase();

            if (status === 'active' && h.isActive) {
                activeSubs++;
                const pricing = PLAN_PRICES[plan] || PLAN_PRICES.STANDARD;
                if (cycle === 'yearly') {
                    mrr += Math.round(pricing.yearly / 12);
                } else {
                    mrr += pricing.monthly;
                }
            } else if (status === 'payment_pending') {
                pendingPayments++;
            }
        });

        return {
            mrr,
            activeSubs,
            pendingPayments,
            totalHospitals: hospitals.length,
            activePromosCount: promos.filter(p => p.active).length
        };
    }, [hospitals, promos]);

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
            isActive: hospital.isActive ?? true,
            subscriptionPlan: hospital.subscriptionPlan || 'PREMIUM',
            subscriptionStatus: hospital.subscriptionStatus || 'active',
            billingCycle: hospital.billingCycle || 'monthly',
            subscriptionExpiry: hospital.subscriptionExpiry 
                ? new Date(hospital.subscriptionExpiry).toISOString().split('T')[0] 
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
        } else if (!/^[0-9]{10,15}$/.test(formData.contactNumber.trim())) {
            newErrors.contactNumber = "Enter a valid 10-digit mobile number";
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateHospital()) return;

        try {
            let res;
            const payload = {
                ...formData,
                subscriptionExpiry: formData.subscriptionExpiry ? `${formData.subscriptionExpiry}T23:59:59` : null
            };

            if (isEditing && selectedHospital) {
                res = await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}`, payload);
            } else {
                res = await axios.post('/api/SuperAdmin/Hospitals', payload);
            }

            if (res.data.ErrorMessage) {
                toast.error(res.data.ErrorMessage);
            } else {
                fetchHospitals();
                setShowModal(false);
                setIsEditing(false);
                setSelectedHospital(null);
                setFormData({ 
                    name: '', address: '', contactNumber: '', email: '', 
                    adminUsername: '', adminPassword: '', isActive: true,
                    subscriptionPlan: 'PREMIUM', subscriptionStatus: 'active',
                    billingCycle: 'monthly', subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });
                setErrors({});
                toast.success(isEditing ? "Subscription profile updated!" : "Hospital onboarded successfully!");
            }
        } catch (error) {
            console.error("Error saving hospital", error);
            toast.error(error.response?.data?.ErrorMessage || "Failed to save hospital profile.");
        }
    };

    const handleResetCredentials = (hospital) => {
        setSelectedHospital(hospital);
        setCredentialData({ newUsername: '', newPassword: '' });
        setErrors({});
        setShowCredentialsModal(true);
    };

    const submitCredentials = async (e) => {
        e.preventDefault();
        if (!credentialData.newUsername.trim() || credentialData.newUsername.length < 4) {
            toast.error("Username must be at least 4 characters");
            return;
        }
        if (!credentialData.newPassword || credentialData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        try {
            const res = await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}/UpdateCredentials`, credentialData);
            if (res.data.ErrorMessage) {
                toast.error(res.data.ErrorMessage);
            } else {
                toast.success("Credentials updated successfully!");
                setShowCredentialsModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.ErrorMessage || "Failed to update credentials");
        }
    };

    // Promo Code Operations
    const handleAddPromo = (e) => {
        e.preventDefault();
        if (!promoForm.code.trim()) { toast.error("Enter a code"); return; }
        if (!promoForm.value.trim()) { toast.error("Enter a value"); return; }

        const codeUpper = promoForm.code.trim().toUpperCase();
        if (promos.some(p => p.code === codeUpper)) {
            toast.error("Promo code already exists");
            return;
        }

        const newPromo = {
            id: String(Date.now()),
            code: codeUpper,
            type: promoForm.type,
            value: promoForm.value,
            desc: promoForm.desc,
            active: promoForm.active
        };

        setPromos(prev => [newPromo, ...prev]);
        setShowPromoModal(false);
        setPromoForm({ code: '', type: 'Discount', value: '', desc: '', active: true });
        toast.success(`Promo code ${codeUpper} created!`);
    };

    const togglePromoActive = (id) => {
        setPromos(prev => prev.map(p => 
            p.id === id ? { ...p, active: !p.active } : p
        ));
        toast.success("Promo status updated!");
    };

    const deletePromo = (id, code) => {
        setConfirmDeletePromo({ id, code });
    };

    const handleConfirmDeletePromo = () => {
        if (!confirmDeletePromo) return;
        setPromos(prev => prev.filter(p => p.id !== confirmDeletePromo.id));
        toast.success("Promo code deleted");
        setConfirmDeletePromo(null);
    };

    const filteredHospitals = hospitals.filter(h => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || 
               (h.email && h.email.toLowerCase().includes(q)) || 
               (h.contactNumber && h.contactNumber.includes(q)) ||
               (h.subscriptionPlan && h.subscriptionPlan.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-8 px-4 pb-12 max-w-7xl mx-auto">
            
            {/* ─── Platform Header ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Sliders className="text-teal-700 h-8 w-8" />
                        Trikaar SaaS Console
                    </h1>
                    <p className="text-gray-500 font-medium text-xs mt-1">
                        Welcome Nagesh • Platform owner subscription, licensing, and promocode dispatch controls.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchHospitals}
                        className="p-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                        title="Reload Fleet Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setSelectedHospital(null);
                            setFormData({ 
                                name: '', address: '', contactNumber: '', email: '', 
                                adminUsername: '', adminPassword: '', isActive: true,
                                subscriptionPlan: 'PREMIUM', subscriptionStatus: 'active',
                                billingCycle: 'monthly', subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-black transition-all active:scale-95 text-xs font-black uppercase tracking-wider"
                    >
                        <Plus size={16} />
                        Onboard Hospital
                    </button>
                </div>
            </div>

            {/* ─── Premium Glassmorphic SaaS KPI Metrics Banner ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { t: 'Clinics Onboarded', v: hospitals.length, sub: 'Total fleet size', g: 'from-slate-800 to-slate-900', icon: <Building size={20} /> },
                    { t: 'Active Connection', v: hospitals.filter(h => h.isActive).length, sub: 'Online & operational', g: 'from-teal-600 to-teal-800', icon: <CheckCircle size={20} /> },
                    { t: 'Offline Connection', v: hospitals.filter(h => !h.isActive).length, sub: 'Fleet access disabled', g: 'from-rose-500 to-rose-700', icon: <XCircle size={20} /> },
                ].map(c => (
                    <div key={c.t} className={`rounded-3xl bg-gradient-to-br ${c.g} p-6 text-white shadow-lg relative overflow-hidden`}>
                        <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full border-4 border-white/10" />
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider opacity-85">{c.t}</p>
                                <p className="text-3xl font-black mt-2">{c.v}</p>
                                <p className="text-[9px] mt-1 opacity-70 font-semibold">{c.sub}</p>
                            </div>
                            <div className="p-2 bg-white/15 rounded-xl">{c.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── TAB 1: HOSPITAL FLEET ─── */}
            <div className="space-y-6">
                    {/* Search & Stats */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter fleet by clinic name, plan, contact..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-700 bg-white"
                        />
                    </div>

                    {loading ? (
                        <div className="py-24 text-center">
                            <div className="animate-spin h-8 w-8 border-4 border-teal-700 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[9px]">Loading tenant databases...</p>
                        </div>
                    ) : filteredHospitals.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl p-8">
                            <Building className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 text-sm">No hospitals registered</h3>
                            <p className="text-xs text-gray-400 mt-1">Try onboarding a new clinic or hospital client.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredHospitals.map(h => {
                                const expiry = h.subscriptionExpiry ? new Date(h.subscriptionExpiry) : null;
                                const hasExpired = expiry ? expiry < new Date() : false;
                                const plan = (h.subscriptionPlan || 'STANDARD').toUpperCase();
                                const status = (h.subscriptionStatus || 'active').toLowerCase();
                                const cycle = (h.billingCycle || 'monthly').toLowerCase();

                                return (
                                    <div key={h.hospitalId} className="group bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-0.5">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="p-3 bg-gray-50 rounded-xl text-slate-800 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                                                    <Building size={22} />
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        h.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {h.isActive ? 'Connected' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-800 transition-colors">{h.name}</h3>
                                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <MapPin size={12} className="text-teal-700" />
                                                {h.address || 'Remote / Cloud'}
                                            </p>

                                            <div className="space-y-2.5 bg-gray-50/50 p-4 rounded-2xl my-4 text-xs font-semibold">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] text-gray-400 uppercase font-black">Contact Phone</span>
                                                    <span className="text-slate-800 font-bold">{h.contactNumber || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] text-gray-400 uppercase font-black">Admin Email</span>
                                                    <span className="text-slate-800 font-bold truncate max-w-[140px]">{h.email || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50">
                                            <button
                                                onClick={() => handleManage(h)}
                                                className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                                            >
                                                Clinic Details
                                            </button>
                                            <button
                                                onClick={() => handleEdit(h)}
                                                className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                onClick={() => handleResetCredentials(h)}
                                                className="col-span-2 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors border border-purple-100"
                                            >
                                                Re-key Admin Login
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            {/* ─── MODAL: ONBOARD / EDIT HOSPITAL ─── */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{isEditing ? 'Modify Client Account' : 'Onboard Hospital Client'}</h3>
                                <p className="text-xs text-gray-500 font-semibold mt-1">Configure client profile details and system access credentials.</p>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 transition-colors bg-white shadow-sm"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Hospital Basic Metadata */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest border-b border-gray-100 pb-1.5">1. Institutional Profiling</h4>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Hospital / Clinic Name *</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Care Clinic and Hospital"
                                    />
                                    {errors.name && <p className="text-[10px] font-bold text-red-600 mt-1 px-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Physical Address</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition-all"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="12 Main Road, Indiranagar, Bengaluru"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Inbound Contact *</label>
                                        <input
                                            required
                                            type="tel"
                                            maxLength={15}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition-all"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '') })}
                                            placeholder="9876543210 (10 digits)"
                                        />
                                        {errors.contactNumber && <p className="text-[10px] font-bold text-red-600 mt-1 px-1">{errors.contactNumber}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 px-1">Direct Email Address *</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="admin@careclinic.com"
                                        />
                                        {errors.email && <p className="text-[10px] font-bold text-red-600 mt-1 px-1">{errors.email}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Platform Connectivity Control */}
                            <div className="space-y-4 bg-teal-50/50 p-6 rounded-3xl border border-teal-100/50">
                                <h4 className="text-[10px] font-black text-teal-700 uppercase tracking-widest border-b border-teal-100 pb-1.5 flex items-center gap-1.5">
                                    <Sliders size={12} /> 2. Platform Access Settings
                                </h4>
                                <div className="flex items-center gap-4 pt-1">
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            className="sr-only peer"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
                                    </div>
                                    <label htmlFor="isActive" className="text-[10px] font-black text-teal-900 uppercase tracking-wide">
                                        Enable Platform Fleet Connectivity (Active/Offline)
                                    </label>
                                </div>
                            </div>

                            {/* Credentials Initializer (only for onboarding) */}
                            {!isEditing && (
                                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-md space-y-4">
                                    <h4 className="text-[10px] font-black text-teal-400 uppercase tracking-widest border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                                        <Key size={12} /> 3. Tenant Admin Credentials
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Master Username *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full rounded-xl bg-white/10 border-none px-4 py-2.5 text-xs font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-teal-400 outline-none"
                                                value={formData.adminUsername}
                                                onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                                                placeholder="clinic_admin"
                                            />
                                            {errors.adminUsername && <p className="text-[10px] font-bold text-red-400 mt-1 px-1">{errors.adminUsername}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Secure Password *</label>
                                            <input
                                                required
                                                type="password"
                                                className="w-full rounded-xl bg-white/10 border-none px-4 py-2.5 text-xs font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-teal-400 outline-none"
                                                value={formData.adminPassword}
                                                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                                placeholder="••••••••"
                                            />
                                            {errors.adminPassword && <p className="text-[10px] font-bold text-red-400 mt-1 px-1">{errors.adminPassword}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-3.5 border border-gray-200 rounded-xl text-gray-400 font-black uppercase tracking-wider text-xs hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-3.5 bg-teal-700 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-teal-800 shadow-md transition-colors"
                                >
                                    {isEditing ? 'Confirm Modifications' : 'Initialize Tenant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: RESET ADMIN CREDENTIALS ─── */}
            {showCredentialsModal && selectedHospital && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-purple-900 tracking-tight">Re-key Secure Access</h3>
                                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mt-1">{selectedHospital.name}</p>
                            </div>
                            <button 
                                onClick={() => setShowCredentialsModal(false)} 
                                className="p-1 rounded-lg border border-purple-200 text-purple-400 hover:text-red-500 hover:border-red-100 transition-colors bg-white shadow-sm"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitCredentials} className="p-8 space-y-5">
                            <div className="bg-slate-900 rounded-3xl p-6 shadow-md space-y-4">
                                <div className="space-y-3.5">
                                    <div>
                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1.5">New Master Username</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full rounded-xl bg-white/10 border-none px-4 py-3 text-xs font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={credentialData.newUsername}
                                            onChange={(e) => setCredentialData({ ...credentialData, newUsername: e.target.value })}
                                            placeholder="new_admin_username"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1.5">New Secure Password</label>
                                        <input
                                            required
                                            type="password"
                                            className="w-full rounded-xl bg-white/10 border-none px-4 py-3 text-xs font-bold text-white placeholder-white/20 focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={credentialData.newPassword}
                                            onChange={(e) => setCredentialData({ ...credentialData, newPassword: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCredentialsModal(false)}
                                    className="flex-1 px-5 py-3 border border-gray-200 rounded-xl text-gray-400 font-black uppercase tracking-wider text-[10px] hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-5 py-3 bg-purple-600 rounded-xl text-white font-black uppercase tracking-wider text-[10px] hover:bg-purple-700 shadow-md transition-colors"
                                >
                                    Re-key Security
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: LICENSE DETAILS ─── */}
            {showDetailsModal && selectedHospital && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedHospital.name}</h3>
                                <p className="text-xs font-black text-teal-700 uppercase tracking-widest mt-1">Tenant License Architecture</p>
                            </div>
                            <button 
                                onClick={() => setShowDetailsModal(false)} 
                                className="p-1 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 text-xs font-semibold">
                                <div className="space-y-1">
                                    <label className="text-[8px] text-gray-400 uppercase font-black">Global Fleet Status</label>
                                    <div className={`font-black flex items-center gap-1.5 ${selectedHospital.isActive ? 'text-green-600' : 'text-red-500'}`}>
                                        <div className={`h-2 w-2 rounded-full ${selectedHospital.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                        {selectedHospital.isActive ? 'ONLINE / CONNECTED' : 'OFFLINE / DISCONNECTED'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-gray-400 uppercase font-black">Onboarding Date</label>
                                    <p className="font-bold text-gray-900">{new Date(selectedHospital.createdOn).toDateString()}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[8px] text-gray-400 uppercase font-black">HQ Physical Address</label>
                                    <p className="font-bold text-gray-900">{selectedHospital.address || 'Cloud Database / Private server'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-gray-400 uppercase font-black">Primary Contact</label>
                                    <p className="font-bold text-gray-900">{selectedHospital.contactNumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-gray-400 uppercase font-black">Tenant Admin Email</label>
                                    <p className="font-bold text-gray-900 truncate">{selectedHospital.email}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-1">Licensing Profile</h4>
                                <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/50 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-teal-700 shrink-0" />
                                    <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider">Enterprise License Active • Unlimited Full-Featured Access Unlocked</span>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-black transition-colors"
                                >
                                    Dismiss Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Promo Deletion Confirmation */}
            <ConfirmationModal
                isOpen={!!confirmDeletePromo}
                onClose={() => setConfirmDeletePromo(null)}
                onConfirm={handleConfirmDeletePromo}
                title="Delete Promo Code"
                message={`Are you sure you want to permanently delete promo code "${confirmDeletePromo?.code}"? Dynamic signup discounts associated with this promo code will be halted immediately.`}
                confirmText="Delete Promo"
                cancelText="Keep Promo"
                type="danger"
            />
        </div>
    );
};

export default Hospitals;
