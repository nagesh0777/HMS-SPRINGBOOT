import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';

const NewAppointment = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        patientId: '',
        performerId: '', // Doctor ID
        appointmentDate: '',
    });

    const [doctors, setDoctors] = useState([]);

    React.useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await axios.get('/api/Doctor?isActive=true');
                if (res.data.Results) setDoctors(res.data.Results);
            } catch (err) {
                console.error("No doctors found", err);
            }
        };
        fetchDoctors();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dateLocal = formData.appointmentDate;
            const dateISO = dateLocal.length === 16 ? `${dateLocal}:00` : dateLocal;

            const selectedDoc = doctors.find(d => d.doctorId === parseInt(formData.performerId));

            const response = await axios.post('/api/Appointment/AddAppointment', {
                patientId: parseInt(formData.patientId),
                performerId: parseInt(formData.performerId),
                performerName: selectedDoc?.fullName || '',
                appointmentDate: dateISO,
                appointmentType: "New Visit"
            });

            if (response.data.Status === "OK") {
                navigate('/dashboard/appointments');
            } else {
                alert(`Booking failed: ${response.data.ErrorMessage || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Failed to book appointment", error);
            alert('Failed to book appointment. Please try again.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/dashboard/appointments')}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
                <ArrowLeft size={16} />
                Back to Appointments
            </button>

            <div className="rounded-2xl bg-white p-4 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Book Appointment</h1>
                    <button
                        onClick={() => navigate('/dashboard/appointments/doctors')}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium border border-primary-200 px-3 py-1.5 rounded-lg bg-primary-50 text-center"
                    >
                        Manage Doctors
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <PatientSearch
                        onSelect={(id) => setFormData({ ...formData, patientId: id })}
                        selectedPatientId={formData.patientId}
                    />

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Doctor</label>
                        <select
                            required
                            value={formData.performerId}
                            onChange={(e) => setFormData({ ...formData, performerId: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 bg-white"
                        >
                            <option value="">Select Doctor</option>
                            {doctors.map(doc => (
                                <option key={doc.doctorId} value={doc.doctorId}>
                                    {doc.fullName} ({doc.department})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Date & Time</label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.appointmentDate}
                            onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary-700"
                        >
                            <Save size={20} />
                            Confirm Booking
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewAppointment;
