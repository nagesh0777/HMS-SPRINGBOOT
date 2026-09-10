import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Calendar, Clock, AlertTriangle, CheckCircle, X,
    FileText, Search, Edit3, Heart, Loader2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import PatientSearch from '../../components/PatientSearch';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const PRIORITY_BADGE = { routine: 'secondary', urgent: 'warning', critical: 'destructive' };
const STATUS_BADGE = { scheduled: 'info', completed: 'success', missed: 'destructive', cancelled: 'secondary' };

const FollowUpCare = () => {
    const toast = useToast();
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        patientId: '', followUpDate: '', careInstructions: '', treatmentPlan: '',
        reason: '', priority: 'routine', status: 'scheduled',
    });

    useEffect(() => { fetchFollowUps(); }, []);

    const fetchFollowUps = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/FollowUps');
            if (res.data.Results) setFollowUps(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch follow-ups', e);
            toast.error('Failed to load follow-ups');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ patientId: '', followUpDate: '', careInstructions: '', treatmentPlan: '', reason: '', priority: 'routine', status: 'scheduled' });
        setEditingId(null);
    };

    const openEdit = (f) => {
        setForm({
            patientId: f.patientId || '',
            followUpDate: f.followUpDate || '',
            careInstructions: f.careInstructions || '',
            treatmentPlan: f.treatmentPlan || '',
            reason: f.reason || '',
            priority: f.priority || 'routine',
            status: f.status || 'scheduled',
        });
        setEditingId(f.followUpId);
        setShowForm(true);
    };

    const saveFollowUp = async () => {
        if (!form.patientId || !form.followUpDate) {
            toast.warning('Please select a patient and a follow-up date');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, patientId: parseInt(form.patientId) };
            const res = editingId
                ? await axios.put(`/api/DoctorPortal/FollowUps/${editingId}`, payload)
                : await axios.post('/api/DoctorPortal/FollowUps', payload);

            if (res.data.Status === 'OK') {
                toast.success(editingId ? 'Follow-up updated' : 'Follow-up scheduled');
                setShowForm(false);
                resetForm();
                fetchFollowUps();
            } else {
                toast.error(res.data.ErrorMessage || 'Failed to save follow-up');
            }
        } catch (e) {
            console.error('Failed to save follow-up', e);
            toast.error('Failed to save follow-up');
        } finally {
            setSaving(false);
        }
    };

    const markStatus = async (id, status) => {
        try {
            const fu = followUps.find(f => f.followUpId === id);
            if (!fu) return;
            await axios.put(`/api/DoctorPortal/FollowUps/${id}`, { ...fu, status });
            setFollowUps(prev => prev.map(f => f.followUpId === id ? { ...f, status } : f));
            toast.success(`Marked as ${status}`);
        } catch (e) {
            console.error('Failed to update status', e);
            toast.error('Failed to update status');
        }
    };

    const filtered = followUps.filter(f => {
        if (filter !== 'all' && f.status !== filter) return false;
        if (search) {
            const s = search.toLowerCase();
            return (f.patientName || '').toLowerCase().includes(s) || String(f.patientId).includes(s) || (f.reason || '').toLowerCase().includes(s);
        }
        return true;
    });

    const today = new Date().toISOString().split('T')[0];
    const dueToday = followUps.filter(f => f.followUpDate === today && f.status === 'scheduled');
    const overdue = followUps.filter(f => f.followUpDate < today && f.status === 'scheduled');
    const completed = followUps.filter(f => f.status === 'completed');

    return (
        <div className="space-y-5">
            <PageHeader
                title="Follow-ups"
                description="Schedule follow-ups and manage treatment plans."
                icon={Calendar}
                actions={
                    <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
                        {showForm ? <X /> : <Plus />} {showForm ? 'Close' : 'Schedule follow-up'}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Due today" value={dueToday.length} icon={Calendar} />
                <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone={overdue.length > 0 ? 'critical' : 'neutral'} />
                <StatCard label="Completed" value={completed.length} icon={CheckCircle} tone="success" />
            </div>

            <AnimatePresence initial={false}>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Card className="space-y-5 p-5 sm:p-6">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                <Edit3 className="h-[18px] w-[18px] text-muted-foreground" />
                                {editingId ? 'Edit follow-up' : 'Schedule follow-up'}
                            </h3>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <PatientSearch onSelect={(id) => setForm(prev => ({ ...prev, patientId: id }))} selectedPatientId={form.patientId} />
                                </div>
                                <div>
                                    <Label className="mb-1 block">Follow-up date</Label>
                                    <Input type="date" value={form.followUpDate} onChange={e => setForm(prev => ({ ...prev, followUpDate: e.target.value }))} />
                                </div>
                                <div>
                                    <Label className="mb-1 block">Priority</Label>
                                    <select
                                        value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="routine">Routine</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1 block">Reason for follow-up</Label>
                                <Input
                                    value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="e.g. Post-surgery review, lab result follow-up…"
                                />
                            </div>

                            <div>
                                <Label className="mb-1 flex items-center gap-1.5">
                                    <Heart className="h-3 w-3 text-destructive" /> Care instructions
                                </Label>
                                <Textarea
                                    value={form.careInstructions} onChange={e => setForm(prev => ({ ...prev, careInstructions: e.target.value }))}
                                    placeholder="Diet, exercise, medication reminders, lifestyle changes…" rows={3}
                                />
                            </div>

                            <div>
                                <Label className="mb-1 block">Long-term treatment plan</Label>
                                <Textarea
                                    value={form.treatmentPlan} onChange={e => setForm(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                                    placeholder="Outline the long-term treatment strategy, milestones and goals…" rows={4}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Button onClick={saveFollowUp} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                                    {editingId ? 'Update' : 'Schedule'} follow-up
                                </Button>
                                <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient or reason…" className="pl-9" />
                </div>
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
                    {['all', 'scheduled', 'completed', 'missed'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                                    filter === f ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <EmptyState icon={Calendar} title="No follow-ups found" description="Schedule a follow-up to get started." />
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((fu, i) => {
                        const isOverdue = fu.followUpDate < today && fu.status === 'scheduled';
                        return (
                            <motion.div key={fu.followUpId || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                                <Card className={cn('p-4', isOverdue && 'border-destructive/40 bg-destructive-subtle/30')}>
                                    {isOverdue && (
                                        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Overdue
                                        </p>
                                    )}
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                <Calendar className="h-[18px] w-[18px]" />
                                            </span>
                                            <div>
                                                <p className="font-semibold">{fu.patientName || `Patient #${fu.patientId}`}</p>
                                                <p className="mt-0.5 text-sm text-muted-foreground">{fu.reason || 'Routine follow-up'}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="tabular flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" /> {fu.followUpDate}
                                                    </span>
                                                    <Badge variant={PRIORITY_BADGE[fu.priority] || 'secondary'}>{fu.priority || 'routine'}</Badge>
                                                    <Badge variant={STATUS_BADGE[fu.status] || 'secondary'}>{fu.status || 'scheduled'}</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            {fu.status === 'scheduled' && (
                                                <>
                                                    <Button size="sm" variant="secondary" className="text-success hover:bg-success-subtle" onClick={() => markStatus(fu.followUpId, 'completed')}>
                                                        <CheckCircle /> Complete
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => markStatus(fu.followUpId, 'missed')}>
                                                        <X /> Missed
                                                    </Button>
                                                </>
                                            )}
                                            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(fu)} className="text-muted-foreground">
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {(fu.careInstructions || fu.treatmentPlan) && (
                                        <div className="mt-4 space-y-2 border-t pt-3">
                                            {fu.careInstructions && (
                                                <div className="flex items-start gap-2 text-sm">
                                                    <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase text-muted-foreground">Care instructions</p>
                                                        <p className="text-muted-foreground">{fu.careInstructions}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {fu.treatmentPlan && (
                                                <div className="flex items-start gap-2 text-sm">
                                                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase text-muted-foreground">Treatment plan</p>
                                                        <p className="text-muted-foreground">{fu.treatmentPlan}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FollowUpCare;
