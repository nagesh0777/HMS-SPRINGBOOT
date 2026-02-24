import React, { useEffect, useState } from 'react';
import { Users, Calendar, Bed, Activity, Download, Building, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    const toast = useToast();
    const [dateRange, setDateRange] = useState('week'); // 'week' or 'month'
    const [stats, setStats] = useState({
        patients: 0,
        appointments: 0,
        admissions: 0,
    });
    const [analytics, setAnalytics] = useState({
        chartData: [],
        patients: [],
        summary: { newPatients: 0, newAppointments: 0 }
    });
    const [recentAdmissions, setRecentAdmissions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Global Summary & Admissions (Existing Logic)
    useEffect(() => {
        const fetchGlobalData = async () => {
            try {
                const doctorId = localStorage.getItem('doctorId');
                const role = localStorage.getItem('role');

                if (role === 'SuperAdmin') {
                    // Super Admin Stats
                    const res = await axios.get('/api/SuperAdmin/Summary');
                    if (res.data.Results) {
                        const data = res.data.Results;
                        setStats({
                            hospitals: data.totalHospitals,
                            activeHospitals: data.activeHospitals,
                            inactiveHospitals: data.inactiveHospitals,
                            isSuperAdmin: true
                        });
                    }
                } else {
                    // Regular Hospital Stats
                    const summaryUrl = doctorId ? `/api/Dashboard/Summary?performerId=${doctorId}` : '/api/Dashboard/Summary';
                    const statsRes = await axios.get(summaryUrl);
                    if (statsRes.data.Results) {
                        const data = statsRes.data.Results;
                        setStats({
                            patients: data.totalPatients,
                            appointments: data.appointmentsToday,
                            admissions: data.activeAdmissions,
                            isSuperAdmin: false
                        });
                    }

                    // 2. Recent Admissions
                    const admsUrl = '/api/Admission/AdmittedPatients?admissionStatus=admitted';
                    const admRes = await axios.get(admsUrl);
                    if (admRes.data.Results) {
                        let results = admRes.data.Results;
                        if (role === 'Doctor' && doctorId) {
                            results = results.filter(a => a.admittingDoctorId === parseInt(doctorId));
                        }
                        setRecentAdmissions(results.slice(0, 5));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch dashboard data", e);
            }
        };
        fetchGlobalData();
    }, []);

    // Fetch Analytics Data (New Logic)
    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/Dashboard/Analytics?range=${dateRange}`);
                if (res.data.Results) {
                    setAnalytics(res.data.Results);
                }
            } catch (e) {
                console.error("Failed to fetch analytics", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [dateRange]);

    // Download CSV
    const downloadCSV = () => {
        if (!analytics.patients || analytics.patients.length === 0) {
            toast.info("No data to download");
            return;
        }

        const headers = ["Patient ID", "Name", "Gender", "Age", "Phone", "Created Date"];
        const rows = analytics.patients.map(p => [
            p.patientCode || p.patientId,
            `${p.firstName} ${p.lastName}`,
            p.gender,
            p.age,
            p.phoneNumber,
            new Date(p.createdOn).toLocaleDateString()
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `patients_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Recharts imports need to be top level, but for tool usage I can't change top level easily without full file replace.
    // Assuming imports are handled or I will add them in a separate block if needed.
    // Actually, I need to add Recharts imports at the top.

    return (
        <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {stats.isSuperAdmin ? (
                    <>
                        <StatCard title="Total Hospitals" value={stats.hospitals} icon={<Building size={24} />} color="bg-blue-600" />
                        <StatCard title="Active Hospitals" value={stats.activeHospitals} icon={<CheckCircle size={24} />} color="bg-green-600" />
                        <StatCard title="Inactive Hospitals" value={stats.inactiveHospitals} icon={<XCircle size={24} />} color="bg-gray-600" />
                    </>
                ) : (
                    <>
                        <StatCard title="Total Patients" value={stats.patients} icon={<Users size={24} />} color="bg-blue-500" />
                        <StatCard title="Appointments Today" value={stats.appointments} icon={<Calendar size={24} />} color="bg-purple-500" />
                        <StatCard title="Active Admissions" value={stats.admissions} icon={<Bed size={24} />} color="bg-teal-500" />
                    </>
                )}
            </div>

            {/* Main Content - Hide for Super Admin */}
            {!stats.isSuperAdmin && (
                <>
                    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Hospital Analytics</h3>
                                <p className="text-sm text-gray-500">Patient registration and appointment trends</p>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setDateRange('week')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${dateRange === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('month')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${dateRange === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Last 30 Days
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center text-gray-400">Loading charts...</div>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.chartData}>
                                        <defs>
                                            <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" />
                                        <Area type="monotone" dataKey="patients" name="New Patients" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPatients)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorAppts)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Patient Report Table */}
                        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">New Patients ({dateRange === 'week' ? 'Week' : 'Month'})</h3>
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Download size={16} />
                                    Download Report
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Patient</th>
                                            <th className="px-4 py-3 font-medium">Contact</th>
                                            <th className="px-4 py-3 font-medium">Registered</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {analytics.patients.length > 0 ? analytics.patients.slice(0, 5).map((p) => (
                                            <tr key={p.patientId} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                                                    <div className="text-xs text-gray-500">{p.patientCode} • {p.age}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">{p.phoneNumber}</td>
                                                <td className="px-4 py-3 text-gray-500">{new Date(p.createdOn).toLocaleDateString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="px-4 py-3 text-center text-gray-400">No new patients in this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                {analytics.patients.length > 5 && (
                                    <div className="mt-3 text-center text-xs text-gray-400">
                                        Showing 5 of {analytics.patients.length} records. Download CSV for full list.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-fit">
                            <h3 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => navigate('/dashboard/patients/new')} className="flex items-center gap-3 w-full p-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-left">
                                    <div className="p-2 bg-blue-200/50 rounded-lg"><Users size={20} /></div>
                                    <div>
                                        <div className="font-semibold">Register Patient</div>
                                        <div className="text-xs opacity-75">Add new patient record</div>
                                    </div>
                                </button>
                                <button onClick={() => navigate('/dashboard/appointments/new')} className="flex items-center gap-3 w-full p-4 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-left">
                                    <div className="p-2 bg-purple-200/50 rounded-lg"><Calendar size={20} /></div>
                                    <div>
                                        <div className="font-semibold">Book Appointment</div>
                                        <div className="text-xs opacity-75">Schedule a visit</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* Helper Icons for Buttons */
const UsersComponent = ({ className }) => <Users className={className} size={24} />;
const CalendarComponent = ({ className }) => <Calendar className={className} size={24} />;


export default DashboardHome;
