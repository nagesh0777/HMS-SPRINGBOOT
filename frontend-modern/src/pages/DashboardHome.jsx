import React, { useEffect, useState } from 'react';
import { Users, Calendar, Bed, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// components/StatCard.jsx
const StatCard = ({ title, value, icon, color }) => (
    <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-white p-4 md:p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                <p className="mt-1 md:mt-2 text-2xl md:text-3xl font-black text-gray-900">{value}</p>
            </div>
            <div className={`rounded-xl ${color} p-2.5 md:p-3 text-white shadow-lg`}>
                {icon}
            </div>
        </div>
        <div className="mt-3 md:mt-4 flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            System Data
        </div>
    </div>
);

const DashboardHome = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        patients: 0,
        appointments: 0,
        admissions: 0,
    });
    const [recentAdmissions, setRecentAdmissions] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const doctorId = localStorage.getItem('doctorId');
                const role = localStorage.getItem('role');
                const summaryUrl = doctorId ? `/api/Dashboard/Summary?performerId=${doctorId}` : '/api/Dashboard/Summary';

                // 1. Fetch Stats
                const statsRes = await axios.get(summaryUrl);
                if (statsRes.data.Results) {
                    const data = statsRes.data.Results;
                    setStats({
                        patients: data.totalPatients,
                        appointments: data.appointmentsToday,
                        admissions: data.activeAdmissions
                    });
                }

                // 2. Fetch Recent Admissions
                const admsUrl = '/api/Admission/AdmittedPatients?admissionStatus=admitted';
                const admRes = await axios.get(admsUrl);
                if (admRes.data.Results) {
                    let results = admRes.data.Results;
                    // Filter in frontend if doctorId exists (or backend could be updated too)
                    if (role === 'Doctor' && doctorId) {
                        results = results.filter(a => a.admittingDoctorId === parseInt(doctorId));
                    }
                    setRecentAdmissions(results.slice(0, 5));
                }
            } catch (e) {
                console.error("Failed to fetch dashboard data", e);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StatCard
                    title="Total Patients"
                    value={stats.patients}
                    icon={<Users size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Appointments Today"
                    value={stats.appointments}
                    icon={<Calendar size={24} />}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Active Admissions"
                    value={stats.admissions}
                    icon={<Bed size={24} />}
                    color="bg-teal-500"
                />
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Admissions</h3>
                    <div className="space-y-4">
                        {recentAdmissions.length > 0 ? recentAdmissions.map((adm) => (
                            <div key={adm.patientAdmissionId} className="flex items-center justify-between rounded-lg border border-gray-50 p-3 hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{adm.patientName || `Pat #${adm.patientId}`}</p>
                                        <p className="text-[10px] text-gray-500">Bed: {adm.bedId} • {new Date(adm.admissionDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                    Admitted
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-gray-400 text-sm">No recent admissions found.</div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/dashboard/patients/new')}
                            className="flex flex-col items-center justify-center rounded-xl bg-blue-50 p-4 text-blue-700 transition-colors hover:bg-blue-100"
                        >
                            <UsersComponent className="mb-2" />
                            Register Patient
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/appointments/new')}
                            className="flex flex-col items-center justify-center rounded-xl bg-purple-50 p-4 text-purple-700 transition-colors hover:bg-purple-100"
                        >
                            <CalendarComponent className="mb-2" />
                            Book Appointment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Helper Icons for Buttons */
const UsersComponent = ({ className }) => <Users className={className} size={24} />;
const CalendarComponent = ({ className }) => <Calendar className={className} size={24} />;


export default DashboardHome;
