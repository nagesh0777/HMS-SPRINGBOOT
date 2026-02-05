import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash, User, Save, ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorManagement = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [newDoctor, setNewDoctor] = useState({
        fullName: '',
        department: 'OPD',
        specialization: '',
        phoneNumber: '',
        email: '',
        startTime: '09:00',
        endTime: '17:00',
        userName: '',
        password: ''
    });

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            // Seed if empty - REMOVED for production
            // await axios.post('/api/Doctor/seed').catch(() => { });

            const response = await axios.get('/api/Doctor?isActive=true');
            if (response.data.Results) {
                setDoctors(response.data.Results);
            }
        } catch (error) {
            console.error("Error fetching doctors", error);
        }
    };

    const handleAddDoctor = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/Doctor', newDoctor);
            setNewDoctor({
                fullName: '',
                department: 'OPD',
                specialization: '',
                phoneNumber: '',
                email: '',
                startTime: '09:00',
                endTime: '17:00',
                userName: '',
                password: ''
            });
            fetchDoctors();
            alert("Doctor and Staff account created successfully!");
        } catch (error) {
            console.error("Failed to add doctor", error);
            alert("Error creating doctor account.");
        }
    };

    const handleDeleteDoctor = async (id) => {
        try {
            await axios.delete(`/api/Doctor/${id}`);
            fetchDoctors();
        } catch (error) {
            console.error("Failed to delete doctor", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/dashboard/appointments')}
                        className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                        <ArrowLeft size={16} />
                        Back to Appointments
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Doctor & Staff Management</h1>
                    <p className="text-sm text-gray-500">Manage doctors, availability, and contact details.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Form Section */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Plus size={20} className="text-primary-600" />
                        Add New Doctor
                    </h3>
                    <form onSubmit={handleAddDoctor} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                required
                                value={newDoctor.fullName}
                                onChange={(e) => setNewDoctor({ ...newDoctor, fullName: e.target.value })}
                                placeholder="Dr. John Doe"
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Department</label>
                                <select
                                    value={newDoctor.department}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-white"
                                >
                                    <option>OPD</option>
                                    <option>Cardiology</option>
                                    <option>Pediatrics</option>
                                    <option>Gynaecology</option>
                                    <option>Emergency</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Specialization</label>
                                <input
                                    type="text"
                                    value={newDoctor.specialization}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                                    placeholder="Heart Surgeon"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                    type="time"
                                    value={newDoctor.startTime}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, startTime: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                                <input
                                    type="time"
                                    value={newDoctor.endTime}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, endTime: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="tel"
                                value={newDoctor.phoneNumber}
                                onChange={(e) => setNewDoctor({ ...newDoctor, phoneNumber: e.target.value })}
                                placeholder="98XXXXXXXX"
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-4">
                            <div>
                                <label className="mb-1 block text-sm font-black text-primary-700 uppercase tracking-tighter text-[10px]">Login Username</label>
                                <input
                                    type="text"
                                    value={newDoctor.userName}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, userName: e.target.value })}
                                    placeholder="dr.john"
                                    className="w-full rounded-lg border border-primary-100 bg-primary-50/30 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-black text-primary-700 uppercase tracking-tighter text-[10px]">Login Password</label>
                                <input
                                    type="password"
                                    value={newDoctor.password}
                                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border border-primary-100 bg-primary-50/30 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                        >
                            <Save size={18} />
                            Save Doctor
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Registered Doctors</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dept/Spec</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Shift</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {doctors.map((doc) => (
                                    <tr key={doc.doctorId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <User size={16} />
                                                </div>
                                                <div className="font-bold text-gray-900">{doc.fullName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{doc.department}</div>
                                            <div className="text-[10px] text-gray-500">{doc.specialization}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                                <Clock size={12} className="text-gray-400" />
                                                {doc.startTime} - {doc.endTime}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteDoctor(doc.doctorId)}
                                                className="text-red-500 hover:text-red-700 p-2 rounded-lg bg-red-50"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {doctors.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No doctors added yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorManagement;
