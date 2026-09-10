import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    BadgeIndianRupee, Bed, Bot, Building2, CalendarCheck, Check,
    ClipboardCheck, CreditCard, LockKeyhole, Mail, PhoneCall,
    ShieldCheck, Sparkles, Stethoscope, Users, Zap, AlertCircle, Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/app/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FORM_CACHE_KEY = 'trikaar_subscription_form_cache';
const DEMO_CACHE_KEY = 'trikaar_demo_form_cache';

const loadRazorpay = () =>
    new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const highlights = [
    { icon: Users, label: 'Patient registration', text: 'Fast OPD registration, profiles, history, and search.' },
    { icon: CalendarCheck, label: 'Appointments', text: 'Doctor-wise booking, daily queue, and status tracking.' },
    { icon: Stethoscope, label: 'Doctor workspace', text: 'Consultation queue, prescriptions, follow-ups, and patient timeline.' },
    { icon: BadgeIndianRupee, label: 'Billing', text: 'Service rates, invoices, payments, dues, and final bills.' },
    { icon: Users, label: 'Employee management', text: 'Staff records, attendance, access modules, and role-wise control.' },
    { icon: Bot, label: 'AI-powered HMS', text: 'Premium plan adds an AI copilot for workflow help and owner insights, with role-based privacy controls.' },
];

const outcomes = [
    'Launch a next-gen all-in-one HMS in one day',
    'Reduce front-desk confusion during peak OPD hours',
    'Give doctors and employees one clean workbench',
    'Track billing, dues, admissions, employees and AI insights from one place',
];

const InputField = (props) => <Input {...props} className={cn('h-11', props.className)} />;

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
        hospitalName: '', adminName: '', contactNumber: '', email: '',
        address: '', adminUsername: '', adminPassword: '', promoCode: '',
    });
    const [demoForm, setDemoForm] = useState({
        hospitalName: '', contactName: '', phone: '', email: '', city: '',
        hospitalType: '', preferredPlan: 'PREMIUM', preferredTime: '', message: '',
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

    useEffect(() => { localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(form)); }, [form]);
    useEffect(() => { localStorage.setItem(DEMO_CACHE_KEY, JSON.stringify(demoForm)); }, [demoForm]);

    const activePlan = useMemo(() => plans.find((p) => p.code === selectedPlan) || plans[0], [plans, selectedPlan]);
    const price = activePlan ? (billingCycle === 'yearly' ? activePlan.yearlyPrice : activePlan.monthlyPrice) : 0;
    const monthlyEquivalent = activePlan?.yearlyPrice ? Math.round(activePlan.yearlyPrice / 12) : 0;

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === 'email') {
            setOtp(''); setOtpRequested(false); setTestOtpCode('');
            setOtpStatus({ verified: false, token: '', message: '' });
        }
    };
    const handleDemoChange = (field, value) => setDemoForm((prev) => ({ ...prev, [field]: value }));

    const scrollToCheckout = () => document.getElementById('subscription-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const scrollToDemo = () => document.getElementById('request-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const verifyPayment = async (payment) => {
        const res = await axios.post('/api/Subscriptions/VerifyPayment', {
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
        });
        if (res.data.ErrorMessage) { setError(res.data.ErrorMessage); return; }
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
        if (!loaded) { setError('Razorpay checkout could not load. Please try again.'); return; }

        const razorpay = new window.Razorpay({
            key: payment.keyId, amount: payment.amount, currency: payment.currency,
            name: 'Trikaar HMS', description: `${activePlan?.name || 'HMS'} subscription`,
            order_id: payment.orderId, handler: verifyPayment,
            prefill: { name: form.adminName, email: form.email, contact: form.contactNumber },
            theme: { color: '#101828' },
        });
        razorpay.open();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setMessage(''); setCheckout(null);
        if (!otpStatus.verified || !otpStatus.token) { setError('Please verify your email OTP before checkout.'); return; }

        setLoading(true);
        try {
            const res = await axios.post('/api/Subscriptions/Register', {
                ...form, planCode: selectedPlan, billingCycle, emailOtpToken: otpStatus.token,
            });
            if (res.data.ErrorMessage) { setError(res.data.ErrorMessage); return; }

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
        setError(''); setMessage(''); setOtp(''); setTestOtpCode('');
        setOtpStatus({ verified: false, token: '', message: '' });
        if (!form.email.trim()) { setError('Enter your email address first.'); return; }

        setOtpSending(true);
        try {
            const res = await axios.post('/api/Otp/SendEmail', { email: form.email });
            if (res.data.ErrorMessage) { setError(res.data.ErrorMessage); return; }
            const result = res.data.Results;
            setOtpRequested(true);
            setTestOtpCode(result?.mockMode && result?.otpCode ? result.otpCode : '');
            setOtpStatus({
                verified: false, token: '',
                message: result?.mockMode
                    ? 'OTP retrieved automatically under sandbox mode. Autofill below to complete registration.'
                    : 'OTP sent to your email. If you request again, enter the code from the newest email only.',
            });
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || 'Could not send OTP.');
        } finally {
            setOtpSending(false);
        }
    };

    const verifyEmailOtp = async () => {
        setError(''); setMessage('');
        if (!form.email.trim() || otp.trim().length !== 6) { setError('Enter the 6-digit OTP sent to your email.'); return; }

        setOtpVerifying(true);
        try {
            const res = await axios.post('/api/Otp/VerifyEmail', { email: form.email, otp });
            if (res.data.ErrorMessage) { setError(res.data.ErrorMessage); return; }
            setOtpStatus({ verified: true, token: res.data.Results.verificationToken, message: 'Email verified. You can continue checkout.' });
        } catch (err) {
            setError(err.response?.data?.ErrorMessage || 'Could not verify OTP.');
        } finally {
            setOtpVerifying(false);
        }
    };

    const activateMockPayment = async () => {
        if (!checkout) return;
        setLoading(true); setError('');
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
        setDemoError(''); setDemoMessage(''); setDemoLoading(true);
        try {
            const res = await axios.post('/api/Subscriptions/RequestDemo', demoForm);
            if (res.data.ErrorMessage) { setDemoError(res.data.ErrorMessage); return; }
            setDemoMessage(res.data.Results?.message || 'Demo request sent. We will contact you shortly.');
            localStorage.removeItem(DEMO_CACHE_KEY);
            setDemoForm({ hospitalName: '', contactName: '', phone: '', email: '', city: '', hospitalType: '', preferredPlan: 'PREMIUM', preferredTime: '', message: '' });
        } catch (err) {
            setDemoError(err.response?.data?.ErrorMessage || 'Could not send demo request.');
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
                    <Logo variant="full" className="h-6" />
                    <div className="flex items-center gap-2">
                        <Button onClick={scrollToCheckout}>Start subscription</Button>
                        <Button variant="outline" onClick={scrollToDemo} className="hidden sm:inline-flex">Request demo</Button>
                        <Link to="/login"><Button variant="ghost" className="hidden sm:inline-flex">Existing user</Button></Link>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="border-b">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-[1fr_440px]">
                        <div>
                            <Badge variant="secondary" className="mb-5 gap-1.5 py-1.5">
                                <Sparkles className="h-3 w-3" /> First-launch pricing for Indian clinics
                            </Badge>
                            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                                Next-gen AI-powered all-in-one HMS, starting at ₹1,999/month.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                                Trikaar HMS is built for clinics, nursing homes and hospitals that want patients, doctors, billing, employees, reports and AI in one connected system. Standard runs daily operations; Premium adds beds, analytics, priority support and owner intelligence.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Button size="lg" onClick={scrollToCheckout}><CreditCard /> Buy and create login</Button>
                                <Button size="lg" variant="outline" onClick={scrollToDemo}><PhoneCall /> Request demo</Button>
                                <Badge variant="warning" className="justify-center gap-1.5 py-2.5 text-xs">
                                    <Zap className="h-3.5 w-3.5" /> Launch offer: WELCOME gives 1 month free
                                </Badge>
                            </div>

                            <div className="mt-10 grid gap-3 sm:grid-cols-2">
                                {outcomes.map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm font-medium">
                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                                            <Check className="h-3 w-3" />
                                        </span>
                                        <span className="leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live product preview card */}
                        <Card className="overflow-hidden border-2 p-5">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live command center</p>
                                    <h2 className="text-base font-semibold">Today at City Care</h2>
                                </div>
                                <Badge variant="success" className="gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active AI
                                </Badge>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {[['OPD queue', '38', '12 waiting'], ['Collections', '₹42,800', '8 pending'], ['Beds', '17/24', '71% occupied'], ['Employees', '18', '3 on leave']].map(([label, value, note]) => (
                                    <div key={label} className="rounded-lg border bg-muted/30 p-3.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                                        <p className="tabular mt-1.5 text-xl font-semibold">{value}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-lg border border-info/25 bg-info-subtle p-4">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-info">
                                    <Bot className="h-4 w-4" /> AI copilot
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-info/90">
                                    Billing details are protected by role. Staff get workflow guidance; owners get operating insights.
                                </p>
                            </div>
                            <div className="mt-4 space-y-2">
                                {['Dr. Mehta consultation resumed', 'Invoice HMS-2043 paid by UPI', 'Bed B-12 ready for discharge'].map((item) => (
                                    <div key={item} className="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3.5 py-2.5 text-xs font-medium">
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> {item}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                {/* Feature grid */}
                <section className="border-b bg-muted/20">
                    <div className="mx-auto max-w-7xl px-4 py-16">
                        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What hospitals get</p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Not just registration. A full operating system.</h2>
                            </div>
                            <p className="max-w-xl text-sm text-muted-foreground">
                                Each module is connected, so front desk, doctors, billing, ward, employees and management work on the same live data.
                            </p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {highlights.map((item) => (
                                <Card key={item.label} className="p-6">
                                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><item.icon className="h-5 w-5" /></span>
                                    <h3 className="font-semibold">{item.label}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Checkout */}
                <section id="subscription-checkout" className="py-16">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_420px]">
                        <div>
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Simple launch pricing</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Two plans. Billed monthly or yearly.</h2>
                                </div>
                                <div className="inline-flex w-fit items-center gap-0.5 rounded-lg border p-0.5">
                                    {[['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([key, label]) => (
                                        <button key={key} type="button" onClick={() => setBillingCycle(key)} aria-pressed={billingCycle === key}
                                                className={cn('rounded-md px-4 py-2 text-xs font-semibold transition-colors', billingCycle === key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Badge variant="secondary" className="mb-6 gap-1.5 py-2">
                                <ClipboardCheck className="h-3.5 w-3.5" /> Drafts are auto-saved on this device
                            </Badge>

                            <div className="grid gap-5 sm:grid-cols-2">
                                {plans.map((plan) => {
                                    const selected = selectedPlan === plan.code;
                                    const planPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                                    const planMonthlyEquivalent = plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : 0;
                                    return (
                                        <button type="button" key={plan.code} onClick={() => setSelectedPlan(plan.code)} className="text-left">
                                            <Card className={cn('flex h-full flex-col justify-between p-6', selected && 'border-2 border-foreground')}>
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                                                            <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                                                        </div>
                                                        {selected && <Badge variant="secondary">Selected</Badge>}
                                                    </div>
                                                    <div className="mt-5 flex items-end gap-1 border-b pb-4">
                                                        <span className="tabular text-3xl font-semibold tracking-tight">₹{planPrice}</span>
                                                        <span className="pb-1 text-xs text-muted-foreground">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                                    </div>
                                                    {billingCycle === 'yearly' && (
                                                        <Badge variant="success" className="mt-2.5">≈ ₹{planMonthlyEquivalent}/month</Badge>
                                                    )}
                                                    <div className="mt-4">
                                                        <Badge variant={plan.aiIncluded ? 'info' : 'secondary'}>
                                                            {plan.aiIncluded ? 'AI copilot included' : 'Standard core only'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{plan.bestFor}</p>

                                                    <div className="mt-4 space-y-2">
                                                        {(plan.sellingPoints || []).map((point) => (
                                                            <div key={point} className="flex items-start gap-2 text-xs">
                                                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> <span>{point}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-4 rounded-lg border bg-muted/30 p-3.5">
                                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usage limits &amp; caps</p>
                                                        {(plan.limits || []).map((limit) => (
                                                            <div key={limit} className="flex items-center gap-2 py-0.5 text-xs">
                                                                <ShieldCheck className="h-3 w-3 shrink-0 text-muted-foreground" /> <span className="truncate">{limit}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-4 space-y-2 border-t pt-4">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Included modules</p>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {plan.modules.map((module) => (
                                                                <div key={module} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <Check className="h-3 w-3 shrink-0 text-success" /> <span className="truncate">{module}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </button>
                                    );
                                })}
                            </div>

                            <Card className="mt-6 border-warning/25 bg-warning-subtle/40 p-5">
                                <p className="flex items-center gap-2 text-sm font-semibold text-warning"><Sparkles className="h-4 w-4" /> Launch customer discount</p>
                                <p className="mt-2 text-xs leading-relaxed text-warning/90">
                                    Apply the coupon code <span className="rounded bg-card px-1.5 py-0.5 font-mono font-semibold">WELCOME</span> during registration to activate any selected plan free for one month.
                                </p>
                            </Card>
                        </div>

                        {/* Checkout form */}
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <Card className="overflow-hidden p-0">
                                <div className="h-1.5 bg-primary" />
                                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected plan</p>
                                            <h2 className="text-lg font-semibold">{activePlan?.name || 'Select plan'}</h2>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <div className="flex items-end gap-1">
                                            <span className="tabular text-3xl font-semibold tracking-tight">₹{price}</span>
                                            <span className="pb-1 text-xs text-muted-foreground">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                        </div>
                                        <p className="mt-1.5 text-xs text-muted-foreground">
                                            {billingCycle === 'yearly' ? `About ₹${monthlyEquivalent}/month, billed annually.` : 'Instantly set up your clinic workspace.'}
                                        </p>
                                        {activePlan?.limits?.length > 0 && (
                                            <div className="mt-3 space-y-1.5 border-t pt-3">
                                                {activePlan.limits.slice(0, 3).map((limit) => (
                                                    <div key={limit} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{limit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label>Hospital / clinic info</Label>
                                        <InputField required value={form.hospitalName} onChange={(e) => handleChange('hospitalName', e.target.value)} placeholder="Clinic / hospital name" />
                                        <InputField required value={form.adminName} onChange={(e) => handleChange('adminName', e.target.value)} placeholder="Owner / admin full name" />
                                        <InputField required value={form.contactNumber} onChange={(e) => handleChange('contactNumber', e.target.value)} placeholder="Mobile number" />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label>Email verification</Label>
                                        <div className="flex gap-2">
                                            <InputField required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email address" className="min-w-0 flex-1" />
                                            <Button type="button" onClick={sendEmailOtp} disabled={otpSending || otpStatus.verified} className="shrink-0">
                                                {otpSending ? <Loader2 className="animate-spin" /> : null}
                                                {otpSending ? 'Sending' : otpStatus.verified ? 'Verified' : otpRequested ? 'Resend' : 'Send OTP'}
                                            </Button>
                                        </div>

                                        {testOtpCode && !otpStatus.verified && (
                                            <Card className="border-info/25 bg-info-subtle p-4">
                                                <p className="flex items-center gap-1.5 text-xs font-semibold text-info"><Sparkles className="h-3.5 w-3.5" /> Developer sandbox mode active</p>
                                                <p className="mt-1.5 text-xs text-info/80">SMTP is unconfigured, so the test OTP was retrieved directly from the server:</p>
                                                <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-info/20 bg-card p-2">
                                                    <span className="rounded bg-primary px-3 py-1 font-mono text-sm font-semibold tracking-wider text-primary-foreground">{testOtpCode}</span>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(testOtpCode); setOtp(testOtpCode); }}>
                                                        Autofill &amp; copy
                                                    </Button>
                                                </div>
                                            </Card>
                                        )}

                                        <div className="flex gap-2">
                                            <InputField value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" className="min-w-0 flex-1" />
                                            <Button type="button" variant="outline" onClick={verifyEmailOtp} disabled={otpVerifying || otpStatus.verified} className="shrink-0">
                                                {otpVerifying ? <Loader2 className="animate-spin" /> : null} {otpVerifying ? 'Checking' : 'Verify'}
                                            </Button>
                                        </div>

                                        {otpStatus.message && (
                                            <p className={cn(
                                                'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-medium',
                                                otpStatus.verified ? 'border-success/25 bg-success-subtle text-success' : 'border-warning/25 bg-warning-subtle text-warning',
                                            )}>
                                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', otpStatus.verified ? 'bg-success' : 'bg-warning')} />
                                                {otpStatus.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label>Account &amp; security</Label>
                                        <InputField value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Clinic address / city" />
                                        <InputField required value={form.adminUsername} onChange={(e) => handleChange('adminUsername', e.target.value)} placeholder="Create admin username" />
                                        <InputField required type="password" value={form.adminPassword} onChange={(e) => handleChange('adminPassword', e.target.value)} placeholder="Create admin password" />
                                        <InputField value={form.promoCode} onChange={(e) => handleChange('promoCode', e.target.value.toUpperCase())} placeholder="Promo code (e.g. WELCOME)" className="uppercase" />
                                    </div>

                                    {error && (
                                        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive-subtle px-4 py-3 text-sm text-destructive">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                                        </p>
                                    )}
                                    {message && (
                                        <p role="status" className="flex items-start gap-2 rounded-lg border border-success/25 bg-success-subtle px-4 py-3 text-sm text-success">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0" /> {message}
                                        </p>
                                    )}

                                    <Button type="submit" size="lg" className="w-full" disabled={loading || !otpStatus.verified}>
                                        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
                                        {loading ? 'Processing…' : form.promoCode === 'WELCOME' ? 'Activate free month' : `Pay ₹${price} and create login`}
                                    </Button>

                                    {checkout?.mockMode && (
                                        <Button type="button" variant="secondary" className="w-full" onClick={activateMockPayment} disabled={loading}>
                                            <ShieldCheck /> Activate test payment
                                        </Button>
                                    )}

                                    <p className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                                        Verify email first. Your checkout draft is securely auto-saved on this device until payment or promo activation is complete.
                                    </p>
                                </form>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Demo request */}
                <section id="request-demo" className="border-t bg-muted/20 py-16">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Guided demo</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Request a personalized walk-through.</h2>
                            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                Share your clinic details and preferred time. The request goes straight to the Trikaar onboarding team, and your checkout draft stays saved on this device.
                            </p>
                            <div className="mt-8 grid gap-3">
                                {[
                                    'We map your clinic, billing, doctor and patient workflows live.',
                                    'You see the exact benefits of the AI Copilot features.',
                                    'We recommend optimized caps based on your patient volume.',
                                    'Full onboarding configuration is assisted by our technical team.',
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm font-medium">
                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success"><Check className="h-3 w-3" /></span>
                                        <span className="leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Card className="overflow-hidden p-0">
                            <div className="h-1.5 bg-primary" />
                            <form onSubmit={submitDemoRequest} className="space-y-4 p-6">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Mail className="h-5 w-5" /></span>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Demo request</p>
                                        <h2 className="text-base font-semibold">Send inquiry to Trikaar</h2>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InputField required value={demoForm.hospitalName} onChange={(e) => handleDemoChange('hospitalName', e.target.value)} placeholder="Clinic / hospital name" />
                                    <InputField required value={demoForm.contactName} onChange={(e) => handleDemoChange('contactName', e.target.value)} placeholder="Your name" />
                                    <InputField required value={demoForm.phone} onChange={(e) => handleDemoChange('phone', e.target.value)} placeholder="Mobile number" />
                                    <InputField required type="email" value={demoForm.email} onChange={(e) => handleDemoChange('email', e.target.value)} placeholder="Email address" />
                                    <InputField value={demoForm.city} onChange={(e) => handleDemoChange('city', e.target.value)} placeholder="City" />
                                    <select value={demoForm.hospitalType} onChange={(e) => handleDemoChange('hospitalType', e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        <option value="">Clinic type</option>
                                        <option value="Clinic">Clinic</option>
                                        <option value="Polyclinic">Polyclinic</option>
                                        <option value="Nursing home">Nursing home</option>
                                        <option value="Hospital">Hospital</option>
                                    </select>
                                    <select value={demoForm.preferredPlan} onChange={(e) => handleDemoChange('preferredPlan', e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        {plans.map((plan) => (
                                            <option key={plan.code} value={plan.code}>{plan.name} - ₹{plan.monthlyPrice}/mo or ₹{plan.yearlyPrice}/yr</option>
                                        ))}
                                    </select>
                                    <InputField value={demoForm.preferredTime} onChange={(e) => handleDemoChange('preferredTime', e.target.value)} placeholder="Preferred call time" />
                                    <Textarea value={demoForm.message} onChange={(e) => handleDemoChange('message', e.target.value)} placeholder="Current challenges or specific features you would like to see" className="min-h-[100px] sm:col-span-2" />
                                </div>

                                {demoError && (
                                    <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive-subtle px-4 py-3 text-sm text-destructive">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {demoError}
                                    </p>
                                )}
                                {demoMessage && (
                                    <p role="status" className="flex items-start gap-2 rounded-lg border border-success/25 bg-success-subtle px-4 py-3 text-sm text-success">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0" /> {demoMessage}
                                    </p>
                                )}

                                <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={demoLoading}>
                                    {demoLoading ? <Loader2 className="animate-spin" /> : <PhoneCall />} {demoLoading ? 'Sending…' : 'Request demo call'}
                                </Button>
                            </form>
                        </Card>
                    </div>
                </section>

                {/* Closing CTA */}
                <section className="bg-primary py-12 text-primary-foreground">
                    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Ready to launch your modern clinic EMR?</h2>
                            <p className="mt-1.5 text-sm text-primary-foreground/70">Pick Standard at ₹1,999/month or Premium at ₹4,999/month. Billed yearly at a 20% discount.</p>
                        </div>
                        <Button size="lg" variant="secondary" onClick={scrollToCheckout}>Choose plan</Button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SubscriptionRegister;
