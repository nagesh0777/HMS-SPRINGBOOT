import React, { useEffect, useState } from 'react';
import {
    Search, Plus, Users, Loader2, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import ExportButton from '../../components/ExportButton';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage, initials } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PatientList = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    // Distinguishes "still loading the first page" from "loaded, and there is nothing",
    // so the empty state never flashes before the request has had a chance to answer.
    const [loaded, setLoaded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPatients = async () => {
            setSearching(true);
            try {
                const response = await axios.get(`/api/Patient?search=${encodeURIComponent(searchTerm)}`);
                if (response.data.Results) {
                    setPatients(response.data.Results);
                    setCurrentPage(1);
                }
            } catch (error) {
                console.error('Error fetching patients:', error);
            } finally {
                setSearching(false);
                setLoaded(true);
            }
        };
        const delay = setTimeout(fetchPatients, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    // Pagination calculations
    const totalRecords = patients.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    const paginatedPatients = patients.slice(startIndex, endIndex);

    const getPageNumbers = () => {
        const pages = [];
        const maxButtons = 5;
        let start = Math.max(1, safePage - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) {
            start = Math.max(1, end - maxButtons + 1);
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Patients"
                description="Search, register and open the master clinical record."
                icon={Users}
                actions={
                    <>
                        {/* The walk-in case: register and go straight into booking, rather than
                            registering, landing on a list, and searching for the same person again. */}
                        <Button variant="outline" onClick={() => navigate('/dashboard/patients/new?then=appointment')}>
                            <Plus /> Register &amp; book
                        </Button>
                        <Button onClick={() => navigate('/dashboard/patients/new')}>
                            <Plus /> Register patient
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, mobile or code…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search patients"
                        className="pl-9 pr-9"
                    />
                    {searching ? (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </div>

                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                        <span className="tabular font-medium text-foreground">{patients.length}</span>
                        {searchTerm ? ' matching' : ' total'}
                    </p>
                    {/* Exports exactly what is on screen — passing the search term through means the
                        download matches the filter rather than silently dumping everything. */}
                    <ExportButton
                        url={`/api/Export/Patients?search=${encodeURIComponent(searchTerm || '')}`}
                        label="Export"
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                {!loaded ? (
                    <div className="space-y-3 p-4">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                    </div>
                ) : patients.length === 0 ? (
                    // Two different situations that a bare "no rows" message would conflate:
                    // a filter that matched nothing needs widening, an empty database needs a record.
                    searchTerm ? (
                        <EmptyState
                            icon={Search}
                            title="No patients match that search"
                            description={`Nothing found for “${searchTerm}”. Try a partial name, mobile number or patient code.`}
                            action={<Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>Clear search</Button>}
                        />
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No patients registered yet"
                            description="Register the first patient to start building the clinical record."
                            action={<Button size="sm" onClick={() => navigate('/dashboard/patients/new')}><Plus /> Register patient</Button>}
                        />
                    )
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Patient</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="hidden lg:table-cell">Address</TableHead>
                                        <TableHead className="pr-6 text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedPatients.map((patient) => {
                                        const name = `${patient.firstName} ${patient.lastName}`;
                                        return (
                                            <TableRow
                                                key={patient.patientId}
                                                onClick={() => navigate(`/dashboard/patients/${patient.patientId}`)}
                                                className="cursor-pointer"
                                            >
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            {patient.photoPath && <AvatarImage src={patient.photoPath} alt="" />}
                                                            <AvatarFallback>{initials(name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{name}</p>
                                                            <p className="tabular truncate text-xs text-muted-foreground">
                                                                {[patient.patientCode, patient.gender, patient.age && `${patient.age}y`]
                                                                    .filter(Boolean).join(' · ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="tabular text-muted-foreground">
                                                    {patient.phoneNumber || '—'}
                                                </TableCell>
                                                <TableCell className="hidden max-w-[280px] truncate text-muted-foreground lg:table-cell">
                                                    {patient.address || '—'}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <StatusPill status={patient.status || 'Outpatient'} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {totalRecords > 0 && (
                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span>
                                        Showing <span className="tabular font-medium text-foreground">{startIndex + 1}</span>–
                                        <span className="tabular font-medium text-foreground">{endIndex}</span> of{' '}
                                        <span className="tabular font-medium text-foreground">{totalRecords}</span> patients
                                        {searchTerm ? ' (filtered)' : ''}
                                    </span>
                                    <div className="flex items-center gap-1.5 pl-2 sm:border-l">
                                        <span className="text-muted-foreground">Per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            aria-label="Patients per page"
                                            className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value={10}>10</option>
                                            <option value={15}>15</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={safePage === 1}
                                            aria-label="First page"
                                            title="First page"
                                        >
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={safePage === 1}
                                            aria-label="Previous page"
                                            title="Previous page"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>

                                        <div className="flex items-center gap-1">
                                            {getPageNumbers().map(pageNum => (
                                                <Button
                                                    key={pageNum}
                                                    variant={pageNum === safePage ? 'default' : 'outline'}
                                                    size="icon-sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="text-xs"
                                                    aria-label={`Page ${pageNum}`}
                                                >
                                                    {pageNum}
                                                </Button>
                                            ))}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={safePage === totalPages}
                                            aria-label="Next page"
                                            title="Next page"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={safePage === totalPages}
                                            aria-label="Last page"
                                            title="Last page"
                                        >
                                            <ChevronsRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default PatientList;
