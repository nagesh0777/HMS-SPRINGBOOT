import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Settings, Upload, Save, Building, Phone, Mail, FileText, Image, Hash, Shield, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const HospitalSettingsPage = () => {
    const toast = useToast();
    const logoRef = useRef(null);
    const sigRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        hospitalName: '', address: '', phoneNumber: '', email: '',
        gstNumber: '', registrationNumber: '', footerText: '', hospitalCode: '',
        logoPath: '', signatureImagePath: '',
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

    const getFileUrl = (path) => (path ? `/api/Files${path.replace(/^\/uploads/, '')}` : null);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader
                title="Hospital settings"
                description="Configure branding, contact info and PDF appearance."
                icon={Settings}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="p-6">
                    <Label className="mb-4 block">Hospital logo</Label>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/30">
                            {(logoPreview || getFileUrl(settings.logoPath)) ? (
                                <img src={logoPreview || getFileUrl(settings.logoPath)} alt="Logo" className="h-full w-full object-contain" />
                            ) : <Image className="h-8 w-8 text-muted-foreground" />}
                        </div>
                        <input ref={logoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => uploadFile(e.target.files[0], 'logo')} />
                        <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                            <Upload /> {settings.logoPath ? 'Change logo' : 'Upload logo'}
                        </Button>
                    </div>
                </Card>

                <Card className="p-6">
                    <Label className="mb-4 block">Authorized signature</Label>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/30">
                            {(sigPreview || getFileUrl(settings.signatureImagePath)) ? (
                                <img src={sigPreview || getFileUrl(settings.signatureImagePath)} alt="Signature" className="h-full w-full object-contain" />
                            ) : <FileText className="h-8 w-8 text-muted-foreground" />}
                        </div>
                        <input ref={sigRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => uploadFile(e.target.files[0], 'signature')} />
                        <Button variant="outline" size="sm" onClick={() => sigRef.current?.click()}>
                            <Upload /> {settings.signatureImagePath ? 'Change signature' : 'Upload signature'}
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="space-y-4 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic information</h2>
                <div>
                    <Label className="mb-1.5 block">Hospital name</Label>
                    <div className="relative">
                        <Building className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={settings.hospitalName || ''} onChange={e => setSettings(s => ({ ...s, hospitalName: e.target.value }))} placeholder="Hospital name" className="pl-9" />
                    </div>
                </div>
                <div>
                    <Label className="mb-1.5 block">Address</Label>
                    <Textarea value={settings.address || ''} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} rows={2} placeholder="Full address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="mb-1.5 block">Phone</Label>
                        <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={settings.phoneNumber || ''} onChange={e => setSettings(s => ({ ...s, phoneNumber: e.target.value }))} placeholder="+91…" className="pl-9" />
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Email</Label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={settings.email || ''} onChange={e => setSettings(s => ({ ...s, email: e.target.value }))} placeholder="admin@hospital.com" className="pl-9" />
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="space-y-4 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration &amp; tax</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="mb-1.5 block">GST number</Label>
                        <div className="relative">
                            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={settings.gstNumber || ''} onChange={e => setSettings(s => ({ ...s, gstNumber: e.target.value }))} placeholder="22AAAAA0000A1Z5" className="pl-9" />
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Registration number</Label>
                        <div className="relative">
                            <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={settings.registrationNumber || ''} onChange={e => setSettings(s => ({ ...s, registrationNumber: e.target.value }))} placeholder="REG-2024-XXXX" className="pl-9" />
                        </div>
                    </div>
                </div>
                <div>
                    <Label className="mb-1.5 block">Hospital code (for bill numbers)</Label>
                    <Input
                        value={settings.hospitalCode || ''}
                        onChange={e => setSettings(s => ({ ...s, hospitalCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) }))}
                        placeholder="APL" maxLength={5} className="uppercase"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">Used in bill numbers: BILL-{settings.hospitalCode || 'XXX'}-00001</p>
                </div>
            </Card>

            <Card className="space-y-3 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PDF footer text</h2>
                <Textarea value={settings.footerText || ''} onChange={e => setSettings(s => ({ ...s, footerText: e.target.value }))} rows={3} placeholder="Thank you for choosing our hospital. Get well soon!" />
            </Card>

            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
                {saving ? <Loader2 className="animate-spin" /> : <Save />} {saving ? 'Saving…' : 'Save settings'}
            </Button>
        </div>
    );
};

export default HospitalSettingsPage;
