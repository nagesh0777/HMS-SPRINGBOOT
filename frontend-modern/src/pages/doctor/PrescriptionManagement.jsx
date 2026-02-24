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
        clinicalNotes: '',
        allergyWarnings: '',
        medicines: [],
    });

    const [currentMed, setCurrentMed] = useState({
        name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: ''
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
        setCurrentMed({ name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' });
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
        setForm(prev => ({
            ...prev,
            diagnosis: template.name,
            medicines: [...template.medicines.map(m => ({ ...m }))],
        }));
        showToast(`Template "${template.name}" applied`, 'info');
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
            };
            const res = await axios.post('/api/DoctorPortal/Prescriptions', payload);
            if (res.data.Status === 'OK') {
                setShowForm(false);
                setForm({ diagnosis: '', clinicalNotes: '', allergyWarnings: '', medicines: [] });
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

    const downloadPDF = (rx) => {
        let meds = [];
        try { meds = rx.medicines ? JSON.parse(rx.medicines) : []; } catch (e) { }
        let content = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               PRESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${new Date(rx.createdOn).toLocaleDateString()}
Patient: ${rx.patientName || `#${rx.patientId}`}
Diagnosis: ${rx.diagnosis || 'N/A'}

MEDICINES:
${meds.map((m, i) => `
 ${i + 1}. ${m.name.toUpperCase()} - ${m.dosage}
    Frequency: ${m.frequency}
    Duration: ${m.duration}
    Instructions: ${m.instructions || 'As directed'}`).join('\n')}

Clinical Notes: ${rx.clinicalNotes || 'None'}
Allergy Warnings: ${rx.allergyWarnings || 'None'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription_${rx.prescriptionId}_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
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

                            {/* Step 2: Quick Templates */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <FileText size={12} /> Step 2: Diagnosis & Template (Optional)
                                </p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {templates.map(t => (
                                        <button key={t.id} onClick={() => applyTemplate(t)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.diagnosis === t.name
                                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Diagnosis</label>
                                        <input type="text" value={form.diagnosis}
                                            onChange={e => setForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                                            placeholder="Primary diagnosis"
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
                                                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-2">
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
                                                    <input className="col-span-2 md:col-span-5 px-3 py-1.5 rounded-lg border border-blue-200 text-xs bg-white" value={med.instructions || ''}
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
                                        <button onClick={addMedicine}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-1">
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clinical Notes</label>
                                <textarea value={form.clinicalNotes}
                                    onChange={e => setForm(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                                    placeholder="Additional clinical notes, follow-up instructions..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
