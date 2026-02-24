import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash, BedDouble, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';

const BedManagement = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [beds, setBeds] = useState([]);
    const [newBed, setNewBed] = useState({
        bedNumber: '',
        ward: 'General Ward',
        floor: '1st Floor',
        pricePerDay: '',
        status: 'available'
    });

    useEffect(() => {
        fetchBeds();
    }, []);

    const fetchBeds = async () => {
        try {
            const response = await axios.get('/api/Adt/Beds'); // Get ALL beds
            if (response.data.Results) {
                setBeds(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching beds", error);
        }
    };

    const handleAddBed = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/Adt/Beds', {
                ...newBed,
                pricePerDay: parseFloat(newBed.pricePerDay)
            });
            // Reset form and refresh list
            setNewBed({ ...newBed, bedNumber: '', pricePerDay: '' });
            fetchBeds();
            toast.success("Bed added successfully!");
        } catch (error) {
            console.error("Failed to add bed", error);
            toast.error("Failed to add bed.");
        }
    };

    const handleDeleteBed = async (id) => {
        try {
            await axios.delete(`/api/Adt/Beds/${id}`);
            fetchBeds();
        } catch (error) {
            console.error("Failed to delete bed", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/dashboard/adt')}
                        className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                        <ArrowLeft size={16} />
                        Back to ADT
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bed & Ward Management</h1>
                    <p className="text-sm text-gray-500">Customize floors, wards, and bed pricing.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Form Section */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Plus size={20} className="text-primary-600" />
                        Add New Bed
                    </h3>
                    <form onSubmit={handleAddBed} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Bed Number</label>
                            <input
                                type="text"
                                required
                                value={newBed.bedNumber}
                                onChange={(e) => setNewBed({ ...newBed, bedNumber: e.target.value })}
                                placeholder="e.g. 305-A"
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Ward / Department</label>
                            <select
                                value={newBed.ward}
                                onChange={(e) => setNewBed({ ...newBed, ward: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 bg-white"
                            >
                                <option>General Ward</option>
                                <option>Private Ward</option>
                                <option>ICU</option>
                                <option>Maternity</option>
                                <option>Emergency</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Floor</label>
                            <select
                                value={newBed.floor}
                                onChange={(e) => setNewBed({ ...newBed, floor: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 bg-white"
                            >
                                <option>1st Floor</option>
                                <option>2nd Floor</option>
                                <option>3rd Floor</option>
                                <option>4th Floor</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Price Per Day ($)</label>
                            <input
                                type="number"
                                required
                                value={newBed.pricePerDay}
                                onChange={(e) => setNewBed({ ...newBed, pricePerDay: e.target.value })}
                                placeholder="e.g. 500"
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                        >
                            <Save size={18} />
                            Save Configuration
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 px-4 md:px-6 py-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Current Bed Configuration</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Bed No</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Ward</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Floor</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {beds.map((bed) => (
                                    <tr key={bed.bedId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                                            <BedDouble size={16} className="text-gray-400" />
                                            {bed.bedNumber}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{bed.ward}</td>
                                        <td className="px-6 py-4 text-gray-600">{bed.floor}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">${bed.pricePerDay}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bed.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {bed.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteBed(bed.bedId)}
                                                className="text-red-500 hover:text-red-700 transition-colors bg-red-50 p-2 rounded-lg"
                                                title="Delete Bed"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {beds.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No beds configured yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BedManagement;
