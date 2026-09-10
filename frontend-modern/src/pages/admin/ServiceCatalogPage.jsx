import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Package, Plus, Edit3, Trash2, Save, Search, Zap } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CATEGORIES = ['OPD', 'IPD', 'Lab', 'Imaging', 'Procedure', 'Other'];
const RATE_TYPES = ['fixed', 'per_visit', 'per_day', 'per_unit'];

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

    const resetForm = () => setForm({ serviceName: '', category: 'OPD', rate: '', rateType: 'fixed', description: '', subCategory: '' });

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
            setShowForm(false); setEditing(null); resetForm();
            fetchServices();
        } catch (e) { toast.error('Failed to save'); }
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
        <div className="space-y-5">
            <PageHeader
                title="Services & rates"
                description="Manage hospital service rates used across the billing module."
                icon={Package}
                actions={
                    <>
                        {services.length === 0 && (
                            <Button variant="outline" onClick={seedDefaults}><Zap className="text-warning" /> Load default catalog</Button>
                        )}
                        <Button onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}><Plus /> Add service</Button>
                    </>
                }
            />

            <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter services by name…" className="pl-9" />
                </div>
                <div className="flex flex-wrap items-center gap-0.5 rounded-lg border p-0.5">
                    <button onClick={() => setFilterCat('')} aria-pressed={!filterCat}
                            className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', !filterCat ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        All
                    </button>
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)} aria-pressed={filterCat === c}
                                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filterCat === c ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>
            ) : Object.keys(grouped).length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Package}
                        title="No services found"
                        description="Adjust your filters, try a different keyword, or load the defaults."
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([cat, items]) => (
                        <Card key={cat} className="overflow-hidden p-0">
                            <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                                <Badge variant="secondary">{cat}</Badge>
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{items.length} services</span>
                            </div>
                            <div className="divide-y">
                                {items.map(s => (
                                    <div key={s.serviceId} className={cn('flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center', !s.isActive && 'opacity-50')}>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-semibold">{s.serviceName}</h4>
                                                <Badge variant="outline" className="uppercase">{s.rateType?.replace('_', ' ')}</Badge>
                                                {!s.isActive && <Badge variant="destructive">Inactive</Badge>}
                                            </div>
                                            {s.description && <p className="max-w-2xl text-xs text-muted-foreground">{s.description}</p>}
                                        </div>
                                        <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
                                            <span className="tabular text-base font-semibold">₹{Number(s.rate).toFixed(2)}</span>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon-sm" onClick={() => editService(s)} title="Edit service" className="text-muted-foreground">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                {s.isActive && (
                                                    <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDeleteId(s.serviceId)} title="Deactivate service" className="text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">Service name</Label>
                            <Input value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} placeholder="e.g. CBC / Complete Blood Count" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1.5 block">Category</Label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Rate type</Label>
                                <select value={form.rateType} onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    {RATE_TYPES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Rate (₹)</Label>
                            <Input type="number" min="0" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="500" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Description</Label>
                            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the service…" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
                        <Button onClick={saveService}><Save /> {editing ? 'Save changes' : 'Create service'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Deactivate service"
                message="This service will be marked inactive and hidden from active billing modules."
                confirmText="Deactivate"
                cancelText="Keep active"
                type="danger"
            />
        </div>
    );
};

export default ServiceCatalogPage;
