import React, { useState, useRef, useEffect } from 'react';
import {
    Bot, Send, Sparkles, Key, Lock, ShieldCheck, RefreshCw,
    User, Building, Database, BookOpen, MessageSquare,
    CheckCircle2, AlertCircle, HelpCircle, ExternalLink, Trash2, ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { cn } from '@/lib/utils';

// Knowledge Base for answering questions about the software
const KNOWLEDGE_BASE = [
    {
        keywords: ['register', 'registration', 'patient', 'add patient', 'new patient'],
        title: 'How to Register a New Patient',
        answer: `**Steps to Register a Patient:**
1. Navigate to **Patients** in the left navigation.
2. Click the **Register Patient** button in the top right.
3. Fill in the patient demographic details: Full Name, Gender, Date of Birth or Age, Phone Number, and Address.
4. (Optional) Enter emergency contact details and government ID if available.
5. Click **Save & Register**. The system generates a unique Medical Record Number (MRN) and token for the patient.
6. You can immediately schedule an appointment or direct the patient to the OPD Doctor Queue.`,
        action: { label: 'Go to Patients', path: '/dashboard/patients' }
    },
    {
        keywords: ['prescribe', 'prescription', 'medicine', 'drug', 'dosage', 'doctor'],
        title: 'How Doctors Create & Issue Prescriptions',
        answer: `**Writing Digital Prescriptions:**
1. From the **Doctor Workspace** or **Patient Queue**, select the patient who is currently in consultation.
2. Click **Start Consult** to open the patient's clinical file.
3. Review patient vitals, history, and allergies.
4. Enter the **Provisional Diagnosis** (with ICD-10 suggestions).
5. In the **Prescription Pad**, type the medicine name. Select dosage form (Tablet, Capsule, Syrup), dosage amount, frequency (e.g. 1-0-1), duration in days, and meal timing (Before/After Food).
6. Add clinical advice or follow-up date (e.g. 5 days).
7. Click **Save & Finalize**. The prescription is saved to the patient record and can be printed immediately.`,
        action: { label: 'Doctor Queue', path: '/dashboard/doctor/queue' }
    },
    {
        keywords: ['admit', 'admission', 'bed', 'ipd', 'ward', 'icu'],
        title: 'How to Admit a Patient & Assign Beds (IPD)',
        answer: `**Inpatient (IPD) Bed Admission Workflow:**
1. Go to **Inpatients (Beds)** in the sidebar.
2. Review the **Bed Matrix** to see available beds across General Ward, Semi-Private, Private, and ICU.
3. Click **New Admission** or click directly on any **Available (Green)** bed.
4. Search for the patient by Name, Phone, or MRN.
5. Select the Admitting Doctor, Department, and Admission Reason.
6. Confirm the bed assignment and click **Admit Patient**.
7. The bed status changes to **Occupied (Blue)**. Nursing staff can now record shift handovers and round notes.`,
        action: { label: 'Go to Inpatients', path: '/dashboard/adt' }
    },
    {
        keywords: ['bill', 'billing', 'invoice', 'payment', 'charge', 'rate', 'money', 'upi', 'cash'],
        title: 'How to Generate Bills & Collect Payments',
        answer: `**Billing & Cashier Process:**
1. Navigate to **Billing** in the sidebar.
2. Click **Create Bill / Invoice**.
3. Search for the patient. The system automatically loads any pending OPD consultation charges or bed charges.
4. Add service line items from the catalog (e.g., Blood Test, X-Ray, Nursing Care, Dressing).
5. If applicable, enter a discount percentage or concession.
6. Select the Payment Mode: **Cash**, **Card**, or **UPI QR**.
7. Enter the amount received and click **Process & Print Receipt**.
8. A professional GST tax invoice receipt is generated with hospital branding.`,
        action: { label: 'Go to Billing', path: '/dashboard/billing' }
    },
    {
        keywords: ['chat', 'teams', 'message', 'purge', '7 day', 'whatsapp', 'delete'],
        title: 'Teams Hospital Chat & 7-Day Silent Auto-Purge',
        answer: `**About Teams Clinical Communication:**
- **WhatsApp Familiar Design**: Messages sent by you appear on the right in green bubbles with double checkmarks. Messages from colleagues appear on the left with role badges (Doctor, Nurse, Admin).
- **2 Streamlined Channels**:
  - **# General Team**: For daily shift handovers, bed vacancies, and staff announcements.
  - **# Urgent Alerts**: For code emergencies, trauma calls, and critical patient escalations.
- **Zero Disk Space Storage (7-Day Auto-Purge)**:
  - All messages are transient. A background job runs automatically every 4 hours to permanently purge messages older than 7 days.
  - No old messages clutter the database or disk!`,
        action: { label: 'Open Teams', path: '/dashboard/teams' }
    },
    {
        keywords: ['sound', 'notification', 'chime', 'mute', 'turn off', 'turn on', 'alert'],
        title: 'How to Turn Chat Sound & Notifications ON or OFF',
        answer: `**Managing Notifications:**
- **In Teams Chat**:
  - In the top-right header, click the **Notifications: ON** button to toggle between ON and OFF (Muted).
  - When ON, you receive audible Web Audio chimes and browser desktop popups.
  - When OFF, all chat sounds and alerts are completely muted.
  - Click **Test Sound** to verify your speakers.
- **Across the Entire Hospital Portal**:
  - Click the **Bell Icon** in the top navigation bar.
  - In the dropdown, use the **Chat Sound: [ON / OFF]** switch to quickly mute or unmute from any page without leaving your current work.`,
        action: { label: 'Open Teams', path: '/dashboard/teams' }
    },
    {
        keywords: ['password', 'username', 'cache', 'caching', 'login', 'autofill', 'credentials', 'lock', 'reset'],
        title: 'Username, Password & Browser Credential Caching',
        answer: `**Credential Caching & Login Management:**
- **Saving Credentials**: Modern browsers (Chrome, Safari, Edge) allow you to save your hospital login so you do not have to type it every shift. When prompted, click **Save Password**.
- **Outdated Password in Browser**: If your password was updated but the browser keeps auto-filling your old password:
  1. Open your browser settings -> **Password Manager**.
  2. Search for \`hms.trikaar.tech\`.
  3. Delete the old entry or click Edit to update to the new password.
- **Password Policy**: Passwords must be at least 8 characters long.
- **Temporary Account Lock**: To protect patient data from brute-force guessing, multiple failed login attempts will temporarily lock the username for 2-3 minutes. Wait for the cooldown or contact SuperAdmin.
- Check the **Account & Caching** tab above for your live session details and one-click cache clearing!`,
    },
    {
        keywords: ['role', 'permission', 'access', 'admin', 'nurse', 'doctor', 'staff'],
        title: 'User Roles & System Permissions',
        answer: `**Hospital Roles & Access Levels:**
- **SuperAdmin / Platform Owner**: Full platform fleet control, subscription management, and global tenant settings.
- **Admin**: Hospital administration, adding doctors and staff, configuring rates and services, viewing financial analytics.
- **Doctor**: Dedicated Doctor Workspace, patient queues, digital prescriptions, consultation logs, and medical history.
- **Nurse**: Inpatient bed management, patient admissions, vitals recording, and shift handovers.
- **Front Desk / Reception**: Patient registration, appointment booking, token issuance, and OPD check-in.
- **Cashier / Billing**: Invoicing, payment collection, concessions, and revenue reports.`,
        action: { label: 'Staff Directory', path: '/dashboard/staff' }
    }
];

const ChatbotPage = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Session Data
    const currentUserName = localStorage.getItem('userName') || 'staff';
    const currentRole = localStorage.getItem('role') || 'Staff';
    const currentEmpId = localStorage.getItem('employeeId') || 'N/A';
    const currentDocId = localStorage.getItem('doctorId') || 'N/A';
    const currentHospId = localStorage.getItem('hospitalId') || '1';
    const hasToken = Boolean(localStorage.getItem('token'));

    // Chat states
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: `Hello ${currentUserName}! I am your **Trikaar Software Assistant**.\n\nI can answer any doubt or question you have regarding using this hospital management software — including **Patient Registration**, **Prescriptions**, **Bed Management**, **Billing**, **Teams Chat**, and **Username/Password Caching**.\n\nHow can I help you today?`,
            time: 'Just now',
            suggestions: [
                'How do I register a new patient?',
                'How do doctors prescribe medicines?',
                'How to admit a patient to an IPD bed?',
                'How to fix username and password caching?',
                'How to turn notifications ON or OFF?'
            ]
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Query matcher
    const findAnswer = (query) => {
        const q = query.toLowerCase();
        let bestMatch = null;
        let maxScore = 0;

        for (const item of KNOWLEDGE_BASE) {
            let score = 0;
            for (const kw of item.keywords) {
                if (q.includes(kw)) score += 2;
            }
            if (score > maxScore) {
                maxScore = score;
                bestMatch = item;
            }
        }

        if (bestMatch && maxScore > 0) {
            return {
                title: bestMatch.title,
                answer: bestMatch.answer,
                action: bestMatch.action,
            };
        }

        // Generic fallback
        return {
            title: 'Help & Information',
            answer: `I looked for answers matching "${query}".\n\nHere are some common topics you might be looking for:\n- **Patient Registration & OPD**\n- **Doctor Consultations & Prescriptions**\n- **Inpatient Beds & ADT**\n- **Billing & Tax Invoices**\n- **Teams 7-Day Auto-Purge Chat**\n- **Username, Password & Caching Help**\n\nPlease select one of the suggested topics below or ask a more specific question.`,
            suggestions: [
                'How to register a new patient?',
                'How to admit a patient to an IPD bed?',
                'How do doctors prescribe medicines?',
                'How do I generate a billing invoice?',
                'Username and password caching details'
            ]
        };
    };

    const handleSendMessage = (textToSend) => {
        const query = (textToSend || inputText).trim();
        if (!query) return;

        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        setTimeout(() => {
            const result = findAnswer(query);
            const botMsg = {
                id: Date.now() + 1,
                sender: 'bot',
                text: `${result.title ? `### ${result.title}\n\n` : ''}${result.answer}`,
                action: result.action,
                suggestions: result.suggestions || [
                    'How to register a new patient?',
                    'How to admit a patient to an IPD bed?',
                    'Username and password caching details'
                ],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 500);
    };

    // Clear local app cache
    const handleClearAppCache = () => {
        try {
            // Remove cached transient keys but preserve login token
            const token = localStorage.getItem('token');
            const userName = localStorage.getItem('userName');
            const role = localStorage.getItem('role');
            const empId = localStorage.getItem('employeeId');
            const hospId = localStorage.getItem('hospitalId');

            // Clear sessionStorage & specific localStorage caches
            sessionStorage.clear();
            localStorage.removeItem('teams_sent_ids');
            localStorage.removeItem('teams_my_sent_ids');

            // Restore primary session
            if (token) localStorage.setItem('token', token);
            if (userName) localStorage.setItem('userName', userName);
            if (role) localStorage.setItem('role', role);
            if (empId) localStorage.setItem('employeeId', empId);
            if (hospId) localStorage.setItem('hospitalId', hospId);

            toast.success('App cache cleared successfully! Active session retained.');
        } catch {
            toast.error('Failed to clear app cache.');
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
                            <Bot className="h-5 w-5" />
                        </span>
                        Software Chatbot & Help Center
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Get instant answers for all hospital workflows, software features, and manage login credential caching.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>AI Assistant Ready</span>
                    </Badge>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="chat" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="chat" className="gap-2 text-xs">
                        <Bot className="h-4 w-4" />
                        <span>Software Assistant</span>
                    </TabsTrigger>
                    <TabsTrigger value="caching" className="gap-2 text-xs">
                        <Key className="h-4 w-4" />
                        <span>Username, Password & Caching</span>
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="gap-2 text-xs">
                        <BookOpen className="h-4 w-4" />
                        <span>Workflow Quick Guides</span>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Chatbot Software Assistant */}
                <TabsContent value="chat" className="space-y-3">
                    <Card className="flex flex-col h-[660px] overflow-hidden border shadow-sm">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Trikaar HMS Knowledge Bot</h3>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Always available to answer software questions</span>
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMessages([messages[0]])}
                                className="h-7 text-xs gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                <span>Clear Chat</span>
                            </Button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 space-y-4 overflow-y-auto p-4 bg-muted/10 scrollbar-thin">
                            {messages.map((m) => {
                                const isBot = m.sender === 'bot';
                                return (
                                    <div
                                        key={m.id}
                                        className={cn('flex gap-2.5', isBot ? 'justify-start' : 'justify-end')}
                                    >
                                        {isBot && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs mt-1">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                'max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs shadow-xs',
                                                isBot
                                                    ? 'bg-card text-card-foreground border'
                                                    : 'bg-blue-600 text-white'
                                            )}
                                        >
                                            {/* Message Content */}
                                            <div className="leading-relaxed whitespace-pre-wrap break-words space-y-2">
                                                {m.text}
                                            </div>

                                            {/* Direct Action Link if available */}
                                            {m.action && (
                                                <div className="mt-3 pt-2 border-t border-border/40">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => navigate(m.action.path)}
                                                        className="h-7 gap-1.5 text-xs font-semibold"
                                                    >
                                                        <span>{m.action.label}</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Suggestion Chips */}
                                            {m.suggestions && m.suggestions.length > 0 && (
                                                <div className="mt-3.5 pt-2.5 border-t border-border/40 space-y-1.5">
                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Related Questions:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {m.suggestions.map((s, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => handleSendMessage(s)}
                                                                className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-all text-left"
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <span className="mt-2 block text-right text-[9px] text-muted-foreground/70">
                                                {m.time}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {isTyping && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 shadow-2xs">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="border-t bg-card p-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Ask any question about software workflows, billing, doctor queue, or settings…"
                                    className="h-10 text-xs rounded-full pl-4"
                                />
                                <Button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 text-xs font-semibold shadow-xs"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Ask</span>
                                </Button>
                            </form>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 2: Username, Password & Caching Details */}
                <TabsContent value="caching" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current User Session Card */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span>Current Logged-in Session</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Active authentication token details stored in your browser session.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 border">
                                    <div>
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Username</span>
                                        <span className="font-bold text-foreground text-sm">{currentUserName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Role</span>
                                        <Badge variant="secondary" className="mt-0.5 text-[10px] font-bold">
                                            {currentRole}
                                        </Badge>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Hospital ID</span>
                                        <span className="font-medium text-foreground">Facility #{currentHospId}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Session Token</span>
                                        <span className="font-medium text-emerald-600 flex items-center gap-1">
                                            <ShieldCheck className="h-3.5 w-3.5" /> {hasToken ? 'Active (Valid JWT)' : 'None'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t flex items-center justify-between">
                                    <span className="text-muted-foreground">Having visual or caching issues?</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearAppCache}
                                        className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Clear App Cache</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Password Policy & Security Card */}
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-emerald-600" />
                                    <span>Password & Security Policy</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Hospital security standards and account lockout protection.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="space-y-2 rounded-lg bg-muted/40 p-3 border">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                        <div>
                                            <strong className="text-foreground">Minimum 8 Characters:</strong> All passwords must contain at least 8 alphanumeric characters to protect patient records.
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                        <div>
                                            <strong className="text-foreground">Brute-Force Rate Limiter:</strong> If an incorrect password is entered multiple times, the login API automatically locks out the username and IP for 2-3 minutes to prevent brute-force attacks.
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                        <div>
                                            <strong className="text-foreground">Admin Password Reset:</strong> Hospital Admins can reset staff passwords anytime in <strong>Staff Management</strong>.
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Step-by-Step Browser Password Caching Guide */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Key className="h-4 w-4 text-amber-600" />
                                <span>How to Manage Browser Username & Password Caching</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Fix autofill issues, save credentials for fast shift login, or delete outdated passwords.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Chrome */}
                                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-xs">
                                            1
                                        </div>
                                        <span>Google Chrome</span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To save credentials:</strong> Click the Key icon in the URL bar when logging in and select <em>Save Password</em>.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To fix wrong autofill:</strong> Go to Chrome Settings &gt; <em>Autofill and passwords</em> &gt; <em>Password Manager</em>. Search for <code>hms.trikaar.tech</code> and delete or update the entry.
                                    </p>
                                </div>

                                {/* Safari */}
                                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-xs">
                                            2
                                        </div>
                                        <span>Apple Safari (Mac / iPad)</span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To save credentials:</strong> Enable <em>AutoFill user names and passwords</em> in Safari Preferences &gt; AutoFill.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To fix wrong autofill:</strong> Open System Settings &gt; <em>Passwords</em> (or Safari Preferences &gt; Passwords). Search for <code>trikaar.tech</code> and update password.
                                    </p>
                                </div>

                                {/* Edge / Firefox */}
                                <div className="rounded-xl border p-3.5 space-y-2 bg-card">
                                    <div className="flex items-center gap-2 font-bold text-foreground">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-xs">
                                            3
                                        </div>
                                        <span>Microsoft Edge / Firefox</span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To save credentials:</strong> Allow the browser password prompt on successful login.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        <strong>To fix wrong autofill:</strong> Open Edge Settings &gt; <em>Profiles</em> &gt; <em>Passwords</em>. Remove the old password for <code>hms.trikaar.tech</code>.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: Workflow Quick Guides */}
                <TabsContent value="workflows" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {KNOWLEDGE_BASE.slice(0, 6).map((item, idx) => (
                            <Card key={idx} className="shadow-xs hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                                        <span>{item.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs text-muted-foreground">
                                    <div className="line-clamp-6 leading-relaxed whitespace-pre-wrap">
                                        {item.answer}
                                    </div>
                                    {item.action && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(item.action.path)}
                                            className="w-full h-8 text-xs font-semibold gap-1.5"
                                        >
                                            <span>{item.action.label}</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ChatbotPage;
