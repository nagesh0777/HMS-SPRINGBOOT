import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import {
    Receipt, Plus, Search, Download, Eye, X, CheckCircle,
    Clock, TrendingUp, AlertCircle, Package, User, FileText,
    Stethoscope, Bed, Pill, ChevronRight, Zap, Layers,
    ArrowLeft, Printer
} from 'lucide-react';

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Insurance', 'Cheque'];
const CATEGORY_ICONS = { OPD: '🏥', IPD: '🛏️', Lab: '🧪', Imaging: '📡', Procedure: '⚕️', Pharmacy: '💊', Other: '📋' };

const BillingDashboard = () => {
    const toast = useToast();
    const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState('bills');
    const [finalBills, setFinalBills] = useState([]);

    // CREATE BILL state
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientHistory, setPatientHistory] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Service catalog
    const [serviceCatalog, setServiceCatalog] = useState([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Bill items & calculations
    const [billItems, setBillItems] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [taxPercent, setTaxPercent] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState('Unpaid');
    const [paymentMode, setPaymentMode] = useState('');

    // ========== DATA FETCHING ==========
    const fetchBills = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Billing');
            if (res.data.Results) setBills(res.data.Results);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    const fetchSummary = async () => {
        try { const res = await axios.get('/api/Billing/Summary'); if (res.data.Results) setSummary(res.data.Results); } catch (e) { }
    };

    const fetchFinalBills = async () => {
        try { const res = await axios.get('/api/Billing/FinalBills'); if (res.data.Results) setFinalBills(res.data.Results); } catch (e) { }
    };

    const fetchCatalog = async () => {
        try {
            const res = await axios.get('/api/ServiceCatalog');
            if (res.data.Results && res.data.Results.length > 0) {
                setServiceCatalog(res.data.Results);
            } else {
                const seed = await axios.post('/api/ServiceCatalog/SeedDefaults');
                if (seed.data.Results && Array.isArray(seed.data.Results)) setServiceCatalog(seed.data.Results);
            }
        } catch (e) { }
    };

    useEffect(() => { fetchBills(); fetchSummary(); fetchFinalBills(); fetchCatalog(); }, [fetchBills]);

    // ========== PATIENT ==========
    const searchPatients = async (q) => {
        if (q.length < 2) { setPatients([]); return; }
        try { const res = await axios.get('/api/DoctorPortal/SearchPatient', { params: { query: q } }); if (res.data.Results) setPatients(res.data.Results); } catch (e) { }
    };

    const selectPatient = async (p) => {
        setSelectedPatient(p);
        setPatients([]);
        setPatientSearch('');
        setLoadingHistory(true);
        try {
            const res = await axios.get(`/api/Billing/PatientHistory/${p.patientId}`);
            if (res.data.Results) setPatientHistory(res.data.Results);
        } catch (e) { }
        setLoadingHistory(false);
    };

    // ========== BILL ITEMS ==========
    const addFromCatalog = (service) => {
        if (billItems.find(i => i.serviceId === service.serviceId)) { toast.error('Already added'); return; }
        setBillItems(prev => [...prev, {
            serviceId: service.serviceId, itemName: service.serviceName,
            category: service.category, quantity: 1, unitPrice: service.rate,
            rateType: service.rateType, total: service.rate,
        }]);
    };

    const autoAddFromHistory = () => {
        if (!patientHistory) return;
        const items = [];
        const { opdVisitCount, admissions, totalIpdDays } = patientHistory;
        if (opdVisitCount > 0) {
            const s = serviceCatalog.find(s => s.category === 'OPD' && s.serviceName.toLowerCase().includes('general'));
            if (s) items.push({ serviceId: s.serviceId, itemName: s.serviceName, category: 'OPD', quantity: opdVisitCount, unitPrice: s.rate, rateType: 'per_visit', total: s.rate * opdVisitCount, autoAdded: true });
        }
        if (admissions?.length > 0 && totalIpdDays > 0) {
            const bed = serviceCatalog.find(s => s.category === 'IPD' && s.serviceName.toLowerCase().includes('general ward'));
            const nurse = serviceCatalog.find(s => s.category === 'IPD' && s.serviceName.toLowerCase().includes('nursing'));
            if (bed) items.push({ serviceId: bed.serviceId, itemName: bed.serviceName, category: 'IPD', quantity: totalIpdDays, unitPrice: bed.rate, rateType: 'per_day', total: bed.rate * totalIpdDays, autoAdded: true });
            if (nurse) items.push({ serviceId: nurse.serviceId, itemName: nurse.serviceName, category: 'IPD', quantity: totalIpdDays, unitPrice: nurse.rate, rateType: 'per_day', total: nurse.rate * totalIpdDays, autoAdded: true });
        }
        const existingIds = billItems.map(i => i.serviceId);
        const newItems = items.filter(i => !existingIds.includes(i.serviceId));
        if (newItems.length === 0) { toast.error('Already added from history'); return; }
        setBillItems(prev => [...prev, ...newItems]);
        toast.success(`${newItems.length} services auto-added`);
    };

    const addCustomItem = () => {
        setBillItems(prev => [...prev, { serviceId: null, itemName: '', category: 'Other', quantity: 1, unitPrice: 0, rateType: 'fixed', total: 0, isCustom: true }]);
    };

    const updateBillItem = (idx, field, val) => {
        setBillItems(prev => {
            const items = [...prev];
            items[idx] = { ...items[idx], [field]: val };
            if (field === 'quantity' || field === 'unitPrice') {
                const q = Math.max(0, Number(field === 'quantity' ? val : items[idx].quantity));
                const p = Math.max(0, Number(field === 'unitPrice' ? val : items[idx].unitPrice));
                items[idx].quantity = q; items[idx].unitPrice = p;
                items[idx].total = Math.round(q * p * 100) / 100;
            }
            return items;
        });
    };

    const removeBillItem = (idx) => setBillItems(prev => prev.filter((_, i) => i !== idx));

    // ========== CALCULATIONS ==========
    const subtotal = billItems.reduce((s, i) => s + (i.total || 0), 0);
    const discAmt = discountAmount > 0 ? Math.min(discountAmount, subtotal) : (subtotal * Math.min(Math.max(discountPercent, 0), 100)) / 100;
    const discPct = discountAmount > 0 ? (subtotal > 0 ? (discAmt / subtotal) * 100 : 0) : Math.min(Math.max(discountPercent, 0), 100);
    const taxAmt = ((subtotal - discAmt) * Math.max(taxPercent, 0)) / 100;
    const grandTotal = Math.round((subtotal - discAmt + taxAmt) * 100) / 100;

    // ========== SUBMIT ==========
    const submitBill = async () => {
        if (!selectedPatient) { toast.error('Select a patient'); return; }
        if (billItems.length === 0) { toast.error('Add at least one service'); return; }
        if (billItems.some(i => !i.itemName)) { toast.error('Fill all service names'); return; }
        try {
            const res = await axios.post('/api/Billing', {
                patientId: selectedPatient.patientId, billType: 'Comprehensive',
                billItems: JSON.stringify(billItems), subtotal,
                discountPercent: discPct, discountAmount: discAmt,
                taxPercent, taxAmount: taxAmt, grandTotal,
                paymentStatus, paymentMode
            });
            if (res.data.ErrorMessage) { toast.error(res.data.ErrorMessage); return; }
            toast.success('Bill generated!');
            goBackToList(); fetchBills(); fetchSummary();
        } catch (e) { toast.error('Failed to create bill'); }
    };

    const goBackToList = () => {
        setView('list'); setSelectedPatient(null); setPatientHistory(null);
        setBillItems([]); setDiscountPercent(0); setDiscountAmount(0);
        setTaxPercent(0); setPaymentStatus('Unpaid'); setPaymentMode('');
        setPatientSearch('');
    };

    const updatePayment = async (billId, status, mode) => {
        try {
            await axios.put(`/api/Billing/${billId}/Payment`, { paymentStatus: status, paymentMode: mode });
            toast.success('Payment updated'); fetchBills(); fetchSummary();
        } catch (e) { toast.error('Failed'); }
    };

// ========== PDF ==========
const downloadPDF = async (bill) => {
    try {
        const sRes = await axios.get('/api/HospitalSettings');
        const settings = sRes.data.Results || {};
        const items = typeof bill.billItems === 'string' ? JSON.parse(bill.billItems || '[]') : (bill.billItems || []);
        let pat = {};
        try { const pRes = await axios.get(`/api/DoctorPortal/Patient/${bill.patientId}`); if (pRes.data.Results?.patient) pat = pRes.data.Results.patient; } catch (e) { }
        const catLabels = { OPD: 'Outpatient Department', IPD: 'Inpatient Department', Lab: 'Laboratory Investigations', Imaging: 'Diagnostic Imaging', Procedure: 'Medical Procedures', Pharmacy: 'Pharmacy & Medications', Other: 'Miscellaneous Charges' };
        const grouped = {};
        items.forEach(it => { const c = it.category || 'Other'; if (!grouped[c]) grouped[c] = []; grouped[c].push(it); });
        let sn = 0;
        const pn = bill.patientName || (pat.firstName ? pat.firstName + ' ' + pat.lastName : 'N/A');
        const bd = bill.createdAt ? new Date(bill.createdAt) : new Date();
        const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const itemRows = Object.entries(grouped).map(([cat, ci]) => {
            const cl = catLabels[cat] || cat;
            return '<tr><td colspan="6" style="background:#edf2f7;padding:6px 12px;font-size:10px;font-weight:700;color:#2d3748;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #1a365d">' + cl + '</td></tr>' +
                ci.map(it => { sn++; return '<tr><td>' + sn + '</td><td><strong>' + it.itemName + '</strong>' + (it.rateType && it.rateType !== 'fixed' ? '<br/><span style="font-size:9px;color:#a0aec0;font-style:italic">' + (it.rateType === 'per_day' ? 'Per diem charges' : it.rateType === 'per_visit' ? 'Per consultation' : 'Per unit') + '</span>' : '') + '</td><td>' + cl + '</td><td style="text-align:right">' + it.quantity + '</td><td style="text-align:right;font-family:monospace">' + fmt(it.unitPrice) + '</td><td style="text-align:right;font-family:monospace">' + fmt(it.total) + '</td></tr>'; }).join('');
        }).join('');
        const statusClr = bill.paymentStatus === 'Paid' ? '#276749' : bill.paymentStatus === 'Partial' ? '#b7791f' : '#c53030';
        const w = window.open('', '_blank');
        w.document.write('<!DOCTYPE html><html><head><title>Invoice ' + (bill.billNumber || '') + '</title>' +
            '<style>@page{margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;color:#1a1a1a;padding:30px 40px;max-width:820px;margin:0 auto;font-size:12px;line-height:1.5}table{width:100%;border-collapse:collapse}th{background:#2d3748;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px}td{padding:7px 10px;border-bottom:1px solid #edf2f7;font-size:11px;color:#2d3748}@media print{body{padding:15px}.np{display:none!important}}</style></head><body>' +
            // HEADER
            '<div style="display:flex;align-items:center;gap:24px;padding-bottom:14px;border-bottom:2px solid #1a365d;margin-bottom:6px">' +
            (settings.logoPath ? '<img src="/api/Files' + settings.logoPath.replace('/uploads', '') + '" style="width:68px;height:68px;object-fit:contain" onerror="this.style.display=\'none\'" />' : '') +
            '<div style="flex:1"><h1 style="font-size:20px;font-weight:800;color:#1a365d;margin-bottom:2px">' + (settings.hospitalName || 'Hospital') + '</h1>' +
            '<p style="font-size:10px;color:#555">' + (settings.address || '') + '</p>' +
            '<p style="font-size:10px;color:#555">Tel: ' + (settings.phoneNumber || '-') + ' | Email: ' + (settings.email || '-') + '</p>' +
            (settings.gstNumber ? '<p style="font-size:9px;color:#777;margin-top:2px">GSTIN: ' + settings.gstNumber + '</p>' : '') +
            '</div></div>' +
            // TITLE BAR
            '<div style="background:#1a365d;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">TAX INVOICE</div>' +
            // PATIENT + INVOICE INFO
            '<div style="display:flex;gap:20px;margin-bottom:16px">' +
            '<div style="flex:1;border:1px solid #e2e8f0;padding:12px 14px">' +
            '<h4 style="font-size:9px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Patient Information</h4>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Patient Name</span><span style="font-weight:600">' + pn + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Patient ID</span><span style="font-weight:600">' + (bill.patientCode || pat.patientCode || '#' + bill.patientId) + '</span></div>' +
            (pat.gender ? '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Gender / Age</span><span style="font-weight:600">' + pat.gender + (pat.age ? ' / ' + pat.age : '') + '</span></div>' : '') +
            (pat.phoneNumber ? '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Contact</span><span style="font-weight:600">' + pat.phoneNumber + '</span></div>' : '') +
            '</div>' +
            '<div style="flex:1;border:1px solid #e2e8f0;padding:12px 14px">' +
            '<h4 style="font-size:9px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Invoice Details</h4>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Invoice No.</span><span style="font-weight:600">' + (bill.billNumber || 'N/A') + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Invoice Date</span><span style="font-weight:600">' + bd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Type</span><span style="font-weight:600">' + (bill.billType || 'Comprehensive') + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Status</span><span style="font-weight:700;color:' + statusClr + '">' + (bill.paymentStatus || 'Unpaid') + '</span></div>' +
            '</div></div>' +
            // TABLE
            '<table><thead><tr><th style="width:35px">S.No</th><th>Description of Charges</th><th>Department</th><th style="width:50px;text-align:right">Qty</th><th style="width:90px;text-align:right">Unit Rate (INR)</th><th style="width:100px;text-align:right">Amount (INR)</th></tr></thead><tbody>' +
            itemRows + '</tbody></table>' +
            // FINANCIAL SUMMARY
            '<div style="display:flex;justify-content:flex-end;margin-top:18px"><div style="width:320px">' +
            '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Subtotal</span><span style="font-weight:600;font-family:monospace">' + fmt(bill.subtotal) + '</span></div>' +
            (Number(bill.discountAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Less: Discount (' + Number(bill.discountPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#c53030">- ' + fmt(bill.discountAmount) + '</span></div>' : '') +
            (Number(bill.taxAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Add: GST/Tax (' + Number(bill.taxPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#2f855a">+ ' + fmt(bill.taxAmount) + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#1a365d;color:#fff;font-size:15px;font-weight:800;border-radius:4px;margin-top:6px"><span>Net Amount Payable</span><span style="font-family:monospace">INR ' + fmt(bill.grandTotal) + '</span></div>' +
            '</div></div>' +
            // PAYMENT BAR
            '<div style="display:flex;gap:18px;margin-top:14px;padding:10px 14px;background:#f7fafc;border:1px solid #e2e8f0">' +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Payment Status</div><div style="font-weight:700;margin-top:2px;color:' + statusClr + '">' + (bill.paymentStatus || 'Unpaid') + '</div></div>' +
            (bill.paymentMode ? '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Mode</div><div style="font-weight:700;margin-top:2px">' + bill.paymentMode + '</div></div>' : '') +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Generated</div><div style="font-weight:700;margin-top:2px">' + bd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</div></div></div>' +
            // FOOTER
            '<div style="margin-top:36px;border-top:1px solid #e2e8f0;padding-top:18px">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:18px">' +
            '<div style="text-align:center"><div style="width:180px;border-top:1px solid #2d3748;padding-top:4px;font-size:10px;color:#4a5568">Received By (Patient / Attendant)</div></div>' +
            '<div style="text-align:center">' + (settings.signatureImagePath ? '<img src="/api/Files' + settings.signatureImagePath.replace('/uploads', '') + '" style="max-width:100px;max-height:50px;display:block;margin:0 auto 6px" onerror="this.style.display=\'none\'" />' : '') +
            '<div style="width:180px;border-top:1px solid #2d3748;padding-top:4px;font-size:10px;color:#4a5568">Authorized Signatory</div></div></div>' +
            '<div style="font-size:8px;color:#a0aec0;line-height:1.6;margin-top:14px;padding-top:8px;border-top:1px dashed #e2e8f0"><strong style="color:#718096">Terms & Conditions:</strong><br/>1. Computer-generated document, valid without physical signature.<br/>2. All charges as per prevailing hospital rate card.<br/>3. Please retain this invoice for insurance claims and future reference.</div>' +
            '<div style="text-align:center;font-size:9px;color:#718096;margin-top:10px;font-style:italic">' + (settings.footerText || 'We wish you a speedy recovery. Thank you for your trust in our services.') + '</div></div>' +
            '<div class="np" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:12px 48px;background:#1a365d;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase">Print Invoice</button></div>' +
            '</body></html>');
        w.document.close();
    } catch (e) { toast.error('Failed to generate invoice'); }
};


    // ========== FILTERS ==========
    const filteredBills = bills.filter(b => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (b.patientName?.toLowerCase().includes(q) || b.billNumber?.toLowerCase().includes(q) || b.patientCode?.toLowerCase().includes(q));
    });
    const categories = [...new Set(serviceCatalog.map(s => s.category))];
    const filteredCatalog = serviceCatalog.filter(s => {
        if (selectedCategory && s.category !== selectedCategory) return false;
        if (catalogSearch && !s.serviceName.toLowerCase().includes(catalogSearch.toLowerCase())) return false;
        return true;
    });
    const statusColor = (s) => s === 'Paid' ? 'bg-green-100 text-green-700' : s === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

    // ===============================================
    // VIEW: BILL DETAIL
    // ===============================================
    if (view === 'detail' && selectedBill) {
        const items = (() => { try { return JSON.parse(selectedBill.billItems || '[]'); } catch { return []; } })();
        return (
            <div className="space-y-6">
                <button onClick={() => { setView('list'); setSelectedBill(null); }} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"><ArrowLeft size={16} />Back to Bills</button>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">{selectedBill.billNumber}</h2>
                            <p className="text-sm text-gray-500">{selectedBill.billType} Bill • {selectedBill.createdAt ? new Date(selectedBill.createdAt).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => downloadPDF(selectedBill)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg"><Printer size={16} />Print / PDF</button>
                            {selectedBill.paymentStatus !== 'Paid' && (
                                <button onClick={() => { updatePayment(selectedBill.billId, 'Paid', 'Cash'); setSelectedBill({ ...selectedBill, paymentStatus: 'Paid' }); }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg"><CheckCircle size={16} />Mark Paid</button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-[10px] font-black text-gray-400 uppercase">Patient</p><p className="font-bold text-gray-900 mt-1">{selectedBill.patientName}</p></div>
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-[10px] font-black text-gray-400 uppercase">Status</p><p className="mt-1"><span className={`px-3 py-1 rounded-full text-xs font-black ${statusColor(selectedBill.paymentStatus)}`}>{selectedBill.paymentStatus}</span></p></div>
                        <div className="bg-gray-50 rounded-xl p-4"><p className="text-[10px] font-black text-gray-400 uppercase">Grand Total</p><p className="text-2xl font-black text-blue-600 mt-1">₹{Number(selectedBill.grandTotal).toFixed(2)}</p></div>
                    </div>
                    <div className="space-y-2 mb-6">
                        {items.map((it, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-lg text-sm">
                                <span className="font-medium">{it.itemName} <span className="text-gray-400">×{it.quantity} • {it.category}</span></span>
                                <span className="font-bold">₹{Number(it.total).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50 rounded-xl p-5 space-y-2 max-w-xs ml-auto">
                        <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">₹{Number(selectedBill.subtotal).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-₹{Number(selectedBill.discountAmount).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm text-green-600"><span>Tax</span><span>+₹{Number(selectedBill.taxAmount).toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg font-black border-t border-blue-200 pt-2"><span>Total</span><span>₹{Number(selectedBill.grandTotal).toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        );
    }

    // ===============================================
    // VIEW: CREATE BILL (FULL PAGE)
    // ===============================================
    if (view === 'create') {
        return (
            <div className="space-y-5">
                {/* Top Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={goBackToList} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft size={20} /></button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">New Bill</h1>
                            <p className="text-xs text-gray-400">{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Search a patient to start'}</p>
                        </div>
                    </div>
                    {billItems.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Grand Total</p>
                                <p className="text-2xl font-black text-blue-600">₹{grandTotal.toFixed(2)}</p>
                            </div>
                            <button onClick={submitBill} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-sm hover:shadow-xl shadow-lg transition-all active:scale-[0.98]">
                                ✅ Generate Bill
                            </button>
                        </div>
                    )}
                </div>

                {/* Patient Search — always visible if no patient selected */}
                {!selectedPatient ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="relative max-w-2xl">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={patientSearch} onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value); }}
                                placeholder="🔍  Type patient name, phone number, or patient code..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 text-base font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                autoFocus />
                            {patients.length > 0 && (
                                <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto">
                                    {patients.map(p => (
                                        <button key={p.patientId} onClick={() => selectPatient(p)}
                                            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black">
                                                {(p.firstName || '?')[0]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-gray-400">{p.patientCode || `#${p.patientId}`} • {p.gender} • {p.phoneNumber}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {patients.length === 0 && patientSearch.length === 0 && (
                            <p className="text-center text-sm text-gray-300 mt-6">Start typing to search patients...</p>
                        )}
                    </div>
                ) : (
                    /* Patient selected — show full billing area */
                    <div className="space-y-5">
                        {/* Patient Card + History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                                        {(selectedPatient.firstName || '?')[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                        <p className="text-xs text-gray-500">{selectedPatient.patientCode} • {selectedPatient.gender} • {selectedPatient.phoneNumber} • Age: {selectedPatient.age || 'N/A'}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedPatient(null); setPatientHistory(null); setBillItems([]); }}
                                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200">Change Patient</button>
                            </div>

                            {/* History Stats */}
                            {loadingHistory ? (
                                <div className="flex justify-center py-4"><div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
                            ) : patientHistory && (
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <Stethoscope size={16} className="mx-auto text-blue-600 mb-1" />
                                        <p className="text-xl font-black text-blue-700">{patientHistory.opdVisitCount}</p>
                                        <p className="text-[9px] font-bold text-blue-400 uppercase">OPD Visits</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                                        <Bed size={16} className="mx-auto text-purple-600 mb-1" />
                                        <p className="text-xl font-black text-purple-700">{patientHistory.ipdAdmissionCount}</p>
                                        <p className="text-[9px] font-bold text-purple-400 uppercase">Admissions</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                                        <Clock size={16} className="mx-auto text-amber-600 mb-1" />
                                        <p className="text-xl font-black text-amber-700">{patientHistory.totalIpdDays}</p>
                                        <p className="text-[9px] font-bold text-amber-400 uppercase">IPD Days</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                        <Pill size={16} className="mx-auto text-emerald-600 mb-1" />
                                        <p className="text-xl font-black text-emerald-700">{patientHistory.prescriptions?.length || 0}</p>
                                        <p className="text-[9px] font-bold text-emerald-400 uppercase">Prescriptions</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <button onClick={autoAddFromHistory} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all">
                                <Zap size={18} />Auto-Fill from History
                            </button>
                            <button onClick={addCustomItem} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">
                                <Plus size={18} />Add Custom Item
                            </button>
                        </div>

                        {/* Two Column Layout: Catalog | Bill */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                            {/* Service Catalog — 2 columns */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                                <p className="text-sm font-black text-gray-600 uppercase tracking-widest flex items-center gap-2"><Package size={16} />Service Catalog</p>
                                <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="Search services..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setSelectedCategory('')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>All</button>
                                    {categories.map(c => (
                                        <button key={c} onClick={() => setSelectedCategory(c === selectedCategory ? '' : c)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedCategory === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                            {CATEGORY_ICONS[c]} {c}
                                        </button>
                                    ))}
                                </div>
                                <div className="max-h-[55vh] overflow-y-auto space-y-1.5">
                                    {filteredCatalog.map(s => (
                                        <button key={s.serviceId} onClick={() => addFromCatalog(s)}
                                            className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 rounded-xl hover:bg-blue-50 hover:ring-2 hover:ring-blue-200 transition-all text-left group">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.serviceName}</p>
                                                <p className="text-xs text-gray-400">{s.category} • {s.rateType}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-blue-600">₹{s.rate}</span>
                                                <Plus size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bill Items — 3 columns */}
                            <div className="lg:col-span-3 space-y-4">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <p className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Layers size={16} />Bill Items ({billItems.length})</p>
                                    {billItems.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FileText size={36} className="mx-auto text-gray-300 mb-3" />
                                            <p className="text-base text-gray-400 font-medium">Click services from catalog or use Auto-Fill</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                                            {billItems.map((item, idx) => (
                                                <div key={idx} className={`rounded-xl p-4 ring-1 ${item.autoAdded ? 'ring-blue-200 bg-blue-50/40' : 'ring-gray-100 bg-gray-50'}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        {item.isCustom ? (
                                                            <input value={item.itemName} onChange={e => updateBillItem(idx, 'itemName', e.target.value)}
                                                                placeholder="Service name..." className="font-bold text-sm bg-transparent outline-none flex-1 mr-2 border-b-2 border-dashed border-gray-300 pb-1" autoFocus />
                                                        ) : (
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">{item.itemName}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{item.category} • {item.rateType}{item.autoAdded ? ' • ⚡ auto' : ''}</p>
                                                            </div>
                                                        )}
                                                        <button onClick={() => removeBillItem(idx)} className="p-2 rounded-lg text-red-300 hover:text-red-600 hover:bg-red-50"><X size={18} /></button>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 font-bold">QTY</span>
                                                            <input type="number" min="1" value={item.quantity} onChange={e => updateBillItem(idx, 'quantity', e.target.value)}
                                                                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 font-bold">Rate ₹</span>
                                                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateBillItem(idx, 'unitPrice', e.target.value)}
                                                                className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                                        </div>
                                                        <span className="ml-auto text-lg font-black text-blue-600">₹{(item.total || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Totals + Payment — only show when items exist */}
                                {billItems.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs font-black text-gray-500 uppercase mb-1.5 block">Discount %</label>
                                                <input type="number" min="0" max="100" step="0.1" value={discountPercent}
                                                    onChange={e => { setDiscountPercent(Math.max(0, Number(e.target.value) || 0)); setDiscountAmount(0); }}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-500 uppercase mb-1.5 block">Discount ₹</label>
                                                <input type="number" min="0" step="1" value={discountAmount}
                                                    onChange={e => { setDiscountAmount(Math.max(0, Number(e.target.value) || 0)); setDiscountPercent(0); }}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-500 uppercase mb-1.5 block">Tax %</label>
                                                <input type="number" min="0" step="0.1" value={taxPercent}
                                                    onChange={e => setTaxPercent(Math.max(0, Number(e.target.value) || 0))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                                            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal ({billItems.length} items)</span><span className="font-bold">₹{subtotal.toFixed(2)}</span></div>
                                            {discAmt > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount ({discPct.toFixed(1)}%)</span><span>-₹{discAmt.toFixed(2)}</span></div>}
                                            {taxAmt > 0 && <div className="flex justify-between text-sm text-green-600"><span>Tax ({taxPercent.toFixed(1)}%)</span><span>+₹{taxAmt.toFixed(2)}</span></div>}
                                            <div className="flex justify-between text-xl font-black border-t border-gray-200 pt-2 mt-1"><span>Grand Total</span><span className="text-blue-600">₹{grandTotal.toFixed(2)}</span></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold outline-none">
                                                <option>Unpaid</option><option>Paid</option><option>Partial</option>
                                            </select>
                                            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold outline-none">
                                                <option value="">Payment Mode</option>{PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                            </select>
                                        </div>

                                        <button onClick={submitBill}
                                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl shadow-lg transition-all active:scale-[0.98]">
                                            ✅ Generate Bill — ₹{grandTotal.toFixed(2)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ===============================================
    // VIEW: BILL LIST (DEFAULT)
    // ===============================================
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Bills', val: summary.totalBills || 0, icon: <Receipt size={20} />, color: 'from-blue-500 to-blue-600' },
                    { label: 'Revenue', val: `₹${(summary.totalRevenue || 0).toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'from-green-500 to-emerald-600' },
                    { label: 'Pending', val: `₹${(summary.totalPending || 0).toLocaleString()}`, icon: <Clock size={20} />, color: 'from-amber-500 to-orange-600' },
                    { label: 'Unpaid', val: summary.unpaidBills || 0, icon: <AlertCircle size={20} />, color: 'from-red-500 to-rose-600' }
                ].map((c, i) => (
                    <div key={i} className={`rounded-2xl bg-gradient-to-br ${c.color} text-white p-5 shadow-lg`}>
                        <div className="flex items-center justify-between mb-2">{c.icon}<span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{c.label}</span></div>
                        <p className="text-2xl font-black">{c.val}</p>
                    </div>
                ))}
            </div>

            {/* Tabs + New Bill Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2">
                    {['bills', 'final'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === t ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                            {t === 'bills' ? '📄 All Bills' : '📋 Final Bills'}
                        </button>
                    ))}
                </div>
                <button onClick={() => setView('create')}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-xl shadow-lg transition-all active:scale-[0.98]">
                    <Zap size={16} />New Bill
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search bills..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Bills Table */}
            {activeTab === 'bills' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b border-gray-100">
                                {['Bill #', 'Patient', 'Items', 'Grand Total', 'Status', 'Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr> :
                                    filteredBills.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-400">No bills yet</td></tr> :
                                        filteredBills.map(b => {
                                            const cnt = (() => { try { return JSON.parse(b.billItems || '[]').length; } catch { return 0; } })();
                                            return (
                                                <tr key={b.billId} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => { setSelectedBill(b); setView('detail'); }}>
                                                    <td className="px-4 py-3 font-bold text-blue-600">{b.billNumber || `#${b.billId}`}</td>
                                                    <td className="px-4 py-3 font-semibold">{b.patientName || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-500">{cnt} services</td>
                                                    <td className="px-4 py-3 font-black">₹{Number(b.grandTotal || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${statusColor(b.paymentStatus)}`}>{b.paymentStatus}</span></td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</td>
                                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => downloadPDF(b)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Print"><Download size={14} /></button>
                                                            {b.paymentStatus !== 'Paid' && <button onClick={() => updatePayment(b.billId, 'Paid', 'Cash')} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600" title="Mark Paid"><CheckCircle size={14} /></button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Final Bills */}
            {activeTab === 'final' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b border-gray-100">
                                {['Bill #', 'Patient', 'Grand Total', 'Status', 'Date', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {finalBills.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No final bills yet</td></tr> :
                                    finalBills.map(b => (
                                        <tr key={b.finalBillId} className="border-b border-gray-50 hover:bg-purple-50/30">
                                            <td className="px-4 py-3 font-bold text-purple-600">{b.billNumber || `#${b.finalBillId}`}</td>
                                            <td className="px-4 py-3 font-semibold">{b.patientName || '-'}</td>
                                            <td className="px-4 py-3 font-black">₹{Number(b.grandTotal || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${statusColor(b.paymentStatus)}`}>{b.paymentStatus}</span></td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</td>
                                            <td className="px-4 py-3"><button onClick={() => downloadPDF(b)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"><Download size={14} /></button></td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingDashboard;
