import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useToast } from '../../components/Toast';

const PatientRegistration = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { id } = useParams(); // If present, we are in edit mode
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        age: '',
        phoneNumber: '',
        address: '',
        email: '',
        status: 'Outpatient',
        photoPath: '',
        weight: '',
        height: '',
        bloodGroup: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

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
                    email: p.email || '',
                    status: p.status || 'Outpatient',
                    photoPath: p.photoPath || '',
                    weight: p.weight || '',
                    height: p.height || '',
                    bloodGroup: p.bloodGroup || ''
                });
            }
        } catch (err) {
            console.error("Failed to fetch patient for editing", err);
        } finally {
            setFetching(false);
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.warning("File is too large. Max size is 5MB.");
            return;
        }

        if (isEditMode) {
            setUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append('file', file);
                uploadData.append('type', 'patient');
                uploadData.append('id', id);
                const res = await axios.post('/api/Files/UploadPhoto', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.Status === 'OK') {
                    setFormData(prev => ({ ...prev, photoPath: res.data.Results.path }));
                    toast.success("Profile photo updated successfully.");
                } else {
                    toast.error(res.data.ErrorMessage || "Upload failed.");
                }
            } catch (err) {
                toast.error("Failed to upload photo.");
            } finally {
                setUploading(false);
            }
        } else {
            setSelectedPhotoFile(file);
            setPhotoPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mobile Number Validation
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(formData.phoneNumber)) {
            toast.warning("Please enter a valid mobile number (10-15 digits).");
            return;
        }

        setLoading(true);
        try {
            // Build payload — convert numeric fields, strip empty strings
            const payload = {
                ...formData,
                weight: formData.weight !== '' ? parseFloat(formData.weight) : null,
                height: formData.height !== '' ? parseFloat(formData.height) : null,
                bloodGroup: formData.bloodGroup || null,
            };

            if (isEditMode) {
                const res = await axios.put(`/api/Patient/${id}`, payload);
                if (res.data.ErrorMessage) {
                    toast.error(res.data.ErrorMessage);
                    return;
                }
                toast.success("Patient profile updated successfully.");
                navigate(`/dashboard/patients/${id}`);
            } else {
                const res = await axios.post('/api/Patient', {
                    ...payload,
                    patientNo: 0,
                    isActive: true
                });

                if (res.data.ErrorMessage) {
                    toast.error(res.data.ErrorMessage || "Failed to register patient.");
                    return;
                }

                if (selectedPhotoFile && res.data.Results?.patientId) {
                    const uploadData = new FormData();
                    uploadData.append('file', selectedPhotoFile);
                    uploadData.append('type', 'patient');
                    uploadData.append('id', res.data.Results.patientId);
                    await axios.post('/api/Files/UploadPhoto', uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                const newId = res.data.Results?.patientId;
                toast.success("Patient registered successfully.");

                // Reception registers a walk-in *because* the patient needs to be seen now.
                // Landing on the full patient list meant searching straight back for the person
                // just created; `?then=` lets the caller chain into the next step instead, and
                // otherwise we open the new chart rather than the list.
                const then = searchParams.get('then');
                if (newId && then === 'appointment') {
                    navigate(`/dashboard/appointments/new?patientId=${newId}`);
                } else if (newId && then === 'admit') {
                    navigate(`/dashboard/adt/admit?patientId=${newId}`);
                } else if (newId) {
                    navigate(`/dashboard/patients/${newId}`);
                } else {
                    navigate('/dashboard/patients');
                }
            }
        } catch (error) {
            console.error("Failed to save patient", error);
            const msg = error.response?.data?.ErrorMessage || error.message || "Failed to save patient";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };


    if (fetching) return <div className="p-8 text-center">Loading patient data...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <button
                onClick={() => isEditMode ? navigate(`/dashboard/patients/${id}`) : navigate('/dashboard/patients')}
                className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft size={16} />
                {isEditMode ? 'Back to Profile' : 'Back to Patient List'}
            </button>

            <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-100">
                <div className="mb-8 flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-blue-600">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">{isEditMode ? 'Edit Patient Profile' : 'New Patient Registration'}</h1>
                        <p className="text-xs text-slate-500 font-semibold mt-1">{isEditMode ? `Updating information for ${formData.firstName} ${formData.lastName}` : 'Enter patient demographics and clinical details to register them in the system.'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Photo Upload Widget */}
                    <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-all gap-4">
                        <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-3xl">
                            {uploading ? (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">Uploading...</div>
                            ) : null}
                            {photoPreviewUrl || formData.photoPath ? (
                                <img src={photoPreviewUrl || formData.photoPath} alt="Patient Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-slate-400" />
                            )}
                        </div>
                        <div className="text-center">
                            <label className="cursor-pointer px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-black text-slate-700 shadow-xs hover:bg-slate-50 transition-all block">
                                {uploading ? 'Uploading Photo...' : (formData.photoPath || photoPreviewUrl ? 'Change Profile Photo' : 'Upload Profile Photo')}
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                            </label>
                            <p className="text-[10px] text-slate-400 mt-2.5 font-bold uppercase tracking-wider">JPEG or PNG, maximum 5MB</p>
                        </div>
                    </div>

                    {/* First Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">First Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="Enter first name"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Last Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="Enter last name"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Gender <span className="text-red-500">*</span></label>
                        <select
                            name="gender"
                            required
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Age */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Age (e.g. 25Y) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="age"
                            required
                            value={formData.age}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="e.g. 25Y"
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Phone Number <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            required
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="Enter mobile number"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="e.g. patient@example.com"
                        />
                    </div>

                    {/* Weight */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Weight (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="weight"
                            value={formData.weight}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="e.g. 72.5"
                        />
                    </div>

                    {/* Height */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Height (cm)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="height"
                            value={formData.height}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="e.g. 175.0"
                        />
                    </div>

                    {/* Blood Group */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Blood Group</label>
                        <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
                        >
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>

                    {/* Clinical Status */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Clinical Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
                        >
                            <option value="Outpatient">Outpatient</option>
                            <option value="Inpatient">Inpatient (Admitted)</option>
                            <option value="Emergency">Emergency</option>
                            <option value="Discharged">Discharged</option>
                        </select>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-200 bg-slate-50/30 px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-300"
                            placeholder="Street address, City"
                        />
                    </div>

                    <div className="mt-4 flex justify-end md:col-span-2 pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-10 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-black disabled:bg-slate-200 disabled:shadow-none transform active:scale-95 shrink-0 w-full sm:w-auto"
                        >
                            <Save size={16} />
                            {loading ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Register Patient')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientRegistration;
