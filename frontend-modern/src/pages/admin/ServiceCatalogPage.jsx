import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Package, Plus, Edit3, Trash2, X, Save, Search, Zap } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const CATEGORIES = ['OPD', 'IPD', 'Lab', 'Imaging', 'Procedure', 'Other'];
const RATE_TYPES = ['fixed', 'per_visit', 'per_day', 'per_unit'];
const CAT_COLORS = { OPD: 'blue', IPD: 'purple', Lab: 'emerald', Imaging: 'amber', Procedure: 'rose', Other: 'gray' };

const ServiceCatalogPage = () => {
    const toast = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' });
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

    const deleteService = (id) => {
        setConfirmDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await axios.delete(`/api/ServiceCatalog/${confirmDeleteId}`);
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
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <Package className="h-6 w-6 text-zinc-700" />
                        Service Catalog
                    </h1>
                    <p className="text-sm text-zinc-500 font-normal">
                        Manage and configure hospital service rates for billing modules.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {services.length === 0 && (
                        <button 
                            onClick={seedDefaults} 
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                        >
                            <Zap className="h-4 w-4 text-amber-500" />
                            Load Default Catalog
                        </button>
                    )}
                    <button 
                        onClick={() => { setEditing(null); setForm({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' }); setShowForm(true); }}
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 shadow hover:bg-zinc-900/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add New Service
                    </button>
                </div>
            </div>

            {/* Filter + Search Controls */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-50/50 p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                        type="text"
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Filter services by name..."
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-zinc-200 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-medium text-zinc-900" 
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    <button 
                        onClick={() => setFilterCat('')} 
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                            !filterCat 
                                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
                        }`}
                    >
                        All Items
                    </button>
                    {CATEGORIES.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setFilterCat(c === filterCat ? '' : c)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                                filterCat === c 
                                    ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services Grouped by Category */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin h-6 w-6 border-2 border-zinc-900 border-t-transparent rounded-full" />
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 rounded-xl border border-dashed border-zinc-200 bg-white p-8">
                    <Package className="h-10 w-10 text-zinc-300 mb-3" />
                    <h3 className="font-semibold text-zinc-900 text-base">No services found</h3>
                    <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                        Try adjusting your filters, searching for a different keyword, or load the defaults.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat} className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
                            {/* Card Header */}
                            <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                                <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize ${
                                    cat === 'OPD' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    cat === 'IPD' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                    cat === 'Lab' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    cat === 'Imaging' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    cat === 'Procedure' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                }`}>
                                    {cat} Category
                                </span>
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{items.length} services configured</span>
                            </div>

                            {/* Card Content Table */}
                            <div className="divide-y divide-zinc-100">
                                {items.map(s => (
                                    <div 
                                        key={s.serviceId} 
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-colors ${
                                            !s.isActive ? 'opacity-50 bg-zinc-50/30' : ''
                                        }`}
                                    >
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <h4 className="font-semibold text-zinc-900 text-sm">{s.serviceName}</h4>
                                                <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10 uppercase">
                                                    {s.rateType?.replace('_', ' ')}
                                                </span>
                                                {!s.isActive && (
                                                    <span className="inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            {s.description && (
                                                <p className="text-xs text-zinc-500 font-normal leading-normal max-w-2xl">{s.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                                            <div className="text-right">
                                                <span className="text-base font-bold text-zinc-900">₹{Number(s.rate).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => editService(s)} 
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                                                    title="Edit Service"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                {s.isActive && (
                                                    <button 
                                                        onClick={() => deleteService(s.serviceId)} 
                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                                        title="Deactivate Service"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <h3 className="font-semibold text-zinc-900 text-base">{editing ? 'Modify Service' : 'Add New Service'}</h3>
                            <button 
                                onClick={() => { setShowForm(false); setEditing(null); }} 
                                className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Service Name *</label>
                                <input 
                                    type="text"
                                    value={form.serviceName} 
                                    onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 placeholder-zinc-300 transition-all" 
                                    placeholder="e.g. CBC / Complete Blood Count" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Category *</label>
                                    <select 
                                        value={form.category} 
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 transition-all"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Rate Type</label>
                                    <select 
                                        value={form.rateType} 
                                        onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 transition-all"
                                    >
                                        {RATE_TYPES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Rate (₹) *</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    value={form.rate} 
                                    onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 placeholder-zinc-300 transition-all" 
                                    placeholder="500" 
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                                <input 
                                    type="text"
                                    value={form.description} 
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-normal outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 placeholder-zinc-300 transition-all" 
                                    placeholder="Brief description of the service..." 
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditing(null); }}
                                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={saveService}
                                    className="flex-1 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 shadow hover:bg-zinc-900/90 transition-colors"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {editing ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal Overlay */}
            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Deactivate Service"
                message="Are you sure you want to deactivate this service? It will be marked as inactive and hidden from active billing modules."
                confirmText="Deactivate"
                cancelText="Keep Active"
                type="danger"
            />
        </div>
    );
};

export default ServiceCatalogPage;
