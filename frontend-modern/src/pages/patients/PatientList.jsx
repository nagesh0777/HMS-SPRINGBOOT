import React, { useEffect, useState } from 'react';
import { Search, Plus, User, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ExportButton from '../../components/ExportButton';

const PatientList = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPatients();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const [searching, setSearching] = useState(false);

    const fetchPatients = async () => {
        setSearching(true);
        try {
            const response = await axios.get(`/api/Patient?search=${searchTerm}`);
            if (response.data.Results) {
                setPatients(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight font-display">Patient Management</h1>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Search, filter, and register patients in the master clinical records database.</p>
                </div>
                <div className="flex gap-2 self-start sm:self-auto">
                    {/* The walk-in case: register and go straight into booking, rather than
                        registering, landing on a list, and searching for the same person again. */}
                    <button
                        onClick={() => navigate('/dashboard/patients/new?then=appointment')}
                        className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95 text-xs font-black uppercase tracking-wider shadow-sm"
                    >
                        <Plus size={16} />
                        Register &amp; Book
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/patients/new')}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-black transition-all active:scale-95 text-xs font-black uppercase tracking-wider shadow-sm"
                    >
                        <Plus size={16} />
                        Register Patient
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className={`absolute left-3.5 top-3.5 transition-colors ${searching ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} size={16} />
                <input
                    type="text"
                    placeholder="Search by name, mobile, or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 rounded-2xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder-gray-400"
                />
                {searching && (
                    <div className="absolute right-3.5 top-3.5">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
            </div>

            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                    {searchTerm ? `Filtered by "${searchTerm}"` : 'All patients'}
                </p>
                {/* Exports exactly what is on screen — passing the search term through means the
                    download matches the filter rather than silently dumping everything. */}
                <ExportButton
                    url={`/api/Export/Patients?search=${encodeURIComponent(searchTerm || '')}`}
                    label="Download CSV"
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
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 overflow-hidden border border-gray-150">
                                                    {patient.photoPath ? (
                                                        <img src={patient.photoPath} alt="Patient" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900">
                                                            {patient.firstName} {patient.lastName}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            patient.status === 'Inpatient' ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-100' :
                                                            patient.status === 'Emergency' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' :
                                                            patient.status === 'Discharged' ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-100' :
                                                            'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                                        }`}>
                                                            {patient.status || 'Outpatient'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
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
