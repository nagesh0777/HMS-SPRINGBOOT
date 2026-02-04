import React, { useEffect, useState } from 'react';
import { Bed, User, ArrowRight, Settings, Activity } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdtDashboard = () => {
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [dischargedPatients, setDischargedPatients] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAdmissions();
        fetchDischarges();
    }, []);

    const fetchAdmissions = async () => {
        try {
            const response = await axios.get('/api/Admission/AdmittedPatients?admissionStatus=admitted');
            if (response.data.Results) {
                setAdmittedPatients(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching admissions", error);
        }
    };

    const fetchDischarges = async () => {
        try {
            const response = await axios.get('/api/Admission/AdmittedPatients?admissionStatus=discharged');
            if (response.data.Results) {
                setDischargedPatients(response.data.Results.slice(0, 5)); // Just last 5
            }
        } catch (error) {
            console.error("Error fetching discharges", error);
        }
    };

    const handleDischarge = async (admissionId) => {
        try {
            const response = await axios.post(`/api/Admission/Discharge?admissionId=${admissionId}`);
            if (response.data.Status === "OK") {
                fetchAdmissions();
                fetchDischarges();
            } else {
                // alert("Error: " + response.data.ErrorMessage); // Removed alert
            }
        } catch (error) {
            console.error("Discharge failed", error);
            // alert("Failed to discharge patient."); // Removed alert
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admission, Discharge & Transfer</h1>
                    <p className="text-sm text-gray-500">Manage inpatient occupancy and bed allocations.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/dashboard/adt/beds')}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <Settings size={20} />
                        Manage Beds
                    </button>
                    <button
                        onClick={() => navigate('/dashboard/adt/admit')}
                        className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
                    >
                        <Bed size={20} />
                        Admit Patient
                    </button>
                </div>
            </div>

            {/* Bed View Grid (Mock Visuals) */}
            <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Activity size={20} className="text-teal-600" />
                    Real-time Ward Occupancy
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {admittedPatients.map((adm) => (
                        <div key={adm.patientAdmissionId} className="relative group flex flex-col items-center justify-center rounded-xl bg-red-50 p-4 border border-red-100 text-center transition-all hover:bg-red-100">
                            <Bed size={32} className="mb-2 text-red-500" />
                            <span className="text-xs font-bold text-gray-900 uppercase">Bed #{adm.bedId}</span>
                            <span className="text-[10px] text-gray-600 font-bold truncate w-full" title={adm.patientName}>{adm.patientName || `Pat #${adm.patientId}`}</span>
                            <span className="text-[9px] text-gray-400 font-medium">({adm.patientCode || 'N/A'})</span>
                            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                                {adm.patientName} • In: {new Date(adm.admissionDate).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {[...Array(Math.max(0, 8 - admittedPatients.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="flex flex-col items-center justify-center rounded-xl bg-green-50 p-4 border border-green-100 text-center opacity-75 hover:opacity-100 cursor-pointer transition-all">
                            <Bed size={32} className="mb-2 text-green-500" />
                            <span className="text-xs font-bold text-gray-900">EMPTY</span>
                            <span className="text-[10px] text-green-600">Available</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* List View */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Current Admissions List</h3>
                    <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded-full">{admittedPatients.length} Admitted</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Admission Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Bed</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {admittedPatients.map((adm) => (
                                <tr key={adm.patientAdmissionId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{adm.patientName || `Pat #${adm.patientId}`}</div>
                                        <div className="text-[10px] text-gray-500 font-medium">{adm.patientCode || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">
                                        {new Date(adm.admissionDate).toLocaleDateString()} {new Date(adm.admissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-100">
                                            Bed: {adm.bedId}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDischarge(adm.patientAdmissionId)}
                                            className="text-red-600 hover:text-white hover:bg-red-600 transition-all text-xs font-bold border border-red-200 px-4 py-2 rounded-lg shadow-sm"
                                        >
                                            Discharge
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {admittedPatients.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No patients currently admitted.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Discharges (Bill Summary) */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Recent Discharges</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Discharge Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Remarks</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {dischargedPatients.map((adm) => (
                                <tr key={adm.patientAdmissionId} className="bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{adm.patientName || `Pat #${adm.patientId}`}</div>
                                        <div className="text-[10px] text-gray-500">{adm.patientCode}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {new Date(adm.dischargeDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-teal-700">
                                        {adm.dischargeRemarks || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">Discharged</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdtDashboard;
