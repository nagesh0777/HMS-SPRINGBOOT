import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    BadgeIndianRupee,
    Bed,
    Bot,
    Building2,
    CalendarCheck,
    Check,
    ClipboardCheck,
    CreditCard,
    HeartPulse,
    LockKeyhole,
    Mail,
    PhoneCall,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    Users,
    Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const FORM_CACHE_KEY = 'trikaar_subscription_form_cache';
const DEMO_CACHE_KEY = 'trikaar_demo_form_cache';

const loadRazorpay = () =>
    new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const highlights = [
    { icon: <Users size={18} />, label: 'Patient registration', text: 'Fast OPD registration, profiles, history, and search.' },
    { icon: <CalendarCheck size={18} />, label: 'Appointments', text: 'Doctor-wise booking, daily queue, and status tracking.' },
    { icon: <Stethoscope size={18} />, label: 'Doctor workspace', text: 'Consultation queue, prescriptions, follow-ups, and patient timeline.' },
    { icon: <BadgeIndianRupee size={18} />, label: 'Billing', text: 'Service rates, invoices, payments, dues, and final bills.' },
    { icon: <Users size={18} />, label: 'Employee management', text: 'Staff records, attendance, access modules, and role-wise control.' },
    { icon: <Bot size={18} />, label: 'AI-powered HMS', text: 'Premium plan adds AI copilot for workflow help and owner insights with role-based privacy controls.' },
];

const outcomes = [
    'Launch a next-gen all-in-one HMS in one day',
    'Reduce front-desk confusion during peak OPD hours',
    'Give doctors and employees one clean workbench',
    'Track billing, dues, admissions, employees, and AI insights from one place',
];

const SubscriptionRegister = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('STANDARD');
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [demoMessage, setDemoMessage] = useState('');
    const [demoError, setDemoError] = useState('');
    const [checkout, setCheckout] = useState(null);
    const [otp, setOtp] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpStatus, setOtpStatus] = useState({ verified: false, token: '', message: '' });
    const [otpRequested, setOtpRequested] = useState(false);
    const [testOtpCode, setTestOtpCode] = useState('');
    const [form, setForm] = useState({
        hospitalName: '',
        adminName: '',
        contactNumber: '',
        email: '',
        address: '',
        adminUsername: '',
        adminPassword: '',
        promoCode: '',
    });
    const [demoForm, setDemoForm] = useState({
        hospitalName: '',
        contactName: '',
        phone: '',
        email: '',
        city: '',
        hospitalType: '',
        preferredPlan: 'PREMIUM',
        preferredTime: '',
        message: '',
    });

    useEffect(() => {
        try {
            const cachedForm = JSON.parse(localStorage.getItem(FORM_CACHE_KEY) || 'null');
            if (cachedForm) setForm((prev) => ({ ...prev, ...cachedForm }));
            const cachedDemo = JSON.parse(localStorage.getItem(DEMO_CACHE_KEY) || 'null');
            if (cachedDemo) setDemoForm((prev) => ({ ...prev, ...cachedDemo }));
        } catch {
            // Ignore broken local draft data.
        }
    }, []);

    useEffect(() => {
        axios.get('/api/Subscriptions/Plans')
            .then((res) => {
                if (res.data.Results) {
                    setPlans(res.data.Results);
                    if (!res.data.Results.some((plan) => plan.code === 'STANDARD')) {
                        setSelectedPlan(res.data.Results[0]?.code || 'STANDARD');
                    }
                }
            })
            .catch(() => setError('Could not load subscription plans.'));
    }, []);

    useEffect(() => {
        localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(form));
    }, [form]);

    useEffect(() => {
        localStorage.setItem(DEMO_CACHE_KEY, JSON.stringify(demoForm));
    }, [demoForm]);

    const activePlan = useMemo(
        () => plans.find((p) => p.code === selectedPlan) || plans[0],
        [plans, selectedPlan]
    );

    const price = activePlan ? (billingCycle === 'yearly' ? activePlan.yearlyPrice : activePlan.monthlyPrice) : 0;
    const monthlyEquivalent = activePlan?.yearlyPrice ? Math.round(activePlan.yearlyPrice / 12) : 0;

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === 'email') {
            setOtp('');
            setOtpRequested(false);
            setTestOtpCode('');
            setOtpStatus({ verified: false, token: '', message: '' });
        }
    };

    const handleDemoChange = (field, value) => {
        setDemoForm((prev) => ({ ...prev, [field]: value }));
    };

    const scrollToCheckout = () => {
        document.getElementById('subscription-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToDemo = () => {
        document.getElementById('request-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const verifyPayment = async (payment) => {
        const res = await axios.post('/api/Subscriptions/VerifyPayment', {
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
        });

        if (res.data.ErrorMessage) {
            setError(res.data.ErrorMessage);
            return;
        }

        setMessage('Subscription activated. Your admin login is ready.');
        localStorage.removeItem(FORM_CACHE_KEY);
        setCheckout(null);
        setTimeout(() => navigate('/login'), 1400);
    };

    const startRazorpay = async (payment) => {
        if (payment.mockMode) {
            setCheckout(payment);
            setMessage('Test checkout created. Activate it below while Razorpay keys are pending.');
            return;
        }

        const loaded = await loadRazorpay();
        if (!loaded) {
            setError('Razorpay checkout could not load. Please try again.');
            return;
        }

        const options = {
            key: payment.keyId,
            amount: payment.amount,
            currency: payment.currency,
            name: 'Trikaar HMS',
            description: `${activePlan?.name || 'HMS'} subscription`,
            order_id: payment.orderId,
            handler: verifyPayment,
            prefill: {
                name: form.adminName,
                email: form.email,
                contact: form.contactNumber,
            },
            theme: { color: '#0f766e' },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setCheckout(null);

        if (!otpStatus.verified || !otpStatus.token) {
            setError('Please verify your email OTP before checkout.');
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post('/api/Subscriptions/Register', {
                ...form,
                planCode: selectedPlan,
                billingCycle,
                emailOtpToken: otpStatus.token,
            });

            if (res.data.ErrorMessage) {
                setError(res.data.ErrorMessage);
                return;
            }

            const result = res.data.Results;
            if (result.promoApplied) {
                setMessage(result.message || 'WELCOME applied. Your admin login is ready.');
                localStorage.removeItem(FORM_CACHE_KEY);
                setTimeout(() => navigate('/login'), 1600);
                return;
            }

            await startRazorpay(result.payment);
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || 'Registration failed. Please check details and try again.');
        } finally {
            setLoading(false);
        }
    };

    const sendEmailOtp = async () => {
        setError('');
        setMessage('');
        setOtp('');
        setTestOtpCode('');
        setOtpStatus({ verified: false, token: '', message: '' });
        if (!form.email.trim()) {
            setError('Enter your email address first.');
            return;
        }

        setOtpSending(true);
        try {
            const res = await axios.post('/api/Otp/SendEmail', { email: form.email });
            if (res.data.ErrorMessage) {
                setError(res.data.ErrorMessage);
                return;
            }
            const result = res.data.Results;
            setOtpRequested(true);
            
            if (result?.mockMode && result?.otpCode) {
                setTestOtpCode(result.otpCode);
            } else {
                setTestOtpCode('');
            }

            setOtpStatus({
                verified: false,
                token: '',
                message: result?.mockMode
                    ? 'OTP retrieved automatically under Sandbox Mode. Autofill below to complete registration!'
                    : 'OTP sent to your email. If you request again, enter the code from the newest email only.',
            });
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || 'Could not send OTP.');
        } finally {
            setOtpSending(false);
        }
    };

    const verifyEmailOtp = async () => {
        setError('');
        setMessage('');
        if (!form.email.trim() || otp.trim().length !== 6) {
            setError('Enter the 6 digit OTP sent to your email.');
            return;
        }

        setOtpVerifying(true);
        try {
            const res = await axios.post('/api/Otp/VerifyEmail', { email: form.email, otp });
            if (res.data.ErrorMessage) {
                setError(res.data.ErrorMessage);
                return;
            }
            setOtpStatus({
                verified: true,
                token: res.data.Results.verificationToken,
                message: 'Email verified. You can continue checkout.',
            });
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || 'Could not verify OTP.');
        } finally {
            setOtpVerifying(false);
        }
    };

    const activateMockPayment = async () => {
        if (!checkout) return;
        setLoading(true);
        setError('');
        try {
            await verifyPayment({
                razorpay_order_id: checkout.orderId,
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_signature: 'mock_signature',
            });
        } finally {
            setLoading(false);
        }
    };

    const submitDemoRequest = async (e) => {
        e.preventDefault();
        setDemoError('');
        setDemoMessage('');
        setDemoLoading(true);
        try {
            const res = await axios.post('/api/Subscriptions/RequestDemo', demoForm);
            if (res.data.ErrorMessage) {
                setDemoError(res.data.ErrorMessage);
                return;
            }
            setDemoMessage(res.data.Results?.message || 'Demo request sent. We will contact you shortly.');
            localStorage.removeItem(DEMO_CACHE_KEY);
            setDemoForm({
                hospitalName: '',
                contactName: '',
                phone: '',
                email: '',
                city: '',
                hospitalType: '',
                preferredPlan: 'PREMIUM',
                preferredTime: '',
                message: '',
            });
        } catch (err) {
            setDemoError(err.response?.data?.ErrorMessage || 'Could not send demo request.');
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-tr from-[#f4f8f7] via-white to-[#edf4f2] text-slate-900 font-sans relative overflow-hidden selection:bg-teal-100 selection:text-teal-900">
            {/* Soft Ambient Glow Orbs */}
            <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] rounded-full bg-teal-200/20 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[40%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-200/10 blur-[110px] pointer-events-none" />
            
            <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/70 backdrop-blur-md transition-all duration-300">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2.5 font-black text-slate-900 text-lg">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-teal-800 text-white shadow-md shadow-teal-700/20">
                            <HeartPulse size={22} className="stroke-[2.5]" />
                        </span>
                        <span className="tracking-tight">Trikaar <span className="text-teal-700 font-medium">HMS</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={scrollToCheckout}
                            className="rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-teal-700/10 transition-all duration-300 hover:from-teal-800 hover:to-teal-900 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Start Subscription
                        </button>
                        <button
                            type="button"
                            onClick={scrollToDemo}
                            className="hidden rounded-xl border border-teal-200 bg-teal-50/50 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-teal-800 hover:bg-teal-100/70 transition-all duration-300 hover:-translate-y-0.5 sm:inline-flex"
                        >
                            Request Demo
                        </button>
                        <Link to="/login" className="hidden rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5 sm:inline-flex">
                            Existing User
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative z-10">
                <section className="border-b border-slate-100 bg-white/40 backdrop-blur-sm">
                    <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-4 py-12 lg:grid-cols-[1fr_480px]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-150 bg-teal-50/70 px-4.5 py-2 text-xs font-extrabold uppercase tracking-widest text-teal-800 shadow-sm animate-pulse-slow">
                                <Sparkles size={14} className="text-teal-600 animate-spin-slow" />
                                First launch pricing for Indian clinics
                            </div>
                            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
                                Next-gen AI-powered <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-indigo-700 bg-clip-text text-transparent">all-in-one HMS</span>, starting at ₹1,999/month.
                            </h1>
                            <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-slate-500">
                                Trikaar HMS is built for clinics, nursing homes, and hospitals that want patients, doctors, billing, employees, reports, and AI in one connected system. Standard runs daily operations; Premium adds beds, analytics, priority support, and owner intelligence.
                            </p>

                            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={scrollToCheckout}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 px-7 py-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-teal-700/25 hover:from-teal-800 hover:to-teal-900 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <CreditCard size={18} /> Buy and Create Login
                                </button>
                                <button
                                    type="button"
                                    onClick={scrollToDemo}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <PhoneCall size={18} /> Request Demo
                                </button>
                                <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-250 bg-amber-50/70 px-7 py-4 text-xs font-extrabold uppercase tracking-wider text-amber-800 shadow-sm animate-pulse-slow">
                                    <Zap size={18} className="text-amber-600 animate-pulse" /> Launch offer: WELCOME gives 1 month free
                                </div>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                                {outcomes.map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-sm p-4.5 text-sm font-bold text-slate-700 shadow-sm hover:shadow-md hover:border-teal-100/60 hover:-translate-y-0.5 transition-all duration-300">
                                        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 mt-0.5">
                                            <Check size={13} className="stroke-[3.5]" />
                                        </span>
                                        <span className="leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-teal-950/20 relative group overflow-hidden transition-all duration-500">
                            {/* Accent Glow */}
                            <div className="absolute top-[-50%] right-[-50%] w-[120%] h-[120%] rounded-full bg-teal-500/5 blur-[85px] pointer-events-none group-hover:bg-teal-500/10 transition-all duration-500" />
                            
                            <div className="rounded-2xl bg-white p-5 border border-slate-100/50 shadow-inner relative z-10">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Command Center</p>
                                        <h2 className="text-lg font-black text-slate-900 leading-tight">Today at City Care</h2>
                                    </div>
                                    <span className="rounded-full bg-emerald-55 bg-emerald-50 border border-emerald-150 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 animate-pulse-slow">
                                        Active AI
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {[
                                        ['OPD Queue', '38', '12 waiting'],
                                        ['Collections', '₹42,800', '8 pending'],
                                        ['Beds', '17/24', '71% occupied'],
                                        ['Employees', '18', '3 on leave'],
                                    ].map(([label, value, note]) => (
                                        <div key={label} className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/50 p-3.5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                                            <p className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">{value}</p>
                                            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                                                {note}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-800">
                                        <Bot size={18} className="text-blue-600 shrink-0 animate-bounce-slow" /> AI Copilot
                                    </div>
                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-blue-900">
                                        Billing details are protected by role. Staff get workflow guidance; owners get operating insights.
                                    </p>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {['Dr. Mehta consultation resumed', 'Invoice HMS-2043 paid by UPI', 'Bed B-12 ready for discharge'].map((item) => (
                                        <div key={item} className="flex items-center gap-2.5 rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-600">
                                            <ShieldCheck size={15} className="text-teal-600 shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-slate-100 bg-gradient-to-b from-white/20 to-slate-50/40 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-4 py-16">
                        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-teal-700">What Hospitals Get</p>
                                <h2 className="mt-2.5 text-3xl font-black tracking-tight leading-tight md:text-4xl text-slate-900">Not just registration. A full operating system.</h2>
                            </div>
                            <p className="max-w-xl text-sm font-semibold leading-relaxed text-slate-500">
                                Each module is connected, so front desk, doctors, billing, ward, employees, and management work on the same live data.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {highlights.map((item) => (
                                <div key={item.label} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl hover:border-teal-150/60 transition-all duration-300 hover:-translate-y-1">
                                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition-all duration-300 group-hover:bg-teal-700 group-hover:text-white group-hover:scale-110 shadow-sm">
                                        {item.icon}
                                    </div>
                                    <h3 className="font-black text-slate-900 group-hover:text-teal-900 transition-all duration-200">{item.label}</h3>
                                    <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-500">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="subscription-checkout" className="bg-white/60 backdrop-blur-sm relative overflow-hidden py-16">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_450px]">
                        <div>
                            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-teal-700">Simple Launch Pricing</p>
                                    <h2 className="mt-2.5 text-3xl font-black tracking-tight text-slate-900 leading-tight">Two plans. Billed monthly or yearly.</h2>
                                </div>
                                <div className="inline-flex w-fit rounded-2xl border border-slate-100 bg-slate-100/80 p-1 backdrop-blur-sm">
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-white text-teal-850 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-white text-teal-850 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>

                            <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-2.5 text-xs font-bold text-teal-800 shadow-sm">
                                <ClipboardCheck size={16} className="text-teal-700 animate-pulse" />
                                <span>Drafts are securely auto-saved on this device</span>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                {plans.map((plan) => {
                                    const selected = selectedPlan === plan.code;
                                    const planPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                                    const planMonthlyEquivalent = plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : 0;
                                    return (
                                        <button
                                            type="button"
                                            key={plan.code}
                                            onClick={() => setSelectedPlan(plan.code)}
                                            className={`rounded-3xl border p-6 text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                                                selected
                                                    ? 'border-teal-500 bg-gradient-to-br from-teal-50/30 to-white shadow-xl shadow-teal-500/5 ring-1 ring-teal-500'
                                                    : 'border-slate-200/80 bg-white hover:border-slate-350 hover:shadow-lg hover:-translate-y-1'
                                            }`}
                                        >
                                            {selected && (
                                                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
                                                    <div className="absolute top-2 right-[-24px] bg-gradient-to-r from-teal-700 to-teal-800 text-white font-extrabold text-[9px] py-1 px-8 rotate-45 text-center shadow-sm uppercase tracking-wider">
                                                        Selected
                                                    </div>
                                                </div>
                                            )}
                                            <div className="w-full">
                                                <div className="flex min-h-[64px] items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 leading-tight">{plan.name}</h3>
                                                        <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-400">{plan.description}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-6 flex items-end gap-1 border-b border-slate-100 pb-4">
                                                    <span className="text-4xl font-black tracking-tight text-slate-900">₹{planPrice}</span>
                                                    <span className="pb-1 text-xs font-bold text-slate-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                                </div>
                                                {billingCycle === 'yearly' && (
                                                    <p className="mt-2.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                                                        Equivalent to about ₹{planMonthlyEquivalent}/month
                                                    </p>
                                                )}
                                                <div className="mt-4">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                                        plan.aiIncluded
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {plan.aiIncluded ? '✨ AI Core Copilot Included' : 'Standard Core Only'}
                                                    </span>
                                                </div>
                                                <p className="mt-4 text-xs font-bold leading-relaxed text-slate-500 border-t border-slate-100 pt-3">{plan.bestFor}</p>

                                                <div className="mt-5 space-y-3">
                                                    {(plan.sellingPoints || []).map((point) => (
                                                        <div key={point} className="flex items-start gap-2.5 text-xs font-bold text-slate-600">
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 mt-0.5">
                                                                <Check size={11} className="stroke-[3.5]" />
                                                            </span>
                                                            <span className="leading-snug">{point}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                                    <p className="mb-2.5 text-[9px] font-black uppercase tracking-wider text-slate-450">Usage Limits & Caps</p>
                                                    {(plan.limits || []).map((limit) => (
                                                        <div key={limit} className="flex items-center gap-2 py-1 text-xs font-bold text-slate-600">
                                                            <ShieldCheck size={13} className="text-teal-600 shrink-0" />
                                                            <span className="truncate">{limit}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-450">Included Modules</p>
                                                    <div className="grid gap-2 grid-cols-2">
                                                        {plan.modules.map((module) => (
                                                            <div key={module} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                                <Check size={12} className="text-teal-600 shrink-0" />
                                                                <span className="truncate">{module}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-amber-100/30 p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-black text-amber-900 uppercase tracking-wide">
                                    <Sparkles size={18} className="text-amber-600 animate-pulse" /> Launch Customer Discount
                                </div>
                                <p className="mt-2 text-xs font-semibold leading-relaxed text-amber-800">
                                    Apply the coupon code <span className="px-2 py-0.5 bg-amber-200/50 rounded font-mono font-black text-amber-955">WELCOME</span> during registration to activate any selected plan free for one month.
                                </p>
                            </div>
                        </div>

                        <aside className="lg:sticky lg:top-24 lg:self-start">
                            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-teal-955/5 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-teal-950/10">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700" />
                                
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-teal-800 text-white shadow-md shadow-teal-700/20">
                                        <Building2 size={22} className="stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected Plan</p>
                                        <h2 className="text-xl font-black text-slate-900 leading-tight">{activePlan?.name || 'Select Plan'}</h2>
                                    </div>
                                </div>

                                <div className="mb-6 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 p-5 border border-slate-100">
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black tracking-tight text-slate-900">₹{price}</span>
                                        <span className="pb-1 text-xs font-bold text-slate-400">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                    </div>
                                    <p className="mt-1.5 text-xs font-semibold text-slate-500 leading-relaxed">
                                        {billingCycle === 'yearly' ? `About ₹${monthlyEquivalent}/month, billed annually.` : 'Instantly set up your clinic workspace.'}
                                    </p>
                                    {activePlan?.limits?.length > 0 && (
                                        <div className="mt-4 space-y-1.5 border-t border-slate-200/50 pt-3">
                                            {activePlan.limits.slice(0, 3).map((limit) => (
                                                <div key={limit} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                    <ShieldCheck size={14} className="text-teal-600 shrink-0" />
                                                    <span className="truncate">{limit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">Hospital / Clinic Info</label>
                                        <div className="grid gap-2.5">
                                            <input required value={form.hospitalName} onChange={(e) => handleChange('hospitalName', e.target.value)} placeholder="Clinic / Hospital name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                            <input required value={form.adminName} onChange={(e) => handleChange('adminName', e.target.value)} placeholder="Owner / Admin full name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                            <input required value={form.contactNumber} onChange={(e) => handleChange('contactNumber', e.target.value)} placeholder="Mobile number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">Email Verification</label>
                                        <div className="grid gap-2.5">
                                            <div className="flex gap-2">
                                                <input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email address" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                                <button type="button" onClick={sendEmailOtp} disabled={otpSending || otpStatus.verified} className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-black transition-all active:scale-95 disabled:opacity-60">
                                                    {otpSending ? 'Sending' : otpStatus.verified ? 'Verified' : otpRequested ? 'Resend' : 'Send OTP'}
                                                </button>
                                            </div>

                                            {/* Beautiful Developer Sandbox OTP Banner */}
                                            {testOtpCode && !otpStatus.verified && (
                                                <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/90 to-emerald-50/70 p-4 shadow-md text-xs leading-relaxed text-teal-950 flex flex-col gap-2.5 animate-pulse">
                                                    <div className="flex items-center gap-1.5 font-black text-teal-900">
                                                        <Sparkles size={14} className="text-teal-700 animate-spin-slow" />
                                                        Developer Sandbox Mode Active
                                                    </div>
                                                    <p className="text-slate-600 font-medium">SMTP mail server is unconfigured, so we retrieved your test OTP directly from the server:</p>
                                                    <div className="flex items-center justify-between gap-2 bg-white/70 backdrop-blur-sm p-2 rounded-xl border border-teal-100">
                                                        <span className="px-3 py-1 font-mono text-base font-black bg-teal-800 text-white rounded-lg shadow-sm tracking-wider select-all">{testOtpCode}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(testOtpCode);
                                                                setOtp(testOtpCode);
                                                            }}
                                                            className="text-[10px] text-teal-800 hover:text-teal-900 font-extrabold bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm"
                                                        >
                                                            Autofill & Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit OTP" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                                <button type="button" onClick={verifyEmailOtp} disabled={otpVerifying || otpStatus.verified} className="shrink-0 rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-teal-800 hover:bg-teal-100 transition-all active:scale-95 disabled:opacity-60">
                                                    {otpVerifying ? 'Checking' : 'Verify'}
                                                </button>
                                            </div>
                                            
                                            {otpStatus.message && (
                                                <div className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2 ${
                                                    otpStatus.verified 
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                                        : 'bg-amber-50/70 text-amber-800 border border-amber-100'
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${otpStatus.verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    <span>{otpStatus.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">Account & Security</label>
                                        <div className="grid gap-2.5">
                                            <input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Clinic Address / City" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                            <input required value={form.adminUsername} onChange={(e) => handleChange('adminUsername', e.target.value)} placeholder="Create admin username" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                            <input required type="password" value={form.adminPassword} onChange={(e) => handleChange('adminPassword', e.target.value)} placeholder="Create admin password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                            <input value={form.promoCode} onChange={(e) => handleChange('promoCode', e.target.value.toUpperCase())} placeholder="Promo code (e.g. WELCOME)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all uppercase" />
                                        </div>
                                    </div>
                                </div>

                                {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
                                {message && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

                                <button disabled={loading || !otpStatus.verified} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 px-5 py-4 text-sm font-black uppercase tracking-wider text-white shadow-md shadow-teal-700/10 hover:from-teal-800 hover:to-teal-900 hover:shadow-lg transition-all active:scale-95 disabled:opacity-60">
                                    <CreditCard size={18} /> {loading ? 'Processing...' : form.promoCode === 'WELCOME' ? 'Activate Free Month' : `Pay ₹${price} and Create Login`}
                                </button>

                                {checkout?.mockMode && (
                                    <button type="button" onClick={activateMockPayment} disabled={loading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-wider text-white hover:bg-black transition-all active:scale-95 disabled:opacity-60 shadow-md">
                                        <ShieldCheck size={18} /> Activate Test Payment
                                    </button>
                                )}

                                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-500">
                                    <LockKeyhole size={16} className="mt-0.5 shrink-0 text-slate-600" />
                                    <span>Verify email first. Your checkout draft is securely auto-saved on this device until payment or promo activation is complete.</span>
                                </div>
                            </form>
                        </aside>
                    </div>
                </section>

                <section id="request-demo" className="border-t border-slate-150 bg-[#f4f8f6]/80 backdrop-blur-sm relative overflow-hidden py-16">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-teal-700">Guided Demo</p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 leading-tight">Request a personalized walk-through.</h2>
                            <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">
                                Share your clinic details and preferred time. The request is emailed directly to the Trikaar onboarding team, and your checkout drafts remain saved on this device.
                            </p>
                            <div className="mt-8 grid gap-4">
                                {[
                                    'We map your clinic, billing, doctor, and patient workflows live.',
                                    'You see the exact benefits of AI Core Copilot features.',
                                    'We recommend optimized caps based on your patient volume.',
                                    'Full onboarding configuration is assisted by our technical team.',
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm px-4.5 py-4 text-sm font-bold text-slate-700 shadow-sm hover:shadow-md transition-all duration-300 hover:border-teal-100/60 hover:-translate-y-0.5">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-150 text-teal-750 mt-0.5">
                                            <Check size={11} className="stroke-[3.5]" />
                                        </span>
                                        <span className="leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={submitDemoRequest} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-teal-950/5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700" />
                            
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shadow-sm">
                                    <Mail size={22} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Demo Request</p>
                                    <h2 className="text-lg font-black text-slate-900 leading-tight">Send inquiry to Trikaar</h2>
                                </div>
                            </div>

                            <div className="grid gap-3.5 sm:grid-cols-2">
                                <input required value={demoForm.hospitalName} onChange={(e) => handleDemoChange('hospitalName', e.target.value)} placeholder="Clinic / Hospital name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <input required value={demoForm.contactName} onChange={(e) => handleDemoChange('contactName', e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <input required value={demoForm.phone} onChange={(e) => handleDemoChange('phone', e.target.value)} placeholder="Mobile number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <input required type="email" value={demoForm.email} onChange={(e) => handleDemoChange('email', e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <input value={demoForm.city} onChange={(e) => handleDemoChange('city', e.target.value)} placeholder="City" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <select value={demoForm.hospitalType} onChange={(e) => handleDemoChange('hospitalType', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-450 bg-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all">
                                    <option value="">Clinic type</option>
                                    <option value="Clinic">Clinic</option>
                                    <option value="Polyclinic">Polyclinic</option>
                                    <option value="Nursing home">Nursing home</option>
                                    <option value="Hospital">Hospital</option>
                                </select>
                                <select value={demoForm.preferredPlan} onChange={(e) => handleDemoChange('preferredPlan', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-455 bg-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all">
                                    {plans.map((plan) => (
                                        <option key={plan.code} value={plan.code}>{plan.name} - ₹{plan.monthlyPrice}/mo or ₹{plan.yearlyPrice}/yr</option>
                                    ))}
                                </select>
                                <input value={demoForm.preferredTime} onChange={(e) => handleDemoChange('preferredTime', e.target.value)} placeholder="Preferred call time" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all" />
                                <textarea value={demoForm.message} onChange={(e) => handleDemoChange('message', e.target.value)} placeholder="Current challenges or specific features you would like to see" className="min-h-[110px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 bg-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all sm:col-span-2" />
                            </div>

                            {demoError && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{demoError}</div>}
                            {demoMessage && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{demoMessage}</div>}

                            <button disabled={demoLoading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-black transition-all active:scale-95 disabled:opacity-60 shadow-md">
                                <PhoneCall size={18} /> {demoLoading ? 'Sending...' : 'Request Demo Call'}
                            </button>
                        </form>
                    </div>
                </section>

                <section className="bg-slate-950 text-white relative overflow-hidden py-12">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 animate-pulse-slow" />
                    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between relative z-10">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Ready to launch your modern clinic EMR?</h2>
                            <p className="mt-1.5 text-xs font-semibold text-slate-400">Pick Standard at ₹1,999/month or Premium at ₹4,999/month. Billed yearly at 20% discount.</p>
                        </div>
                        <button onClick={scrollToCheckout} className="rounded-xl bg-white px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-slate-100 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-lg">
                            Choose Plan
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SubscriptionRegister;
