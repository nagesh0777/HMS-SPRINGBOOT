import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, User, Plus, X, CalendarClock, Ban, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import ExportButton from '../../components/ExportButton';

const AppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reschedulingApt, setReschedulingApt] = useState(null);
    const [cancellingApt, setCancellingApt] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
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
            toast.error("Failed to fetch appointments");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleCancelClick = (apt) => {
        setCancellingApt(apt);
    };

    const confirmCancel = async () => {
        if (!cancellingApt) return;
        setSaving(true);
        try {
            const patientName = `${cancellingApt.firstName || ''} ${cancellingApt.lastName || ''}`.trim() || `Patient #${cancellingApt.patientId}`;
            const res = await axios.put(`/api/Appointment/${cancellingApt.appointmentId}/Cancel`);
            if (res.data.Status === "OK") {
                toast.success(`Appointment for ${patientName} has been successfully cancelled.`);
                setCancellingApt(null);
                fetchAppointments();
            } else {
                toast.error(res.data.ErrorMessage || "Unable to process appointment cancellation.");
            }
        } catch (err) {
            console.error("Failed to cancel appointment", err);
            toast.error("An error occurred while trying to cancel the appointment.");
        } finally {
            setSaving(false);
        }
    };

    const openReschedule = (apt) => {
        setReschedulingApt(apt);
        // Pre-fill date picker (convert to format datetime-local accepts: YYYY-MM-DDTHH:MM)
        const dateObj = new Date(apt.appointmentDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        setNewDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    };

    const handleReschedule = async (e) => {
        e.preventDefault();
        if (!newDate) return;

        setSaving(true);
        try {
            const patientName = `${reschedulingApt.firstName} ${reschedulingApt.lastName}`;
            const res = await axios.put(`/api/Appointment/${reschedulingApt.appointmentId}/Reschedule`, {
                appointmentDate: newDate
            });

            if (res.data.Status === "OK") {
                toast.success(`Successfully rescheduled ${patientName}'s appointment.`);
                setReschedulingApt(null);
                fetchAppointments();
            } else {
                toast.error(res.data.ErrorMessage || "This slot is unavailable or conflicts with another booking.");
            }
        } catch (err) {
            console.error("Failed to reschedule", err);
            toast.error("Failed to update appointment. Please check for scheduling conflicts.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track clinician schedules and patient visits</p>
                </div>
                <div className="flex gap-3">
                    {/* Month-to-date by default: the range the front desk actually reconciles. */}
                    <ExportButton
                        url={`/api/Export/Appointments?from=${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`}
                        label="Export"
                        variant="ghost"
                    />
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
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Loading appointments...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : appointments.length > 0 ? (
                                appointments.map((apt) => {
                                    const patientName = `${apt.firstName || ''} ${apt.lastName || ''}`.trim() || `Patient #${apt.patientId}`;
                                    const isCancelled = apt.appointmentStatus === 'cancelled';
                                    
                                    return (
                                        <tr key={apt.appointmentId} className={`hover:bg-gray-50/50 transition-colors ${isCancelled ? 'bg-gray-50/30 opacity-70' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-900">
                                                    <Calendar size={16} className={isCancelled ? "text-gray-300" : "text-gray-400"} />
                                                    <span className={`font-semibold ${isCancelled ? 'text-gray-400 line-through' : ''}`}>
                                                        {new Date(apt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock size={14} className="text-gray-400" />
                                                    <span className={isCancelled ? 'text-gray-400 line-through' : ''}>
                                                        {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-bold text-gray-900 truncate ${isCancelled ? 'text-gray-400 line-through' : ''}`}>
                                                    {patientName}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium">#{apt.patientCode || apt.patientId}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-sm font-medium text-gray-900 ${isCancelled ? 'text-gray-400' : ''}`}>
                                                    Dr. {apt.performerName || `Staff #${apt.performerId}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${isCancelled ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                                                    {apt.appointmentType || 'New Visit'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                                                    isCancelled ? 'bg-red-50 text-red-700 ring-red-200' :
                                                    apt.appointmentStatus === 'Completed' ? 'bg-green-50 text-green-700 ring-green-200' :
                                                    apt.appointmentStatus === 'InConsultation' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                                                    apt.appointmentStatus === 'CheckedIn' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                                                    'bg-blue-50 text-blue-700 ring-blue-200'
                                                }`}>
                                                    {apt.appointmentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!isCancelled && apt.appointmentStatus !== 'Completed' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openReschedule(apt)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                            title="Update Time / Reschedule"
                                                        >
                                                            <CalendarClock size={13} />
                                                            Reschedule
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelClick(apt)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                                            title="Cancel Appointment"
                                                        >
                                                            <Ban size={13} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium italic">No actions</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No upcoming appointments.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reschedule Modal */}
            {reschedulingApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CalendarClock className="text-primary-600" size={20} />
                                Reschedule Appointment
                            </h3>
                            <button
                                onClick={() => setReschedulingApt(null)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleReschedule} className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500">Patient Details</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">
                                    {reschedulingApt.firstName} {reschedulingApt.lastName}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">Assigned Clinician</p>
                                <p className="text-sm font-medium text-gray-700 mt-0.5">
                                    Dr. {reschedulingApt.performerName || `Staff #${reschedulingApt.performerId}`}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setReschedulingApt(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Save New Time
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {cancellingApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20} />
                                Cancel Appointment
                            </h3>
                            <button
                                onClick={() => setCancellingApt(null)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Are you sure you want to cancel the scheduled appointment for <strong className="text-gray-900">{cancellingApt.firstName} {cancellingApt.lastName}</strong>?
                            </p>
                            <p className="text-xs text-gray-400 leading-relaxed bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-100 flex gap-2">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>This action will transition the appointment status to Cancelled and remove the patient from active duty schedules.</span>
                            </p>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setCancellingApt(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                                >
                                    No, Keep Booking
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmCancel}
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Yes, Cancel Visit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentList;
