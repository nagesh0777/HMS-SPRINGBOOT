import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Settings, Upload, Save, Building, Phone, Mail, FileText, Image, Hash, Shield, Eye } from 'lucide-react';

const HospitalSettingsPage = () => {
    const toast = useToast();
    const logoRef = useRef(null);
    const sigRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        hospitalName: '', address: '', phoneNumber: '', email: '',
        gstNumber: '', registrationNumber: '', footerText: '', hospitalCode: '',
        logoPath: '', signatureImagePath: ''
    });
    const [logoPreview, setLogoPreview] = useState(null);
    const [sigPreview, setSigPreview] = useState(null);

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/HospitalSettings');
            if (res.data.Results) setSettings(res.data.Results);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.put('/api/HospitalSettings', settings);
            if (res.data.ErrorMessage) { toast.error(res.data.ErrorMessage); }
            else { toast.success('Settings saved successfully!'); setSettings(res.data.Results); }
        } catch (e) { toast.error('Failed to save settings'); } finally { setSaving(false); }
    };

    const uploadFile = async (file, type) => {
        if (!file) return;
        const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowed.includes(file.type)) { toast.error('Only PNG/JPG files allowed'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }

        const formData = new FormData();
        formData.append('file', file);
        try {
            const url = type === 'logo' ? '/api/HospitalSettings/UploadLogo' : '/api/HospitalSettings/UploadSignature';
            const res = await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.ErrorMessage) { toast.error(res.data.ErrorMessage); return; }
            toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded!`);
            fetchSettings();
            if (type === 'logo') setLogoPreview(URL.createObjectURL(file));
            else setSigPreview(URL.createObjectURL(file));
        } catch (e) { toast.error(`Failed to upload ${type}`); }
    };

    const getFileUrl = (path) => {
        if (!path) return null;
        return `/api/Files${path.replace(/^\/uploads/, '')}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><Settings size={28} /></div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hospital Settings</h1>
                    <p className="text-gray-500 font-medium">Configure branding, contact info, and PDF appearance.</p>
                </div>
            </div>

            {/* Logo & Signature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Hospital Logo</label>
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                            {(logoPreview || getFileUrl(settings.logoPath)) ? (
                                <img src={logoPreview || getFileUrl(settings.logoPath)} alt="Logo" className="w-full h-full object-contain" />
                            ) : <Image size={32} className="text-gray-300" />}
                        </div>
                        <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => uploadFile(e.target.files[0], 'logo')} />
                        <button onClick={() => logoRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all">
                            <Upload size={14} />{settings.logoPath ? 'Change Logo' : 'Upload Logo'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Authorized Signature</label>
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                            {(sigPreview || getFileUrl(settings.signatureImagePath)) ? (
                                <img src={sigPreview || getFileUrl(settings.signatureImagePath)} alt="Signature" className="w-full h-full object-contain" />
                            ) : <FileText size={32} className="text-gray-300" />}
                        </div>
                        <input ref={sigRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => uploadFile(e.target.files[0], 'signature')} />
                        <button onClick={() => sigRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all">
                            <Upload size={14} />{settings.signatureImagePath ? 'Change Signature' : 'Upload Signature'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Basic Information</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Hospital Name</label>
                        <div className="relative">
                            <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={settings.hospitalName || ''} onChange={e => setSettings(s => ({ ...s, hospitalName: e.target.value }))}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Hospital Name" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Address</label>
                        <textarea value={settings.address || ''} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Full address" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Phone</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input value={settings.phoneNumber || ''} onChange={e => setSettings(s => ({ ...s, phoneNumber: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="+91..." />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input value={settings.email || ''} onChange={e => setSettings(s => ({ ...s, email: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@hospital.com" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration & Tax */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-5">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Registration & Tax</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">GST Number</label>
                        <div className="relative">
                            <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={settings.gstNumber || ''} onChange={e => setSettings(s => ({ ...s, gstNumber: e.target.value }))}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="22AAAAA0000A1Z5" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Registration Number</label>
                        <div className="relative">
                            <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={settings.registrationNumber || ''} onChange={e => setSettings(s => ({ ...s, registrationNumber: e.target.value }))}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="REG-2024-XXXX" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Hospital Code (for Bill Numbers)</label>
                    <input value={settings.hospitalCode || ''} onChange={e => setSettings(s => ({ ...s, hospitalCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase" placeholder="APL" maxLength={5} />
                    <p className="text-[10px] text-gray-400 mt-1">Used in bill numbers: BILL-{settings.hospitalCode || 'XXX'}-00001</p>
                </div>
            </div>

            {/* PDF Footer */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-4">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">PDF Footer Text</h2>
                <textarea value={settings.footerText || ''} onChange={e => setSettings(s => ({ ...s, footerText: e.target.value }))} rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Thank you for choosing our hospital. Get well soon!" />
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={18} />{saving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    );
};

export default HospitalSettingsPage;
