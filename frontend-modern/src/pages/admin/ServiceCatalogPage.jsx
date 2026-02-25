import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Package, Plus, Edit3, Trash2, X, Save, Search, Zap } from 'lucide-react';

const CATEGORIES = ['OPD', 'IPD', 'Lab', 'Imaging', 'Procedure', 'Pharmacy', 'Other'];
const RATE_TYPES = ['fixed', 'per_visit', 'per_day', 'per_unit'];
const CAT_COLORS = { OPD: 'blue', IPD: 'purple', Lab: 'emerald', Imaging: 'amber', Procedure: 'rose', Pharmacy: 'teal', Other: 'gray' };

const ServiceCatalogPage = () => {
    const toast = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' });

    useEffect(() => { fetchServices(); }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/ServiceCatalog', { params: { activeOnly: false } });
            if (res.data.Results) setServices(res.data.Results);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const seedDefaults = async () => {
        try {
            const res = await axios.post('/api/ServiceCatalog/SeedDefaults');
            if (res.data.Results && Array.isArray(res.data.Results)) {
                setServices(res.data.Results);
                toast.success('Default services loaded!');
            } else {
                toast.error(typeof res.data.Results === 'string' ? res.data.Results : 'Failed');
            }
        } catch (e) { toast.error('Failed to seed defaults'); }
    };

    const saveService = async () => {
        if (!form.serviceName.trim()) { toast.error('Service name required'); return; }
        if (!form.rate || Number(form.rate) < 0) { toast.error('Valid rate required'); return; }
        try {
            const payload = { ...form, rate: Number(form.rate) };
            if (editing) {
                await axios.put(`/api/ServiceCatalog/${editing.serviceId}`, payload);
                toast.success('Service updated');
            } else {
                await axios.post('/api/ServiceCatalog', payload);
                toast.success('Service created');
            }
            setShowForm(false); setEditing(null);
            setForm({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' });
            fetchServices();
        } catch (e) { toast.error('Failed to save'); }
    };

    const deleteService = async (id) => {
        if (!confirm('Deactivate this service?')) return;
        try {
            await axios.delete(`/api/ServiceCatalog/${id}`);
            toast.success('Service deactivated');
            fetchServices();
        } catch (e) { toast.error('Failed'); }
    };

    const editService = (s) => {
        setEditing(s);
        setForm({ serviceName: s.serviceName, category: s.category, rate: s.rate, rateType: s.rateType || 'fixed', description: s.description || '', subCategory: s.subCategory || '' });
        setShowForm(true);
    };

    const filtered = services.filter(s => {
        if (filterCat && s.category !== filterCat) return false;
        if (search && !s.serviceName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const grouped = {};
    filtered.forEach(s => { if (!grouped[s.category]) grouped[s.category] = []; grouped[s.category].push(s); });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Package size={28} /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Service Catalog</h1>
                        <p className="text-gray-500 font-medium text-sm">Configure service rates for billing — set once, use forever.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {services.length === 0 && (
                        <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-200 transition-all">
                            <Zap size={16} />Load Defaults
                        </button>
                    )}
                    <button onClick={() => { setEditing(null); setForm({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' }); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg transition-all">
                        <Plus size={16} />Add Service
                    </button>
                </div>
            </div>

            {/* Filter + Search */}
            <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!filterCat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>All</button>
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterCat === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{c}</button>
                    ))}
                </div>
                <span className="text-xs text-gray-400 font-bold">{filtered.length} services</span>
            </div>

            {/* Services Grouped by Category */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                    <Package size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-bold text-gray-500">No services configured</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Load Defaults" to get started with standard hospital services</p>
                </div>
            ) : (
                Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className={`px-5 py-3 bg-${CAT_COLORS[cat] || 'gray'}-50 border-b border-gray-100`}>
                            <h3 className={`text-xs font-black text-${CAT_COLORS[cat] || 'gray'}-600 uppercase tracking-widest`}>{cat} ({items.length})</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {items.map(s => (
                                <div key={s.serviceId} className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors ${!s.isActive ? 'opacity-40' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-800">{s.serviceName}</p>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">{s.rateType}</span>
                                            {!s.isActive && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-500">Inactive</span>}
                                        </div>
                                        {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-black text-indigo-600">₹{Number(s.rate).toFixed(0)}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => editService(s)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"><Edit3 size={14} /></button>
                                            {s.isActive && <button onClick={() => deleteService(s.serviceId)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900">{editing ? 'Edit Service' : 'Add New Service'}</h3>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-2 rounded-xl hover:bg-gray-100"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Service Name *</label>
                                <input value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. General Consultation" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Category *</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Rate Type</label>
                                    <select value={form.rateType} onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                        {RATE_TYPES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Rate (₹) *</label>
                                <input type="number" min="0" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Brief description..." />
                            </div>
                            <button onClick={saveService}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                <Save size={18} />{editing ? 'Update Service' : 'Add Service'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceCatalogPage;
