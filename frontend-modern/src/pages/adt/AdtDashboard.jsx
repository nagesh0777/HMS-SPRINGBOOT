import React, { useEffect, useState } from 'react';
import { Bed, Settings, Activity } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const AdtDashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [dischargedPatients, setDischargedPatients] = useState([]);

    useEffect(() => { fetchAdmissions(); fetchDischarges(); }, []);

    const fetchAdmissions = async () => {
        try {
            const response = await axios.get('/api/Admission/AdmittedPatients?admissionStatus=admitted');
            if (response.data.Results) setAdmittedPatients(response.data.Results);
        } catch (error) { console.error('Error fetching admissions', error); }
    };

    const fetchDischarges = async () => {
        try {
            const response = await axios.get('/api/Admission/AdmittedPatients?admissionStatus=discharged');
            if (response.data.Results) setDischargedPatients(response.data.Results.slice(0, 5));
        } catch (error) { console.error('Error fetching discharges', error); }
    };

    const handleDischarge = async (admissionId) => {
        try {
            const response = await axios.post(`/api/Admission/Discharge?admissionId=${admissionId}`);
            if (response.data.Status === 'OK') {
                toast.success('Patient discharged');
                fetchAdmissions();
                fetchDischarges();
            } else {
                toast.error(response.data.ErrorMessage || 'Failed to discharge patient.');
            }
        } catch (error) {
            console.error('Discharge failed', error);
            toast.error('Failed to discharge patient.');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Admission, discharge & transfer"
                description="Manage inpatient occupancy and bed allocations."
                icon={Activity}
                actions={
                    <>
                        <Button variant="outline" onClick={() => navigate('/dashboard/adt/beds')}><Settings /> Manage beds</Button>
                        <Button onClick={() => navigate('/dashboard/adt/admit')}><Bed /> Admit patient</Button>
                    </>
                }
            />

            <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-muted-foreground" /> Real-time ward occupancy
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {admittedPatients.map((adm) => (
                        <Tooltip key={adm.patientAdmissionId}>
                            <TooltipTrigger asChild>
                                <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/25 bg-destructive-subtle p-3 text-center transition-colors hover:bg-destructive-subtle/70">
                                    <Bed className="mb-1.5 h-6 w-6 text-destructive" />
                                    <span className="text-xs font-semibold uppercase">Bed #{adm.bedId}</span>
                                    <span className="w-full truncate text-[10px] font-medium text-muted-foreground">{adm.patientName || `Pat #${adm.patientId}`}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>{adm.patientName} · In: {new Date(adm.admissionDate).toLocaleDateString()}</TooltipContent>
                        </Tooltip>
                    ))}
                    {[...Array(Math.max(0, 8 - admittedPatients.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-success/25 bg-success-subtle p-3 text-center opacity-75 transition-opacity hover:opacity-100">
                            <Bed className="mb-1.5 h-6 w-6 text-success" />
                            <span className="text-xs font-semibold">Empty</span>
                            <span className="text-[10px] text-success">Available</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                    <h3 className="text-sm font-semibold">Current admissions</h3>
                    <Badge variant="secondary">{admittedPatients.length} admitted</Badge>
                </div>
                {admittedPatients.length === 0 ? (
                    <EmptyState icon={Bed} title="No patients currently admitted" />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Patient</TableHead>
                                    <TableHead>Admission date</TableHead>
                                    <TableHead>Bed</TableHead>
                                    <TableHead className="pr-6 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admittedPatients.map((adm) => (
                                    <TableRow key={adm.patientAdmissionId}>
                                        <TableCell className="pl-6">
                                            <p className="font-medium">{adm.patientName || `Pat #${adm.patientId}`}</p>
                                            <p className="tabular text-xs text-muted-foreground">{adm.patientCode || '-'}</p>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(adm.admissionDate).toLocaleDateString()} {new Date(adm.admissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">Bed {adm.bedId}</Badge></TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleDischarge(adm.patientAdmissionId)}
                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                                Discharge
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="border-b bg-muted/30 px-5 py-3"><h3 className="text-sm font-semibold">Recent discharges</h3></div>
                {dischargedPatients.length === 0 ? (
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
                                {dischargedPatients.map((adm) => (
                                    <TableRow key={adm.patientAdmissionId} className="bg-muted/20">
                                        <TableCell className="pl-6">
                                            <p className="font-medium">{adm.patientName || `Pat #${adm.patientId}`}</p>
                                            <p className="tabular text-xs text-muted-foreground">{adm.patientCode}</p>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(adm.dischargeDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-muted-foreground">{adm.dischargeRemarks || 'N/A'}</TableCell>
                                        <TableCell className="pr-6 text-right"><Badge variant="secondary">Discharged</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdtDashboard;
