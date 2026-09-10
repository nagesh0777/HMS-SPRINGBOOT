import React, { useEffect, useState, useMemo } from 'react';
import { Bed, Settings, Activity, BedDouble, LogOut, Plus, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { StatCard } from '@/components/app/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/** Whole days since admission, counted inclusively so the day of admission reads "Day 1". */
const stayDays = (admissionDate) => {
    if (!admissionDate) return null;
    const start = new Date(admissionDate);
    if (Number.isNaN(start.getTime())) return null;
    const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((midnight(new Date()) - midnight(start)) / 86400000) + 1;
};

const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
        && d.getFullYear() === now.getFullYear();
};

const AdtDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [beds, setBeds] = useState([]);
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [dischargedPatients, setDischargedPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [discharging, setDischarging] = useState(null);
    const [confirmDischarge, setConfirmDischarge] = useState(null);

    useEffect(() => { refresh(); }, []);

    const refresh = async () => {
        setLoading(true);
        // The ward board is only truthful if beds and admissions are read together, so they
        // load as one unit rather than racing each other into separate renders.
        const [bedRes, admRes, disRes] = await Promise.allSettled([
            axios.get('/api/Adt/Beds'),
            axios.get('/api/Admission/AdmittedPatients?admissionStatus=admitted'),
            axios.get('/api/Admission/AdmittedPatients?admissionStatus=discharged'),
        ]);
        if (bedRes.status === 'fulfilled') setBeds(bedRes.value.data?.Results || []);
        if (admRes.status === 'fulfilled') setAdmittedPatients(admRes.value.data?.Results || []);
        if (disRes.status === 'fulfilled') setDischargedPatients(disRes.value.data?.Results || []);
        if ([bedRes, admRes, disRes].some(r => r.status === 'rejected')) {
            toast.error('Some ward data could not be loaded.');
        }
        setLoading(false);
    };

    /** bedId -> the admission occupying it, so a bed tile can name its patient. */
    const occupantByBed = useMemo(() => {
        const map = new Map();
        admittedPatients.forEach(a => { if (a.bedId != null) map.set(a.bedId, a); });
        return map;
    }, [admittedPatients]);

    const bedById = useMemo(
        () => new Map(beds.map(b => [b.bedId, b])),
        [beds],
    );

    /** Beds grouped by ward, wards alphabetical, beds in natural number order within each. */
    const wards = useMemo(() => {
        const groups = new Map();
        beds.forEach(b => {
            const ward = b.ward || 'Unassigned';
            if (!groups.has(ward)) groups.set(ward, []);
            groups.get(ward).push(b);
        });
        return [...groups.entries()]
            .map(([ward, list]) => ({
                ward,
                beds: [...list].sort((a, b) =>
                    String(a.bedNumber ?? '').localeCompare(String(b.bedNumber ?? ''), undefined, { numeric: true })),
            }))
            .sort((a, b) => a.ward.localeCompare(b.ward));
    }, [beds]);

    // Occupancy comes from the bed register itself. This panel used to render a fixed eight
    // tiles — `8 - admittedPatients.length` — which invented free beds for a hospital with
    // more than eight and hid every one beyond the eighth.
    const occupied = occupantByBed.size;
    const totalBeds = beds.length;
    const available = Math.max(0, totalBeds - occupied);
    const occupancyPct = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
    const dischargedToday = dischargedPatients.filter(d => isToday(d.dischargeDate)).length;

    const recentDischarges = useMemo(
        () => [...dischargedPatients]
            .sort((a, b) => new Date(b.dischargeDate || 0) - new Date(a.dischargeDate || 0))
            .slice(0, 5),
        [dischargedPatients],
    );

    const handleDischarge = async () => {
        const adm = confirmDischarge;
        if (!adm) return;
        setConfirmDischarge(null);
        setDischarging(adm.patientAdmissionId);
        try {
            const response = await axios.post(`/api/Admission/Discharge?admissionId=${adm.patientAdmissionId}`);
            if (response.data.Status === 'OK') {
                toast.success(`${adm.patientName || 'Patient'} discharged — bed released`);
                refresh();
            } else {
                toast.error(response.data.ErrorMessage || 'Failed to discharge patient.');
            }
        } catch (error) {
            console.error('Discharge failed', error);
            toast.error('Failed to discharge patient.');
        } finally {
            setDischarging(null);
        }
    };

    const bedLabel = (bedId) => {
        const bed = bedById.get(bedId);
        if (!bed) return bedId != null ? `Bed ${bedId}` : 'No bed';
        return bed.ward ? `${bed.ward} · ${bed.bedNumber}` : bed.bedNumber;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Inpatients"
                description="Admissions, discharges and live bed occupancy."
                icon={Activity}
                actions={
                    <>
                        <Button variant="outline" onClick={refresh} disabled={loading}>
                            <RefreshCw className={cn(loading && 'animate-spin')} /> Refresh
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/dashboard/adt/beds')}><Settings /> Manage beds</Button>
                        <Button onClick={() => navigate('/dashboard/adt/admit')}><Bed /> Admit patient</Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Occupied" value={occupied} hint={`of ${totalBeds} beds`} icon={BedDouble} loading={loading} />
                {/* Only a genuine capacity problem earns colour: no free bed blocks admissions. */}
                <StatCard label="Available" value={available} hint={available === 0 ? 'ward full' : 'ready for admission'} icon={Bed} tone={available === 0 ? 'critical' : 'neutral'} loading={loading} />
                <StatCard
                    label="Occupancy"
                    value={`${occupancyPct}%`}
                    hint={occupancyPct >= 90 ? 'ward near capacity' : 'across all wards'}
                    icon={Activity}
                    tone={occupancyPct >= 90 ? 'critical' : occupancyPct >= 75 ? 'warning' : 'neutral'}
                    loading={loading}
                />
                <StatCard label="Discharged today" value={dischargedToday} hint="beds freed today" icon={LogOut} loading={loading} />
            </div>

            {/* ── Ward board ───────────────────────────────────────────── */}
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4 text-muted-foreground" /> Ward board
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full border border-success/30 bg-success-subtle" /> Available
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full border border-destructive/30 bg-destructive-subtle" /> Occupied
                        </span>
                    </div>
                </div>

                {totalBeds === 0 ? (
                    <Card>
                        <EmptyState
                            icon={BedDouble}
                            title="No beds configured"
                            description="Add wards and beds before admitting patients."
                            action={<Button onClick={() => navigate('/dashboard/adt/beds')}><Plus /> Configure beds</Button>}
                        />
                    </Card>
                ) : (
                    wards.map(({ ward, beds: wardBeds }) => {
                        const wardOccupied = wardBeds.filter(b => occupantByBed.has(b.bedId)).length;
                        return (
                            <div key={ward}>
                                <div className="mb-2 flex items-baseline gap-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ward}</h3>
                                    <span className="tabular text-xs text-muted-foreground">
                                        {wardOccupied}/{wardBeds.length} occupied
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                                    {wardBeds.map((bed) => {
                                        const adm = occupantByBed.get(bed.bedId);
                                        const days = adm ? stayDays(adm.admissionDate) : null;

                                        // An occupied bed opens the patient; a free one starts an admission
                                        // already pointed at that bed. Free tiles previously carried a
                                        // pointer cursor with no handler behind it.
                                        const tile = (
                                            <button
                                                type="button"
                                                onClick={() => navigate(adm
                                                    ? `/dashboard/patients/${adm.patientId}`
                                                    : `/dashboard/adt/admit?bedId=${bed.bedId}`)}
                                                className={cn(
                                                    'flex w-full flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors',
                                                    adm
                                                        ? 'border-destructive/25 bg-destructive-subtle hover:bg-destructive-subtle/70'
                                                        : 'border-success/25 bg-success-subtle hover:bg-success-subtle/70',
                                                )}
                                            >
                                                <Bed className={cn('mb-1.5 h-6 w-6', adm ? 'text-destructive' : 'text-success')} />
                                                <span className="w-full truncate text-xs font-semibold">{bed.bedNumber}</span>
                                                {adm ? (
                                                    <>
                                                        <span className="w-full truncate text-[10px] font-medium text-muted-foreground">
                                                            {adm.patientName || `Patient #${adm.patientId}`}
                                                        </span>
                                                        {days && <span className="tabular text-[10px] text-muted-foreground">Day {days}</span>}
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-success">Available</span>
                                                )}
                                            </button>
                                        );

                                        return (
                                            <Tooltip key={bed.bedId}>
                                                <TooltipTrigger asChild>{tile}</TooltipTrigger>
                                                <TooltipContent>
                                                    {adm
                                                        ? `${adm.patientName || `Patient #${adm.patientId}`} · admitted ${new Date(adm.admissionDate).toLocaleDateString()}${days ? ` · day ${days}` : ''} — open record`
                                                        : `${bed.bedNumber} free${bed.pricePerDay ? ` · ₹${bed.pricePerDay}/day` : ''} — admit here`}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Current admissions ───────────────────────────────────── */}
            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                    <h3 className="text-sm font-semibold">Current admissions</h3>
                    <Badge variant="secondary">{admittedPatients.length} admitted</Badge>
                </div>
                {admittedPatients.length === 0 ? (
                    <EmptyState
                        icon={Bed}
                        title="No patients currently admitted"
                        description="Admitted patients appear here with their bed and length of stay."
                        action={<Button onClick={() => navigate('/dashboard/adt/admit')}><Bed /> Admit patient</Button>}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Patient</TableHead>
                                    <TableHead>Admitted</TableHead>
                                    <TableHead>Stay</TableHead>
                                    <TableHead>Bed</TableHead>
                                    <TableHead className="pr-6 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admittedPatients.map((adm) => {
                                    const days = stayDays(adm.admissionDate);
                                    return (
                                        <TableRow key={adm.patientAdmissionId}>
                                            <TableCell className="pl-6">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/dashboard/patients/${adm.patientId}`)}
                                                    className="text-left font-medium hover:underline"
                                                >
                                                    {adm.patientName || `Patient #${adm.patientId}`}
                                                </button>
                                                <p className="tabular text-xs text-muted-foreground">{adm.patientCode || '-'}</p>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(adm.admissionDate).toLocaleDateString()}{' '}
                                                {new Date(adm.admissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell>
                                                {days && (
                                                    <Badge variant={days >= 7 ? 'warning' : 'secondary'} className="tabular">
                                                        Day {days}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{bedLabel(adm.bedId)}</TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button
                                                    variant="outline" size="sm"
                                                    onClick={() => setConfirmDischarge(adm)}
                                                    disabled={discharging === adm.patientAdmissionId}
                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    {discharging === adm.patientAdmissionId ? 'Discharging…' : 'Discharge'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* ── Recent discharges ────────────────────────────────────── */}
            <Card className="overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3"><h3 className="text-sm font-semibold">Recent discharges</h3></div>
                {recentDischarges.length === 0 ? (
                    <EmptyState icon={Bed} title="No recent discharges" />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Patient</TableHead>
                                    <TableHead>Discharge date</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="pr-6 text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentDischarges.map((adm) => (
                                    <TableRow key={adm.patientAdmissionId} className="bg-muted/20">
                                        <TableCell className="pl-6">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/dashboard/patients/${adm.patientId}`)}
                                                className="text-left font-medium hover:underline"
                                            >
                                                {adm.patientName || `Patient #${adm.patientId}`}
                                            </button>
                                            <p className="tabular text-xs text-muted-foreground">{adm.patientCode}</p>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {adm.dischargeDate ? new Date(adm.dischargeDate).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{adm.dischargeRemarks || 'N/A'}</TableCell>
                                        <TableCell className="pr-6 text-right"><Badge variant="secondary">Discharged</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Discharge frees the bed and closes the stay, so it asks first — it used to fire
                on a single click with nothing between the button and the write. */}
            <AlertDialog open={!!confirmDischarge} onOpenChange={(o) => !o && setConfirmDischarge(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discharge {confirmDischarge?.patientName || 'this patient'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDischarge && (
                                <>
                                    This closes the admission started{' '}
                                    {new Date(confirmDischarge.admissionDate).toLocaleDateString()}
                                    {stayDays(confirmDischarge.admissionDate)
                                        ? ` (day ${stayDays(confirmDischarge.admissionDate)})`
                                        : ''}{' '}
                                    and releases {bedLabel(confirmDischarge.bedId)} back to the ward.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDischarge}>Discharge patient</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdtDashboard;
