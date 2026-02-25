import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pill, Search, Send, Download, Edit3, X, Check,
    AlertTriangle, FileText, Trash2, Save, RefreshCw,
    CheckCircle, User, Settings, Copy, ChevronDown
} from 'lucide-react';

const MEDICINE_DB = [
    'Amoxicillin', 'Azithromycin', 'Paracetamol', 'Ibuprofen', 'Cetirizine',
    'Metformin', 'Omeprazole', 'Amlodipine', 'Atorvastatin', 'Losartan',
    'Ciprofloxacin', 'Doxycycline', 'Prednisone', 'Montelukast', 'Pantoprazole',
    'Levothyroxine', 'Lisinopril', 'Hydrochlorothiazide', 'Clopidogrel',
    'Aspirin', 'Diclofenac', 'Tramadol', 'Gabapentin', 'Sertraline', 'Fluoxetine',
    'Ranitidine', 'Domperidone', 'Ondansetron', 'Salbutamol', 'Budesonide',
    'Metronidazole', 'Acyclovir', 'Clindamycin', 'Levofloxacin', 'Rabeprazole',
    'Montelukast', 'Fexofenadine', 'Loperamide', 'ORS', 'Vitamin D3',
    'Vitamin B12', 'Iron Supplement', 'Calcium', 'Folic Acid', 'Multivitamin'
];

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Every 8 hours', 'Every 12 hours', 'Before meals', 'After meals', 'At bedtime', 'Morning only', 'Night only'];
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', '60 days', '90 days', 'Ongoing'];

// Default templates - stored in localStorage so doctors can customize
const DEFAULT_TEMPLATES = [
    {
        id: 'common_cold', name: 'Common Cold / Flu', medicines: [
            { name: 'Paracetamol', dosage: '500mg', frequency: 'Three times daily', duration: '3 days', instructions: 'After meals with warm water' },
            { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '5 days', instructions: 'At bedtime' },
            { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily', duration: '5 days', instructions: 'If fever persists beyond 3 days' },
        ]
    },
    {
        id: 'uti', name: 'UTI Treatment', medicines: [
            { name: 'Ciprofloxacin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', instructions: 'With plenty of water' },
            { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '3 days', instructions: 'For fever/pain' },
        ]
    },
    {
        id: 'hypertension', name: 'Hypertension', medicines: [
            { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing', instructions: 'Morning, before breakfast' },
            { name: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: 'Ongoing', instructions: 'Morning' },
        ]
    },
    {
        id: 'diabetes_t2', name: 'Type 2 Diabetes', medicines: [
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: 'Ongoing', instructions: 'After meals' },
        ]
    },
    {
        id: 'gastritis', name: 'Gastritis / GERD', medicines: [
            { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily', duration: '14 days', instructions: 'Before breakfast, empty stomach' },
            { name: 'Domperidone', dosage: '10mg', frequency: 'Three times daily', duration: '7 days', instructions: 'Before meals' },
        ]
    },
    {
        id: 'allergy', name: 'Allergy / Urticaria', medicines: [
            { name: 'Fexofenadine', dosage: '120mg', frequency: 'Once daily', duration: '7 days', instructions: 'Before meals' },
            { name: 'Montelukast', dosage: '10mg', frequency: 'Once daily', duration: '7 days', instructions: 'At bedtime' },
        ]
    },
    {
        id: 'diarrhea', name: 'Acute Diarrhea', medicines: [
            { name: 'ORS', dosage: '1 packet', frequency: 'As needed', duration: '3 days', instructions: 'Dissolve in 1L water, sip frequently' },
            { name: 'Loperamide', dosage: '2mg', frequency: 'As needed', duration: '2 days', instructions: 'Max 8mg/day' },
            { name: 'Metronidazole', dosage: '400mg', frequency: 'Three times daily', duration: '5 days', instructions: 'After meals' },
        ]
    },
];

const Toast = ({ message, type, onClose }) => (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold ${type === 'success' ? 'bg-green-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
        {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
        {message}
        <button onClick={onClose} className="ml-2 hover:opacity-80"><X size={14} /></button>
    </motion.div>
);

const PrescriptionManagement = () => {
    const [searchParams] = useSearchParams();
    const prePatientId = searchParams.get('patientId');
    const prePatientName = searchParams.get('patientName');

    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(!!prePatientId);
    const [search, setSearch] = useState('');
    const [medSearch, setMedSearch] = useState('');
    const [showMedSuggestions, setShowMedSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    // Patient search within prescription
    const [patientSearch, setPatientSearch] = useState('');
    const [patientResults, setPatientResults] = useState([]);
    const [searchingPatient, setSearchingPatient] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(
        prePatientId ? { patientId: parseInt(prePatientId), name: prePatientName || `Patient #${prePatientId}` } : null
    );

    // Templates
    const [templates, setTemplates] = useState(() => {
        try {
            const saved = localStorage.getItem('prescriptionTemplates');
            return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
        } catch { return DEFAULT_TEMPLATES; }
    });
    const [editingTemplate, setEditingTemplate] = useState(null);

    // Form state
    const [form, setForm] = useState({
        diagnosis: '',
        clinicalNotes: '', // Chief complaint
        allergyWarnings: '',
        medicines: [],
        followUpDate: '',
        followUpNotes: '',
        patientWeight: '',
        patientHeight: '',
    });
    const [appliedTemplates, setAppliedTemplates] = useState([]);

    const [currentMed, setCurrentMed] = useState({
        name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '', timing: 'After food'
    });

    const showToast = useCallback((text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => { fetchPrescriptions(); }, []);

    useEffect(() => {
        localStorage.setItem('prescriptionTemplates', JSON.stringify(templates));
    }, [templates]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/DoctorPortal/Prescriptions');
            if (res.data.Results) setPrescriptions(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch prescriptions', e);
        } finally {
            setLoading(false);
        }
    };

    const searchPatient = async (query) => {
        if (!query.trim() || query.length < 2) { setPatientResults([]); return; }
        setSearchingPatient(true);
        try {
            const res = await axios.get(`/api/DoctorPortal/SearchPatient?query=${encodeURIComponent(query)}`);
            if (res.data.Results) setPatientResults(res.data.Results);
        } catch (e) {
            console.error('Patient search failed', e);
        } finally {
            setSearchingPatient(false);
        }
    };

    const selectPatient = (p) => {
        setSelectedPatient({ patientId: p.patientId, name: `${p.firstName} ${p.lastName}`, data: p });
        setPatientSearch('');
        setPatientResults([]);
    };

    const addMedicine = () => {
        if (!currentMed.name.trim() || !currentMed.dosage.trim()) {
            showToast('Medicine name and dosage are required', 'error');
            return;
        }
        setForm(prev => ({ ...prev, medicines: [...prev.medicines, { ...currentMed }] }));
        setCurrentMed({ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '', timing: 'After food' });
        setMedSearch('');
    };

    const removeMedicine = (index) => {
        setForm(prev => ({ ...prev, medicines: prev.medicines.filter((_, i) => i !== index) }));
    };

    const updateMedicine = (index, field, value) => {
        setForm(prev => ({
            ...prev,
            medicines: prev.medicines.map((m, i) => i === index ? { ...m, [field]: value } : m)
        }));
    };

    const applyTemplate = (template) => {
        const isAlreadyApplied = appliedTemplates.includes(template.id);
        if (isAlreadyApplied) {
            // Remove template medicines
            const templateMedNames = template.medicines.map(m => m.name);
            setForm(prev => ({
                ...prev,
                diagnosis: prev.diagnosis.replace(template.name, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim(),
                medicines: prev.medicines.filter(m => !templateMedNames.includes(m.name)),
            }));
            setAppliedTemplates(prev => prev.filter(id => id !== template.id));
            showToast(`Removed "${template.name}"`, 'info');
        } else {
            // Add template medicines (combine)
            const existingNames = form.medicines.map(m => m.name);
            const newMeds = template.medicines.filter(m => !existingNames.includes(m.name)).map(m => ({ ...m, timing: m.timing || 'After food' }));
            setForm(prev => ({
                ...prev,
                diagnosis: prev.diagnosis ? prev.diagnosis + ', ' + template.name : template.name,
                medicines: [...prev.medicines, ...newMeds],
            }));
            setAppliedTemplates(prev => [...prev, template.id]);
            showToast(`Added "${template.name}" (${newMeds.length} medicines)`, 'info');
        }
    };

    const savePrescription = async (sendToPharmacy = false) => {
        if (!selectedPatient) {
            showToast('Please select a patient first', 'error');
            return;
        }
        if (form.medicines.length === 0) {
            showToast('Add at least one medicine', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                patientId: selectedPatient.patientId,
                diagnosis: form.diagnosis,
                clinicalNotes: form.clinicalNotes,
                allergyWarnings: form.allergyWarnings,
                medicines: JSON.stringify(form.medicines),
                status: sendToPharmacy ? 'sent_to_pharmacy' : 'finalized',
                followUpDate: form.followUpDate || null,
                followUpNotes: form.followUpNotes || null,
                patientWeight: form.patientWeight ? Number(form.patientWeight) : null,
                patientHeight: form.patientHeight ? Number(form.patientHeight) : null,
            };
            const res = await axios.post('/api/DoctorPortal/Prescriptions', payload);
            if (res.data.Status === 'OK') {
                setShowForm(false);
                setForm({ diagnosis: '', clinicalNotes: '', allergyWarnings: '', medicines: [], followUpDate: '', followUpNotes: '', patientWeight: '', patientHeight: '' });
                setAppliedTemplates([]);
                setSelectedPatient(null);
                fetchPrescriptions();
                showToast(sendToPharmacy ? `Prescription sent to pharmacy for ${selectedPatient.name}` : `Prescription saved for ${selectedPatient.name}`);
            } else {
                showToast(res.data.ErrorMessage || 'Failed to save', 'error');
            }
        } catch (e) {
            console.error('Failed to save prescription', e);
            showToast('Failed to save prescription', 'error');
        } finally {
            setSaving(false);
        }
    };

    const sendToPharmacy = async (id) => {
        try {
            await axios.put(`/api/DoctorPortal/Prescriptions/${id}/SendToPharmacy`);
            setPrescriptions(prev => prev.map(p =>
                p.prescriptionId === id ? { ...p, status: 'sent_to_pharmacy' } : p
            ));
            showToast('Sent to pharmacy');
        } catch (e) {
            showToast('Failed to send to pharmacy', 'error');
        }
    };

    // Template management
    const saveTemplate = (template) => {
        if (template.id) {
            setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
        } else {
            template.id = `custom_${Date.now()}`;
            setTemplates(prev => [...prev, template]);
        }
        setEditingTemplate(null);
        showToast(`Template "${template.name}" saved`);
    };

    const deleteTemplate = (id) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        showToast('Template deleted');
    };

    const saveCurrentAsTemplate = () => {
        if (form.medicines.length === 0) {
            showToast('Add medicines first before saving as template', 'error');
            return;
        }
        const name = prompt('Enter template name:', form.diagnosis || 'My Template');
        if (!name) return;
        const newTemplate = {
            id: `custom_${Date.now()}`,
            name,
            medicines: form.medicines.map(m => ({ ...m }))
        };
        setTemplates(prev => [...prev, newTemplate]);
        showToast(`Template "${name}" created`);
    };

    const downloadPDF = async (rx) => {
        let meds = [];
        try { meds = rx.medicines ? JSON.parse(rx.medicines) : []; } catch (e) { }

        // Fetch hospital branding
        let settings = {};
        try {
            const sRes = await axios.get('/api/HospitalSettings');
            if (sRes.data.Results) settings = sRes.data.Results;
        } catch (e) { }

        // Fetch patient details
        let patient = {};
        try {
            const pRes = await axios.get(`/api/DoctorPortal/Patient/${rx.patientId}`);
            if (pRes.data.Results?.patient) patient = pRes.data.Results.patient;
        } catch (e) { }

        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>Prescription - ${rx.patientName || ''}</title>
        <style>
          @page{margin:15mm}*{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1a1a1a;padding:30px 40px;max-width:800px;margin:0 auto;font-size:12px;line-height:1.5}
          .header{display:flex;align-items:center;gap:20px;padding-bottom:14px;border-bottom:2px solid #16a085;margin-bottom:6px}
          .logo{width:68px;height:68px;object-fit:contain}
          .hospital-info h1{font-size:20px;font-weight:800;color:#16a085;letter-spacing:.5px;margin-bottom:2px}
          .hospital-info p{font-size:10px;color:#555;line-height:1.6}
          .hospital-info .reg{font-size:9px;color:#777;margin-top:2px}
          .title-bar{background:#16a085;color:#fff;text-align:center;padding:8px;font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px}
          .info-sec{display:flex;gap:20px;margin-bottom:16px}
          .info-blk{flex:1;border:1px solid #e2e8f0;padding:12px 14px}
          .info-blk h4{font-size:9px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
          .ir{display:flex;justify-content:space-between;font-size:11px;padding:2px 0}
          .ir .l{color:#718096}.ir .v{font-weight:600}
          table{width:100%;border-collapse:collapse;margin:16px 0}
          th{background:#2d3748;color:white;padding:8px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700}
          td{padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:11px;color:#2d3748}
          tr:nth-child(even){background:#f8f9fa}
          .notes{background:#f0f9ff;padding:14px 18px;border-left:3px solid #3b82f6;margin:16px 0;font-size:12px}
          .allergy{background:#fef2f2;padding:14px 18px;border-left:3px solid #ef4444;margin:16px 0;font-size:12px;color:#991b1b}
          .followup{background:#fffbeb;padding:14px 18px;border-left:3px solid #f59e0b;margin:16px 0;font-size:12px}
          .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:18px}
          .sig-area{display:flex;justify-content:space-between;margin-bottom:18px}
          .sb{text-align:center}.sb img{max-width:100px;max-height:50px;display:block;margin:0 auto 6px}
          .sb .sl{width:180px;border-top:1px solid #2d3748;padding-top:4px;font-size:10px;color:#4a5568}
          .footer-text{font-size:9px;color:#718096;text-align:center;margin-top:12px;font-style:italic}
          @media print{body{padding:15px}.np{display:none!important}}
        </style></head><body>
        <div class="header">
          ${settings.logoPath ? `<img src="/api/Files${settings.logoPath.replace('/uploads', '')}" class="logo" onerror="this.style.display='none'" />` : ''}
          <div class="hospital-info">
            <h1>${settings.hospitalName || 'Hospital'}</h1>
            <p>${settings.address || ''}</p>
            <p>Tel: ${settings.phoneNumber || '-'} | Email: ${settings.email || '-'}</p>
            ${settings.registrationNumber ? `<p class="reg">Reg. No: ${settings.registrationNumber}</p>` : ''}
          </div>
        </div>
        <div class="title-bar">Medical Prescription</div>
        <div class="info-sec">
          <div class="info-blk">
            <h4>Patient Information</h4>
            <div class="ir"><span class="l">Patient Name</span><span class="v">${rx.patientName || (patient.firstName ? patient.firstName + ' ' + patient.lastName : 'N/A')}</span></div>
            <div class="ir"><span class="l">Patient ID</span><span class="v">${patient.patientCode || '#' + rx.patientId}</span></div>
            ${patient.gender ? `<div class="ir"><span class="l">Gender / Age</span><span class="v">${patient.gender}${patient.age ? ' / ' + patient.age : ''}</span></div>` : ''}
            ${patient.phoneNumber ? `<div class="ir"><span class="l">Contact</span><span class="v">${patient.phoneNumber}</span></div>` : ''}
            ${rx.patientWeight ? `<div class="ir"><span class="l">Weight / Height</span><span class="v">${rx.patientWeight} kg${rx.patientHeight ? ' / ' + rx.patientHeight + ' cm' : ''}</span></div>` : ''}
          </div>
          <div class="info-blk">
            <h4>Consultation Details</h4>
            <div class="ir"><span class="l">Date of Consultation</span><span class="v">${new Date(rx.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div class="ir"><span class="l">Clinical Diagnosis</span><span class="v">${rx.diagnosis || 'General'}</span></div>
            <div class="ir"><span class="l">Status</span><span class="v" style="text-transform:capitalize">${rx.status || 'Draft'}</span></div>
            ${rx.followUpDate ? `<div class="ir"><span class="l">Next Appointment</span><span class="v" style="color:#b45309;font-weight:700">${new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>` : ''}
          </div>
        </div>
        <table><thead><tr><th>S.No</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Timing</th><th>Instructions</th></tr></thead><tbody>
        ${meds.map((m, i) => `<tr><td>${i + 1}</td><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td style="font-weight:600;color:#b45309">${m.timing || 'After food'}</td><td>${m.instructions || 'As directed'}</td></tr>`).join('')}
        </tbody></table>
        ${rx.clinicalNotes ? `<div class="notes"><strong>Chief Complaint:</strong> ${rx.clinicalNotes}</div>` : ''}
        ${rx.allergyWarnings ? `<div class="allergy"><strong>Allergy Alert:</strong> ${rx.allergyWarnings}</div>` : ''}
        ${rx.followUpDate ? `<div class="followup"><strong>Follow-Up Appointment:</strong> Kindly visit on <strong>${new Date(rx.followUpDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>${rx.followUpNotes ? ' — ' + rx.followUpNotes : ''}</div>` : ''}
        <div class="footer">
          <div class="sig-area">
            <div class="sb"><div class="sl">Patient Acknowledgement</div></div>
            <div class="sb">
              ${settings.signatureImagePath ? `<img src="/api/Files${settings.signatureImagePath.replace('/uploads', '')}" onerror="this.style.display='none'" />` : ''}
              <div class="sl">Prescribing Physician</div>
            </div>
          </div>
          <div style="font-size:8px;color:#a0aec0;line-height:1.6;padding-top:8px;border-top:1px dashed #e2e8f0"><strong style="color:#718096">Disclaimer:</strong> This prescription is issued based on the clinical assessment of the patient. Self-medication is strictly not advised. Please follow the prescribed dosage and consult your physician if symptoms persist.</div>
          <div class="footer-text">${settings.footerText || 'We wish you a speedy recovery. Thank you for your trust in our services.'}</div>
        </div>
        <div class="np" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:12px 48px;background:#1a365d;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase">Print Prescription</button></div>
        </body></html>`);
        w.document.close();
    };


    const filteredMeds = MEDICINE_DB.filter(m => m.toLowerCase().includes(medSearch.toLowerCase()));
    const filteredRx = prescriptions.filter(rx => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (rx.diagnosis || '').toLowerCase().includes(s) || (rx.patientName || '').toLowerCase().includes(s) || String(rx.patientId).includes(s);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Prescriptions</h1>
                    <p className="text-sm text-gray-500 mt-1">Create and manage digital prescriptions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowTemplateManager(!showTemplateManager)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                        <Settings size={16} /> Templates
                    </button>
                    <button onClick={() => { setShowForm(!showForm); if (showForm) { setSelectedPatient(null); } }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all">
                        {showForm ? <X size={16} /> : <Plus size={16} />}
                        {showForm ? 'Close' : 'New Prescription'}
                    </button>
                </div>
            </div>

            {/* Template Manager */}
            <AnimatePresence>
                {showTemplateManager && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Settings size={18} className="text-gray-500" /> Prescription Templates
                                </h3>
                                <button onClick={() => setEditingTemplate({ id: '', name: '', medicines: [{ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }] })}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100">
                                    <Plus size={14} /> New Template
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {templates.map(t => (
                                    <div key={t.id} className="p-4 rounded-xl bg-gray-50 ring-1 ring-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-gray-900 text-sm">{t.name}</h4>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingTemplate({ ...t, medicines: t.medicines.map(m => ({ ...m })) })}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={13} /></button>
                                                <button onClick={() => deleteTemplate(t.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {t.medicines.map((m, i) => (
                                                <p key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Pill size={10} className="text-blue-500" />
                                                    <span className="font-medium text-gray-700">{m.name}</span> {m.dosage} • {m.frequency}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Template Editor Modal */}
            <AnimatePresence>
                {editingTemplate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                            className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">{editingTemplate.id ? 'Edit Template' : 'New Template'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template Name *</label>
                                    <input type="text" value={editingTemplate.name}
                                        onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Common Cold / Flu"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Medicines</label>
                                    {editingTemplate.medicines.map((m, i) => (
                                        <div key={i} className="grid grid-cols-5 gap-2 items-center">
                                            <input className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Name" value={m.name}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], name: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }} />
                                            <input className="px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Dosage" value={m.dosage}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], dosage: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }} />
                                            <select className="px-2 py-2 rounded-lg border border-gray-200 text-xs bg-white" value={m.frequency}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], frequency: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }}>
                                                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                                            </select>
                                            <button onClick={() => { const meds = editingTemplate.medicines.filter((_, j) => j !== i); setEditingTemplate(p => ({ ...p, medicines: meds })); }}
                                                className="p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setEditingTemplate(p => ({ ...p, medicines: [...p.medicines, { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }] }))}
                                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                        <Plus size={12} /> Add Medicine
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingTemplate(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Cancel</button>
                                <button onClick={() => {
                                    if (!editingTemplate.name.trim()) { showToast('Template name required', 'error'); return; }
                                    saveTemplate(editingTemplate);
                                }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold">Save Template</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Prescription Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-gray-100 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Edit3 size={20} className="text-blue-500" /> New Prescription
                            </h3>

                            {/* Step 1: Select Patient */}
                            <div className="bg-blue-50/50 rounded-2xl p-4 ring-1 ring-blue-100">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                    <User size={12} /> Step 1: Select Patient
                                </p>
                                {selectedPatient ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                            {selectedPatient.name[0]}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{selectedPatient.name}</p>
                                            <p className="text-xs text-gray-500">
                                                Patient #{selectedPatient.patientId}
                                                {selectedPatient.data?.gender && ` • ${selectedPatient.data.gender}`}
                                                {selectedPatient.data?.age && ` • Age: ${selectedPatient.data.age}`}
                                                {selectedPatient.data?.phoneNumber && ` • ${selectedPatient.data.phoneNumber}`}
                                            </p>
                                        </div>
                                        <button onClick={() => setSelectedPatient(null)} className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 ring-1 ring-red-200">
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                                        <input type="text" placeholder="Search by patient name, phone, or ID..."
                                            value={patientSearch}
                                            onChange={e => { setPatientSearch(e.target.value); searchPatient(e.target.value); }}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        {searchingPatient && (
                                            <RefreshCw className="absolute right-3 top-3 text-blue-400 animate-spin" size={16} />
                                        )}
                                        {patientResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto z-20">
                                                {patientResults.map(p => (
                                                    <button key={p.patientId} onClick={() => selectPatient(p)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                            {(p.firstName || '?')[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{p.firstName} {p.lastName}</p>
                                                            <p className="text-xs text-gray-500">{p.patientCode || `#${p.patientId}`} • {p.gender} • {p.phoneNumber}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Diagnosis & Templates */}

                            <div>

                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">

                                    <FileText size={12} /> Step 2: Select Conditions (combine multiple)

                                </p>

                                <div className="flex flex-wrap gap-2 mb-3">

                                    {templates.map(t => (

                                        <button key={t.id} onClick={() => applyTemplate(t)}

                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${appliedTemplates.includes(t.id)

                                                ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md'

                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>

                                            {appliedTemplates.includes(t.id) && <Check size={12} />}

                                            {t.name}

                                        </button>

                                    ))}

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                                    <div>

                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Diagnosis</label>

                                        <input type="text" value={form.diagnosis}

                                            onChange={e => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}

                                            placeholder="Auto-filled from templates above"

                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                                    </div>

                                    <div>

                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">

                                            <AlertTriangle size={11} className="text-amber-500" /> Allergy Warnings

                                        </label>

                                        <input type="text" value={form.allergyWarnings}

                                            onChange={e => setForm(prev => ({ ...prev, allergyWarnings: e.target.value }))}

                                            placeholder="Known allergies or drug interactions"

                                            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />

                                    </div>

                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                    <div>

                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weight (kg)</label>

                                        <input type="number" step="0.1" value={form.patientWeight}

                                            onChange={e => setForm(prev => ({ ...prev, patientWeight: e.target.value }))}

                                            placeholder="e.g. 72"

                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                                    </div>

                                    <div>

                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Height (cm)</label>

                                        <input type="number" step="0.1" value={form.patientHeight}

                                            onChange={e => setForm(prev => ({ ...prev, patientHeight: e.target.value }))}

                                            placeholder="e.g. 170"

                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                                    </div>

                                    <div className="md:col-span-2">

                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Chief Complaint (Patient's words)</label>

                                        <input type="text" value={form.clinicalNotes}

                                            onChange={e => setForm(prev => ({ ...prev, clinicalNotes: e.target.value }))}

                                            placeholder="e.g. Headache since 3 days, mild fever, body ache..."

                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                                    </div>

                                </div>

                            </div>

                            {/* Step 3: Add Medicines */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Pill size={12} /> Step 3: Medicines ({form.medicines.length})
                                </p>

                                {/* Medicine list */}
                                {form.medicines.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {form.medicines.map((med, i) => (

                                            <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">

                                                <div className="w-7 h-7 rounded-lg bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</div>

                                                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-6 gap-2">

                                                    <input className="col-span-2 md:col-span-1 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold bg-white" value={med.name}

                                                        onChange={e => updateMedicine(i, 'name', e.target.value)} placeholder="Name" />

                                                    <input className="px-3 py-1.5 rounded-lg border border-blue-200 text-xs bg-white" value={med.dosage}

                                                        onChange={e => updateMedicine(i, 'dosage', e.target.value)} placeholder="Dosage" />

                                                    <select className="px-2 py-1.5 rounded-lg border border-blue-200 text-xs bg-white" value={med.frequency}

                                                        onChange={e => updateMedicine(i, 'frequency', e.target.value)}>

                                                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}

                                                    </select>

                                                    <select className="px-2 py-1.5 rounded-lg border border-blue-200 text-xs bg-white" value={med.duration}

                                                        onChange={e => updateMedicine(i, 'duration', e.target.value)}>

                                                        {DURATIONS.map(d => <option key={d}>{d}</option>)}

                                                    </select>

                                                    <select className="px-2 py-1.5 rounded-lg border border-blue-200 text-xs bg-white font-semibold" value={med.timing || 'After food'}

                                                        onChange={e => updateMedicine(i, 'timing', e.target.value)}>

                                                        <option>Before food</option><option>After food</option><option>With food</option><option>Empty stomach</option><option>At bedtime</option><option>As needed</option>

                                                    </select>

                                                    <input className="col-span-2 md:col-span-6 px-3 py-1.5 rounded-lg border border-blue-200 text-xs bg-white" value={med.instructions || ''}

                                                        onChange={e => updateMedicine(i, 'instructions', e.target.value)} placeholder="Special instructions (optional)" />

                                                </div>

                                                <button onClick={() => removeMedicine(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">

                                                    <Trash2 size={14} />

                                                </button>

                                            </div>

                                        ))}
                                    </div>
                                )}

                                {/* Add new medicine */}
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                        <div className="relative md:col-span-2">
                                            <input type="text" value={currentMed.name || medSearch}
                                                onChange={e => { setMedSearch(e.target.value); setCurrentMed(prev => ({ ...prev, name: e.target.value })); setShowMedSuggestions(true); }}
                                                onFocus={() => setShowMedSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowMedSuggestions(false), 200)}
                                                placeholder="Medicine name..."
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                            {showMedSuggestions && medSearch && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-40 overflow-y-auto z-20">
                                                    {filteredMeds.slice(0, 8).map(m => (
                                                        <button key={m} onMouseDown={() => { setCurrentMed(prev => ({ ...prev, name: m })); setMedSearch(m); setShowMedSuggestions(false); }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700">
                                                            <Pill size={12} className="inline mr-2 text-blue-400" />{m}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input type="text" value={currentMed.dosage} placeholder="Dosage (e.g. 500mg)"
                                            onChange={e => setCurrentMed(prev => ({ ...prev, dosage: e.target.value }))}
                                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <select value={currentMed.frequency} onChange={e => setCurrentMed(prev => ({ ...prev, frequency: e.target.value }))}
                                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        <select value={currentMed.duration} onChange={e => setCurrentMed(prev => ({ ...prev, duration: e.target.value }))}
                                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-3">

                                        <input type="text" value={currentMed.instructions} placeholder="Special instructions..."

                                            onChange={e => setCurrentMed(prev => ({ ...prev, instructions: e.target.value }))}

                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                                        <select value={currentMed.timing} onChange={e => setCurrentMed(prev => ({ ...prev, timing: e.target.value }))}

                                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold">

                                            <option>Before food</option><option>After food</option><option>With food</option><option>Empty stomach</option><option>At bedtime</option><option>As needed</option>

                                        </select>

                                        <button onClick={addMedicine}

                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-1">

                                            <Plus size={14} /> Add

                                        </button>

                                    </div>
                                </div>
                            </div>



                            {/* Follow-Up Appointment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Next Appointment Date</label>
                                    <input type="date" value={form.followUpDate}
                                        onChange={e => setForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Follow-Up Notes</label>
                                    <input type="text" value={form.followUpNotes}
                                        onChange={e => setForm(prev => ({ ...prev, followUpNotes: e.target.value }))}
                                        placeholder="e.g. Review blood reports, check wound healing..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2 flex-wrap">
                                <button onClick={() => savePrescription(false)} disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                                    Save Prescription
                                </button>
                                <button onClick={() => savePrescription(true)} disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50">
                                    <Send size={16} /> Save & Send to Pharmacy
                                </button>
                                <button onClick={saveCurrentAsTemplate}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors">
                                    <Copy size={16} /> Save as Template
                                </button>
                                <button onClick={() => { setShowForm(false); setSelectedPatient(null); }}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Prescriptions */}
            {!showForm && (
                <div className="relative">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Search prescriptions by diagnosis, patient name, or ID..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            )}

            {/* Prescriptions List */}
            {!showForm && (
                loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredRx.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-40" />
                        <p className="font-semibold text-gray-500">No prescriptions found</p>
                        <p className="text-sm mt-1">Create your first prescription to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredRx.map((rx, i) => {
                            let meds = [];
                            try { meds = rx.medicines ? JSON.parse(rx.medicines) : []; } catch (e) { }
                            return (
                                <motion.div key={rx.prescriptionId}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{rx.diagnosis || 'General Prescription'}</h4>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${rx.status === 'sent_to_pharmacy' ? 'bg-green-100 text-green-700' :
                                                    rx.status === 'finalized' ? 'bg-blue-100 text-blue-700' :
                                                        rx.status === 'dispensed' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-gray-100 text-gray-600'}`}>
                                                    {rx.status?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Patient: <strong>{rx.patientName || `#${rx.patientId}`}</strong> • {new Date(rx.createdOn).toLocaleDateString()} • {meds.length} medicine{meds.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {rx.status !== 'sent_to_pharmacy' && rx.status !== 'dispensed' && (
                                                <button onClick={() => sendToPharmacy(rx.prescriptionId)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                                                    <Send size={12} /> Pharmacy
                                                </button>
                                            )}
                                            <button onClick={() => downloadPDF(rx)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                                <Download size={12} /> Download
                                            </button>
                                        </div>
                                    </div>
                                    {meds.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {meds.map((m, j) => (
                                                    <div key={j} className="flex items-center gap-2 text-sm">
                                                        <Pill size={14} className="text-blue-500 flex-shrink-0" />
                                                        <span className="font-medium text-gray-800">{m.name}</span>
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-gray-500">{m.dosage} • {m.frequency} • {m.duration}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {rx.allergyWarnings && (
                                        <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                                            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-amber-700">{rx.allergyWarnings}</p>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )
            )}

            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default PrescriptionManagement;
