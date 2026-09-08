import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import {
    Receipt, Plus, Search, Download, CheckCircle,
    Clock, TrendingUp, AlertCircle, Package, FileText,
    Stethoscope, Bed, Pill, ChevronRight, Zap, Layers,
    ArrowLeft, Printer, Loader2, Minus, X,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { StatusPill } from '@/components/app/status-pill';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Insurance', 'Cheque'];
const CATEGORY_ICONS = { OPD: '🏥', IPD: '🛏️', Lab: '🧪', Imaging: '📡', Procedure: '⚕️', Other: '📋' };
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50];

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
        setTimeout(() => { document.getElementById('catalog-search-input')?.focus(); }, 150);
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
                paymentStatus, paymentMode,
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

    /*
     * ── Invoice print / PDF ──
     * Left outside the design system deliberately, same reasoning as the prescription
     * printout: this produces a physical tax invoice a patient keeps for insurance
     * claims, not app UI. Untouched from the pre-makeover version.
     */
    const loadHtml2Pdf = () => {
        return new Promise((resolve, reject) => {
            if (window.html2pdf) { resolve(window.html2pdf); return; }
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

        return { settings, pat, pn, bd, fmt, itemRows, statusClr, logoUrl, sigUrl };
    };

    const getInvoiceHtml = (bill, data) => {
        return '<!DOCTYPE html><html><head><title>Invoice ' + (bill.billNumber || '') + '</title>' +
            '<style>@page{margin:15mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Helvetica Neue,Arial,sans-serif;color:#1a1a1a;padding:30px 40px;max-width:820px;margin:0 auto;font-size:12px;line-height:1.5}table{width:100%;border-collapse:collapse}th{background:#2d3748;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px}td{padding:7px 10px;border-bottom:1px solid #edf2f7;font-size:11px;color:#2d3748}@media print{body{padding:15px}.np{display:none!important}}</style>' +
            '</head><body>' +
            '<div style="display:flex;align-items:center;gap:24px;padding-bottom:14px;border-bottom:2px solid #1a365d;margin-bottom:6px">' +
            (data.logoUrl ? '<img src="' + data.logoUrl + '" style="width:68px;height:68px;object-fit:contain" onerror="this.style.display=\'none\'" />' : '') +
            '<div style="flex:1"><h1 style="font-size:20px;font-weight:800;color:#1a365d;margin-bottom:2px">' + (data.settings.hospitalName || 'Hospital') + '</h1>' +
            '<p style="font-size:10px;color:#555">' + (data.settings.address || '') + '</p>' +
            '<p style="font-size:10px;color:#555">Tel: ' + (data.settings.phoneNumber || '-') + ' | Email: ' + (data.settings.email || '-') + '</p>' +
            (data.settings.gstNumber ? '<p style="font-size:9px;color:#777;margin-top:2px">GSTIN: ' + data.settings.gstNumber + '</p>' : '') +
            '</div></div>' +
            '<div style="background:#1a365d;color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">TAX INVOICE</div>' +
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
            '<table><thead><tr><th style="width:35px">S.No</th><th>Description of Charges</th><th>Department</th><th style="width:50px;text-align:right">Qty</th><th style="width:90px;text-align:right">Unit Rate (INR)</th><th style="width:100px;text-align:right">Amount (INR)</th></tr></thead><tbody>' +
            data.itemRows + '</tbody></table>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:18px"><div style="width:320px">' +
            '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Subtotal</span><span style="font-weight:600;font-family:monospace">' + data.fmt(bill.subtotal) + '</span></div>' +
            (Number(bill.discountAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Less: Discount (' + Number(bill.discountPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#c53030">- ' + data.fmt(bill.discountAmount) + '</span></div>' : '') +
            (Number(bill.taxAmount) > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 14px;font-size:12px;border-bottom:1px dotted #e2e8f0"><span style="color:#4a5568">Add: GST/Tax (' + Number(bill.taxPercent).toFixed(1) + '%)</span><span style="font-weight:600;font-family:monospace;color:#2f855a">+ ' + data.fmt(bill.taxAmount) + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#1a365d;color:#fff;font-size:15px;font-weight:800;border-radius:4px;margin-top:6px"><span>Net Amount Payable</span><span style="font-family:monospace">INR ' + data.fmt(bill.grandTotal) + '</span></div>' +
            '</div></div>' +
            '<div style="display:flex;gap:18px;margin-top:14px;padding:10px 14px;background:#f7fafc;border:1px solid #e2e8f0">' +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Payment Status</div><div style="font-weight:700;margin-top:2px;color:' + data.statusClr + '">' + (bill.paymentStatus || 'Unpaid') + '</div></div>' +
            (bill.paymentMode ? '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Mode</div><div style="font-weight:700;margin-top:2px">' + bill.paymentMode + '</div></div>' : '') +
            '<div style="font-size:10px"><div style="color:#718096;text-transform:uppercase;font-weight:700">Generated</div><div style="font-weight:700;margin-top:2px">' + data.bd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</div></div></div>' +
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
            iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
            iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.write(html); doc.close();
            iframe.contentWindow.focus();
            setTimeout(() => {
                try { iframe.contentWindow.print(); } catch (printErr) { console.error('Iframe print triggered error:', printErr); }
                setTimeout(() => { document.body.removeChild(iframe); }, 1000);
            }, 500);
        } catch (e) {
            console.error('Print failed:', e);
            toast.error('Failed to print invoice.');
        }
    };

    const handleDownloadInvoicePdf = async (bill) => {
        toast.info('Generating PDF download. Please wait...');
        try {
            const data = await fetchInvoicePrintData(bill);
            const html = getInvoiceHtml(bill, data);
            const html2pdf = await loadHtml2Pdf();
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed'; iframe.style.left = '0'; iframe.style.top = '0';
            iframe.style.width = '800px'; iframe.style.height = '1130px'; iframe.style.border = '0';
            iframe.style.zIndex = '-9999'; iframe.style.opacity = '0'; iframe.style.pointerEvents = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.write(html); doc.close();
            await new Promise(resolve => setTimeout(resolve, 500));
            const opt = {
                margin: 10, filename: `Invoice_${bill.billNumber || 'Invoice'}_${bill.billId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };
            await html2pdf().from(iframe.contentWindow.document.body).set(opt).save();
            document.body.removeChild(iframe);
            toast.success('PDF downloaded successfully!');
        } catch (e) {
            console.error('PDF generation failed:', e);
            toast.error('Failed to download PDF.');
        }
    };
    /* ── End invoice print / PDF ── */

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

    // ========== GLOBAL SHORTCUTS ==========
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement?.tagName === 'INPUT' &&
                document.activeElement?.type === 'text' &&
                document.activeElement?.id !== 'patient-search-input' &&
                document.activeElement?.id !== 'catalog-search-input') {
                return;
            }
            if (e.key === 'F1') {
                e.preventDefault();
                if (view !== 'create') setView('create');
                setTimeout(() => { document.getElementById('patient-search-input')?.focus(); }, 100);
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (view === 'create') document.getElementById('catalog-search-input')?.focus();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (view === 'create' && selectedPatient) autoAddFromHistory();
            }
            if (e.key === 'F8') {
                e.preventDefault();
                if (view === 'create' && billItems.length > 0) submitBill();
            }
            if (e.key === 'Escape') {
                if (view === 'create') goBackToList();
                else if (view === 'detail') { setView('list'); setSelectedBill(null); }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, selectedPatient, billItems]);

    // ===============================================
    // VIEW: BILL DETAIL
    // ===============================================
    if (view === 'detail' && selectedBill) {
        const items = (() => { try { return JSON.parse(selectedBill.billItems || '[]'); } catch { return []; } })();
        return (
            <div className="mx-auto max-w-4xl space-y-5">
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedBill(null); }} className="-ml-2 text-muted-foreground">
                        <ArrowLeft /> Back to bills
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(selectedBill)}><Printer /> Print</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadInvoicePdf(selectedBill)}><Download /> PDF</Button>
                        {selectedBill.paymentStatus !== 'Paid' && (
                            <Button size="sm" onClick={() => { updatePayment(selectedBill.billId, 'Paid', 'Cash'); setSelectedBill({ ...selectedBill, paymentStatus: 'Paid' }); }}>
                                <CheckCircle /> Mark as paid
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="space-y-6 p-6 sm:p-8">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">{selectedBill.billNumber || `#${selectedBill.billId}`}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedBill.billType || 'Comprehensive'} bill · {selectedBill.createdAt ? new Date(selectedBill.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Patient</p>
                            <p className="mt-1 text-sm font-semibold">{selectedBill.patientName || '-'}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment status</p>
                            <div className="mt-1.5"><StatusPill status={selectedBill.paymentStatus || 'Unpaid'} /></div>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total amount</p>
                            <p className="tabular mt-1 text-lg font-semibold">₹{Number(selectedBill.grandTotal || 0).toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itemized charges</h4>
                        <div className="divide-y overflow-hidden rounded-lg border">
                            {items.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No items attached to this invoice.</p>
                            ) : items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent/30">
                                    <div>
                                        <span className="font-medium">{it.itemName}</span>
                                        <p className="text-xs text-muted-foreground">Qty {it.quantity} · {it.category}{it.rateType && ` (${it.rateType.replace('_', ' ')})`}</p>
                                    </div>
                                    <span className="tabular font-semibold">₹{Number(it.total || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end border-t pt-4">
                        <div className="w-full max-w-sm space-y-2 rounded-lg border bg-muted/30 p-5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="tabular font-semibold text-foreground">₹{Number(selectedBill.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {Number(selectedBill.discountAmount) > 0 && (
                                <div className="flex justify-between text-xs font-medium text-destructive">
                                    <span>Discount ({Number(selectedBill.discountPercent).toFixed(1)}%)</span>
                                    <span className="tabular font-semibold">-₹{Number(selectedBill.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(selectedBill.taxAmount) > 0 && (
                                <div className="flex justify-between text-xs font-medium text-success">
                                    <span>Tax / GST ({Number(selectedBill.taxPercent).toFixed(1)}%)</span>
                                    <span className="tabular font-semibold">+₹{Number(selectedBill.taxAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="tabular flex justify-between border-t pt-2 text-sm font-semibold">
                                <span>Total payable</span>
                                <span>₹{Number(selectedBill.grandTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    // ===============================================
    // VIEW: CREATE BILL
    // ===============================================
    if (view === 'create') {
        return (
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={goBackToList}><ArrowLeft className="h-4 w-4" /></Button>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Generate invoice</h1>
                            <p className="text-xs text-muted-foreground">
                                {selectedPatient ? `Preparing bill for ${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Search and select a patient to compile items.'}
                            </p>
                        </div>
                    </div>
                    {billItems.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimated total</p>
                                <p className="tabular text-xl font-semibold">₹{grandTotal.toFixed(2)}</p>
                            </div>
                            <Button onClick={submitBill}><CheckCircle /> Generate bill <kbd className="ml-1 opacity-60">F8</kbd></Button>
                        </div>
                    )}
                </div>

                <Card className="flex flex-wrap items-center justify-between gap-3 p-3 text-[11px] text-muted-foreground">
                    <span className="font-medium">Power-user shortcuts:</span>
                    <div className="flex flex-wrap items-center gap-3">
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">F1</kbd> Patient search</span>
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">F2</kbd> Service input</span>
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">Enter</kbd> Add matched service</span>
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">F4</kbd> Auto-fill history</span>
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">F8</kbd> Generate bill</span>
                        <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-semibold text-foreground">Esc</kbd> Exit</span>
                    </div>
                </Card>

                {!selectedPatient ? (
                    <Card className="space-y-4 p-6">
                        <h3 className="text-sm font-semibold">Select patient</h3>
                        <div className="relative max-w-2xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="patient-search-input"
                                value={patientSearch}
                                onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value); }}
                                placeholder="Search by patient name, contact number or code…"
                                className="pl-9" autoFocus
                            />
                            {patients.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 divide-y overflow-y-auto rounded-lg border bg-popover shadow-md scrollbar-thin">
                                    {patients.map(p => (
                                        <button key={p.patientId} onClick={() => selectPatient(p)}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold">
                                                {(p.firstName || '?')[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{p.firstName} {p.lastName}</p>
                                                <p className="tabular text-xs text-muted-foreground">{p.patientCode || `#${p.patientId}`} · {p.gender} · {p.phoneNumber}</p>
                                            </div>
                                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {patients.length === 0 && patientSearch.length === 0 && (
                            <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                                Start typing to look up registered patients. Press <kbd className="rounded border bg-muted px-1 font-semibold text-foreground">F1</kbd> anytime to focus here.
                            </p>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-5">
                        <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                                    {(selectedPatient.firstName || '?')[0]}
                                </div>
                                <div>
                                    <p className="font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                    <p className="tabular text-xs text-muted-foreground">
                                        {selectedPatient.patientCode || `#${selectedPatient.patientId}`} · {selectedPatient.gender} · {selectedPatient.phoneNumber} · Age {selectedPatient.age || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedPatient(null); setPatientHistory(null); setBillItems([]); }}>
                                Change patient
                            </Button>
                        </Card>

                        {loadingHistory ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : patientHistory && (
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {[
                                    { icon: Stethoscope, value: patientHistory.opdVisitCount || 0, label: 'OPD consultations' },
                                    { icon: Bed, value: patientHistory.ipdAdmissionCount || 0, label: 'IPD admissions' },
                                    { icon: Clock, value: patientHistory.totalIpdDays || 0, label: 'IPD stay days' },
                                    { icon: Pill, value: patientHistory.prescriptions?.length || 0, label: 'Active scripts' },
                                ].map((s, i) => (
                                    <Card key={i} className="p-3 text-center">
                                        <s.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                                        <p className="tabular text-lg font-semibold">{s.value}</p>
                                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                                    </Card>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={autoAddFromHistory} className="gap-1.5" title="Shortcut: F4">
                                <Zap className="fill-current" /> Auto-fill from history <kbd className="opacity-60">F4</kbd>
                            </Button>
                            <Button variant="outline" onClick={addCustomItem}><Plus /> Add custom charge</Button>
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                            {/* Service catalog */}
                            <Card className="space-y-4 p-5 lg:col-span-2">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Package className="h-3.5 w-3.5" /> Hospital service rates <kbd className="opacity-60 normal-case">F2</kbd>
                                </p>
                                <Input
                                    id="catalog-search-input"
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (filteredCatalog.length > 0) {
                                                addFromCatalog(filteredCatalog[0]);
                                                setCatalogSearch('');
                                                toast.success(`Added ${filteredCatalog[0].serviceName}`);
                                            } else {
                                                toast.error('No service matched.');
                                            }
                                        }
                                    }}
                                    placeholder="Type keyword & press Enter to add…"
                                />
                                <div className="flex flex-wrap gap-1">
                                    <button onClick={() => setSelectedCategory('')}
                                            className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors', !selectedCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>
                                        All
                                    </button>
                                    {categories.map(c => (
                                        <button key={c} onClick={() => setSelectedCategory(c === selectedCategory ? '' : c)}
                                                className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors', selectedCategory === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>
                                            {CATEGORY_ICONS[c]} {c}
                                        </button>
                                    ))}
                                </div>
                                <div className="max-h-[50vh] space-y-1 overflow-y-auto scrollbar-thin">
                                    {filteredCatalog.map(s => (
                                        <button key={s.serviceId} onClick={() => addFromCatalog(s)}
                                                className="group flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-accent">
                                            <div>
                                                <p className="text-xs font-semibold">{s.serviceName}</p>
                                                <p className="text-[10px] uppercase text-muted-foreground">{s.category} · {s.rateType}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="tabular text-xs font-semibold">₹{Number(s.rate).toFixed(2)}</span>
                                                <Plus className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Cart + totals */}
                            <div className="space-y-4 lg:col-span-3">
                                <Card className="space-y-4 p-5">
                                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Layers className="h-3.5 w-3.5" /> Invoice cart ({billItems.length})
                                    </p>
                                    {billItems.length === 0 ? (
                                        <EmptyState icon={FileText} title="No services selected yet" description="Add items from the catalog or auto-fill from history." />
                                    ) : (
                                        <div className="max-h-[45vh] space-y-2.5 overflow-y-auto scrollbar-thin">
                                            {billItems.map((item, idx) => (
                                                <div key={idx} className={cn('rounded-lg border p-3.5', item.autoAdded && 'border-info/30 bg-info-subtle/30')}>
                                                    <div className="mb-3 flex items-start justify-between gap-4">
                                                        {item.isCustom ? (
                                                            <input
                                                                value={item.itemName}
                                                                onChange={e => updateBillItem(idx, 'itemName', e.target.value)}
                                                                placeholder="Type custom charge description…"
                                                                className="flex-1 border-b border-dashed bg-transparent pb-0.5 text-xs font-semibold outline-none placeholder:text-muted-foreground focus:border-foreground"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <div>
                                                                <p className="text-xs font-semibold">{item.itemName}</p>
                                                                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                                                    {item.category} · {item.rateType}{item.autoAdded ? ' · auto' : ''}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button onClick={() => removeBillItem(idx)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</span>
                                                            <div className="flex h-7 items-center overflow-hidden rounded-md border">
                                                                <button type="button" onClick={() => updateBillItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                                                        className="flex h-full items-center border-r bg-muted px-2 text-muted-foreground hover:bg-accent">
                                                                    <Minus className="h-3 w-3" />
                                                                </button>
                                                                <input type="number" min="1" value={item.quantity} onChange={e => updateBillItem(idx, 'quantity', e.target.value)}
                                                                       className="tabular h-full w-10 border-0 bg-transparent p-0 text-center text-xs font-semibold outline-none" />
                                                                <button type="button" onClick={() => updateBillItem(idx, 'quantity', item.quantity + 1)}
                                                                        className="flex h-full items-center border-l bg-muted px-2 text-muted-foreground hover:bg-accent">
                                                                    <Plus className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Rate ₹</span>
                                                            <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateBillItem(idx, 'unitPrice', e.target.value)} className="h-7 w-24 text-xs" />
                                                        </div>
                                                        <span className="tabular ml-auto text-sm font-semibold">₹{(item.total || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {billItems.length > 0 && (
                                    <Card className="space-y-4 p-5">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2 space-y-1.5">
                                                <Label className="block">Discount presets</Label>
                                                <div className="flex flex-wrap gap-1">
                                                    {DISCOUNT_PRESETS.map(val => (
                                                        <button key={val} type="button" onClick={() => { setDiscountPercent(val); setDiscountAmount(0); }}
                                                                className={cn(
                                                                    'rounded border px-2 py-1 text-[10px] font-semibold transition-colors',
                                                                    discountPercent === val && discountAmount === 0 ? 'border-foreground bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent',
                                                                )}>
                                                            {val}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="mb-1.5 block">Custom %</Label>
                                                <Input type="number" min="0" max="100" step="0.1" value={discountPercent}
                                                       onChange={e => { setDiscountPercent(Math.max(0, Number(e.target.value) || 0)); setDiscountAmount(0); }} className="h-8 text-xs" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="mb-1.5 block">Discount value (₹)</Label>
                                                <Input type="number" min="0" step="1" value={discountAmount}
                                                       onChange={e => { setDiscountAmount(Math.max(0, Number(e.target.value) || 0)); setDiscountPercent(0); }} className="h-8 text-xs" />
                                            </div>
                                            <div>
                                                <Label className="mb-1.5 block">Tax rate %</Label>
                                                <Input type="number" min="0" step="0.1" value={taxPercent}
                                                       onChange={e => setTaxPercent(Math.max(0, Number(e.target.value) || 0))} className="h-8 text-xs" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 rounded-lg bg-muted/40 p-4">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Items subtotal</span>
                                                <span className="tabular font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
                                            </div>
                                            {discAmt > 0 && (
                                                <div className="flex justify-between text-xs font-medium text-destructive">
                                                    <span>Discount ({discPct.toFixed(1)}%)</span>
                                                    <span className="tabular font-semibold">-₹{discAmt.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {taxAmt > 0 && (
                                                <div className="flex justify-between text-xs font-medium text-success">
                                                    <span>Tax ({taxPercent.toFixed(1)}%)</span>
                                                    <span className="tabular font-semibold">+₹{taxAmt.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="tabular flex justify-between border-t pt-2 text-base font-semibold">
                                                <span>Grand payable</span>
                                                <span>₹{grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="block">Payment status</Label>
                                                <div className="flex gap-1">
                                                    {['Unpaid', 'Paid', 'Partial'].map(status => (
                                                        <button key={status} type="button"
                                                                onClick={() => { setPaymentStatus(status); if (status === 'Paid' && !paymentMode) setPaymentMode('Cash'); }}
                                                                className={cn(
                                                                    'flex-1 rounded-lg border py-1.5 text-center text-xs font-semibold transition-colors',
                                                                    paymentStatus === status
                                                                        ? status === 'Paid' ? 'border-success/40 bg-success-subtle text-success'
                                                                        : status === 'Partial' ? 'border-warning/40 bg-warning-subtle text-warning'
                                                                        : 'border-destructive/40 bg-destructive-subtle text-destructive'
                                                                        : 'bg-muted text-muted-foreground hover:bg-accent',
                                                                )}>
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="block">Payment mode</Label>
                                                <div className="flex flex-wrap gap-1">
                                                    {PAYMENT_MODES.map(mode => (
                                                        <button key={mode} type="button" onClick={() => setPaymentMode(mode)}
                                                                className={cn(
                                                                    'min-w-[70px] flex-1 rounded-lg border px-2.5 py-1.5 text-center text-[11px] font-medium transition-colors',
                                                                    paymentMode === mode ? 'border-foreground bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent',
                                                                )}>
                                                        {mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Button onClick={submitBill} size="lg" className="w-full">
                                            Generate bill · ₹{grandTotal.toFixed(2)} <kbd className="opacity-60">F8</kbd>
                                        </Button>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ===============================================
    // VIEW: BILL LIST
    // ===============================================
    const BillsTable = ({ rows, onSelect, showItemCount }) => (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6">Invoice</TableHead>
                            <TableHead>Patient</TableHead>
                            {showItemCount && <TableHead className="hidden md:table-cell">Items</TableHead>}
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden lg:table-cell">Date</TableHead>
                            <TableHead className="pr-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(b => {
                            const count = showItemCount ? (() => { try { return JSON.parse(b.billItems || '[]').length; } catch { return 0; } })() : null;
                            return (
                                <TableRow key={b.billId || b.finalBillId} onClick={() => onSelect(b)} className="cursor-pointer">
                                    <TableCell className="pl-6 font-medium">{b.billNumber || `#${b.billId || b.finalBillId}`}</TableCell>
                                    <TableCell>{b.patientName || '-'}</TableCell>
                                    {showItemCount && <TableCell className="hidden text-muted-foreground md:table-cell">{count} items</TableCell>}
                                    <TableCell className="tabular font-semibold">₹{Number(b.grandTotal || 0).toFixed(2)}</TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}><StatusPill status={b.paymentStatus || 'Unpaid'} /></TableCell>
                                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                    </TableCell>
                                    <TableCell className="pr-6 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => handlePrintInvoice(b)} title="Print invoice"><Printer className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon-sm" onClick={() => handleDownloadInvoicePdf(b)} title="Download PDF"><Download className="h-3.5 w-3.5" /></Button>
                                            {showItemCount && b.paymentStatus !== 'Paid' && (
                                                <Button variant="ghost" size="icon-sm" onClick={() => updatePayment(b.billId, 'Paid', 'Cash')} title="Mark as paid" className="text-success hover:bg-success-subtle">
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title="Billing ledger"
                description="Invoices, collections and pending balances. Press F1 to quick-generate."
                icon={Receipt}
                actions={<Button onClick={() => setView('create')}><Zap /> Generate bill <kbd className="opacity-60">F1</kbd></Button>}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Total invoices" value={summary.totalBills || 0} icon={Receipt} />
                <StatCard label="Revenue received" value={`₹${(summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={TrendingUp} tone="success" />
                <StatCard label="Outstanding balance" value={`₹${(summary.totalPending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Clock} tone={summary.totalPending > 0 ? 'warning' : 'neutral'} />
                <StatCard label="Unpaid accounts" value={summary.unpaidBills || 0} icon={AlertCircle} tone={summary.unpaidBills > 0 ? 'critical' : 'neutral'} />
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search invoices by patient or bill ID…" className="pl-9" />
                </div>
                <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
                    {[['bills', 'Customer bills'], ['final', 'Finalized bills']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} aria-pressed={activeTab === key}
                                className={cn('rounded-md px-4 py-2 text-xs font-medium transition-colors', activeTab === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'bills' && (
                loading ? (
                    <Card className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>
                ) : filteredBills.length === 0 ? (
                    <Card><EmptyState icon={Receipt} title="No invoices found" description="Generate a new bill to begin." /></Card>
                ) : (
                    <BillsTable rows={filteredBills} onSelect={(b) => { setSelectedBill(b); setView('detail'); }} showItemCount />
                )
            )}

            {activeTab === 'final' && (
                finalBills.length === 0 ? (
                    <Card><EmptyState icon={FileText} title="No finalized bills available" /></Card>
                ) : (
                    <BillsTable rows={finalBills} onSelect={(b) => { setSelectedBill(b); setView('detail'); }} />
                )
            )}
        </div>
    );
};

export default BillingDashboard;
