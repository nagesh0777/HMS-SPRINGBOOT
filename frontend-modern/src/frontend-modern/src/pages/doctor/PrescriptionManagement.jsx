import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pill, Search, Send, Download, Edit3, X, Check,
    AlertTriangle, FileText, Trash2, Save, RefreshCw,
    CheckCircle, User, Settings, Copy, ChevronDown, Activity, Printer
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
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold ${type === 'success' ? 'bg-green-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
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
    const [sendingPdfId, setSendingPdfId] = useState(null);
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    // Patient search within prescription
    const [patientSearch, setPatientSearch] = useState('');
    const [patientResults, setPatientResults] = useState([]);
    const [searchingPatient, setSearchingPatient] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(
        prePatientId ? { patientId: parseInt(prePatientId), name: prePatientName || `Patient #${prePatientId}` } : null
    );

    // Templates — loaded from DB, saved to DB
    const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
    const [templatesLoaded, setTemplatesLoaded] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    // Form state
    const [form, setForm] = useState({
        diagnosis: '',
        clinicalNotes: '', // Chief complaint
        allergyWarnings: '',
        recommendedTests: '',
        advice: '',
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
        if (prePatientId) {
            fetchPatientDetails(prePatientId);
        }
    }, [prePatientId]);

    const fetchPatientDetails = async (patientId) => {
        try {
            const res = await axios.get(`/api/DoctorPortal/Patient/${patientId}`);
            if (res.data.Results?.patient) {
                const p = res.data.Results.patient;
                setSelectedPatient({ patientId: p.patientId, name: `${p.firstName} ${p.lastName}`, data: p });
                setForm(prev => ({
                    ...prev,
                    patientWeight: p.weight || '',
                    patientHeight: p.height || ''
                }));
            }
        } catch (e) {
            console.error("Failed to fetch preloaded patient details", e);
        }
    };

    const calculateBMI = (weight, height) => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        if (!w || !h || h <= 0) return null;
        const bmi = w / ((h / 100) * (h / 100));
        return bmi.toFixed(1);
    };

    const getBMICategory = (bmiVal) => {
        const bmi = parseFloat(bmiVal);
        if (!bmi) return { label: 'N/A', color: 'text-gray-400 bg-gray-50' };
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600 bg-amber-50 ring-amber-200' };
        if (bmi < 25) return { label: 'Normal', color: 'text-green-600 bg-green-50 ring-green-200' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600 bg-orange-50 ring-orange-200' };
        return { label: 'Obese', color: 'text-red-600 bg-red-50 ring-red-200' };
    };

    // Load templates from DB on mount
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const res = await axios.get('/api/DoctorPortal/Templates');
                if (res.data.Results && res.data.Results !== '[]') {
                    const parsed = JSON.parse(res.data.Results);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setTemplates(parsed);
                    }
                }
            } catch (e) {
                console.warn('Could not load templates from DB, using defaults:', e);
            } finally {
                setTemplatesLoaded(true);
            }
        };
        loadTemplates();
    }, []);

    // Auto-save templates to DB whenever they change (but only after initial load)
    useEffect(() => {
        if (!templatesLoaded) return;
        const saveTemplates = async () => {
            try {
                await axios.put('/api/DoctorPortal/Templates', { templates: JSON.stringify(templates) });
            } catch (e) {
                console.warn('Failed to save templates to DB:', e);
            }
        };
        saveTemplates();
    }, [templates, templatesLoaded]);

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
        setForm(prev => ({
            ...prev,
            patientWeight: p.weight || '',
            patientHeight: p.height || ''
        }));
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
                recommendedTests: form.recommendedTests,
                advice: form.advice,
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
                setForm({ diagnosis: '', clinicalNotes: '', allergyWarnings: '', recommendedTests: '', advice: '', medicines: [], followUpDate: '', followUpNotes: '', patientWeight: '', patientHeight: '' });
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

    const loadHtml2Pdf = () => {
        return new Promise((resolve, reject) => {
            if (window.html2pdf) {
                resolve(window.html2pdf);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => resolve(window.html2pdf);
            script.onerror = () => reject(new Error('Failed to load html2pdf library'));
            document.head.appendChild(script);
        });
    };

    const fetchPrescriptionPrintData = async (rx) => {
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

        // Fetch consulting doctor details
        let doctor = {};
        try {
            if (rx.doctorId) {
                const dRes = await axios.get(`/api/Doctor/${rx.doctorId}`);
                if (dRes.data.Results) doctor = dRes.data.Results;
            }
        } catch (e) {
            console.error("Failed to fetch doctor details:", e);
        }

        // Fallback for Weight and Height
        const weightVal = (rx.patientWeight !== null && rx.patientWeight !== undefined && rx.patientWeight !== '') ? rx.patientWeight : (patient.weight || '');
        const heightVal = (rx.patientHeight !== null && rx.patientHeight !== undefined && rx.patientHeight !== '') ? rx.patientHeight : (patient.height || '');

        let bmi = null;
        let bmiCategory = '';
        let bmiBadgeColor = '';
        const wValNum = parseFloat(weightVal);
        const hValNum = parseFloat(heightVal);
        if (wValNum && hValNum && hValNum > 0) {
            const hM = hValNum / 100;
            bmi = (wValNum / (hM * hM)).toFixed(1);
            if (bmi < 18.5) { bmiCategory = 'Underweight'; bmiBadgeColor = '#3b82f6'; }
            else if (bmi < 25) { bmiCategory = 'Normal'; bmiBadgeColor = '#10b981'; }
            else if (bmi < 30) { bmiCategory = 'Overweight'; bmiBadgeColor = '#f59e0b'; }
            else { bmiCategory = 'Obese'; bmiBadgeColor = '#ef4444'; }
        }

        const logoUrl = settings.logoPath ? window.location.origin + '/api/Files' + settings.logoPath.replace('/uploads', '') : '';
        const sigUrl = settings.signatureImagePath ? window.location.origin + '/api/Files' + settings.signatureImagePath.replace('/uploads', '') : '';
        const qrUrl = doctor.consultationQrPath ? window.location.origin + doctor.consultationQrPath : '';

        return {
            settings, patient, doctor, meds,
            logoUrl, sigUrl, qrUrl,
            weightVal, heightVal, bmi, bmiCategory, bmiBadgeColor
        };
    };

    const getPrescriptionHtml = (rx, settings, patient, doctor, meds, logoUrl, sigUrl, qrUrl, weightVal, heightVal, bmi, bmiCategory, bmiBadgeColor) => {
        return `<!DOCTYPE html><html><head><title>Prescription - ${rx.patientName || ''}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 12mm 14mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            color: #1e293b;
            background: #fff;
            font-size: 10.5px;
            line-height: 1.55;
          }

          /* ── Top accent bar ── */
          .accent-bar {
            height: 5px;
            background: linear-gradient(90deg, #0e7490 0%, #0f766e 50%, #0284c7 100%);
          }

          /* ── Header / Letterhead ── */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px 20px 14px;
            border-bottom: 2px solid #0f766e;
            background: linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%);
          }
          .logo-block {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .logo {
            width: 68px;
            height: 68px;
            object-fit: contain;
            border-radius: 10px;
            border: 2px solid #e0f2fe;
          }
          .hospital-name {
            font-size: 22px;
            font-weight: 900;
            color: #0f766e;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .hospital-tagline {
            font-size: 9.5px;
            font-weight: 600;
            color: #0e7490;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .hospital-meta {
            font-size: 9.5px;
            color: #475569;
            margin-top: 5px;
            line-height: 1.6;
          }
          .hospital-meta span { margin-right: 10px; }
          .header-right { text-align: right; }
          .rx-symbol {
            font-size: 44px;
            font-weight: 900;
            color: #0f766e;
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1;
            opacity: 0.85;
          }
          .rx-label {
            font-size: 8.5px;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .rx-date {
            font-size: 9.5px;
            color: #334155;
            margin-top: 8px;
            font-weight: 600;
          }

          /* ── Title bar ── */
          .title-bar {
            background: #0f766e;
            color: #fff;
            text-align: center;
            padding: 6px 20px;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
          }

          /* ── Doctor Info Panel ── */
          .doctor-panel {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0f766e;
            border-radius: 0 6px 6px 0;
            padding: 10px 16px;
            margin: 14px 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .doctor-name {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .doctor-creds {
            font-size: 9.5px;
            color: #0e7490;
            font-weight: 600;
            margin-top: 1px;
          }
          .doctor-dept {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
          }
          .doctor-reg {
            font-size: 9px;
            color: #475569;
            font-weight: 700;
            background: #e0f2fe;
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid #bae6fd;
          }

          /* ── 3-column Info Grid ── */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin: 14px 20px 0;
          }
          .info-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .info-card-header {
            background: #0f766e;
            color: #fff;
            font-size: 8.5px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 5px 12px;
          }
          .info-card-body {
            padding: 10px 12px;
            background: #fff;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
            gap: 6px;
          }
          .info-row:last-child { margin-bottom: 0; }
          .info-label {
            color: #64748b;
            font-size: 9.5px;
            font-weight: 500;
            flex-shrink: 0;
          }
          .info-value {
            font-weight: 700;
            color: #0f172a;
            font-size: 10px;
            text-align: right;
          }
          .blood-badge {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
            font-weight: 800;
            font-size: 10px;
            padding: 1px 8px;
            border-radius: 20px;
          }
          .bmi-badge {
            padding: 1px 8px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 9.5px;
            color: #fff;
          }

          /* ── Divider ── */
          .section-divider {
            border: none;
            border-top: 1.5px solid #e2e8f0;
            margin: 14px 20px;
          }

          /* ── Medication Table ── */
          .med-section { margin: 0 20px; }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .section-title::before {
            content: '';
            display: inline-block;
            width: 3px;
            height: 14px;
            background: #0f766e;
            border-radius: 2px;
          }
          .med-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .med-table thead tr { background: #0f766e; }
          .med-table th {
            color: #fff;
            font-weight: 700;
            font-size: 8.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
          }
          .med-table td {
            padding: 9px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10px;
            vertical-align: middle;
          }
          .med-table tbody tr:last-child td { border-bottom: none; }
          .med-table tbody tr:nth-child(even) { background: #f8fafc; }
          .med-table tbody tr:nth-child(odd) { background: #fff; }
          .med-name { font-weight: 700; color: #0f172a; font-size: 10.5px; }
          .timing-badge {
            display: inline-block;
            background: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
            font-size: 8px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 20px;
            text-transform: uppercase;
          }

          /* ── Notes Boxes ── */
          .notes-section { margin: 14px 20px 0; }
          .notes-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .notes-box {
            border-radius: 8px;
            padding: 10px 13px;
            border: 1px solid #e2e8f0;
          }
          .notes-box.complaints {
            background: #f0fdfa;
            border-left: 4px solid #0f766e;
            border-color: #99f6e4;
          }
          .notes-box.advice {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            border-color: #bfdbfe;
          }
          .notes-box.tests {
            background: #faf5ff;
            border-left: 4px solid #8b5cf6;
            border-color: #ddd6fe;
          }
          .notes-box.allergy {
            background: #fff1f2;
            border-left: 4px solid #f43f5e;
            border-color: #fecdd3;
          }
          .notes-box.followup {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            border-color: #fde68a;
          }
          .notes-box-title {
            font-size: 8.5px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .notes-box.complaints .notes-box-title { color: #0f766e; }
          .notes-box.advice .notes-box-title { color: #2563eb; }
          .notes-box.tests .notes-box-title { color: #7c3aed; }
          .notes-box.allergy .notes-box-title { color: #e11d48; }
          .notes-box.followup .notes-box-title { color: #b45309; }
          .notes-box-content {
            font-size: 10px;
            color: #334155;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          /* ── Footer / Signature ── */
          .footer-section {
            margin: 20px 20px 0;
            border-top: 1.5px solid #e2e8f0;
            padding-top: 14px;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 14px;
          }
          .sig-block { text-align: center; min-width: 140px; }
          .sig-img {
            max-width: 130px;
            max-height: 55px;
            display: block;
            margin: 0 auto 6px;
          }
          .sig-line {
            border-top: 1.5px solid #475569;
            padding-top: 5px;
            font-size: 10px;
            font-weight: 700;
            color: #1e293b;
          }
          .sig-sub {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 2px;
          }
          .qr-block { text-align: center; }
          .qr-block img {
            max-width: 80px;
            max-height: 80px;
            border: 1px solid #e2e8f0;
            padding: 3px;
            border-radius: 6px;
            display: block;
            margin: 0 auto 4px;
          }
          .qr-label {
            font-size: 8.5px;
            color: #475569;
            font-weight: 700;
          }
          .disclaimer {
            font-size: 7.5px;
            color: #94a3b8;
            border-top: 1px dashed #cbd5e1;
            padding-top: 7px;
            margin-top: 6px;
            line-height: 1.5;
          }
          .disclaimer strong { color: #64748b; }
          .footer-bar {
            background: linear-gradient(90deg, #f0fdfa, #f0f9ff);
            border-top: 1px solid #e2e8f0;
            text-align: center;
            padding: 8px 20px;
            font-size: 9px;
            color: #64748b;
            font-style: italic;
            margin-top: 10px;
          }
          .bottom-accent {
            height: 4px;
            background: linear-gradient(90deg, #0e7490 0%, #0f766e 50%, #0284c7 100%);
          }
        </style>
        </head><body>
        <div class="accent-bar"></div>

        <!-- HEADER -->
        <div class="header">
          <div class="logo-block">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" onerror="this.style.display='none'" />` : ''}
            <div>
              <div class="hospital-name">${settings.hospitalName || 'Hospital'}</div>
              ${settings.tagline ? `<div class="hospital-tagline">${settings.tagline}</div>` : ''}
              <div class="hospital-meta">
                ${settings.address ? `<span>&#128205; ${settings.address}</span>` : ''}
                ${settings.phoneNumber ? `<span>&#128222; ${settings.phoneNumber}</span>` : ''}
                ${settings.website ? `<span>&#127758; ${settings.website}</span>` : ''}
                ${settings.emergencyContact ? `<br/><span style="color:#dc2626;font-weight:700">&#128680; Emergency: ${settings.emergencyContact}</span>` : ''}
              </div>
              ${settings.registrationNumber ? `<div style="font-size:8.5px;color:#94a3b8;margin-top:4px;font-weight:600">Reg. Lic. No: ${settings.registrationNumber}</div>` : ''}
            </div>
          </div>
          <div class="header-right">
            <div class="rx-symbol">&#8478;</div>
            <div class="rx-label">Prescription</div>
            <div class="rx-date">Date: ${new Date(rx.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            ${rx.prescriptionCode ? `<div style="font-size:8.5px;color:#94a3b8;margin-top:2px;font-weight:700">Rx No: ${rx.prescriptionCode}</div>` : ''}
          </div>
        </div>
        <div class="title-bar">Medical Consultation Prescription</div>

        <!-- DOCTOR PANEL -->
        <div class="doctor-panel">
          <div>
            <div class="doctor-name">Dr. ${doctor.fullName || 'Consulting Doctor'}</div>
            ${doctor.qualifications ? `<div class="doctor-creds">${doctor.qualifications}</div>` : ''}
            <div class="doctor-dept">${[doctor.specialization, doctor.department].filter(Boolean).join(' | ') || 'General Medicine'}</div>
          </div>
          ${doctor.registrationNumber ? `<div class="doctor-reg">Reg. No: ${doctor.registrationNumber}</div>` : ''}
        </div>

        <!-- 3-COLUMN INFO GRID -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-card-header">Patient Details</div>
            <div class="info-card-body">
              <div class="info-row">
                <span class="info-label">Name</span>
                <span class="info-value">${rx.patientName || (patient.firstName ? patient.firstName + ' ' + (patient.lastName || '') : 'N/A')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Patient ID</span>
                <span class="info-value">${patient.patientCode || '#' + rx.patientId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Age / Gender</span>
                <span class="info-value">${patient.age ? patient.age + ' Yrs' : '-'}${patient.gender ? ' / ' + patient.gender : ''}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact</span>
                <span class="info-value">${patient.phoneNumber || '-'}</span>
              </div>
              ${patient.bloodGroup ? `<div class="info-row"><span class="info-label">Blood Group</span><span class="blood-badge">${patient.bloodGroup}</span></div>` : ''}
              ${patient.address ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value" style="font-size:9px">${patient.address}</span></div>` : ''}
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-header">Clinical Vitals</div>
            <div class="info-card-body">
              <div class="info-row"><span class="info-label">Weight</span><span class="info-value">${weightVal ? weightVal + ' kg' : '-'}</span></div>
              <div class="info-row"><span class="info-label">Height</span><span class="info-value">${heightVal ? heightVal + ' cm' : '-'}</span></div>
              <div class="info-row"><span class="info-label">BMI</span><span>${bmi ? `<span class="bmi-badge" style="background:${bmiBadgeColor}">${bmi} - ${bmiCategory}</span>` : '-'}</span></div>
              ${rx.bloodPressure ? `<div class="info-row"><span class="info-label">BP</span><span class="info-value">${rx.bloodPressure} mmHg</span></div>` : ''}
              ${rx.pulseRate ? `<div class="info-row"><span class="info-label">Pulse</span><span class="info-value">${rx.pulseRate} bpm</span></div>` : ''}
              ${rx.temperature ? `<div class="info-row"><span class="info-label">Temp</span><span class="info-value">${rx.temperature}&deg;F</span></div>` : ''}
              ${rx.oxygenSaturation ? `<div class="info-row"><span class="info-label">SpO2</span><span class="info-value">${rx.oxygenSaturation}%</span></div>` : ''}
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-header">Visit Information</div>
            <div class="info-card-body">
              <div class="info-row">
                <span class="info-label">Visit Date</span>
                <span class="info-value">${new Date(rx.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Visit Type</span>
                <span class="info-value">${rx.visitType || 'OPD Consultation'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Diagnosis</span>
                <span class="info-value" style="color:#0f766e">${rx.diagnosis || 'General Consultation'}</span>
              </div>
              ${rx.followUpDate ? `<div class="info-row"><span class="info-label">Follow-Up</span><span class="info-value">${new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>` : ''}
            </div>
          </div>
        </div>

        <hr class="section-divider"/>

        <!-- MEDICATIONS -->
        <div class="med-section">
          <div class="section-title">Prescribed Medications</div>
          <table class="med-table">
            <thead>
              <tr>
                <th style="width:4%">#</th>
                <th style="width:28%">Medication Name</th>
                <th style="width:11%">Dosage</th>
                <th style="width:17%">Frequency</th>
                <th style="width:11%">Duration</th>
                <th style="width:13%">Timing</th>
                <th style="width:16%">Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${meds.length > 0 ? meds.map((m, i) => `<tr><td style="color:#64748b;font-weight:700">${i + 1}</td><td><span class="med-name">${m.name || '-'}</span></td><td style="font-weight:600">${m.dosage || '-'}</td><td>${m.frequency || '-'}</td><td style="font-weight:600">${m.duration || '-'}</td><td><span class="timing-badge">${m.timing || 'After Food'}</span></td><td style="color:#475569;font-size:9.5px">${m.instructions || 'As directed'}</td></tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:16px;font-style:italic">No medications prescribed</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- NOTES -->
        <div class="notes-section">
          ${(rx.clinicalNotes || rx.advice || rx.recommendedTests || rx.allergyWarnings) ? `<div class="notes-grid">
            ${rx.clinicalNotes ? `<div class="notes-box complaints"><div class="notes-box-title">Chief Complaints &amp; Findings</div><div class="notes-box-content">${rx.clinicalNotes}</div></div>` : ''}
            ${rx.advice ? `<div class="notes-box advice"><div class="notes-box-title">Doctor's Advice &amp; Instructions</div><div class="notes-box-content">${rx.advice}</div></div>` : ''}
            ${rx.recommendedTests ? `<div class="notes-box tests"><div class="notes-box-title">Recommended Investigations &amp; Tests</div><div class="notes-box-content">${rx.recommendedTests}</div></div>` : ''}
            ${rx.allergyWarnings ? `<div class="notes-box allergy"><div class="notes-box-title">Allergy &amp; Contraindication Alert</div><div class="notes-box-content">${rx.allergyWarnings}</div></div>` : ''}
          </div>` : ''}
          ${rx.followUpDate ? `<div class="notes-box followup"><div class="notes-box-title">Follow-Up Appointment</div><div class="notes-box-content">Please visit on <strong>${new Date(rx.followUpDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>${rx.followUpNotes ? ' - ' + rx.followUpNotes : ''}</div></div>` : ''}
        </div>

        <!-- SIGNATURE FOOTER -->
        <div class="footer-section">
          <div class="sig-row">
            <div class="sig-block">
              <div style="height:40px;"></div>
              <div class="sig-line">Patient / Attendant Signature</div>
              <div class="sig-sub">Name &amp; Date</div>
            </div>
            ${qrUrl ? `<div class="qr-block"><img src="${qrUrl}" onerror="this.style.display='none'" /><div class="qr-label">Consultation QR</div></div>` : ''}
            <div class="sig-block">
              ${sigUrl ? `<img src="${sigUrl}" class="sig-img" onerror="this.style.display='none'" />` : '<div style="height:40px;"></div>'}
              <div class="sig-line">Dr. ${doctor.fullName || 'Authorized Clinician'}</div>
              <div class="sig-sub">${[doctor.qualifications, doctor.specialization].filter(Boolean).join(' | ') || 'Authorized Signature'}</div>
              ${doctor.registrationNumber ? `<div class="sig-sub">Reg. No: ${doctor.registrationNumber}</div>` : ''}
            </div>
          </div>
          <div class="disclaimer"><strong>Disclaimer:</strong> This prescription is computer-generated and valid only when authenticated by the treating physician. This document is confidential and intended solely for the named patient. Self-medication is strongly discouraged. Please adhere strictly to the prescribed dosage, frequency, and duration. Report any adverse reactions immediately.</div>
        </div>
        <div class="footer-bar">${settings.footerText || 'We care for your health. Thank you for choosing ' + (settings.hospitalName || 'our hospital') + '.'}</div>
        <div class="bottom-accent"></div>
        </body></html>`;
    };

    const handlePrintPrescription = async (rx) => {
        showToast("Preparing print layout...", "info");
        try {
            const data = await fetchPrescriptionPrintData(rx);
            if (!data) return;

            const html = getPrescriptionHtml(
                rx, data.settings, data.patient, data.doctor, data.meds,
                data.logoUrl, data.sigUrl, data.qrUrl,
                data.weightVal, data.heightVal, data.bmi, data.bmiCategory, data.bmiBadgeColor
            );

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.write(html);
            doc.close();

            iframe.contentWindow.focus();
            setTimeout(() => {
                try {
                    iframe.contentWindow.print();
                } catch (printErr) {
                    console.error("Iframe print triggered error:", printErr);
                }
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500);

        } catch (e) {
            console.error("Print failed:", e);
            showToast("Failed to initiate print process.", "error");
        }
    };

    const handleDownloadPdf = async (rx) => {
        showToast("Generating PDF download. Please wait...", "info");
        try {
            const data = await fetchPrescriptionPrintData(rx);
            if (!data) return;

            const html = getPrescriptionHtml(
                rx, data.settings, data.patient, data.doctor, data.meds,
                data.logoUrl, data.sigUrl, data.qrUrl,
                data.weightVal, data.heightVal, data.bmi, data.bmiCategory, data.bmiBadgeColor
            );

            const html2pdf = await loadHtml2Pdf();
            
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.left = '0';
            iframe.style.top = '0';
            iframe.style.width = '800px'; 
            iframe.style.height = '1130px';
            iframe.style.border = '0';
            iframe.style.zIndex = '-9999';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.write(html);
            doc.close();

            // Wait 500ms for signatures and images to load
            await new Promise(resolve => setTimeout(resolve, 500));

            const opt = {
                margin:       10,
                filename:     `Prescription_${rx.patientName || 'Patient'}_${rx.prescriptionId}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().from(iframe.contentWindow.document.body).set(opt).save();
            document.body.removeChild(iframe);
            showToast("PDF Downloaded successfully!", "success");
        } catch (e) {
            console.error("Failed to generate PDF download:", e);
            showToast("Failed to generate PDF download.", "error");
        }
    };

    const handleSendPdf = async (rx) => {
        setSendingPdfId(rx.prescriptionId);
        try {
            const res = await axios.post(`/api/DoctorPortal/Prescriptions/${rx.prescriptionId}/SendPdf`);
            if (res.data?.Status === 'OK') {
                const phone = res.data?.Results?.patientPhone || 'Registered Mobile';
                showToast(`[WhatsApp & SMS Automated Dispatcher] Prescription PDF link successfully delivered to patient's registered mobile number: ${phone}!`, 'success');
            } else {
                showToast(res.data?.ErrorMessage || "Failed to dispatch PDF link.", 'error');
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to send prescription PDF to patient mobile number.", 'error');
        } finally {
            setSendingPdfId(null);
        }
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
                <div className="flex items-center gap-2 flex-wrap">
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
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                            <input className="col-span-12 sm:col-span-5 px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Name" value={m.name}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], name: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }} />
                                            <input className="col-span-6 sm:col-span-3 px-3 py-2 rounded-lg border border-gray-200 text-xs" placeholder="Dosage" value={m.dosage}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], dosage: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }} />
                                            <select className="col-span-4 sm:col-span-3 px-2 py-2 rounded-lg border border-gray-200 text-xs bg-white" value={m.frequency}
                                                onChange={e => { const meds = [...editingTemplate.medicines]; meds[i] = { ...meds[i], frequency: e.target.value }; setEditingTemplate(p => ({ ...p, medicines: meds })); }}>
                                                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                                            </select>
                                            <button onClick={() => { const meds = editingTemplate.medicines.filter((_, j) => j !== i); setEditingTemplate(p => ({ ...p, medicines: meds })); }}
                                                className="col-span-2 sm:col-span-1 p-2 text-red-400 hover:text-red-600 flex justify-center"><Trash2 size={14} /></button>
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
                                     <div className="space-y-4 w-full">
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
                                             <button type="button" onClick={() => setSelectedPatient(null)} className="px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 ring-1 ring-red-200">
                                                 Change
                                             </button>
                                         </div>

                                         {/* Premium Vitals & Dynamic BMI Card */}
                                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-blue-100">
                                             <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl ring-1 ring-blue-100/50">
                                                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Registered Height</p>
                                                 <p className="text-sm font-extrabold text-gray-900">{selectedPatient.data?.height ? `${selectedPatient.data.height} cm` : 'Not recorded'}</p>
                                             </div>
                                             <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl ring-1 ring-blue-100/50">
                                                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Registered Weight</p>
                                                 <p className="text-sm font-extrabold text-gray-900">{selectedPatient.data?.weight ? `${selectedPatient.data.weight} kg` : 'Not recorded'}</p>
                                             </div>
                                             <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl ring-1 ring-blue-100/50">
                                                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Blood Group</p>
                                                 <p className="text-sm font-extrabold text-gray-900 flex items-center gap-1">
                                                     {selectedPatient.data?.bloodGroup ? (
                                                         <>
                                                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                                             {selectedPatient.data.bloodGroup}
                                                         </>
                                                     ) : 'Not recorded'}
                                                 </p>
                                             </div>
                                             {form.patientWeight && form.patientHeight ? (
                                                 (() => {
                                                     const bmi = calculateBMI(form.patientWeight, form.patientHeight);
                                                     const cat = getBMICategory(bmi);
                                                     return (
                                                         <div className={`p-3 rounded-xl ring-1 ${cat.color} flex flex-col justify-center`}>
                                                             <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Computed BMI</p>
                                                             <p className="text-sm font-black flex items-baseline gap-1">
                                                                 {bmi} <span className="text-[9px] font-bold tracking-tight">({cat.label})</span>
                                                             </p>
                                                         </div>
                                                     );
                                                 })()
                                             ) : (
                                                 <div className="bg-gray-50/50 p-3 rounded-xl ring-1 ring-gray-100/50 flex flex-col justify-center">
                                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Computed BMI</p>
                                                     <p className="text-xs text-gray-400 italic">Enter wt & ht below</p>
                                                 </div>
                                             )}
                                         </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recommended Tests / Investigations</label>
                                        <input type="text" value={form.recommendedTests}
                                            onChange={e => setForm(prev => ({ ...prev, recommendedTests: e.target.value }))}
                                            placeholder="e.g. CBC, Blood Sugar Fasting, X-Ray Chest, ECG"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Advice & Instructions</label>
                                        <input type="text" value={form.advice}
                                            onChange={e => setForm(prev => ({ ...prev, advice: e.target.value }))}
                                            placeholder="e.g. Drink plenty of water, Avoid oily foods, Take adequate rest"
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
                                    <div className="flex flex-col sm:flex-row gap-3">

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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button onClick={() => handlePrintPrescription(rx)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                                <Printer size={12} /> Print
                                            </button>
                                            <button onClick={() => handleSendPdf(rx)}
                                                disabled={sendingPdfId === rx.prescriptionId}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
                                                {sendingPdfId === rx.prescriptionId ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                Send PDF
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
