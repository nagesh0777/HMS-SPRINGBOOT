import React, { useEffect, useState } from 'react';
import { Users, Calendar, Bed, Download, Building, CheckCircle, XCircle, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const fmt = (n) => {
    if (n == null || isNaN(n)) return '₹0';
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + ' L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Number(n).toLocaleString('en-IN');
};

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

const DashboardHome = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [full, setFull] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({ chartData: [], patients: [] });
    const [dateRange, setDateRange] = useState('week');

    useEffect(() => {
        const load = async () => {
            try {
                const role = localStorage.getItem('role');
                const doctorId = localStorage.getItem('doctorId');
                if (role === 'SuperAdmin') {
                    const res = await axios.get('/api/SuperAdmin/Summary');
                    if (res.data.Results) setStats({ ...res.data.Results, isSuperAdmin: true });
                } else {
                    const sUrl = doctorId ? `/api/Dashboard/Summary?performerId=${doctorId}` : '/api/Dashboard/Summary';
                    const [s, f] = await Promise.all([axios.get(sUrl), axios.get('/api/Dashboard/FullAnalytics')]);
                    if (s.data.Results) setStats({ ...s.data.Results, isSuperAdmin: false });
                    if (f.data.Results) setFull(f.data.Results);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        axios.get(`/api/Dashboard/Analytics?range=${dateRange}`).then(r => {
            if (r.data.Results) setAnalytics(r.data.Results);
        }).catch(() => { });
    }, [dateRange]);

    const downloadCSV = () => {
        if (!analytics.patients?.length) { toast.info("No data"); return; }
        const h = ["ID", "Name", "Gender", "Phone", "Date"];
        const rows = analytics.patients.map(p => [p.patientCode || p.patientId, `${p.firstName} ${p.lastName}`, p.gender, p.phoneNumber, new Date(p.createdOn).toLocaleDateString()]);
        const csv = "data:text/csv;charset=utf-8," + h.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a"); a.href = encodeURI(csv); a.download = `report_${dateRange}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (stats?.isSuperAdmin) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { t: 'Total Hospitals', v: stats.totalHospitals, icon: <Building size={22} />, g: 'from-blue-500 to-blue-700' },
                { t: 'Active', v: stats.activeHospitals, icon: <CheckCircle size={22} />, g: 'from-green-500 to-green-700' },
                { t: 'Inactive', v: stats.inactiveHospitals, icon: <XCircle size={22} />, g: 'from-gray-500 to-gray-700' },
            ].map(c => (
                <div key={c.t} className={`rounded-2xl bg-gradient-to-br ${c.g} p-6 text-white shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div><p className="text-xs font-semibold opacity-80 uppercase">{c.t}</p><p className="text-3xl font-black mt-1">{c.v}</p></div>
                        <div className="p-2.5 bg-white/20 rounded-xl">{c.icon}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const rev = full?.revenue || {};
    const beds = full?.beds || {};
    const ps = full?.patientStats || {};
    const as2 = full?.appointmentStats || {};
    const bedData = beds.total > 0 ? [{ name: 'Occupied', value: Number(beds.occupied) || 0 }, { name: 'Available', value: Number(beds.available) || 0 }] : [{ name: 'No data', value: 1 }];

    return (
        <div className="space-y-6">

            {/* ─── ROW 1: KPI Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { t: 'Revenue', v: fmt(rev.total), sub: `${rev.paidBills || 0} paid · ${rev.pendingBills || 0} pending`, g: 'from-emerald-500 to-teal-600', icon: <IndianRupee size={20} /> },
                    { t: 'Patients', v: ps.total || 0, sub: `+${ps.newThisWeek || 0} this week`, g: 'from-blue-500 to-indigo-600', icon: <Users size={20} /> },
                    { t: 'Appointments', v: as2.today || 0, sub: `${as2.thisWeek || 0} this week`, g: 'from-violet-500 to-purple-600', icon: <Calendar size={20} /> },
                    { t: 'Bed Occupancy', v: `${beds.occupancyRate || 0}%`, sub: `${beds.occupied || 0} / ${beds.total || 0} beds`, g: 'from-amber-500 to-orange-600', icon: <Bed size={20} /> },
                ].map(c => (
                    <div key={c.t} className={`rounded-2xl bg-gradient-to-br ${c.g} p-5 text-white shadow-lg relative overflow-hidden`}>
                        <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full border-4 border-white/10" />
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{c.t}</p>
                                <p className="text-2xl font-black mt-1">{c.v}</p>
                                <p className="text-[10px] mt-1 opacity-70">{c.sub}</p>
                            </div>
                            <div className="p-2 bg-white/15 rounded-xl">{c.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── ROW 2: Revenue Chart + Bed Donut ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-base font-bold text-gray-900">Monthly Revenue</h3>
                    <p className="text-xs text-gray-400 mb-4">Billed vs Collected — Last 6 months</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={full?.monthlyRevenue || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? (v / 1000) + 'K' : v} />
                                <Tooltip formatter={v => ['₹' + Number(v).toLocaleString('en-IN')]} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="revenue" name="Billed" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 flex flex-col">
                    <h3 className="text-base font-bold text-gray-900">Bed Status</h3>
                    <p className="text-xs text-gray-400 mb-2">Current occupancy</p>
                    <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie data={bedData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {bedData.map((_, i) => <Cell key={i} fill={i === 0 ? '#EF4444' : '#10B981'} />)}
                                </Pie>
                                <Tooltip />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-center p-2 rounded-lg bg-red-50"><p className="text-lg font-black text-red-600">{beds.occupied || 0}</p><p className="text-[9px] font-bold text-red-400 uppercase">Occupied</p></div>
                        <div className="text-center p-2 rounded-lg bg-green-50"><p className="text-lg font-black text-green-600">{beds.available || 0}</p><p className="text-[9px] font-bold text-green-400 uppercase">Available</p></div>
                    </div>
                </div>
            </div>

            {/* ─── ROW 3: Daily Trends + Weekly Stats ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Patient & Appointment Trends</h3>
                            <p className="text-xs text-gray-400">Daily registration & visit activity</p>
                        </div>
                        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                            {['week', 'month'].map(r => (
                                <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${dateRange === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                                    {r === 'week' ? '7D' : '30D'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={full?.dailyTrend || analytics.chartData || []}>
                                <defs>
                                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                <Area type="monotone" dataKey="patients" name="Patients" stroke="#3B82F6" fill="url(#gP)" strokeWidth={2} dot={{ r: 3 }} />
                                <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#8B5CF6" fill="url(#gA)" strokeWidth={2} dot={{ r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <h3 className="text-base font-bold text-gray-900 mb-4">This Week</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { v: as2.thisWeek || 0, l: 'Appointments', bg: 'bg-violet-50', c: 'text-violet-600' },
                            { v: as2.completed || 0, l: 'Completed', bg: 'bg-green-50', c: 'text-green-600' },
                            { v: ps.newThisMonth || 0, l: 'New Patients', bg: 'bg-blue-50', c: 'text-blue-600' },
                            { v: as2.cancelled || 0, l: 'Cancelled', bg: 'bg-red-50', c: 'text-red-600' },
                        ].map(s => (
                            <div key={s.l} className={`p-3 rounded-xl ${s.bg} text-center`}>
                                <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
                                <p className={`text-[9px] font-bold ${s.c} opacity-60 uppercase`}>{s.l}</p>
                            </div>
                        ))}
                    </div>

                    {/* Department Revenue mini list */}
                    {full?.departmentRevenue?.length > 0 && (
                        <div className="mt-5">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Top Departments</h4>
                            <div className="space-y-2">
                                {full.departmentRevenue.slice(0, 4).map((d, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                            <span className="text-xs text-gray-700">{d.department}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900">{fmt(d.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-5 space-y-2">
                        <button onClick={() => navigate('/dashboard/patients/new')} className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">
                            <Users size={14} /> Register Patient
                        </button>
                        <button onClick={() => navigate('/dashboard/appointments/new')} className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition-colors">
                            <Calendar size={14} /> Book Appointment
                        </button>
                        <button onClick={downloadCSV} className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-colors">
                            <Download size={14} /> Export Report
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── ROW 4: Recent Patients ─── */}
            {analytics.patients?.length > 0 && (
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900">Recent Patients</h3>
                        <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Download size={14} /> CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                                <th className="text-left py-2 px-3 font-semibold">Patient</th>
                                <th className="text-left py-2 px-3 font-semibold">ID</th>
                                <th className="text-left py-2 px-3 font-semibold">Gender</th>
                                <th className="text-left py-2 px-3 font-semibold">Contact</th>
                                <th className="text-left py-2 px-3 font-semibold">Date</th>
                            </tr></thead>
                            <tbody>
                                {analytics.patients.slice(0, 6).map(p => (
                                    <tr key={p.patientId} onClick={() => navigate(`/dashboard/patients/${p.patientId}`)} className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors">
                                        <td className="py-2.5 px-3 font-semibold text-gray-900 flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black">{(p.firstName || '?')[0]}</div>
                                            {p.firstName} {p.lastName}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-gray-400 font-mono">{p.patientCode || '#' + p.patientId}</td>
                                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${p.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{p.gender}</span></td>
                                        <td className="py-2.5 px-3 text-xs text-gray-500">{p.phoneNumber || '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-gray-400">{new Date(p.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
