import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Users, AlertTriangle, Send, Shield, Stethoscope,
    ClipboardList, RefreshCw, MessageSquare, Bell, BellOff,
    CheckCheck, Check, Search, Smile
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '../../components/Toast';
import { cn } from '@/lib/utils';

const CHANNELS = [
    {
        id: 'general',
        name: 'General Team',
        short: 'General',
        desc: 'Hospital-wide updates, handovers, and coordination',
        icon: Users,
        color: 'bg-emerald-600',
    },
    {
        id: 'urgent',
        name: 'Urgent Alerts',
        short: 'Urgent',
        desc: 'Critical patient calls, code alerts, and emergency response',
        icon: AlertTriangle,
        color: 'bg-destructive',
        isUrgentChannel: true,
    },
];

const QUICK_TAGS = [
    'Handover',
    'Urgent Review',
    'Bed Vacant',
    'Doctor Needed',
    'Patient Arrival',
];

// Play a pleasant Web Audio notification chime
const playNotificationChime = (urgent = false) => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (urgent) {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(440, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.1); // A5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch {
        // AudioContext may be blocked before first user interaction
    }
};

const getRoleConfig = (role = '') => {
    const r = role.toLowerCase();
    if (r.includes('doctor') || r.includes('physician')) {
        return {
            label: 'Doctor',
            color: 'text-blue-600 dark:text-blue-400',
            badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
            icon: Stethoscope,
        };
    }
    if (r.includes('nurse')) {
        return {
            label: 'Nurse',
            color: 'text-emerald-600 dark:text-emerald-400',
            badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
            icon: Shield,
        };
    }
    if (r.includes('admin') || r.includes('superadmin')) {
        return {
            label: 'Admin',
            color: 'text-amber-600 dark:text-amber-400',
            badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
            icon: Shield,
        };
    }
    if (r.includes('reception') || r.includes('helpdesk')) {
        return {
            label: 'Front Desk',
            color: 'text-purple-600 dark:text-purple-400',
            badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
            icon: ClipboardList,
        };
    }
    return {
        label: role || 'Staff',
        color: 'text-slate-600 dark:text-slate-400',
        badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: Users,
    };
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

const CareTeamsPage = () => {
    const toast = useToast();
    const [activeChannel, setActiveChannel] = useState('general');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    // Notification toggle with localStorage persistence
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const saved = localStorage.getItem('teams_notif_enabled');
        return saved === null ? true : saved === 'true';
    });

    const messagesEndRef = useRef(null);
    const previousMessageIds = useRef(new Set());
    const isFirstLoad = useRef(true);
    const currentUserName = localStorage.getItem('userName') || 'You';

    const toggleNotifications = () => {
        const next = !notificationsEnabled;
        setNotificationsEnabled(next);
        localStorage.setItem('teams_notif_enabled', String(next));

        if (next) {
            toast.success('Team notifications turned ON');
            playNotificationChime(false);
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } else {
            toast.info('Team notifications turned OFF');
        }
    };

    const fetchMessages = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(`/api/TeamChat/Messages?channel=${activeChannel}`);
            if (res.data?.Results) {
                const newMsgs = res.data.Results;
                setMessages(newMsgs);

                // Detect new incoming messages for audio/toast alert
                if (!isFirstLoad.current && notificationsEnabled) {
                    const fresh = newMsgs.filter(m => !previousMessageIds.current.has(m.id));
                    if (fresh.length > 0) {
                        const latest = fresh[fresh.length - 1];
                        const isFromMe = latest.senderName === currentUserName || latest.senderUserId === Number(localStorage.getItem('userId'));
                        if (!isFromMe) {
                            playNotificationChime(latest.isUrgent);
                            toast.info(`New message from ${latest.senderName} (${latest.senderRole}): ${latest.message.slice(0, 60)}…`);

                            if ('Notification' in window && Notification.permission === 'granted') {
                                try {
                                    new Notification(`${latest.senderName} (${latest.senderRole})`, {
                                        body: latest.message,
                                        icon: '/favicon.ico',
                                    });
                                } catch {}
                            }
                        }
                    }
                }

                previousMessageIds.current = new Set(newMsgs.map(m => m.id));
                isFirstLoad.current = false;
            }
        } catch (e) {
            console.error('Teams fetch error', e);
            if (!silent) toast.error('Could not load messages.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [activeChannel, currentUserName, notificationsEnabled, toast]);

    useEffect(() => {
        isFirstLoad.current = true;
        fetchMessages(false);
        const interval = setInterval(() => {
            fetchMessages(true);
        }, 4000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        if (!loading) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        const text = inputText.trim();
        if (!text || submitting) return;

        setSubmitting(true);
        try {
            const res = await axios.post('/api/TeamChat/Messages', {
                channel: activeChannel,
                message: text,
                isUrgent: activeChannel === 'urgent' || isUrgent,
            });
            if (res.data?.Results) {
                const saved = res.data.Results;
                setMessages(prev => [...prev, saved]);
                previousMessageIds.current.add(saved.id);
                setInputText('');
                setIsUrgent(false);
            }
        } catch (e) {
            console.error('Teams send error', e);
            toast.error('Failed to send message.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const activeMeta = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

    return (
        <div className="space-y-3">
            {/* Top Bar */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                            <MessageSquare className="h-4 w-4" />
                        </span>
                        Teams
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Instant hospital messaging for doctors, nurses, and staff.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={notificationsEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleNotifications}
                        className={cn(
                            'h-8 gap-1.5 text-xs font-medium transition-all',
                            notificationsEnabled && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        )}
                        title="Toggle sound and desktop alert notifications"
                    >
                        {notificationsEnabled ? (
                            <>
                                <Bell className="h-3.5 w-3.5" />
                                <span>Notifications: ON</span>
                            </>
                        ) : (
                            <>
                                <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Notifications: OFF</span>
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => fetchMessages(false)}
                        disabled={loading}
                        aria-label="Refresh messages"
                        title="Refresh messages"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* WhatsApp-Style Chat Container */}
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-4 min-h-[640px]">
                {/* Left Channels List (WhatsApp style chat sidebar) */}
                <div className="border-b bg-muted/20 p-2.5 lg:border-b-0 lg:border-r lg:col-span-1 flex flex-col justify-between">
                    <div>
                        <div className="px-2 py-1.5 mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chats</span>
                            <span className="text-[10px] rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5">
                                2 Channels
                            </span>
                        </div>

                        <div className="space-y-1">
                            {CHANNELS.map(chan => {
                                const Icon = chan.icon;
                                const isActive = activeChannel === chan.id;
                                return (
                                    <button
                                        key={chan.id}
                                        type="button"
                                        onClick={() => setActiveChannel(chan.id)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all',
                                            isActive
                                                ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-500/20'
                                                : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        <div className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-xs',
                                            chan.color
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className={cn('truncate text-sm font-semibold', isActive ? 'text-foreground font-bold' : 'text-foreground')}>
                                                    {chan.name}
                                                </p>
                                            </div>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {chan.desc}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-2 border-t mt-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Connected to hospital team</span>
                    </div>
                </div>

                {/* Right Chat Window (WhatsApp chat area) */}
                <div className="flex flex-col lg:col-span-3 h-[640px]">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between border-b bg-card px-4 py-2.5 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-white', activeMeta.color)}>
                                <activeMeta.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground">
                                    {activeMeta.name}
                                </h2>
                                <p className="text-[11px] text-muted-foreground">
                                    {activeMeta.desc}
                                </p>
                            </div>
                        </div>

                        {activeMeta.isUrgentChannel && (
                            <Badge variant="destructive" className="gap-1 text-[10px] uppercase font-bold">
                                <AlertTriangle className="h-3 w-3" /> Priority Channel
                            </Badge>
                        )}
                    </div>

                    {/* Chat Messages Wallpaper / Body */}
                    <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin bg-[#efeae2]/60 dark:bg-[#0b141a]/95">
                        {loading && messages.length === 0 ? (
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                                        <Skeleton className="h-14 w-64 rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                                    <MessageSquare className="h-6 w-6 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No messages in {activeMeta.name}</p>
                                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                                    Type a message below to update on-duty staff and physicians.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const roleCfg = getRoleConfig(msg.senderRole);
                                const isMe = msg.senderName === currentUserName || msg.senderUserId === Number(localStorage.getItem('userId'));
                                const prevMsg = messages[index - 1];
                                const showDate = !prevMsg || formatDate(prevMsg.createdAt) !== formatDate(msg.createdAt);

                                return (
                                    <React.Fragment key={msg.id || index}>
                                        {/* WhatsApp Style Date Badge */}
                                        {showDate && (
                                            <div className="my-2 flex justify-center">
                                                <span className="rounded-md bg-card/90 px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs border">
                                                    {formatDate(msg.createdAt)}
                                                </span>
                                            </div>
                                        )}

                                        {/* WhatsApp Message Bubble */}
                                        <div className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
                                            <div
                                                className={cn(
                                                    'relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs transition-all',
                                                    isMe
                                                        ? 'bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] rounded-tr-xs'
                                                        : 'bg-card text-foreground dark:bg-[#202c33] dark:text-[#e9edef] border border-border/40 rounded-tl-xs',
                                                    msg.isUrgent && 'ring-2 ring-destructive ring-offset-1'
                                                )}
                                            >
                                                {/* Header inside bubble: Sender Name & Role (shown for others) */}
                                                {!isMe && (
                                                    <div className="mb-1 flex items-center gap-1.5">
                                                        <span className={cn('text-xs font-bold', roleCfg.color)}>
                                                            {msg.senderName}
                                                        </span>
                                                        <span className={cn('rounded px-1.5 py-0.2 text-[9px] font-semibold', roleCfg.badgeBg)}>
                                                            {msg.senderRole || 'Staff'}
                                                            {msg.senderTitle && msg.senderTitle !== msg.senderRole && (
                                                                <span> · {msg.senderTitle}</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Urgent Tag Banner inside bubble */}
                                                {msg.isUrgent && (
                                                    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-destructive">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        <span>URGENT CLINICAL ALERT</span>
                                                    </div>
                                                )}

                                                {/* Message Text with inline timestamp */}
                                                <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                                                    {msg.message}
                                                    {/* WhatsApp bottom-right time stamp & double checkmark */}
                                                    <span className="float-right ml-2 mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground select-none">
                                                        <span>{formatTime(msg.createdAt)}</span>
                                                        {isMe && <CheckCheck className="h-3.5 w-3.5 text-sky-500" />}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Tags (WhatsApp-style quick chips) */}
                    <div className="flex items-center gap-1.5 border-t bg-card px-4 py-1.5 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground shrink-0">Tags:</span>
                        {QUICK_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setInputText(p => p ? `${p} [${tag}]` : `[${tag}] `)}
                                className="rounded-full border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 shrink-0 transition-colors"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* WhatsApp-Style Pill Input Bar */}
                    <form onSubmit={handleSendMessage} className="border-t bg-card p-3">
                        <div className="flex items-center gap-2">
                            {activeChannel !== 'urgent' && (
                                <button
                                    type="button"
                                    onClick={() => setIsUrgent(v => !v)}
                                    className={cn(
                                        'flex h-10 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors shrink-0 border',
                                        isUrgent
                                            ? 'bg-destructive text-destructive-foreground border-destructive'
                                            : 'bg-muted/40 text-muted-foreground hover:bg-muted border-input'
                                    )}
                                    title="Flag message as urgent alert"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{isUrgent ? 'Urgent' : 'Normal'}</span>
                                </button>
                            )}

                            <div className="flex-1 relative flex items-center">
                                <Input
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Type a message in #${activeMeta.name}… (Enter to send)`}
                                    className="h-10 text-xs rounded-full pl-4 pr-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-emerald-500"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Circular WhatsApp Send Button */}
                            <button
                                type="submit"
                                disabled={submitting || !inputText.trim()}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                                title="Send message"
                            >
                                <Send className="h-4 w-4 ml-0.5" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CareTeamsPage;
