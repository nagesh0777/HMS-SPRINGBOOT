import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    User, AlertTriangle, Shield, Calendar, FileText, Pill,
    Clock, ArrowLeft, Heart, Activity, MapPin, Phone, Mail,
    ChevronDown, ChevronUp, Search, Stethoscope
} from 'lucide-react';

const DoctorPatientProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('history');
    const [expandedRecord, setExpandedRecord] = useState(null);

    useEffect(() => {
        if (id) fetchProfile(id);
    }, [id]);

    const fetchProfile = async (patientId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/DoctorPortal/Patient/${patientId}`);
            if (res.data.Results) {
                setProfile(res.data.Results);
            }
        } catch (e) {
            console.error('Failed to fetch patient', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(searchQuery)}`);
            if (res.data.Results) {
                setSearchResults(res.data.Results);
            }
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setSearching(false);
        }
    };

    if (!id) {
        // Search page
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Patient Lookup</h1>
                    <p className="text-sm text-gray-500 mt-1">Search for a patient to view their clinical profile</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or patient code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div className="space-y-3">
                        {searchResults.map(p => (
                            <motion.button
                                key={p.patientId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/dashboard/doctor/patient/${p.patientId}`)}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white ring-1 ring-gray-100 hover:shadow-md transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                    {(p.firstName || '?')[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900">{p.firstName} {p.lastName}</p>
                                    <p className="text-xs text-gray-500">{p.patientCode || `#${p.patientId}`} • {p.gender} • {p.age} • {p.phoneNumber}</p>
                                </div>
                                <span className="text-gray-300"><ChevronDown size={16} className="rotate-[-90deg]" /></span>
                            </motion.button>
                        ))}
                    </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                    <div className="text-center py-12 text-gray-400">
                        <User size={48} className="mx-auto mb-3 opacity-40" />
                        <p className="font-semibold">No patients found</p>
                        <p className="text-sm">Try a different search term</p>
                    </div>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return <div className="text-center py-12 text-gray-500">Patient not found</div>;
    }

    const { patient, allergies = [], riskFlags = [], medicalHistory = [], prescriptions = [], followUps = [], activeAdmission } = profile;

    const tabs = [
        { key: 'history', label: 'Medical History', icon: <FileText size={16} /> },
        { key: 'prescriptions', label: 'Prescriptions', icon: <Pill size={16} /> },
        { key: 'followups', label: 'Follow-Ups', icon: <Clock size={16} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft size={16} /> Back
            </button>

            {/* Patient Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                        {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-gray-900">{patient.firstName} {patient.middleName || ''} {patient.lastName}</h1>
                        <p className="text-sm text-gray-500 mt-1">{patient.patientCode || `Patient #${patient.patientId}`}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1"><User size={14} /> {patient.gender} • {patient.age}</span>
                            {patient.bloodGroup && <span className="flex items-center gap-1"><Heart size={14} className="text-red-500" /> {patient.bloodGroup}</span>}
                            {patient.phoneNumber && <span className="flex items-center gap-1"><Phone size={14} /> {patient.phoneNumber}</span>}
                            {patient.email && <span className="flex items-center gap-1"><Mail size={14} /> {patient.email}</span>}
                            {patient.address && <span className="flex items-center gap-1"><MapPin size={14} /> {patient.address}</span>}
                        </div>
                    </div>

                    {/* Active Admission Badge */}
                    {activeAdmission && (
                        <div className="px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                            <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Currently Admitted</p>
                            <p className="text-sm text-green-600 mt-0.5">Bed #{activeAdmission.bedId} • Since {new Date(activeAdmission.admissionDate).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Allergies */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className={`rounded-2xl p-5 ring-1 ${allergies.length > 0 ? 'bg-red-50 ring-red-200' : 'bg-gray-50 ring-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={18} className={allergies.length > 0 ? 'text-red-500' : 'text-gray-400'} />
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${allergies.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Allergies</h3>
                    </div>
                    {allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {[...allergies].map((a, i) => (
                                <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{a}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No known allergies recorded</p>
                    )}
                </motion.div>

                {/* Risk Flags */}
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                    className={`rounded-2xl p-5 ring-1 ${riskFlags.length > 0 ? 'bg-amber-50 ring-amber-200' : 'bg-gray-50 ring-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={18} className={riskFlags.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${riskFlags.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Risk Flags</h3>
                    </div>
                    {riskFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {[...riskFlags].map((f, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{f}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No risk flags</p>
                    )}
                </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {medicalHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FileText size={40} className="mx-auto mb-2 opacity-40" />
                            <p className="font-semibold">No medical records yet</p>
                        </div>
                    ) : (
                        medicalHistory.map((record, i) => (
                            <motion.div
                                key={record.recordId || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 hover:shadow-sm transition-all cursor-pointer"
                                onClick={() => setExpandedRecord(expandedRecord === record.recordId ? null : record.recordId)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.recordType === 'lab_result' ? 'bg-amber-100 text-amber-600'
                                            : record.recordType === 'diagnosis' ? 'bg-red-100 text-red-600'
                                                : record.recordType === 'procedure' ? 'bg-purple-100 text-purple-600'
                                                    : 'bg-blue-100 text-blue-600'}`}>
                                            {record.recordType === 'lab_result' ? <Activity size={18} /> : <Stethoscope size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{record.title || record.recordType}</p>
                                            <p className="text-xs text-gray-500">{new Date(record.createdOn).toLocaleDateString()} • {record.recordType?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {record.labStatus && (
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${record.labStatus === 'pending' ? 'bg-amber-100 text-amber-700' : record.labStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {record.labStatus}
                                            </span>
                                        )}
                                        {expandedRecord === record.recordId ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </div>
                                {expandedRecord === record.recordId && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                                        {record.description && <p><strong>Notes:</strong> {record.description}</p>}
                                        {record.findings && <p><strong>Findings:</strong> {record.findings}</p>}
                                        {record.labTestName && <p><strong>Test:</strong> {record.labTestName}</p>}
                                        {record.labResult && <p><strong>Result:</strong> {record.labResult}</p>}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'prescriptions' && (
                <div className="space-y-3">
                    {prescriptions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Pill size={40} className="mx-auto mb-2 opacity-40" />
                            <p className="font-semibold">No prescriptions recorded</p>
                        </div>
                    ) : (
                        prescriptions.map((rx, i) => (
                            <div key={rx.prescriptionId || i} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900">{rx.diagnosis || 'Prescription'}</p>
                                        <p className="text-xs text-gray-500">{new Date(rx.createdOn).toLocaleDateString()} • Status: {rx.status}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${rx.status === 'finalized' ? 'bg-green-100 text-green-700' : rx.status === 'sent_to_pharmacy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {rx.status}
                                    </span>
                                </div>
                                {rx.clinicalNotes && <p className="mt-2 text-sm text-gray-600">{rx.clinicalNotes}</p>}
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'followups' && (
                <div className="space-y-3">
                    {followUps.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Clock size={40} className="mx-auto mb-2 opacity-40" />
                            <p className="font-semibold">No follow-ups scheduled</p>
                        </div>
                    ) : (
                        followUps.map((f, i) => (
                            <div key={f.followUpId || i} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900">{f.reason || 'Follow-up Visit'}</p>
                                        <p className="text-xs text-gray-500">{f.followUpDate} • Priority: {f.priority}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${f.status === 'completed' ? 'bg-green-100 text-green-700' : f.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {f.status}
                                    </span>
                                </div>
                                {f.careInstructions && <p className="mt-2 text-sm text-gray-600">{f.careInstructions}</p>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default DoctorPatientProfile;
