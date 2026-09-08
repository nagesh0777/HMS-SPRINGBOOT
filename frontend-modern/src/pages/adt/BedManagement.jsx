import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, BedDouble, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const WARDS = ['General Ward', 'Private Ward', 'ICU', 'Maternity', 'Emergency'];
const FLOORS = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'];

const BedManagement = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [beds, setBeds] = useState([]);
    const [confirmDeleteBedId, setConfirmDeleteBedId] = useState(null);
    const [newBed, setNewBed] = useState({ bedNumber: '', ward: 'General Ward', floor: '1st Floor', pricePerDay: '', status: 'available' });

    useEffect(() => { fetchBeds(); }, []);

    const fetchBeds = async () => {
        try {
            const response = await axios.get('/api/Adt/Beds');
            if (response.data.Results) setBeds(response.data.Results);
        } catch (error) { console.error('Error fetching beds', error); }
    };

    const handleAddBed = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/Adt/Beds', { ...newBed, pricePerDay: parseFloat(newBed.pricePerDay) });
            setNewBed({ ...newBed, bedNumber: '', pricePerDay: '' });
            fetchBeds();
            toast.success('Bed added successfully!');
        } catch (error) {
            console.error('Failed to add bed', error);
            toast.error('Failed to add bed.');
        }
    };

    const handleConfirmDeleteBed = async () => {
        if (!confirmDeleteBedId) return;
        try {
            await axios.delete(`/api/Adt/Beds/${confirmDeleteBedId}`);
            fetchBeds();
            toast.success('Bed configuration deleted successfully');
            setConfirmDeleteBedId(null);
        } catch (error) {
            console.error('Failed to delete bed', error);
            toast.error('Failed to delete bed.');
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/adt')} className="-ml-2 mb-1 text-muted-foreground">
                    <ArrowLeft /> Back to ADT
                </Button>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Bed &amp; ward management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Customize floors, wards and bed pricing.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <Plus className="h-4 w-4 text-muted-foreground" /> Add new bed
                    </h3>
                    <form onSubmit={handleAddBed} className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">Bed number</Label>
                            <Input required value={newBed.bedNumber} onChange={(e) => setNewBed({ ...newBed, bedNumber: e.target.value })} placeholder="e.g. 305-A" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Ward / department</Label>
                            <select value={newBed.ward} onChange={(e) => setNewBed({ ...newBed, ward: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                {WARDS.map(w => <option key={w}>{w}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Floor</Label>
                            <select value={newBed.floor} onChange={(e) => setNewBed({ ...newBed, floor: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                {FLOORS.map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Price per day (₹)</Label>
                            <Input type="number" required value={newBed.pricePerDay} onChange={(e) => setNewBed({ ...newBed, pricePerDay: e.target.value })} placeholder="e.g. 500" />
                        </div>
                        <Button type="submit" className="w-full"><Save /> Save configuration</Button>
                    </form>
                </Card>

                <Card className="overflow-hidden lg:col-span-2">
                    <div className="border-b bg-muted/30 px-5 py-3"><h3 className="text-sm font-semibold">Current bed configuration</h3></div>
                    {beds.length === 0 ? (
                        <EmptyState icon={BedDouble} title="No beds configured yet" />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Bed no.</TableHead>
                                        <TableHead>Ward</TableHead>
                                        <TableHead className="hidden md:table-cell">Floor</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="pr-6 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {beds.map((bed) => (
                                        <TableRow key={bed.bedId}>
                                            <TableCell className="pl-6 font-medium">
                                                <span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-muted-foreground" /> {bed.bedNumber}</span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{bed.ward}</TableCell>
                                            <TableCell className="hidden text-muted-foreground md:table-cell">{bed.floor}</TableCell>
                                            <TableCell className="tabular font-medium">₹{bed.pricePerDay}</TableCell>
                                            <TableCell><Badge variant={bed.status === 'available' ? 'success' : 'destructive'}>{bed.status}</Badge></TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDeleteBedId(bed.bedId)} title="Delete bed" className="text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            </div>

            <ConfirmationModal
                isOpen={!!confirmDeleteBedId}
                onClose={() => setConfirmDeleteBedId(null)}
                onConfirm={handleConfirmDeleteBed}
                title="Remove bed configuration"
                message="This permanently deletes the bed configuration. Patients currently active in the census system might lose their ward mapping."
                confirmText="Delete bed"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default BedManagement;
