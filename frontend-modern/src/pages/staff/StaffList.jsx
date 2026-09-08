import React, { useState, useEffect } from 'react';
import { Search, Phone, Mail, UserX } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const ROLES = ['All', 'Helpdesk', 'Staff', 'Admin'];
const ROLE_BADGE = { Admin: 'secondary', Doctor: 'info', Helpdesk: 'warning' };

/**
 * StaffList — pure staff directory table.
 * When `embedded` is true (used inside EmployeeManagement's Workforce Hub),
 * the standalone page frame is omitted; the caller supplies it instead.
 */
const StaffList = ({ embedded = false, onStatsRefresh }) => {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        if (!embedded) {
            const userRole = localStorage.getItem('role');
            if (userRole !== 'Admin') { navigate('/dashboard'); return; }
        }
        fetchStaff();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Employees');
            if (res.data.Results) {
                setStaffList(res.data.Results);
                onStatsRefresh?.();
            }
        } catch (err) {
            console.error('Failed to fetch staff', err);
        } finally {
            setLoading(false);
        }
    };

    // Exclude Doctors — they have their own Doctor Management page.
    const nonDoctorStaff = staffList.filter(s => s.role !== 'Doctor');
    const filteredStaff = nonDoctorStaff.filter(s => {
        const matchesSearch =
            (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'All' || s.role === activeTab;
        return matchesSearch && matchesTab;
    });
    const countFor = (role) => staffList.filter(s => s.role === role).length;

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 px-3">
                {ROLES.map(role => (
                    <button key={role} onClick={() => setActiveTab(role)}
                            className={cn('relative px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors', activeTab === role ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        {role === 'All' ? 'All staff' : `${role}s`}
                        {role !== 'All' && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{countFor(role)}</span>}
                        {activeTab === role && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-foreground" />}
                    </button>
                ))}
            </div>

            <div className="border-b p-4">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                           placeholder={`Search ${activeTab === 'All' ? 'all staff' : activeTab + 's'}…`} className="pl-9" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6">Name &amp; ID</TableHead>
                            <TableHead>Role / dept</TableHead>
                            <TableHead className="hidden md:table-cell">Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-6"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell className="pr-6 text-right"><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredStaff.length > 0 ? (
                            filteredStaff.map((staff) => (
                                <TableRow key={staff.employeeId}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                {staff.photoPath && <AvatarImage src={staff.photoPath} alt="" />}
                                                <AvatarFallback>{initials(`${staff.firstName} ${staff.lastName}`)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                                                <p className="tabular text-xs text-muted-foreground">#EMP-{staff.employeeId}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ROLE_BADGE[staff.role] || 'secondary'}>{staff.role}</Badge>
                                        <p className="mt-1 text-xs text-muted-foreground">{staff.department}</p>
                                    </TableCell>
                                    <TableCell className="hidden text-xs md:table-cell">
                                        <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" /> {staff.phoneNumber || '—'}</div>
                                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> {staff.email || '—'}</div>
                                    </TableCell>
                                    <TableCell><StatusPill status={staff.status} /></TableCell>
                                    <TableCell className="pr-6 text-right">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/staff/${staff.employeeId}`)}>View profile</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="py-16">
                                    <EmptyState icon={UserX} title="No staff members found" description="Try adjusting your search or filter." />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};

export default StaffList;
