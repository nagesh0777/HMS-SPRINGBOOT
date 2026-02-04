import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';

const PatientRegistration = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // If present, we are in edit mode
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        age: '',
        phoneNumber: '',
        address: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode) {
            fetchPatient();
        }
    }, [id]);

    const fetchPatient = async () => {
        try {
            const res = await axios.get(`/api/Patient/${id}`);
            if (res.data.Results) {
                const p = res.data.Results;
                setFormData({
                    firstName: p.firstName || '',
                    lastName: p.lastName || '',
                    gender: p.gender || '',
                    age: p.age || '',
                    phoneNumber: p.phoneNumber || '',
                    address: p.address || '',
                    email: p.email || ''
                });
            }
        } catch (err) {
            console.error("Failed to fetch patient for editing", err);
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await axios.put(`/api/Patient/${id}`, formData);
                navigate(`/dashboard/patients/${id}`);
            } else {
                await axios.post('/api/Patient', {
                    ...formData,
                    patientNo: 0,
                    isActive: true
                });
                navigate('/dashboard/patients');
            }
        } catch (error) {
            console.error("Failed to save patient", error);
            const msg = error.response?.data?.ErrorMessage || error.message || "Failed to save patient";
            alert(`Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-8 text-center">Loading patient data...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => isEditMode ? navigate(`/dashboard/patients/${id}`) : navigate('/dashboard/patients')}
                className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
                <ArrowLeft size={16} />
                {isEditMode ? 'Back to Profile' : 'Back to Patient List'}
            </button>

            <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
                <div className="mb-8 flex items-center gap-4">
                    <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Patient Profile' : 'New Patient Registration'}</h1>
                        <p className="text-sm text-gray-500">{isEditMode ? `Updating information for ${formData.firstName}` : 'Enter patient details to register them in the system.'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* First Name */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">First Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g. John"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Last Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g. Doe"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Gender <span className="text-red-500">*</span></label>
                        <select
                            name="gender"
                            required
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Age */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Age (e.g. 25Y) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="age"
                            required
                            value={formData.age}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g. 25Y"
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            required
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g. 9841234567"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g. john.doe@example.com"
                        />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Street address, City"
                        />
                    </div>

                    <div className="mt-4 flex justify-end md:col-span-2 pt-4 border-t border-gray-50">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-primary-600 px-10 py-3 font-bold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl disabled:bg-gray-300 transform active:scale-95"
                        >
                            <Save size={20} />
                            {loading ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Register Patient')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientRegistration;
