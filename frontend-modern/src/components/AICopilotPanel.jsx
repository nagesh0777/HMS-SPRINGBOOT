import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, User, HelpCircle, Activity, ShieldAlert, FileText, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { askOwnerCopilot, askStaffSupport } from '../services/aiService';

const AICopilotPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Auto-close chatbot panel on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const userRole = localStorage.getItem('role') || 'Staff';
    const isManagementRole = userRole === 'SuperAdmin' || userRole === 'Admin';
    const [activeMode, setActiveMode] = useState(isManagementRole ? 'owner' : 'staff'); // 'owner' or 'staff'
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [hospitalStats, setHospitalStats] = useState(null);
    const messagesEndRef = useRef(null);

    // Fetch dashboard context for Owner Copilot
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const [fullRes, billRes] = await Promise.all([
                    axios.get('/api/Dashboard/FullAnalytics'),
                    axios.get('/api/Billing/Summary')
                ]);
                const aggregated = {
                    revenue: fullRes.data?.Results?.revenue || {},
                    beds: fullRes.data?.Results?.beds || {},
                    patientStats: fullRes.data?.Results?.patientStats || {},
                    appointmentStats: fullRes.data?.Results?.appointmentStats || {},
                    departmentRevenue: fullRes.data?.Results?.departmentRevenue || [],
                    billingSummary: billRes.data?.Results || {}
                };
                setHospitalStats(aggregated);
            } catch (e) {
                console.error("Error gathering hospital statistics context:", e);
            }
        };
        if (isOpen && activeMode === 'owner' && !hospitalStats) {
            fetchContext();
        }
    }, [isOpen, activeMode]);

    useEffect(() => {
        // Auto scroll to bottom when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Initial greeting based on mode
    useEffect(() => {
        if (messages.length === 0) {
            triggerGreeting();
        }
    }, [activeMode]);

    const triggerGreeting = () => {
        if (activeMode === 'owner') {
            setMessages([
                {
                    sender: 'ai',
                    text: `Hello! I am your **AI Owner Copilot**. 🏥\n\nI have gathered live statistics on Trikaar HMS including today's revenues, bed occupancy, doctor workloads, and patient flows.\n\nAsk me questions like:\n- *What is today's bed occupancy?*\n- *Show me our department revenue ratios.*\n- *How much revenue is currently outstanding?*`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } else {
            setMessages([
                {
                    sender: 'ai',
                    text: `Welcome to **Staff Support Agent**! 💡\n\nI can help you navigate this portal and run workflows step-by-step. Tell me what you'd like to do, or ask:\n- *How do I register a new patient?*\n- *Explain the high-speed billing keyboard shortcuts.*\n- *How do I admit a patient to a ward?*`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }
    };

    const handleSendMessage = async (textToSend) => {
        const query = textToSend || inputText;
        if (!query.trim()) return;

        // Add user message
        const userMsg = {
            sender: 'user',
            text: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            let aiResponse = '';
            if (activeMode === 'owner') {
                aiResponse = await askOwnerCopilot(query, hospitalStats || { note: "Stats offline" }, userRole);
            } else {
                aiResponse = await askStaffSupport(query, userRole);
            }

            setMessages(prev => [...prev, {
                sender: 'ai',
                text: aiResponse,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: "I apologize, I encountered an issue fetching answers. Please double-check your connection and try again.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setLoading(false);
        }
    };

    // Helper to render text with Markdown formatting (Bold, Headers, Lists)
    const formatMarkdown = (text) => {
        if (!text) return '';
        // Split by lines
        return text.split('\n').map((line, idx) => {
            let cleanLine = line;
            let elementClass = "text-sm text-gray-700 leading-relaxed";

            // Headers
            if (cleanLine.startsWith('### ')) {
                cleanLine = cleanLine.substring(4);
                return <h4 key={idx} className="font-bold text-gray-900 mt-3 mb-1 text-sm flex items-center gap-1.5"><ChevronRight size={14} className="text-blue-500" /> {cleanLine}</h4>;
            }
            if (cleanLine.startsWith('## ')) {
                cleanLine = cleanLine.substring(3);
                return <h3 key={idx} className="font-extrabold text-blue-900 mt-4 mb-1.5 text-sm">{cleanLine}</h3>;
            }
            if (cleanLine.startsWith('# ')) {
                cleanLine = cleanLine.substring(2);
                return <h2 key={idx} className="font-black text-blue-900 mt-4 mb-2 text-base border-b border-blue-100 pb-1">{cleanLine}</h2>;
            }

            // Bullet points
            if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                cleanLine = cleanLine.substring(2);
                elementClass = "text-sm text-gray-700 list-disc ml-4 my-1 pl-1";
            }

            // Parse bold tags **text**
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(cleanLine)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    parts.push(cleanLine.substring(lastIndex, match.index));
                }
                // Add bold text
                parts.push(<strong key={match.index} className="font-black text-gray-900">{match[1]}</strong>);
                lastIndex = boldRegex.lastIndex;
            }
            if (lastIndex < cleanLine.length) {
                parts.push(cleanLine.substring(lastIndex));
            }

            // Render line
            if (cleanLine.trim() === '') return <div key={idx} className="h-2" />;
            return <p key={idx} className={elementClass}>{parts.length > 0 ? parts : cleanLine}</p>;
        });
    };

    const suggestions = activeMode === 'owner' ? [
        "What is our revenue summary?",
        "How is bed occupancy today?",
        "Give me operational insights",
        "Top performing departments?"
    ] : [
        "How do I register a patient?",
        "High-speed billing hotkeys",
        "How do I admit a patient?",
        "How do I write a prescription?"
    ];

    return (
        <>
            {/* Floating Bubble Button */}
            {!isOpen && (
                <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9999]">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.5)] transition-all hover:scale-105 hover:rotate-6 active:scale-95 duration-200 border border-white/20"
                    >
                        <MessageSquare size={24} />
                        {/* Tiny notification pulse */}
                        <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500"></span>
                        </span>
                    </button>
                </div>
            )}

            {/* Slide-over Drawer Panel */}
            {isOpen && (
                <div 
                    className="fixed right-0 top-0 bottom-16 md:bottom-0 z-[9998] w-full md:w-[420px] bg-white/95 backdrop-blur-xl shadow-[-10px_0_40px_rgba(0,0,0,0.1)] border-l border-gray-100 flex flex-col transition-all duration-300 ease-out"
                    style={{
                        animation: 'chatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-sm tracking-tight leading-none">Trikaar AI Workspace</h3>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 inline-block">Enterprise Copilot</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mode Selector Toggle Switch */}
                        {isManagementRole && (
                            <div className="flex bg-gray-100 p-1 rounded-xl w-full border border-gray-200/50">
                                <button
                                    onClick={() => { setActiveMode('owner'); setMessages([]); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${activeMode === 'owner' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Activity size={14} />
                                    Owner Copilot
                                </button>
                                <button
                                    onClick={() => { setActiveMode('staff'); setMessages([]); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${activeMode === 'staff' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <HelpCircle size={14} />
                                    Staff Agent
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                        {messages.map((msg, i) => (
                            <div 
                                key={i} 
                                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                            >
                                {/* Avatar */}
                                <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                                    {msg.sender === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                </div>

                                {/* Text Bubble */}
                                <div className="space-y-1">
                                    <div className={`p-3.5 rounded-2xl text-xs shadow-sm ring-1 ${
                                        msg.sender === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none ring-indigo-700' 
                                            : 'bg-slate-50 text-gray-700 rounded-tl-none ring-slate-100'
                                    }`}>
                                        {msg.sender === 'user' ? <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p> : formatMarkdown(msg.text)}
                                    </div>
                                    <span className={`text-[9px] text-gray-400 font-semibold block px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Typing skeleton */}
                        {loading && (
                            <div className="flex gap-3 max-w-[80%] mr-auto">
                                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm animate-pulse">
                                    <Sparkles size={14} />
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none ring-1 ring-slate-100 w-full space-y-2">
                                    <div className="h-2.5 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                                    <div className="h-2 bg-gray-200 rounded-full w-5/6 animate-pulse"></div>
                                    <div className="h-2 bg-gray-200 rounded-full w-1/2 animate-pulse"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer / Suggestions + Input */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        {/* Suggestion Chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(s)}
                                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Input Box */}
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            className="flex gap-2 items-center"
                        >
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={activeMode === 'owner' ? "Query analytics data..." : "Ask workflow help..."}
                                disabled={loading}
                                className="flex-1 bg-gray-50 text-xs text-gray-900 border border-gray-200 rounded-xl px-3.5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                            <button
                                type="submit"
                                disabled={loading || !inputText.trim()}
                                className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Animations Injection */}
            <style>{`
                @keyframes chatSlideIn {
                    from { transform: translateX(80px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </>
    );
};

export default AICopilotPanel;
