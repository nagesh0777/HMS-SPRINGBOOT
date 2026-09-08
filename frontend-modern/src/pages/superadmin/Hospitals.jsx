import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Building, Plus, Search, MapPin, XCircle,
    IndianRupee, Sparkles, RefreshCw, Tag, Trash2, Key, ShieldCheck, Loader2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PLAN_PRICES = {
    STANDARD: { monthly: 1999, yearly: 19999, name: 'Standard' },
    PREMIUM: { monthly: 4999, yearly: 49999, name: 'Premium' },
};

const emptyHospitalForm = {
    name: '', address: '', contactNumber: '', email: '',
    adminUsername: '', adminPassword: '', isActive: true,
    subscriptionPlan: 'PREMIUM', subscriptionStatus: 'active', billingCycle: 'monthly',
    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

const fmtInr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Hospitals = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'promos'
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDeletePromo, setConfirmDeletePromo] = useState(null);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({ ...emptyHospitalForm });

    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentialData, setCredentialData] = useState({ newUsername: '', newPassword: '' });

    const [promos, setPromos] = useState(() => {
        try {
            const cached = localStorage.getItem('trikaar_platform_promocodes');
            return cached ? JSON.parse(cached) : [
                { id: '1', code: 'WELCOME', type: 'Free Month', value: '1 Month', desc: 'Trikaar SaaS launch promo code. Gives 1 month 100% free.', active: true },
                { id: '2', code: 'NAGESH50', type: 'Discount', value: '50% Off', desc: 'Nagesh exclusive platform partner discount.', active: true },
                { id: '3', code: 'EARLYBIRD', type: 'Discount', value: '20% Off', desc: 'Early bird sign-up promotional discount.', active: true },
            ];
        } catch {
            return [];
        }
    });
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoForm, setPromoForm] = useState({ code: '', type: 'Discount', value: '', desc: '', active: true });

    useEffect(() => { fetchHospitals(); }, []);
    useEffect(() => { localStorage.setItem('trikaar_platform_promocodes', JSON.stringify(promos)); }, [promos]);

    const fetchHospitals = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/SuperAdmin/Hospitals');
            if (res.data.Results) setHospitals(res.data.Results);
        } catch (error) {
            console.error('Failed to fetch hospitals', error);
            toast.error('Could not load hospital fleet.');
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        let mrr = 0, activeSubs = 0, pendingPayments = 0;
        hospitals.forEach(h => {
            const status = (h.subscriptionStatus || 'active').toLowerCase();
            const plan = (h.subscriptionPlan || 'PREMIUM').toUpperCase();
            const cycle = (h.billingCycle || 'monthly').toLowerCase();
            if (status === 'active' && h.isActive) {
                activeSubs++;
                const pricing = PLAN_PRICES[plan] || PLAN_PRICES.STANDARD;
                mrr += cycle === 'yearly' ? Math.round(pricing.yearly / 12) : pricing.monthly;
            } else if (status === 'payment_pending') {
                pendingPayments++;
            }
        });
        return { mrr, activeSubs, pendingPayments, totalHospitals: hospitals.length, activePromosCount: promos.filter(p => p.active).length };
    }, [hospitals, promos]);

    const resetHospitalForm = () => setFormData({ ...emptyHospitalForm });

    const handleEdit = (hospital) => {
        setIsEditing(true);
        setSelectedHospital(hospital);
        setFormData({
            name: hospital.name, address: hospital.address, contactNumber: hospital.contactNumber, email: hospital.email,
            adminUsername: '', adminPassword: '', isActive: hospital.isActive ?? true,
            subscriptionPlan: hospital.subscriptionPlan || 'PREMIUM', subscriptionStatus: hospital.subscriptionStatus || 'active',
            billingCycle: hospital.billingCycle || 'monthly',
            subscriptionExpiry: hospital.subscriptionExpiry ? new Date(hospital.subscriptionExpiry).toISOString().split('T')[0] : emptyHospitalForm.subscriptionExpiry,
        });
        setErrors({});
        setShowModal(true);
    };

    const handleManage = (hospital) => { setSelectedHospital(hospital); setShowDetailsModal(true); };

    const validateHospital = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Hospital name is required';
        if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
        else if (!/^[0-9]{10,15}$/.test(formData.contactNumber.trim())) newErrors.contactNumber = 'Enter a valid 10-digit mobile number';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!isEditing) {
            if (!formData.adminUsername.trim() || formData.adminUsername.length < 4) newErrors.adminUsername = 'Username must be at least 4 characters';
            if (!formData.adminPassword || formData.adminPassword.length < 6) newErrors.adminPassword = 'Password must be at least 6 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateHospital()) return;
        try {
            const payload = { ...formData, subscriptionExpiry: formData.subscriptionExpiry ? `${formData.subscriptionExpiry}T23:59:59` : null };
            const res = isEditing && selectedHospital
                ? await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}`, payload)
                : await axios.post('/api/SuperAdmin/Hospitals', payload);

            if (res.data.ErrorMessage) {
                toast.error(res.data.ErrorMessage);
            } else {
                fetchHospitals();
                setShowModal(false); setIsEditing(false); setSelectedHospital(null);
                resetHospitalForm(); setErrors({});
                toast.success(isEditing ? 'Subscription profile updated!' : 'Hospital onboarded successfully!');
            }
        } catch (error) {
            console.error('Error saving hospital', error);
            toast.error(error.response?.data?.ErrorMessage || 'Failed to save hospital profile.');
        }
    };

    const handleResetCredentials = (hospital) => {
        setSelectedHospital(hospital);
        setCredentialData({ newUsername: '', newPassword: '' });
        setShowCredentialsModal(true);
    };

    const submitCredentials = async (e) => {
        e.preventDefault();
        if (!credentialData.newUsername.trim() || credentialData.newUsername.length < 4) { toast.error('Username must be at least 4 characters'); return; }
        if (!credentialData.newPassword || credentialData.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        try {
            const res = await axios.put(`/api/SuperAdmin/Hospitals/${selectedHospital.hospitalId}/UpdateCredentials`, credentialData);
            if (res.data.ErrorMessage) toast.error(res.data.ErrorMessage);
            else { toast.success('Credentials updated successfully!'); setShowCredentialsModal(false); }
        } catch (error) {
            toast.error(error.response?.data?.ErrorMessage || 'Failed to update credentials');
        }
    };

    const handleAddPromo = (e) => {
        e.preventDefault();
        if (!promoForm.code.trim()) { toast.error('Enter a code'); return; }
        if (!promoForm.value.trim()) { toast.error('Enter a value'); return; }
        const codeUpper = promoForm.code.trim().toUpperCase();
        if (promos.some(p => p.code === codeUpper)) { toast.error('Promo code already exists'); return; }

        setPromos(prev => [{ id: String(Date.now()), code: codeUpper, type: promoForm.type, value: promoForm.value, desc: promoForm.desc, active: promoForm.active }, ...prev]);
        setShowPromoModal(false);
        setPromoForm({ code: '', type: 'Discount', value: '', desc: '', active: true });
        toast.success(`Promo code ${codeUpper} created!`);
    };

    const togglePromoActive = (id) => {
        setPromos(prev => prev.map(p => (p.id === id ? { ...p, active: !p.active } : p)));
        toast.success('Promo status updated!');
    };

    const handleConfirmDeletePromo = () => {
        if (!confirmDeletePromo) return;
        setPromos(prev => prev.filter(p => p.id !== confirmDeletePromo.id));
        toast.success('Promo code deleted');
        setConfirmDeletePromo(null);
    };

    const filteredHospitals = hospitals.filter(h => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || (h.email || '').toLowerCase().includes(q) ||
            (h.contactNumber || '').includes(q) || (h.subscriptionPlan || '').toLowerCase().includes(q);
    });

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader
                title="Trikaar SaaS console"
                description="Platform owner subscription, licensing and promo-code controls."
                icon={Sparkles}
                actions={
                    <>
                        <Button variant="outline" size="icon" onClick={fetchHospitals} title="Reload fleet data">
                            <RefreshCw className={loading ? 'animate-spin' : ''} />
                        </Button>
                        <Button onClick={() => { setIsEditing(false); setSelectedHospital(null); resetHospitalForm(); setErrors({}); setShowModal(true); }}>
                            <Plus /> Onboard hospital
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Clinics onboarded" value={metrics.totalHospitals} hint="Total fleet size" icon={Building} />
                <StatCard label="Active MRR" value={fmtInr(metrics.mrr)} hint={`${metrics.activeSubs} active subscriptions`} icon={IndianRupee} tone="success" />
                <StatCard label="Payment pending" value={metrics.pendingPayments} icon={XCircle} tone={metrics.pendingPayments > 0 ? 'warning' : 'neutral'} />
                <StatCard label="Active promos" value={metrics.activePromosCount} icon={Tag} onClick={() => setActiveTab('promos')} />
            </div>

            <div className="flex w-fit items-center gap-0.5 rounded-lg border p-0.5">
                {[['fleet', 'Hospital fleet'], ['promos', 'Promo codes']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)} aria-pressed={activeTab === key}
                            className={cn('rounded-md px-4 py-2 text-sm font-medium transition-colors', activeTab === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        {label}
                    </button>
                ))}
            </div>

            {activeTab === 'fleet' && (
                <div className="space-y-5">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter fleet by clinic name, plan, contact…" className="pl-9" />
                    </div>

                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : filteredHospitals.length === 0 ? (
                        <Card><EmptyState icon={Building} title="No hospitals registered" description="Try onboarding a new clinic or hospital client." /></Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {filteredHospitals.map(h => (
                                <Card key={h.hospitalId} className="flex flex-col justify-between p-5">
                                    <div>
                                        <div className="mb-3 flex items-start justify-between">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building className="h-5 w-5" /></span>
                                            <Badge variant={h.isActive ? 'success' : 'destructive'}>{h.isActive ? 'Connected' : 'Offline'}</Badge>
                                        </div>
                                        <h3 className="font-semibold">{h.name}</h3>
                                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {h.address || 'Remote / cloud'}</p>

                                        <div className="my-4 space-y-2 rounded-lg bg-muted/30 p-3.5 text-xs">
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Contact phone</span><span className="tabular font-medium">{h.contactNumber || '-'}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Admin email</span><span className="max-w-[140px] truncate font-medium">{h.email || '-'}</span></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 border-t pt-3">
                                        <Button variant="secondary" size="sm" onClick={() => handleManage(h)}>Clinic details</Button>
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(h)}>Edit profile</Button>
                                        <Button variant="outline" size="sm" className="col-span-2 text-info hover:bg-info-subtle" onClick={() => handleResetCredentials(h)}>
                                            <Key className="h-3.5 w-3.5" /> Reset admin login
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'promos' && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Campaign codes offered at signup checkout.</p>
                        <Button onClick={() => setShowPromoModal(true)}><Plus /> Add promo code</Button>
                    </div>

                    {promos.length === 0 ? (
                        <Card><EmptyState icon={Tag} title="No promo codes yet" description="Create a code to offer at signup checkout." /></Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {promos.map(p => (
                                <Card key={p.id} className={cn('p-5', !p.active && 'opacity-60')}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-mono text-sm font-semibold tracking-wide">{p.code}</p>
                                            <Badge variant="secondary" className="mt-1.5">{p.type} · {p.value}</Badge>
                                        </div>
                                        <Switch checked={p.active} onCheckedChange={() => togglePromoActive(p.id)} />
                                    </div>
                                    {p.desc && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>}
                                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                                        <Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Active' : 'Disabled'}</Badge>
                                        <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDeletePromo({ id: p.id, code: p.code })} className="text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Onboard / edit hospital */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Modify client account' : 'Onboard hospital client'}</DialogTitle>
                        <DialogDescription>Configure the client profile and system access credentials.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Institutional profile</p>
                            <div>
                                <Label className="mb-1.5 block">Hospital / clinic name</Label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Care Clinic and Hospital" />
                                {errors.name && <p className="mt-1 text-xs font-medium text-destructive">{errors.name}</p>}
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Physical address</Label>
                                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="12 Main Road, Indiranagar, Bengaluru" />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="mb-1.5 block">Contact number</Label>
                                    <Input required type="tel" maxLength={15} value={formData.contactNumber}
                                           onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '') })} placeholder="9876543210" />
                                    {errors.contactNumber && <p className="mt-1 text-xs font-medium text-destructive">{errors.contactNumber}</p>}
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">Admin email</Label>
                                    <Input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="admin@careclinic.com" />
                                    {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform access</p>
                            <div className="flex items-center gap-3">
                                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} />
                                <Label className="cursor-pointer">Enable fleet connectivity (active / offline)</Label>
                            </div>
                        </div>

                        {!isEditing && (
                            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Key className="h-3 w-3" /> Tenant admin credentials
                                </p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label className="mb-1.5 block">Admin username</Label>
                                        <Input required value={formData.adminUsername} onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })} placeholder="clinic_admin" />
                                        {errors.adminUsername && <p className="mt-1 text-xs font-medium text-destructive">{errors.adminUsername}</p>}
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Admin password</Label>
                                        <Input required type="password" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} placeholder="••••••••" />
                                        {errors.adminPassword && <p className="mt-1 text-xs font-medium text-destructive">{errors.adminPassword}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit">{isEditing ? 'Save changes' : 'Onboard hospital'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reset admin credentials */}
            <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset admin login</DialogTitle>
                        <DialogDescription>{selectedHospital?.name}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCredentials} className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">New admin username</Label>
                            <Input required value={credentialData.newUsername} onChange={(e) => setCredentialData({ ...credentialData, newUsername: e.target.value })} placeholder="new_admin_username" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">New password</Label>
                            <Input required type="password" value={credentialData.newPassword} onChange={(e) => setCredentialData({ ...credentialData, newPassword: e.target.value })} placeholder="••••••••" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCredentialsModal(false)}>Cancel</Button>
                            <Button type="submit">Reset credentials</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Clinic license details */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{selectedHospital?.name}</DialogTitle>
                        <DialogDescription>Tenant license overview</DialogDescription>
                    </DialogHeader>
                    {selectedHospital && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-5 text-sm">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Fleet status</p>
                                    <p className={cn('mt-1 flex items-center gap-1.5 font-medium', selectedHospital.isActive ? 'text-success' : 'text-destructive')}>
                                        <span className={cn('h-1.5 w-1.5 rounded-full', selectedHospital.isActive ? 'bg-success' : 'bg-destructive')} />
                                        {selectedHospital.isActive ? 'Online / connected' : 'Offline / disconnected'}
                                    </p>
                                </div>
                                <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Onboarded</p><p className="mt-1 font-medium">{new Date(selectedHospital.createdOn).toDateString()}</p></div>
                                <div className="col-span-2"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Address</p><p className="mt-1 font-medium">{selectedHospital.address || 'Cloud database / private server'}</p></div>
                                <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Contact</p><p className="tabular mt-1 font-medium">{selectedHospital.contactNumber}</p></div>
                                <div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Admin email</p><p className="mt-1 truncate font-medium">{selectedHospital.email}</p></div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Licensing profile</p>
                                <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success-subtle p-3.5">
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                                    <span className="text-xs font-medium text-success">Enterprise license active · unlimited full-featured access</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter><Button onClick={() => setShowDetailsModal(false)}>Dismiss</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add promo code */}
            <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Add promo code</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddPromo} className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">Code</Label>
                            <Input required value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME25" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1.5 block">Type</Label>
                                <select value={promoForm.type} onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    <option>Discount</option><option>Free Month</option><option>Free Trial</option>
                                </select>
                            </div>
                            <div><Label className="mb-1.5 block">Value</Label><Input required value={promoForm.value} onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })} placeholder="e.g. 25% Off" /></div>
                        </div>
                        <div><Label className="mb-1.5 block">Description</Label><Input value={promoForm.desc} onChange={(e) => setPromoForm({ ...promoForm, desc: e.target.value })} placeholder="What is this promo for?" /></div>
                        <div className="flex items-center gap-3">
                            <Switch checked={promoForm.active} onCheckedChange={(v) => setPromoForm({ ...promoForm, active: v })} />
                            <Label className="cursor-pointer">Active immediately</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowPromoModal(false)}>Cancel</Button>
                            <Button type="submit">Create promo code</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={!!confirmDeletePromo}
                onClose={() => setConfirmDeletePromo(null)}
                onConfirm={handleConfirmDeletePromo}
                title="Delete promo code"
                message={`Permanently delete promo code "${confirmDeletePromo?.code}"? Signup discounts tied to this code stop immediately.`}
                confirmText="Delete promo"
                cancelText="Keep promo"
                type="danger"
            />
        </div>
    );
};

export default Hospitals;
