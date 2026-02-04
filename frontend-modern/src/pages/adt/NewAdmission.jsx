import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BedDouble } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';

const NewAdmission = () => {
    // ... (rest of state is same)
    const [formData, setFormData] = useState({
        patientId: '',
        admittingDoctorId: '',
        bedId: '',
        admissionNotes: ''
    });

    const [beds, setBeds] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const navigate = useNavigate();

    React.useEffect(() => {
        fetchBeds();
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const res = await axios.get('/api/Doctor?isActive=true');
            if (res.data.Results) setDoctors(res.data.Results);
        } catch (err) { console.error(err); }
    };

    const fetchBeds = async () => {
        try {
            await axios.post('/api/Adt/seed').catch(() => { });
            const response = await axios.get('/api/Adt/Beds?status=available');
            if (response.data.Results) setBeds(response.data.Results);
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/Admission/Admission', {
                patientId: parseInt(formData.patientId),
                admittingDoctorId: parseInt(formData.admittingDoctorId),
                bedId: parseInt(formData.bedId),
                admissionDate: new Date(),
                admissionStatus: "admitted",
                admissionNotes: formData.admissionNotes
            });
            navigate('/dashboard/adt');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.ErrorMessage || "Failed to admit patient.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/dashboard/adt')}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
                <ArrowLeft size={16} />
                Back to ADT
            </button>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h1 className="mb-8 text-2xl font-bold text-gray-900">Admit Patient</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <PatientSearch
                        onSelect={(id) => setFormData({ ...formData, patientId: id })}
                        selectedPatientId={formData.patientId}
                    />

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Admitting Doctor</label>
                        <select
                            required
                            value={formData.admittingDoctorId}
                            onChange={(e) => setFormData({ ...formData, admittingDoctorId: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white"
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
                        <label className="mb-2 block text-sm font-medium text-gray-700">Select Bed</label>
                        <select
                            required
                            value={formData.bedId}
                            onChange={(e) => setFormData({ ...formData, bedId: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white shadow-sm"
                        >
                            <option value="">Select Bed</option>
                            {beds.map(bed => (
                                <option key={bed.bedId} value={bed.bedId}>
                                    {bed.ward} - {bed.bedNumber} (${bed.pricePerDay}/day)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Admission Notes</label>
                        <textarea
                            rows="3"
                            value={formData.admissionNotes}
                            onChange={(e) => setFormData({ ...formData, admissionNotes: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                            placeholder="Reason for admission..."
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:scale-[1.02]"
                        >
                            <BedDouble size={20} />
                            Admit Patient
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewAdmission;
