import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Phone } from 'lucide-react';

const PatientSearch = ({ onSelect, selectedPatientId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    useEffect(() => {
        if (searchTerm.length > 2) {
            const delayDebounceFn = setTimeout(() => {
                fetchPatients();
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setResults([]);
        }
    }, [searchTerm]);

    // Fetch details if we have search results but want to display selected one
    useEffect(() => {
        if (selectedPatientId && !selectedPatient) {
            axios.get(`/api/Patient/${selectedPatientId}`).then(res => {
                if (res.data.Results) setSelectedPatient(res.data.Results);
            });
        }
    }, [selectedPatientId]);

    const fetchPatients = async () => {
        try {
            const response = await axios.get(`/api/Patient?search=${searchTerm}`);
            if (response.data.Results) {
                setResults(response.data.Results);
                setShowResults(true);
            }
        } catch (error) {
            console.error("Error searching patients:", error);
        }
    };

    const handleSelect = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm(`${patient.firstName} ${patient.lastName} (${patient.patientCode})`);
        setResults([]);
        setShowResults(false);
        onSelect(patient.patientId);
    };

    return (
        <div className="relative">
            <label className="mb-2 block text-sm font-medium text-gray-700">Find Patient (Name, Mobile, or Code)</label>
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (selectedPatient) setSelectedPatient(null);
                    }}
                    onFocus={() => { if (results.length > 0) setShowResults(true); }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-10 focus:border-primary-500 focus:outline-none"
                    placeholder="Type name, mobile or code..."
                    autoComplete="off"
                />
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden">
                    {results.map(patient => (
                        <div
                            key={patient.patientId}
                            onClick={() => handleSelect(patient)}
                            className="flex items-center gap-3 border-b border-gray-100 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <User size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-900">{patient.firstName} {patient.lastName}</div>
                                <div className="text-[10px] text-gray-500">Code: {patient.patientCode} • Phone: {patient.phoneNumber || 'N/A'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showResults && results.length === 0 && searchTerm.length > 2 && !selectedPatient && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 shadow-xl">
                    No patients found.
                </div>
            )}

            {selectedPatient && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-700 font-medium border border-green-100">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    Selected: {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.patientCode})
                </div>
            )}
        </div>
    );
};

export default PatientSearch;
