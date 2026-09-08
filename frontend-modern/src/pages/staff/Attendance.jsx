import React, { useState, useEffect, useRef } from 'react';
import {
    Clock, CheckCircle, AlertCircle, Search,
    LogIn, LogOut, FileText, Users, Trash2,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Standalone by default (own header); pass `embedded` to drop the header when
 * hosted inside EmployeeManagement's Workforce Hub, so the two don't stack.
 */
const Attendance = ({ embedded = false }) => {
    const toast = useToast();
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [deleteRecordId, setDeleteRecordId] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [activeStaff, setActiveStaff] = useState([]);
    const [completedRecords, setCompletedRecords] = useState([]);

    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualTime, setManualTime] = useState(new Date().toTimeString().slice(0, 5));
    const [manualRemarks, setManualRemarks] = useState('');
    const [isManualEntry, setIsManualEntry] = useState(false);

    const userRole = localStorage.getItem('role') || 'Staff';
    const isProcessing = useRef(false);

    useEffect(() => { refreshAllData(); }, []);

    const refreshAllData = async () => {
        try {
            const [attRes, empRes] = await Promise.all([
                axios.get('/api/Attendance/All'),
                axios.get('/api/Employee/Employees'),
            ]);
            if (attRes.data?.Status === 'OK' && empRes.data?.Status === 'OK') {
                const logs = Array.isArray(attRes.data.Results) ? attRes.data.Results : [];
                const emps = Array.isArray(empRes.data.Results) ? empRes.data.Results : [];
                setEmployees(emps);
                processAttendanceLogic(logs, emps);
            }
        } catch (e) {
            console.error('Data refresh failed', e);
        }
    };

    const processAttendanceLogic = (logs, emps) => {
        if (!emps.length) return;
        const empMap = {};
        emps.forEach(e => empMap[e.employeeId] = e);

        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const active = {};
        const finished = [];

        sortedLogs.forEach(entry => {
            if (!entry || !entry.employeeId) return;
            const empId = entry.employeeId;
            if (entry.type === 'ClockIn') {
                active[empId] = entry;
            } else if (entry.type === 'ClockOut') {
                if (active[empId]) {
                    const start = new Date(active[empId].timestamp);
                    const end = new Date(entry.timestamp);
                    const diffMs = end.getTime() - start.getTime();
                    const diffHrs = diffMs > 0 ? (diffMs / (1000 * 60 * 60)).toFixed(2) : '0.00';
                    if (empMap[empId]) {
                        finished.push({
                            ...empMap[empId],
                            date: start.toLocaleDateString(),
                            in: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            out: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            duration: diffHrs,
                            rawDate: start,
                            idIn: active[empId].attendanceId,
                            idOut: entry.attendanceId,
                        });
                    }
                    delete active[empId];
                }
            }
        });

        const activeList = Object.values(active)
            .filter(log => empMap[log.employeeId])
            .map(log => ({ ...empMap[log.employeeId], clockInTime: log.timestamp, attendanceId: log.attendanceId }));

        setActiveStaff(activeList);
        setCompletedRecords(finished.sort((a, b) => b.rawDate - a.rawDate));
    };

    const formatDateForBackend = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${h}:${min}`;
    };

    const submitAttendance = async (empId, type = null, customTimestamp = null, remarks = '') => {
        if (isProcessing.current && !customTimestamp) return;
        try {
            if (!customTimestamp) isProcessing.current = true;
            setLoading(true);
            setError(null);

            const payload = {
                employeeId: empId,
                type: type || null,
                timestamp: customTimestamp || formatDateForBackend(new Date()),
                remarks: remarks || manualRemarks,
            };

            const res = await axios.post('/api/Attendance/ScanRecord', payload);
            if (res.data?.Status === 'OK') {
                setScanResult(res.data.Results);
                refreshAllData();
                if (customTimestamp) {
                    setManualRemarks(''); setIsManualEntry(false);
                } else {
                    setSelectedEmployee(null); setSearchQuery('');
                }
                setTimeout(() => { setScanResult(null); isProcessing.current = false; }, 3000);
            } else {
                setError(res.data?.ErrorMessage || 'Logging failed');
                isProcessing.current = false;
            }
        } catch (err) {
            setError('Server connection failed');
            isProcessing.current = false;
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDeleteRecord = async () => {
        if (!deleteRecordId) return;
        try {
            setLoading(true);
            const res = await axios.delete(`/api/Attendance/${deleteRecordId}`);
            if (res.data?.Status === 'OK') refreshAllData();
            setDeleteRecordId(null);
        } catch (e) { setError('Delete failed'); }
        finally { setLoading(false); }
    };

    const handleConfirmReset = async () => {
        try {
            setLoading(true);
            const res = await axios.delete('/api/Attendance/ClearAll');
            if (res.data?.Status === 'OK') {
                refreshAllData();
                toast.success('Attendance system reset successfully.');
            }
            setShowResetConfirm(false);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const visibleEmployees = employees.filter(emp => emp.role !== 'Doctor').filter(emp => {
        if (!searchQuery?.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        return fullName.includes(q) || emp.employeeId?.toString().includes(q);
    });

    return (
        <div className="space-y-5">
            {!embedded && (
                <div>
                    <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl">
                        <Clock className="h-6 w-6 text-muted-foreground" /> Staff presence
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manual attendance management.</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="space-y-5 lg:col-span-12 xl:col-span-4">
                    <Card className="space-y-4 p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Staff search</h2>
                            {userRole === 'Admin' && (
                                <Button variant="ghost" size="icon-sm" onClick={() => setShowResetConfirm(true)} title="Reset all data" className="text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search staff by name or ID…" className="pl-9" />
                        </div>

                        <div className="max-h-[350px] space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-2 scrollbar-thin">
                            {visibleEmployees.map(emp => {
                                const isClockedIn = activeStaff.some(a => a.employeeId === emp.employeeId);
                                const isSelected = selectedEmployee?.employeeId === emp.employeeId;
                                return (
                                    <div key={emp.employeeId} onClick={() => setSelectedEmployee(emp)}
                                         className={cn('flex cursor-pointer items-center justify-between rounded-lg border bg-card p-3 transition-colors', isSelected ? 'border-foreground/30 shadow-sm' : 'border-transparent hover:bg-accent/40')}>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar className="h-9 w-9 shrink-0">
                                                {emp.photoPath && <AvatarImage src={emp.photoPath} alt="" />}
                                                <AvatarFallback className="text-[10px]">{initials(`${emp.firstName} ${emp.lastName}`)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-muted-foreground">#{emp.employeeId} · {emp.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge variant={isClockedIn ? 'success' : 'secondary'}>{isClockedIn ? 'In' : 'Out'}</Badge>
                                            <Button
                                                size="sm" variant={isClockedIn ? 'outline' : 'default'}
                                                className={isClockedIn ? 'text-destructive hover:bg-destructive-subtle' : ''}
                                                onClick={(e) => { e.stopPropagation(); submitAttendance(emp.employeeId, isClockedIn ? 'ClockOut' : 'ClockIn'); }}
                                            >
                                                {isClockedIn ? <LogOut /> : <LogIn />} {isClockedIn ? 'Out' : 'In'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {visibleEmployees.length === 0 && (
                                <p className="py-8 text-center text-xs text-muted-foreground">No staff members found</p>
                            )}
                        </div>

                        {selectedEmployee && (
                            <Card className="space-y-5 border-dashed p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-11 w-11">
                                            {selectedEmployee.photoPath && <AvatarImage src={selectedEmployee.photoPath} alt="" />}
                                            <AvatarFallback>{initials(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="text-sm font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                                            <p className="text-xs text-muted-foreground">#{selectedEmployee.employeeId} · {selectedEmployee.role}</p>
                                        </div>
                                    </div>
                                    <Button variant={isManualEntry ? 'default' : 'outline'} size="sm" onClick={() => setIsManualEntry(!isManualEntry)}>
                                        {isManualEntry ? 'Close manual' : 'Manual entry'}
                                    </Button>
                                </div>

                                {isManualEntry ? (
                                    <div className="space-y-4 rounded-lg border bg-card p-4">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div><Label className="mb-1.5 block">Date</Label><Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} /></div>
                                            <div><Label className="mb-1.5 block">Time</Label><Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} /></div>
                                        </div>
                                        <div><Label className="mb-1.5 block">Remarks / reason</Label><Input value={manualRemarks} onChange={(e) => setManualRemarks(e.target.value)} placeholder="Reason for manual entry…" /></div>
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <Button className="flex-1" onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockIn', `${manualDate}T${manualTime}`)}>Clock in</Button>
                                            <Button variant="secondary" className="flex-1" onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockOut', `${manualDate}T${manualTime}`)}>Clock out</Button>
                                        </div>
                                    </div>
                                ) : (
                                    activeStaff.some(a => a.employeeId === selectedEmployee.employeeId) ? (
                                        <Button size="lg" variant="secondary" className="w-full" onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockOut')}>
                                            <LogOut /> Clock out now
                                        </Button>
                                    ) : (
                                        <Button size="lg" className="w-full" onClick={() => submitAttendance(selectedEmployee.employeeId, 'ClockIn')}>
                                            <LogIn /> Clock in now
                                        </Button>
                                    )
                                )}
                            </Card>
                        )}
                    </Card>
                </div>

                <div className="space-y-5 lg:col-span-12 xl:col-span-8">
                    {scanResult && (
                        <Card className="flex items-center gap-4 border-success/30 bg-success-subtle p-5">
                            <CheckCircle className="h-8 w-8 shrink-0 text-success" />
                            <div>
                                <h3 className="text-sm font-semibold uppercase text-success">{scanResult.type} success</h3>
                                <p className="text-xs text-success/80">ID #{scanResult.employeeId} at {new Date(scanResult.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </Card>
                    )}
                    {error && (
                        <Card className="flex items-center gap-4 border-destructive/30 bg-destructive-subtle p-5">
                            <AlertCircle className="h-8 w-8 shrink-0 text-destructive" />
                            <div>
                                <h3 className="text-sm font-semibold uppercase text-destructive">System error</h3>
                                <p className="text-xs text-destructive/80">{error}</p>
                            </div>
                        </Card>
                    )}

                    <Card className="overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-success-subtle/40 px-5 py-4">
                            <span className="flex items-center gap-2.5 text-sm font-semibold"><Users className="h-[18px] w-[18px] text-success" /> On-duty staff</span>
                            <Badge variant="success">{activeStaff.length} active</Badge>
                        </div>
                        <div className="max-h-[400px] overflow-auto">
                            {activeStaff.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead className="pl-6">Staff</TableHead><TableHead>Shift start</TableHead><TableHead className="pr-6 text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {activeStaff.map(emp => (
                                            <TableRow key={emp.employeeId}>
                                                <TableCell className="pl-6 font-medium">{emp.firstName} {emp.lastName}</TableCell>
                                                <TableCell className="tabular text-success">{new Date(emp.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive-subtle" onClick={() => submitAttendance(emp.employeeId, 'ClockOut')}>Stop shift</Button>
                                                        <Button size="icon-sm" variant="ghost" onClick={() => setDeleteRecordId(emp.attendanceId)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <EmptyState icon={Users} title="No active staff" />}
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b bg-muted/20 px-5 py-4">
                            <FileText className="h-[18px] w-[18px] text-muted-foreground" /> <h3 className="text-sm font-semibold">Shift history</h3>
                        </div>
                        <div className="max-h-[400px] overflow-auto">
                            {completedRecords.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead className="pl-6">Staff</TableHead><TableHead>Date</TableHead><TableHead>In / out</TableHead><TableHead className="pr-6 text-right">Hours</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {completedRecords.map((rec, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="pl-6 font-medium">{rec.firstName} {rec.lastName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{rec.date}</TableCell>
                                                <TableCell className="tabular text-xs">{rec.in} - {rec.out}</TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Badge variant="secondary" className="tabular">{rec.duration}h</Badge>
                                                        <div className="flex gap-0.5">
                                                            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteRecordId(rec.idIn)} title="Delete IN" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                                            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteRecordId(rec.idOut)} title="Delete OUT" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <EmptyState icon={FileText} title="No records today" />}
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!deleteRecordId}
                onClose={() => setDeleteRecordId(null)}
                onConfirm={handleConfirmDeleteRecord}
                title="Delete attendance record"
                message="This permanently deletes this staff shift log and will affect work-hour reports."
                confirmText="Delete log"
                cancelText="Cancel"
                type="danger"
            />
            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleConfirmReset}
                title="Reset all attendance data"
                message="This permanently purges all shift logs, clock-in records and work-hour logs for the entire hospital staff database. This action is irreversible."
                confirmText="Permanently reset"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default Attendance;
