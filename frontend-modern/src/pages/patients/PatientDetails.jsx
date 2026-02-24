import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Calendar, Clock, CreditCard, Activity, ArrowLeft, Bed, ClipboardList, Briefcase } from 'lucide-react';
import axios from 'axios';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Patient Info
            const patRes = await axios.get(`/api/Patient/${id}`);
            if (patRes.data.Results) {
                setPatient(patRes.data.Results);
            }

            // 2. Fetch Appointments (Recent)
            const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
            const apptRes = await axios.get(`/api/Appointment/Appointments?FromDate=${twoYearsAgo.toISOString()}&ToDate=${nextYear.toISOString()}`);
            if (apptRes.data.Results) {
                const filtered = apptRes.data.Results.filter(a => String(a.patientId) === String(id));
                setAppointments(filtered);
            }

            // 3. Fetch Admissions
            const admRes = await axios.get(`/api/Admission/AdmittedPatients?admissionStatus=admitted`);
            if (admRes.data.Results) {
                const filtered = admRes.data.Results.filter(a => String(a.patientId) === String(id));
                setAdmissions(filtered);
            }

        } catch (err) {
            console.error("Error fetching patient details:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center">Loading patient data...</div>;
    if (!patient) return <div className="p-8 text-center text-red-500">Patient not found.</div>;

    const isActiveAdmission = admissions.length > 0;

    return (
        <div className="space-y-8 pb-10">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard/patients')}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Patient List
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/dashboard/patients/edit/${id}`)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Edit Profile
                    </button>
                    {!isActiveAdmission && (
                        <button
                            onClick={() => navigate('/dashboard/adt/admit')}
                            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
                        >
                            Admit Patient
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md">
                            <User size={48} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold">{patient.firstName} {patient.lastName}</h1>
                                {isActiveAdmission && (
                                    <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-bold text-teal-100 ring-1 ring-teal-400/30">
                                        CURRENTLY ADMITTED
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-primary-100 font-medium">#{patient.patientCode} • {patient.gender} • {patient.age}</p>
                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary-50">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} />
                                    {patient.phoneNumber}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    {patient.address}
                                </div>
                                {patient.email && (
                                    <div className="flex items-center gap-2">
                                        <ClipboardList size={16} />
                                        {patient.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                    <div className="p-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Visits</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{appointments.length + admissions.length}</p>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Past Diagnoses</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">None</p>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Lab Reports</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Appointments */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Calendar size={20} className="text-primary-600" />
                            Appointment History
                        </h3>
                        <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">View All</button>
                    </div>
                    <div className="space-y-4">
                        {appointments.length > 0 ? appointments.map((appt) => (
                            <div key={appt.appointmentId} className="flex items-center justify-between rounded-xl border border-gray-50 bg-gray-50/30 p-4 transition-all hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="rounded-lg bg-white p-2 text-primary-600 shadow-sm">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Dr. {appt.performerName || `Staff #${appt.performerId}`}</p>
                                        <p className="text-xs text-gray-500">{new Date(appt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${appt.appointmentStatus === 'booked' ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                    appt.appointmentStatus === 'completed' ? 'bg-green-50 text-green-700 ring-green-100' :
                                        'bg-gray-50 text-gray-700 ring-gray-100'
                                    }`}>
                                    {appt.appointmentStatus}
                                </span>
                            </div>
                        )) : (
                            <div className="py-10 text-center text-sm text-gray-400">No appointment records found.</div>
                        )}
                    </div>
                </div>

                {/* Admission & Bed Info */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                    <div className="mb-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Bed size={20} className="text-teal-600" />
                            Admission Details
                        </h3>
                    </div>
                    {isActiveAdmission ? (
                        <div className="space-y-6">
                            <div className="rounded-xl bg-teal-50 p-6 border border-teal-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Current Location</p>
                                        <h4 className="mt-1 text-xl font-bold text-teal-900">Ward A • Bed #{admissions[0].bedId}</h4>
                                    </div>
                                    <div className="rounded-full bg-white p-2 text-teal-600 shadow-sm">
                                        <Activity size={24} />
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-teal-600 uppercase">Admitted On</p>
                                        <p className="text-sm font-bold text-teal-900">{new Date(admissions[0].admissionDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-teal-600 uppercase">Status</p>
                                        <p className="text-sm font-bold text-teal-900">Stable</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="rounded-lg bg-gray-100 p-2 text-gray-500">
                                        <Briefcase size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">In-charge Consultant</p>
                                        <p className="text-xs text-gray-500">Dr. Smith (Cardiology)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="mb-4 rounded-full bg-gray-50 p-4 text-gray-300">
                                <Bed size={48} />
                            </div>
                            <p className="text-sm text-gray-500">This patient is not currently admitted.</p>
                            <button
                                onClick={() => navigate('/dashboard/adt/admit')}
                                className="mt-4 text-sm font-bold text-primary-600 hover:text-primary-700"
                            >
                                Process New Admission
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDetails;
