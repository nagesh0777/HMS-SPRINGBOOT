import React, { useEffect, useState } from 'react';
import { Search, Plus, User, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PatientList = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchPatients();
    }, [searchTerm]);

    const fetchPatients = async () => {
        try {
            const response = await axios.get(`/api/Patient?search=${searchTerm}`);
            if (response.data.Results) {
                setPatients(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
                <button
                    onClick={() => navigate('/dashboard/patients/new')}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                    <Plus size={20} />
                    Register Patient
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, mobile, or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border-gray-200 bg-white py-2.5 pl-10 pr-4 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
            </div>

            {/* Patient Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Patient Info
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Address
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {patients.length > 0 ? (
                                patients.map((patient) => (
                                    <tr key={patient.patientId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {patient.firstName} {patient.lastName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {patient.patientCode} • {patient.gender} • {patient.age}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone size={16} className="text-gray-400" />
                                                {patient.phoneNumber || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin size={16} className="text-gray-400" />
                                                {patient.address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/dashboard/patients/${patient.patientId}`)}
                                                className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                                            >
                                                View details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No patients found. Add a new patient to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PatientList;
