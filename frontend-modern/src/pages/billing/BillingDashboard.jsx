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
const CATEGORY_ICONS = { OPD: '🏥', IPD: '🛏️', Lab: '🧪', Imaging: '📡', Procedure: '⚕️', Other: '📋' };

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
        // Autofocus the catalog search input on next tick
        setTimeout(() => {
            document.getElementById('catalog-search-input')?.focus();
        }, 150);
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
            toast.success('Bill generated successfully!');
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

    const fetchInvoicePrintData = async (bill) => {
        const sRes = await axios.get('/api/HospitalSettings');
        const settings = sRes.data.Results || {};
        const items = typeof bill.billItems === 'string' ? JSON.parse(bill.billItems || '[]') : (bill.billItems || []);
        let pat = {};
        try { const pRes = await axios.get(`/api/DoctorPortal/Patient/${bill.patientId}`); if (pRes.data.Results?.patient) pat = pRes.data.Results.patient; } catch (e) { }
        const catLabels = { OPD: 'Outpatient Department', IPD: 'Inpatient Department', Lab: 'Laboratory Investigations', Imaging: 'Diagnostic Imaging', Procedure: 'Medical Procedures', Other: 'Miscellaneous Charges' };
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
        const logoUrl = settings.logoPath ? window.location.origin + '/api/Files' + settings.logoPath.replace('/uploads', '') : '';
        const sigUrl = settings.signatureImagePath ? window.location.origin + '/api/Files' + settings.signatureImagePath.replace('/uploads', '') : '';

        return {
            settings, pat, pn, bd, fmt, itemRows, statusClr, logoUrl, sigUrl
        };
    };

    const getInvoiceHtml = (bill, data) => {
        return '<!DOCTYPE html><html><head><title>Invoice ' + (bill.billNumber || '') + '</title>' +
            '<style>@page{margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;color:#1a1a1a;padding:30px 40px;max-width:820px;margin:0 auto;font-size:12px;line-height:1.5}table{width:100%;border-collapse:collapse}th{background:#2d3748;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px}td{padding:7px 10px;border-bottom:1px solid #edf2f7;font-size:11px;color:#2d3748}@media print{body{padding:15px}.np{display:none!important}}</style>' +
            '</head><body>' +
            // HEADER
            '<div style="display:flex;align-items:center;gap:24px;padding-bottom:14px;border-bottom:2px solid #1a365d;margin-bottom:6px">' +
            (data.logoUrl ? '<img src="' + data.logoUrl + '" style="width:68px;height:68px;object-fit:contain" onerror="this.style.display=\'none\'" />' : '') +
            '<div style="flex:1"><h1 style="font-size:20px;font-weight:800;color:#1a365d;margin-bottom:2px">' + (data.settings.hospitalName || 'Hospital') + '</h1>' +
            '<p style="font-size:10px;color:#555">' + (data.settings.address || '') + '</p>' +
            '<p style="font-size:10px;color:#555">Tel: ' + (data.settings.phoneNumber || '-') + ' | Email: ' + (data.settings.email || '-') + '</p>' +
            (data.settings.gstNumber ? '<p style="font-size:9px;color:#777;margin-top:2px">GSTIN: ' + data.settings.gstNumber + '</p>' : '') +
            '</div></div>' +
            // TITLE BAR
            '<div style="background:#1a365d;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">TAX INVOICE</div>' +
            // PATIENT + INVOICE INFO
            '<div style="display:flex;gap:20px;margin-bottom:16px">' +
            '<div style="flex:1;border:1px solid #e2e8f0;padding:12px 14px">' +
            '<h4 style="font-size:9px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Patient Information</h4>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Patient Name</span><span style="font-weight:600">' + data.pn + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Patient ID</span><span style="font-weight:600">' + (bill.patientCode || data.pat.patientCode || '#' + bill.patientId) + '</span></div>' +
            (data.pat.gender ? '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Gender / Age</span><span style="font-weight:600">' + data.pat.gender + (data.pat.age ? ' / ' + data.pat.age : '') + '</span></div>' : '') +
            (data.pat.phoneNumber ? '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Contact</span><span style="font-weight:600">' + data.pat.phoneNumber + '</span></div>' : '') +
            '</div>' +
            '<div style="flex:1;border:1px solid #e2e8f0;padding:12px 14px">' +
            '<h4 style="font-size:9px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">Invoice Details</h4>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Invoice No.</span><span style="font-weight:600">' + (bill.billNumber || 'N/A') + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Invoice Date</span><span style="font-weight:600">' + data.bd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Type</span><span style="font-weight:600">' + (bill.billType || 'Comprehensive') + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#718096">Status</span><span style="font-weight:700;color:' + data.statusClr + '">' + (bill.paymentStatus || 'Unpaid') + '</span></div>' +
            '</div></div>' +
            // TABLE
            '<table><thead><tr><th style="width:35px">S.No</th><th>Description of Charges</th><th>Department</th><th style="width:50px;text-align:right">Qty</th><th style="width:90px;text-align:right">Unit Rate (INR)</th><th style="width:100px;text-align:right">Amount (INR)</th></tr></thead><tbody>' +
            data.itemRows + '</tbody></table>' +
            // FINANCIAL SUMMARY
            '<div style="display:flex;justify-content:flex-end;margin-top:18px"><div style="width:320px">' +
            '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Subtotal</span><span style="font-weight:600;font-family:monospace">' + data.fmt(bill.subtotal) + '</span></div>' +
            (Number(bill.discountAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Less: Discount (' + Number(bill.discountPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#c53030">- ' + data.fmt(bill.discountAmount) + '</span></div>' : '') +
            (Number(bill.taxAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Add: GST/Tax (' + Number(bill.taxPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#2f855a">+ ' + data.fmt(bill.taxAmount) + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#1a365d;color:#fff;font-size:15px;font-weight:800;border-radius:4px;margin-top:6px"><span>Net Amount Payable</span><span style="font-family:monospace">INR ' + data.fmt(bill.grandTotal) + '</span></div>' +
            '</div></div>' +
            // PAYMENT BAR
            '<div style="display:flex;gap:18px;margin-top:14px;padding:10px 14px;background:#f7fafc;border:1px solid #e2e8f0">' +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Payment Status</div><div style="font-weight:700;margin-top:2px;color:' + data.statusClr + '">' + (bill.paymentStatus || 'Unpaid') + '</div></div>' +
            (bill.paymentMode ? '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Mode</div><div style="font-weight:700;margin-top:2px">' + bill.paymentMode + '</div></div>' : '') +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Generated</div><div style="font-weight:700;margin-top:2px">' + data.bd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</div></div></div>' +
            // FOOTER
            '<div style="margin-top:36px;border-top:1px solid #e2e8f0;padding-top:18px">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:18px">' +
            '<div style="text-align:center"><div style="width:180px;border-top:1px solid #2d3748;padding-top:4px;font-size:10px;color:#4a5568">Received By (Patient / Attendant)</div></div>' +
            '<div style="text-align:center">' + (data.sigUrl ? '<img src="' + data.sigUrl + '" style="max-width:100px;max-height:50px;display:block;margin:0 auto 6px" onerror="this.style.display=\'none\'" />' : '') +
            '<div style="width:180px;border-top:1px solid #2d3748;padding-top:4px;font-size:10px;color:#4a5568">Authorized Signatory</div></div></div>' +
            '<div style="font-size:8px;color:#a0aec0;line-height:1.6;margin-top:14px;padding-top:8px;border-top:1px dashed #e2e8f0"><strong style="color:#718096">Terms & Conditions:</strong><br/>1. Computer-generated document, valid without physical signature.<br/>2. All charges as per prevailing hospital rate card.<br/>3. Please retain this invoice for insurance claims and future reference.</div>' +
            '<div style="text-align:center;font-size:9px;color:#718096;margin-top:10px;font-style:italic">' + (data.settings.footerText || 'We wish you a speedy recovery. Thank you for your trust in our services.') + '</div></div>' +
            '</body></html>';
    };

    const handlePrintInvoice = async (bill) => {
        toast.info('Preparing print layout...');
        try {
            const data = await fetchInvoicePrintData(bill);
            const html = getInvoiceHtml(bill, data);

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
            toast.error("Failed to print invoice.");
        }
    };

    const handleDownloadInvoicePdf = async (bill) => {
        toast.info('Generating PDF download. Please wait...');
        try {
            const data = await fetchInvoicePrintData(bill);
            const html = getInvoiceHtml(bill, data);

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
                filename:     `Invoice_${bill.billNumber || 'Invoice'}_${bill.billId}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().from(iframe.contentWindow.document.body).set(opt).save();
            document.body.removeChild(iframe);
            toast.success("PDF Downloaded successfully!");
        } catch (e) {
            console.error("PDF generation failed:", e);
            toast.error("Failed to download PDF.");
        }
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

    const getStatusStyle = (s) => {
        if (s === 'Paid') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        if (s === 'Partial') return 'bg-amber-50 text-amber-700 border border-amber-200';
        return 'bg-red-50 text-red-700 border border-red-200';
    };

    // ========== GLOBAL SHORTCUTS ==========
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore hotkeys when actively typing inside custom text inputs or amount boxes
            if (document.activeElement?.tagName === 'INPUT' && 
                document.activeElement?.type === 'text' && 
                document.activeElement?.id !== 'patient-search-input' && 
                document.activeElement?.id !== 'catalog-search-input') {
                return;
            }

            // F1: Go to "New Bill" / Focus Patient Search
            if (e.key === 'F1') {
                e.preventDefault();
                if (view !== 'create') {
                    setView('create');
                }
                setTimeout(() => {
                    document.getElementById('patient-search-input')?.focus();
                }, 100);
            }
            // F2: Focus Catalog Search
            if (e.key === 'F2') {
                e.preventDefault();
                if (view === 'create') {
                    document.getElementById('catalog-search-input')?.focus();
                }
            }
            // F4: Auto-Fill Clinical History
            if (e.key === 'F4') {
                e.preventDefault();
                if (view === 'create' && selectedPatient) {
                    autoAddFromHistory();
                }
            }
            // F8: Generate Invoice
            if (e.key === 'F8') {
                e.preventDefault();
                if (view === 'create' && billItems.length > 0) {
                    submitBill();
                }
            }
            // Escape: Exit View
            if (e.key === 'Escape') {
                if (view === 'create') {
                    goBackToList();
                } else if (view === 'detail') {
                    setView('list');
                    setSelectedBill(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, selectedPatient, billItems, autoAddFromHistory, submitBill, goBackToList]);

    // ===============================================
    // VIEW: BILL DETAIL
    // ===============================================
    if (view === 'detail' && selectedBill) {
        const items = (() => { try { return JSON.parse(selectedBill.billItems || '[]'); } catch { return []; } })();
        return (
            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                    <button 
                        onClick={() => { setView('list'); setSelectedBill(null); }} 
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Bills List
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button 
                            onClick={() => handlePrintInvoice(selectedBill)} 
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                        >
                            <Printer size={15} />
                            Print Invoice
                        </button>
                        <button 
                            onClick={() => handleDownloadInvoicePdf(selectedBill)} 
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 shadow-xs hover:bg-indigo-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                        >
                            <Download size={15} />
                            Download PDF
                        </button>
                        {selectedBill.paymentStatus !== 'Paid' && (
                            <button 
                                onClick={() => { updatePayment(selectedBill.billId, 'Paid', 'Cash'); setSelectedBill({ ...selectedBill, paymentStatus: 'Paid' }); }}
                                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-xs hover:bg-zinc-900/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                            >
                                <CheckCircle size={15} />
                                Mark as Fully Paid
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 md:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900">{selectedBill.billNumber || `#${selectedBill.billId}`}</h2>
                            <p className="text-xs text-zinc-500 font-normal">
                                {selectedBill.billType || 'Comprehensive'} Bill &bull; {selectedBill.createdAt ? new Date(selectedBill.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </p>
                        </div>
                    </div>

                    {/* Patient & Financial Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg p-4">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Patient Name</p>
                            <p className="font-semibold text-zinc-900 text-sm mt-1">{selectedBill.patientName || '-'}</p>
                        </div>
                        <div className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg p-4">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Payment Status</p>
                            <div className="mt-1.5">
                                <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize ${getStatusStyle(selectedBill.paymentStatus)}`}>
                                    {selectedBill.paymentStatus || 'Unpaid'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg p-4">
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Amount</p>
                            <p className="text-lg font-bold text-zinc-900 font-mono mt-1">₹{Number(selectedBill.grandTotal || 0).toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Service Charges List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Itemized Hospital Charges</h4>
                        <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100 overflow-hidden">
                            {items.length === 0 ? (
                                <div className="text-center py-6 text-zinc-400 text-sm">No items attached to this invoice.</div>
                            ) : (
                                items.map((it, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-3 hover:bg-zinc-50/50 transition-colors text-sm">
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-zinc-800">{it.itemName}</span>
                                            <div className="text-xs text-zinc-400 font-normal">
                                                Qty: {it.quantity} &bull; Dept: {it.category} {it.rateType && `(${it.rateType?.replace('_', ' ')})`}
                                            </div>
                                        </div>
                                        <span className="font-bold text-zinc-900 font-mono">₹{Number(it.total || 0).toFixed(2)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="border-t border-zinc-100 pt-4 flex justify-end">
                        <div className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg p-5 space-y-2.5 w-full max-w-sm">
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>Subtotal</span>
                                <span className="font-semibold text-zinc-900 font-mono">₹{Number(selectedBill.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {Number(selectedBill.discountAmount) > 0 && (
                                <div className="flex justify-between text-xs text-red-600 font-medium">
                                    <span>Discount ({Number(selectedBill.discountPercent).toFixed(1)}%)</span>
                                    <span className="font-semibold font-mono">-₹{Number(selectedBill.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(selectedBill.taxAmount) > 0 && (
                                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                                    <span>Tax / GST ({Number(selectedBill.taxPercent).toFixed(1)}%)</span>
                                    <span className="font-semibold font-mono">+₹{Number(selectedBill.taxAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-200/80 pt-2 font-mono">
                                <span>Total Payable</span>
                                <span>₹{Number(selectedBill.grandTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>
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
            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={goBackToList} 
                            className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 shadow-xs hover:bg-zinc-50 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Generate New Invoice</h1>
                            <p className="text-xs text-zinc-500 font-normal">
                                {selectedPatient ? `Preparing bill for ${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Search and select a patient to compile items.'}
                            </p>
                        </div>
                    </div>
                    {billItems.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Estimated Total</p>
                                <p className="text-xl font-bold text-zinc-900 font-mono">₹{grandTotal.toFixed(2)}</p>
                            </div>
                            <button 
                                onClick={submitBill} 
                                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-50 shadow hover:bg-zinc-900/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                            >
                                <CheckCircle size={15} />
                                Generate Bill [F8]
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Help Hotkeys Banner */}
                <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-zinc-500 shadow-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
                        <span>⚡ <strong>Billing Power User Shortcuts:</strong></span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">F1</kbd> Start Patient Search</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">F2</kbd> Focus Service Input</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">Enter</kbd> Add Matched Service</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">F4</kbd> Auto-Fill clinical history</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">F8</kbd> Generate Bill</span>
                        <span><kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-800 font-bold">Esc</kbd> Exit View</span>
                    </div>
                </div>

                {/* Patient Search Drawer */}
                {!selectedPatient ? (
                    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-900">Select Patient Profile</h3>
                        <div className="relative max-w-2xl">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input 
                                id="patient-search-input"
                                value={patientSearch} 
                                onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value); }}
                                placeholder="Search by patient name, contact number, or code..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-200 text-sm font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 placeholder-zinc-400 transition-all shadow-xs"
                                autoFocus 
                            />
                            {patients.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-zinc-200 max-h-72 overflow-y-auto divide-y divide-zinc-100 animate-in fade-in duration-100">
                                    {patients.map(p => (
                                        <button 
                                            key={p.patientId} 
                                            onClick={() => selectPatient(p)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold text-sm">
                                                {(p.firstName || '?')[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-zinc-950 truncate">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-zinc-500 font-normal">
                                                    {p.patientCode || `#${p.patientId}`} &bull; {p.gender} &bull; {p.phoneNumber}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className="text-zinc-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {patients.length === 0 && patientSearch.length === 0 && (
                            <p className="text-center text-xs text-zinc-400 py-6 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                                Start typing in the input box above to lookup registered patients. (Press [F1] anytime to focus here)
                            </p>
                        )}
                    </div>
                ) : (
                    /* Patient selected — full checkout dashboard */
                    <div className="space-y-6">
                        {/* Selected Patient Overview Header */}
                        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-50 font-bold text-sm">
                                    {(selectedPatient.firstName || '?')[0]}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-zinc-900 text-base">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                    <p className="text-xs text-zinc-500 font-normal">
                                        ID: {selectedPatient.patientCode || `#${selectedPatient.patientId}`} &bull; Gender: {selectedPatient.gender} &bull; Phone: {selectedPatient.phoneNumber} &bull; Age: {selectedPatient.age || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedPatient(null); setPatientHistory(null); setBillItems([]); }}
                                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            >
                                Change Patient Profile
                            </button>
                        </div>

                        {/* Clinic Activity Stats */}
                        {loadingHistory ? (
                            <div className="flex justify-center py-4"><div className="animate-spin h-5 w-5 border-2 border-zinc-950 border-t-transparent rounded-full" /></div>
                        ) : patientHistory && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50/50 p-4 border border-zinc-200 rounded-xl shadow-xs">
                                <div className="bg-white border border-zinc-200/50 rounded-lg p-3 text-center">
                                    <Stethoscope size={15} className="mx-auto text-zinc-500 mb-1" />
                                    <p className="text-lg font-bold text-zinc-950 font-mono">{patientHistory.opdVisitCount || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">OPD Consultations</p>
                                </div>
                                <div className="bg-white border border-zinc-200/50 rounded-lg p-3 text-center">
                                    <Bed size={15} className="mx-auto text-zinc-500 mb-1" />
                                    <p className="text-lg font-bold text-zinc-950 font-mono">{patientHistory.ipdAdmissionCount || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">IPD Admissions</p>
                                </div>
                                <div className="bg-white border border-zinc-200/50 rounded-lg p-3 text-center">
                                    <Clock size={15} className="mx-auto text-zinc-500 mb-1" />
                                    <p className="text-lg font-bold text-zinc-950 font-mono">{patientHistory.totalIpdDays || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">IPD Stay Days</p>
                                </div>
                                <div className="bg-white border border-zinc-200/50 rounded-lg p-3 text-center">
                                    <Pill size={15} className="mx-auto text-zinc-500 mb-1" />
                                    <p className="text-lg font-bold text-zinc-950 font-mono">{patientHistory.prescriptions?.length || 0}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Active Scripts</p>
                                </div>
                            </div>
                        )}

                        {/* Interactive Checkout Toolbar */}
                        <div className="flex gap-2">
                            <button 
                                onClick={autoAddFromHistory} 
                                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-50 shadow hover:bg-zinc-900/90 transition-all gap-1.5"
                                title="Shortcut: Press [F4]"
                            >
                                <Zap size={14} className="text-amber-400 fill-amber-400" />
                                Auto-Fill from Clinical History [F4]
                            </button>
                            <button 
                                onClick={addCustomItem} 
                                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 transition-all gap-1.5"
                            >
                                <Plus size={14} />
                                Add Custom Service Charge
                            </button>
                        </div>

                        {/* Left Catalog Sidepanel & Right Checkout Cart */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* Service Rate Catalog Selector */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <Package size={14} />
                                        Hospital Service Rates (F2)
                                    </p>
                                </div>
                                <input 
                                    id="catalog-search-input"
                                    value={catalogSearch} 
                                    onChange={e => setCatalogSearch(e.target.value)} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (filteredCatalog.length > 0) {
                                                addFromCatalog(filteredCatalog[0]);
                                                setCatalogSearch(''); // Clear query to ready for next item
                                                toast.success(`Added ${filteredCatalog[0].serviceName}`);
                                            } else {
                                                toast.error('No service matched.');
                                            }
                                        }
                                    }}
                                    placeholder="Type keyword & press [Enter] to instantly add..."
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white text-zinc-900 placeholder-zinc-400 transition-all" 
                                />
                                <div className="flex gap-1 flex-wrap">
                                    <button 
                                        onClick={() => setSelectedCategory('')} 
                                        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                                            !selectedCategory 
                                                ? 'bg-zinc-900 text-zinc-50 shadow-xs' 
                                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {categories.map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => setSelectedCategory(c === selectedCategory ? '' : c)}
                                            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                                                selectedCategory === c 
                                                    ? 'bg-zinc-900 text-zinc-50 shadow-xs' 
                                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                                            }`}
                                        >
                                            {CATEGORY_ICONS[c]} {c}
                                        </button>
                                    ))}
                                </div>
                                <div className="max-h-[50vh] overflow-y-auto space-y-1 divide-y divide-zinc-50">
                                    {filteredCatalog.map(s => (
                                        <button 
                                            key={s.serviceId} 
                                            onClick={() => addFromCatalog(s)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-100/50 rounded-lg transition-all text-left border border-zinc-100 group"
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-semibold text-zinc-800">{s.serviceName}</p>
                                                <p className="text-[10px] text-zinc-400 font-normal uppercase">{s.category} &bull; {s.rateType}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-zinc-900 font-mono">₹{Number(s.rate).toFixed(2)}</span>
                                                <Plus size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Compilation Cart and Totals Panel */}
                            <div className="lg:col-span-3 space-y-4">
                                <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <Layers size={14} />
                                        Invoice Cart Items ({billItems.length})
                                    </p>
                                    {billItems.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                                            <FileText size={28} className="mx-auto text-zinc-300 mb-2" />
                                            <p className="text-xs text-zinc-400 font-normal">No services selected yet. Add items from the catalog or auto-fill.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto">
                                            {billItems.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`rounded-lg border p-3.5 bg-white relative transition-all ${
                                                        item.autoAdded 
                                                            ? 'border-blue-200 bg-blue-50/10' 
                                                            : 'border-zinc-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        {item.isCustom ? (
                                                            <input 
                                                                value={item.itemName} 
                                                                onChange={e => updateBillItem(idx, 'itemName', e.target.value)}
                                                                placeholder="Type custom charge description..." 
                                                                className="font-semibold text-xs bg-transparent outline-none flex-1 border-b border-dashed border-zinc-300 pb-0.5 focus:border-zinc-950 placeholder-zinc-300" 
                                                                autoFocus 
                                                            />
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-semibold text-zinc-800">{item.itemName}</p>
                                                                <p className="text-[10px] text-zinc-400 uppercase font-medium">
                                                                    {item.category} &bull; {item.rateType} {item.autoAdded ? ' (Clinical Auto)' : ''}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button 
                                                            onClick={() => removeBillItem(idx)} 
                                                            className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        {/* Interactive Quantity Increments */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">QTY</span>
                                                            <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden bg-white h-7 shadow-xs">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateBillItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                                                    className="px-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 font-bold h-full border-r border-zinc-200 transition-colors text-xs select-none active:bg-zinc-200"
                                                                >
                                                                    -
                                                                </button>
                                                                <input 
                                                                    type="number" 
                                                                    min="1" 
                                                                    value={item.quantity} 
                                                                    onChange={e => updateBillItem(idx, 'quantity', e.target.value)}
                                                                    className="w-10 px-1 text-xs font-bold text-center outline-none bg-transparent border-0 focus:ring-0 focus:border-0 h-full p-0 font-mono" 
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateBillItem(idx, 'quantity', item.quantity + 1)}
                                                                    className="px-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 font-bold h-full border-l border-zinc-200 transition-colors text-xs select-none active:bg-zinc-200"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">RATE (₹)</span>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                step="0.01" 
                                                                value={item.unitPrice} 
                                                                onChange={e => updateBillItem(idx, 'unitPrice', e.target.value)}
                                                                className="w-24 px-2 py-1 rounded-md border border-zinc-200 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white" 
                                                            />
                                                        </div>
                                                        <span className="ml-auto text-sm font-bold text-zinc-900 font-mono">
                                                            ₹{(item.total || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Summary & Submission Panel */}
                                {billItems.length > 0 && (
                                    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4 shadow-xs">
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Discount presets */}
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Discount Presets</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {[
                                                        { label: '0%', val: 0 },
                                                        { label: '5%', val: 5 },
                                                        { label: '10%', val: 10 },
                                                        { label: '15%', val: 15 },
                                                        { label: '20%', val: 20 },
                                                        { label: '50%', val: 50 }
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            onClick={() => { setDiscountPercent(preset.val); setDiscountAmount(0); }}
                                                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                                                                discountPercent === preset.val && discountAmount === 0
                                                                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                                                                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                                                            }`}
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Custom %</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100" 
                                                    step="0.1" 
                                                    value={discountPercent}
                                                    onChange={e => { setDiscountPercent(Math.max(0, Number(e.target.value) || 0)); setDiscountAmount(0); }}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white" 
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Discount Value (₹)</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="1" 
                                                    value={discountAmount}
                                                    onChange={e => { setDiscountAmount(Math.max(0, Number(e.target.value) || 0)); setDiscountPercent(0); }}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Tax Rate %</label>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.1" 
                                                    value={taxPercent}
                                                    onChange={e => setTaxPercent(Math.max(0, Number(e.target.value) || 0))}
                                                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 bg-white" 
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-zinc-50 rounded-lg p-4 space-y-1.5">
                                            <div className="flex justify-between text-xs text-zinc-500">
                                                <span>Items Subtotal</span>
                                                <span className="font-semibold text-zinc-900 font-mono">₹{subtotal.toFixed(2)}</span>
                                            </div>
                                            {discAmt > 0 && (
                                                <div className="flex justify-between text-xs text-red-600 font-medium">
                                                    <span>Applied Discount ({discPct.toFixed(1)}%)</span>
                                                    <span className="font-semibold font-mono">-₹{discAmt.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {taxAmt > 0 && (
                                                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                                                    <span>Add Tax ({taxPercent.toFixed(1)}%)</span>
                                                    <span className="font-semibold font-mono">+₹{taxAmt.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200/80 pt-2 mt-1 font-mono">
                                                <span>Grand Payable</span>
                                                <span>₹{grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Status and Mode selector button presets */}
                                        <div className="space-y-3 pt-1">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Payment Status</label>
                                                <div className="flex gap-1">
                                                    {['Unpaid', 'Paid', 'Partial'].map(status => (
                                                        <button
                                                            key={status}
                                                            type="button;button"
                                                            onClick={() => {
                                                                setPaymentStatus(status);
                                                                if (status === 'Paid' && !paymentMode) {
                                                                    setPaymentMode('Cash'); // Auto-set Cash mode on marking Paid
                                                                }
                                                            }}
                                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all text-center ${
                                                                paymentStatus === status
                                                                    ? status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs' :
                                                                      status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs' :
                                                                      'bg-red-50 text-red-700 border-red-300 shadow-xs'
                                                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                                            }`}
                                                        >
                                                            {status === 'Paid' ? '✓ Paid' : status === 'Partial' ? '◒ Partial' : '✗ Unpaid'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Payment Mode</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {PAYMENT_MODES.map(mode => (
                                                        <button
                                                            key={mode}
                                                            type="button"
                                                            onClick={() => setPaymentMode(mode)}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex-1 text-center min-w-[70px] ${
                                                                paymentMode === mode
                                                                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                                                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                                            }`}
                                                        >
                                                            {mode === 'Cash' ? '💵 Cash' :
                                                             mode === 'UPI' ? '📱 UPI' :
                                                             mode === 'Card' ? '💳 Card' :
                                                             mode === 'Insurance' ? '🛡️ Ins' :
                                                             '📋 Cheque'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={submitBill}
                                            className="w-full py-3.5 bg-zinc-900 text-zinc-50 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-zinc-900/90 transition-all focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
                                        >
                                            ✅ Generate Bill &bull; ₹{grandTotal.toFixed(2)} [F8]
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
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <Receipt className="h-6 w-6 text-zinc-700" />
                        Billing Ledger
                    </h1>
                    <p className="text-sm text-zinc-500 font-normal">
                        Track customer invoices, payment collections, pending balances, and record payments. (Press [F1] to quick generate)
                    </p>
                </div>
                <div>
                    <button 
                        onClick={() => setView('create')}
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-50 shadow hover:bg-zinc-900/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        Generate New Bill [F1]
                    </button>
                </div>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Invoices', val: summary.totalBills || 0, icon: <Receipt size={16} className="text-zinc-500" /> },
                    { label: 'Revenue Received', val: `₹${(summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={16} className="text-zinc-500" /> },
                    { label: 'Outstanding Balance', val: `₹${(summary.totalPending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <Clock size={16} className="text-zinc-500" /> },
                    { label: 'Unpaid Accounts', val: summary.unpaidBills || 0, icon: <AlertCircle size={16} className="text-zinc-500" /> }
                ].map((c, i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{c.label}</span>
                            {c.icon}
                        </div>
                        <p className="text-lg md:text-xl font-bold tracking-tight text-zinc-900 mt-2 font-mono">{c.val}</p>
                    </div>
                ))}
            </div>

            {/* Filter and Tab Section */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-50/50 p-4 rounded-xl border border-zinc-200/80 shadow-xs">
                {/* Search Input Box */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Search invoices by patient, bill ID..."
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-zinc-200 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-medium text-zinc-900" 
                    />
                </div>

                {/* Switcher Tab Layout */}
                <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    <button 
                        onClick={() => setActiveTab('bills')}
                        className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                            activeTab === 'bills' 
                                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
                        }`}
                    >
                        📄 Customer Bills
                    </button>
                    <button 
                        onClick={() => setActiveTab('final')}
                        className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                            activeTab === 'final' 
                                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/50'
                        }`}
                    >
                        📋 Finalized Bills
                    </button>
                </div>
            </div>

            {/* Invoices List Table */}
            {activeTab === 'bills' && (
                <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/70 border-b border-zinc-200">
                                    {['Invoice ID', 'Patient', 'Service Items', 'Grand Total', 'Payment Status', 'Generation Date', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-zinc-400 text-sm">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin h-5 w-5 border-2 border-zinc-500 border-t-transparent rounded-full" />
                                                <span>Loading invoices ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-zinc-400 text-sm">No invoices found. Generate a new bill to begin.</td>
                                    </tr>
                                ) : (
                                    filteredBills.map(b => {
                                        const count = (() => { try { return JSON.parse(b.billItems || '[]').length; } catch { return 0; } })();
                                        return (
                                            <tr 
                                                key={b.billId} 
                                                onClick={() => { setSelectedBill(b); setView('detail'); }}
                                                className="hover:bg-zinc-50/50 transition-colors cursor-pointer text-sm"
                                            >
                                                <td className="px-4 py-3 font-semibold text-zinc-900">{b.billNumber || `#${b.billId}`}</td>
                                                <td className="px-4 py-3 font-semibold text-zinc-800">{b.patientName || '-'}</td>
                                                <td className="px-4 py-3 text-zinc-500 font-normal">{count} items configured</td>
                                                <td className="px-4 py-3 font-bold text-zinc-900 font-mono">₹{Number(b.grandTotal || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide capitalize ${getStatusStyle(b.paymentStatus)}`}>
                                                        {b.paymentStatus || 'Unpaid'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400 text-xs font-normal">
                                                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => handlePrintInvoice(b)} 
                                                            className="p-1 h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition-all"
                                                            title="Print Invoice"
                                                        >
                                                            <Printer size={13} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownloadInvoicePdf(b)} 
                                                            className="p-1 h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-indigo-500 hover:text-indigo-700 transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={13} />
                                                        </button>
                                                        {b.paymentStatus !== 'Paid' && (
                                                            <button 
                                                                onClick={() => updatePayment(b.billId, 'Paid', 'Cash')}
                                                                className="p-1 h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-emerald-600 hover:text-emerald-700 transition-all"
                                                                title="Mark as Paid"
                                                            >
                                                                <CheckCircle size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Finalized Invoices Section */}
            {activeTab === 'final' && (
                <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/70 border-b border-zinc-200">
                                    {['Invoice ID', 'Patient', 'Grand Total', 'Payment Status', 'Generation Date', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {finalBills.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">No finalized bills available.</td>
                                    </tr>
                                ) : (
                                    finalBills.map(b => (
                                        <tr 
                                            key={b.finalBillId} 
                                            onClick={() => { setSelectedBill(b); setView('detail'); }}
                                            className="hover:bg-zinc-50/50 transition-colors cursor-pointer text-sm"
                                        >
                                            <td className="px-4 py-3 font-semibold text-zinc-900">{b.billNumber || `#${b.finalBillId}`}</td>
                                            <td className="px-4 py-3 font-semibold text-zinc-800">{b.patientName || '-'}</td>
                                            <td className="px-4 py-3 font-bold text-zinc-900 font-mono">₹{Number(b.grandTotal || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide capitalize ${getStatusStyle(b.paymentStatus)}`}>
                                                    {b.paymentStatus || 'Unpaid'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400 text-xs font-normal">
                                                {b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => handlePrintInvoice(b)} 
                                                        className="p-1 h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition-all"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer size={13} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownloadInvoicePdf(b)} 
                                                        className="p-1 h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-indigo-500 hover:text-indigo-700 transition-all"
                                                        title="Download PDF"
                                                    >
                                                        <Download size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingDashboard;
