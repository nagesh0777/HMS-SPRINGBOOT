import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const doctorId = localStorage.getItem('doctorId');
            // Fetching for a wide range for demo purposes
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            let url = `/api/Appointment/Appointments?FromDate=${today.toISOString()}&ToDate=${nextMonth.toISOString()}`;
            if (doctorId) {
                url += `&performerId=${doctorId}`;
            }

            const response = await axios.get(url);
            if (response.data.Results) {
                setAppointments(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching appointments:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                <div className="flex gap-3">
                    {localStorage.getItem('role') !== 'Doctor' && (
                        <button
                            onClick={() => navigate('/dashboard/appointments/doctors')}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            <User size={20} />
                            Manage Doctors
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/dashboard/appointments/new')}
                        className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
                    >
                        <Plus size={20} />
                        Book Appointment
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Date & Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Patient
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Doctor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {appointments.length > 0 ? (
                                appointments.map((apt) => (
                                    <tr key={apt.appointmentId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-900">
                                                <Calendar size={16} className="text-gray-400" />
                                                <span className="font-medium">
                                                    {new Date(apt.appointmentDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                                                <Clock size={14} />
                                                {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 truncate">
                                                {apt.firstName} {apt.lastName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-medium">#{apt.patientCode || apt.patientId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">Dr. {apt.performerName || `Staff #${apt.performerId}`}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-600">
                                            {apt.appointmentType}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                {apt.appointmentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No upcoming appointments.
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

export default AppointmentList;
