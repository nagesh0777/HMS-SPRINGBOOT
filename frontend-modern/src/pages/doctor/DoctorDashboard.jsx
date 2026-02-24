import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Calendar, Users, Bed, FlaskConical, Clock, AlertTriangle, Stethoscope,
    Play, Activity, ArrowRight, HeartPulse, TrendingUp
} from 'lucide-react';

const StatCard = ({ title, value, icon, color, gradient, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}
    >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <div className="w-full h-full" style={{ transform: 'translate(30%, -30%)' }}>
                {React.cloneElement(icon, { size: 120 })}
            </div>
        </div>
        <div className="relative z-10">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm mb-4`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider">{title}</p>
            <p className="mt-1 text-4xl font-black">{value}</p>
        </div>
    </motion.div>
);

const QuickAction = ({ label, description, icon, color, onClick, delay = 0 }) => (
    <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.3 }}
        onClick={onClick}
        className={`group flex items-center gap-4 w-full p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition-all duration-300 text-left`}
    >
        <div className={`flex-shrink-0 p-3 rounded-xl ${color} transition-transform group-hover:scale-110`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900">{label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
        <ArrowRight size={18} className="text-gray-300 group-hover:text-gray-600 transition-colors group-hover:translate-x-1 transform duration-200" />
    </motion.button>
);

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const userName = localStorage.getItem('userName') || 'Doctor';

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get('/api/DoctorPortal/Dashboard');
                if (res.data.Results) {
                    setData(res.data.Results);
                }
            } catch (e) {
                console.error('Failed to fetch doctor dashboard', e);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    const d = data || {};

    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-white shadow-xl"
            >
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-8"><HeartPulse size={200} /></div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-1">
                        <Activity size={16} />
                        Clinical Workspace
                    </div>
                    <h1 className="text-3xl font-black">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Dr. {userName}</h1>
                    <p className="mt-2 text-blue-200 text-sm max-w-lg">
                        You have <span className="font-bold text-white">{d.appointmentsToday || 0} appointments</span> today,
                        <span className="font-bold text-white"> {d.activeAdmissions || 0} admitted patients</span>, and
                        <span className="font-bold text-yellow-300"> {d.pendingLabResults || 0} pending lab results</span>.
                    </p>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Today's Appointments"
                    value={d.appointmentsToday || 0}
                    icon={<Calendar size={24} />}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                    delay={0.1}
                />
                <StatCard
                    title="Admitted Patients"
                    value={d.activeAdmissions || 0}
                    icon={<Bed size={24} />}
                    gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
                    delay={0.15}
                />
                <StatCard
                    title="Pending Lab Results"
                    value={d.pendingLabResults || 0}
                    icon={<FlaskConical size={24} />}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    delay={0.2}
                />
                <StatCard
                    title="Follow-Ups Due"
                    value={d.followUpsDueToday || 0}
                    icon={<Clock size={24} />}
                    gradient="bg-gradient-to-br from-purple-500 to-violet-700"
                    delay={0.25}
                />
            </div>

            {/* Emergency Alert */}
            {(d.emergencyCount || 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-red-200 bg-red-50"
                >
                    <div className="p-3 rounded-xl bg-red-500 text-white animate-pulse">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-red-800">{d.emergencyCount} Emergency Patient{d.emergencyCount > 1 ? 's' : ''}</p>
                        <p className="text-sm text-red-600">Priority attention required. Check your patient queue.</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/doctor/queue')}
                        className="ml-auto px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                        View Queue
                    </button>
                </motion.div>
            )}

            {/* Status Breakdown + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-1 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-500" /> Queue Status
                    </h3>
                    <div className="space-y-3">
                        {['initiated', 'CheckedIn', 'InConsultation', 'Completed'].map(status => {
                            const count = d.statusBreakdown?.[status] || d.statusBreakdown?.[status.toLowerCase()] || 0;
                            const colors = {
                                initiated: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', label: 'Scheduled' },
                                CheckedIn: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', label: 'Checked In' },
                                InConsultation: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500', label: 'In Consultation' },
                                Completed: { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-400', label: 'Completed' },
                            };
                            const c = colors[status];
                            const total = d.appointmentsToday || 1;
                            return (
                                <div key={status} className={`flex items-center gap-3 p-3 rounded-xl ${c.bg}`}>
                                    <div className={`w-2 h-8 rounded-full ${c.bar}`}></div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-semibold ${c.text}`}>{c.label}</p>
                                        <div className="mt-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${(count / total) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <span className={`text-lg font-black ${c.text}`}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Stethoscope size={20} className="text-blue-500" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <QuickAction
                            label="Start Consultation"
                            description="Begin seeing your next patient"
                            icon={<Play size={20} className="text-white" />}
                            color="bg-gradient-to-br from-green-500 to-emerald-600"
                            onClick={() => navigate('/dashboard/doctor/queue')}
                            delay={0.35}
                        />
                        <QuickAction
                            label="View Patient Queue"
                            description="See today's appointment list"
                            icon={<Users size={20} className="text-white" />}
                            color="bg-gradient-to-br from-blue-500 to-blue-600"
                            onClick={() => navigate('/dashboard/doctor/queue')}
                            delay={0.4}
                        />
                        <QuickAction
                            label="Admitted Patients"
                            description="View your IPD patients"
                            icon={<Bed size={20} className="text-white" />}
                            color="bg-gradient-to-br from-teal-500 to-teal-600"
                            onClick={() => navigate('/dashboard/adt')}
                            delay={0.45}
                        />
                        <QuickAction
                            label="Lab Results"
                            description={`${d.pendingLabResults || 0} pending results`}
                            icon={<FlaskConical size={20} className="text-white" />}
                            color="bg-gradient-to-br from-amber-500 to-orange-500"
                            onClick={() => navigate('/dashboard/doctor/prescriptions')}
                            delay={0.5}
                        />
                        <QuickAction
                            label="Write Prescription"
                            description="Create digital prescription"
                            icon={<Stethoscope size={20} className="text-white" />}
                            color="bg-gradient-to-br from-purple-500 to-violet-600"
                            onClick={() => navigate('/dashboard/doctor/prescriptions')}
                            delay={0.55}
                        />
                        <QuickAction
                            label="Follow-Up Planner"
                            description={`${d.followUpsDueToday || 0} due today`}
                            icon={<Clock size={20} className="text-white" />}
                            color="bg-gradient-to-br from-rose-500 to-pink-600"
                            onClick={() => navigate('/dashboard/doctor/followups')}
                            delay={0.6}
                        />
                    </div>
                </div>
            </div>

            {/* Today's Follow-Ups */}
            {d.followUps && d.followUps.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Follow-Ups</h3>
                    <div className="divide-y divide-gray-100">
                        {d.followUps.map((f, i) => (
                            <div key={f.followUpId || i} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-semibold text-gray-900">Patient #{f.patientId}</p>
                                    <p className="text-sm text-gray-500">{f.reason || 'Routine follow-up'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${f.priority === 'urgent' ? 'bg-red-100 text-red-700' : f.priority === 'critical' ? 'bg-red-200 text-red-800' : 'bg-blue-100 text-blue-700'}`}>
                                    {f.priority || 'routine'}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default DoctorDashboard;
