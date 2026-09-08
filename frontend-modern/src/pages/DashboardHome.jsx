import React, { useEffect, useState } from 'react';
import {
    Users, Calendar, Bed, Download, Building, CheckCircle2, XCircle,
    IndianRupee, Sparkles, RefreshCw, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, PieChart as RechartsPie, Pie, Cell,
} from 'recharts';

import { useToast } from '../components/Toast';
import { generateDashboardInsights } from '../services/aiService';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { CHART, axisProps, seriesDefaults, ChartTooltip, ChartLegend } from '@/components/app/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Indian numbering — lakh/crore, not thousand/million. */
const fmt = (n) => {
    if (n == null || isNaN(n)) return '₹0';
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + ' L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Number(n).toLocaleString('en-IN');
};

/** A ward this full is an operational problem, so the number earns a colour. */
const occupancyTone = (rate) => (rate >= 90 ? 'critical' : rate >= 75 ? 'warning' : 'neutral');

const DashboardHome = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [full, setFull] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({ chartData: [], patients: [] });
    const [dateRange, setDateRange] = useState('week');
    const [aiInsights, setAiInsights] = useState([]);
    const [generatingInsights, setGeneratingInsights] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const role = localStorage.getItem('role');
                const doctorId = localStorage.getItem('doctorId');
                if (role === 'SuperAdmin') {
                    const res = await axios.get('/api/SuperAdmin/Summary');
                    if (res.data.Results) setStats({ ...res.data.Results, isSuperAdmin: true });
                } else {
                    const sUrl = doctorId ? `/api/Dashboard/Summary?performerId=${doctorId}` : '/api/Dashboard/Summary';
                    const [s, f] = await Promise.all([axios.get(sUrl), axios.get('/api/Dashboard/FullAnalytics')]);
                    if (s.data.Results) setStats({ ...s.data.Results, isSuperAdmin: false });
                    if (f.data.Results) setFull(f.data.Results);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        axios.get(`/api/Dashboard/Analytics?range=${dateRange}`)
            .then(r => { if (r.data.Results) setAnalytics(r.data.Results); })
            .catch(() => { });
    }, [dateRange]);

    const downloadCSV = () => {
        if (!analytics.patients?.length) { toast.info('No data to export'); return; }
        const h = ['ID', 'Name', 'Gender', 'Phone', 'Date'];
        const rows = analytics.patients.map(p => [
            p.patientCode || p.patientId,
            `${p.firstName} ${p.lastName}`,
            p.gender,
            p.phoneNumber,
            new Date(p.createdOn).toLocaleDateString(),
        ]);
        const csv = 'data:text/csv;charset=utf-8,' + h.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = encodeURI(csv);
        a.download = `report_${dateRange}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const fetchAIInsights = async () => {
        if (!full) { toast.error('Load dashboard data first before generating insights.'); return; }
        setGeneratingInsights(true);
        try {
            const rawText = await generateDashboardInsights(full);
            const bullets = rawText.split('\n')
                .map(l => l.replace(/^[-*\d.\s]+/, '').trim())
                .filter(l => l.length > 5);
            if (bullets.length >= 1) {
                setAiInsights(bullets.slice(0, 4));
                toast.success('AI insights generated from your real hospital data.');
            }
        } catch {
            toast.error('Failed to generate AI insights. Check your API configuration.');
        } finally {
            setGeneratingInsights(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-9 w-64" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Skeleton className="h-80 lg:col-span-2" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }

    if (stats?.isSuperAdmin) {
        return (
            <>
                <PageHeader
                    title="Platform Overview"
                    description="Tenant hospitals across the Trikaar network."
                    icon={Building}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard label="Total hospitals" value={stats.totalHospitals ?? 0} icon={Building} />
                    <StatCard label="Active" value={stats.activeHospitals ?? 0} icon={CheckCircle2} tone="success" />
                    <StatCard label="Inactive" value={stats.inactiveHospitals ?? 0} icon={XCircle} tone="warning" />
                </div>
            </>
        );
    }

    const rev = full?.revenue || {};
    const beds = full?.beds || {};
    const ps = full?.patientStats || {};
    const appts = full?.appointmentStats || {};
    const occRate = Number(beds.occupancyRate) || 0;
    const hasBeds = Number(beds.total) > 0;

    const bedData = hasBeds
        ? [
            { name: 'Occupied', value: Number(beds.occupied) || 0 },
            { name: 'Available', value: Number(beds.available) || 0 },
        ]
        : [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Command Center"
                description="Live figures from your hospital database."
                icon={Building}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={downloadCSV}>
                            <Download /> Export
                        </Button>
                        <Button size="sm" onClick={() => navigate('/dashboard/patients/new')}>
                            <Users /> Register patient
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Revenue"
                    value={fmt(rev.total)}
                    hint={`${rev.paidBills || 0} paid · ${rev.pendingBills || 0} pending`}
                    icon={IndianRupee}
                    onClick={() => navigate('/dashboard/billing')}
                />
                <StatCard
                    label="Patients"
                    value={ps.total || 0}
                    hint={`+${ps.newThisWeek || 0} this week`}
                    icon={Users}
                    onClick={() => navigate('/dashboard/patients')}
                />
                <StatCard
                    label="Appointments today"
                    value={appts.today || 0}
                    hint={`${appts.thisWeek || 0} this week`}
                    icon={Calendar}
                    onClick={() => navigate('/dashboard/appointments')}
                />
                <StatCard
                    label="Bed occupancy"
                    value={`${occRate}%`}
                    hint={`${beds.occupied || 0} of ${beds.total || 0} beds`}
                    icon={Bed}
                    tone={occupancyTone(occRate)}
                    onClick={() => navigate('/dashboard/adt/beds')}
                />
            </div>

            {/* Revenue + beds */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Monthly revenue</CardTitle>
                        <CardDescription>Billed vs collected — last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {full?.monthlyRevenue?.length ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={full.monthlyRevenue}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                                        <XAxis dataKey="month" {...axisProps} />
                                        <YAxis {...axisProps} tickFormatter={v => (v >= 1000 ? v / 1000 + 'K' : v)} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            content={<ChartTooltip formatter={v => '₹' + Number(v).toLocaleString('en-IN')} />}
                                        />
                                        <Legend content={<ChartLegend />} />
                                        <Bar dataKey="revenue" name="Billed" fill={CHART.series[0]} radius={[4, 4, 0, 0]} {...seriesDefaults} />
                                        <Bar dataKey="collected" name="Collected" fill={CHART.series[2]} radius={[4, 4, 0, 0]} {...seriesDefaults} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState
                                icon={IndianRupee}
                                title="No revenue recorded yet"
                                description="Billed and collected totals will chart here once invoices are raised."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Bed status</CardTitle>
                        <CardDescription>Current occupancy</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                        {hasBeds ? (
                            <>
                                <div className="relative h-[160px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={bedData}
                                                cx="50%" cy="50%"
                                                innerRadius={52} outerRadius={72}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                                {...seriesDefaults}
                                            >
                                                {/* Occupied is the constrained half, so it takes the
                                                    solid foreground; available stays muted. */}
                                                <Cell fill="hsl(var(--chart-1))" />
                                                <Cell fill="hsl(var(--chart-4))" />
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                    {/* Centre label — the number people actually came for. */}
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="tabular text-2xl font-semibold tracking-tight">{occRate}%</span>
                                        <span className="text-[11px] text-muted-foreground">occupied</span>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border p-2.5 text-center">
                                        <p className="tabular text-lg font-semibold">{beds.occupied || 0}</p>
                                        <p className="text-[11px] text-muted-foreground">Occupied</p>
                                    </div>
                                    <div className="rounded-lg border p-2.5 text-center">
                                        <p className="tabular text-lg font-semibold">{beds.available || 0}</p>
                                        <p className="text-[11px] text-muted-foreground">Available</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <EmptyState
                                icon={Bed}
                                title="No beds configured"
                                description="Add wards and beds to track occupancy."
                                action={
                                    <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/adt/beds')}>
                                        Manage beds
                                    </Button>
                                }
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Trends + this week */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                        <div>
                            <CardTitle>Patient &amp; appointment trends</CardTitle>
                            <CardDescription>Daily registration and visit activity</CardDescription>
                        </div>
                        <div className="flex gap-0.5 rounded-md border p-0.5">
                            {[['week', '7D'], ['month', '30D']].map(([r, lbl]) => (
                                <button
                                    key={r}
                                    onClick={() => setDateRange(r)}
                                    aria-pressed={dateRange === r}
                                    className={cn(
                                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                        dateRange === r
                                            ? 'bg-secondary text-secondary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={full?.dailyTrend || analytics.chartData || []}>
                                    <defs>
                                        <linearGradient id="gPatients" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gAppts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                                    <XAxis dataKey="day" {...axisProps} />
                                    <YAxis {...axisProps} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend content={<ChartLegend />} />
                                    <Area type="monotone" dataKey="patients" name="Patients"
                                          stroke="hsl(var(--chart-1))" fill="url(#gPatients)" strokeWidth={2} dot={false} {...seriesDefaults} />
                                    <Area type="monotone" dataKey="appointments" name="Appointments"
                                          stroke="hsl(var(--chart-3))" fill="url(#gAppts)" strokeWidth={2} dot={false} {...seriesDefaults} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>This week</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { v: appts.thisWeek || 0, l: 'Appointments' },
                                { v: appts.completed || 0, l: 'Completed' },
                                { v: ps.newThisMonth || 0, l: 'New patients' },
                                { v: appts.cancelled || 0, l: 'Cancelled' },
                            ].map(s => (
                                <div key={s.l} className="rounded-lg border p-3">
                                    <p className="tabular text-xl font-semibold">{s.v}</p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{s.l}</p>
                                </div>
                            ))}
                        </div>

                        {full?.departmentRevenue?.length > 0 && (() => {
                            const top = full.departmentRevenue.slice(0, 4);
                            const max = Math.max(...top.map(d => Number(d.amount) || 0), 1);
                            return (
                                <div>
                                    <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Top departments
                                    </h4>
                                    <div className="space-y-2.5">
                                        {top.map((d, i) => (
                                            <div key={i}>
                                                <div className="mb-1 flex items-center justify-between gap-2">
                                                    <span className="truncate text-xs">{d.department}</span>
                                                    <span className="tabular shrink-0 text-xs font-medium">{fmt(d.amount)}</span>
                                                </div>
                                                {/* A bar beats a coloured dot here: it shows relative
                                                    size, which is the actual question being asked. */}
                                                <Progress value={((Number(d.amount) || 0) / max) * 100} className="h-1.5" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="space-y-2">
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/dashboard/patients/new')}>
                                <Users /> Register patient
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/dashboard/appointments/new')}>
                                <Calendar /> Book appointment
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent patients */}
            {analytics.patients?.length > 0 && (
                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle>Recent patients</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/patients')}>
                            View all <ArrowRight />
                        </Button>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Patient</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead className="hidden sm:table-cell">Gender</TableHead>
                                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                                    <TableHead className="pr-6 text-right">Registered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics.patients.slice(0, 6).map(p => (
                                    <TableRow
                                        key={p.patientId}
                                        onClick={() => navigate(`/dashboard/patients/${p.patientId}`)}
                                        className="cursor-pointer"
                                    >
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarFallback className="text-[10px]">
                                                        {initials(`${p.firstName} ${p.lastName}`)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{p.firstName} {p.lastName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="tabular text-xs text-muted-foreground">
                                            {p.patientCode || '#' + p.patientId}
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground sm:table-cell">{p.gender || '—'}</TableCell>
                                        <TableCell className="tabular hidden text-muted-foreground sm:table-cell">{p.phoneNumber || '—'}</TableCell>
                                        <TableCell className="pr-6 text-right text-muted-foreground">
                                            {new Date(p.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* AI insights */}
            {full && (
                <Card>
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> AI hospital insights
                            </CardTitle>
                            <CardDescription>
                                Generated from your live revenue, patient and occupancy figures.
                            </CardDescription>
                        </div>
                        <Button
                            variant={aiInsights.length ? 'outline' : 'default'}
                            size="sm"
                            onClick={fetchAIInsights}
                            disabled={generatingInsights}
                        >
                            <RefreshCw className={generatingInsights ? 'animate-spin' : ''} />
                            {generatingInsights ? 'Analysing…' : aiInsights.length ? 'Re-analyse' : 'Generate'}
                        </Button>
                    </CardHeader>
                    {aiInsights.length > 0 && (
                        <CardContent>
                            <ol className="space-y-2.5">
                                {aiInsights.map((ins, i) => (
                                    <li key={i} className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                                        <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-[11px] font-semibold">
                                            {i + 1}
                                        </span>
                                        <p className="text-sm leading-relaxed text-muted-foreground">{ins}</p>
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-3 text-[11px] text-muted-foreground">
                                LLaMA-3.3-70B via Groq Cloud · based on your live hospital data
                            </p>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
};

export default DashboardHome;
