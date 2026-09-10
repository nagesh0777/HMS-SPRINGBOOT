import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Users, AlertTriangle, Send, Shield, Stethoscope,
    ClipboardList, RefreshCw, MessageSquare, Bell, BellOff,
    CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '../../components/Toast';
import { cn } from '@/lib/utils';

// Only 2 channels as requested
const CHANNELS = [
    {
        id: 'general',
        name: 'General',
        desc: 'Hospital-wide coordination, handovers, and team updates',
        icon: Users,
    },
    {
        id: 'urgent',
        name: 'Urgent',
        desc: 'High-priority clinical calls, code alerts, and emergency response',
        icon: AlertTriangle,
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
        // AudioContext may be blocked before first user gesture
    }
};

const getRoleBadge = (role = '') => {
    const r = role.toLowerCase();
    if (r.includes('doctor') || r.includes('physician')) {
        return {
            label: 'Doctor',
            tone: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
            dot: 'bg-blue-500',
            icon: Stethoscope,
        };
    }
    if (r.includes('nurse')) {
        return {
            label: 'Nurse',
            tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
            icon: Shield,
        };
    }
    if (r.includes('admin') || r.includes('superadmin')) {
        return {
            label: 'Admin',
            tone: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
            dot: 'bg-amber-500',
            icon: Shield,
        };
    }
    if (r.includes('reception') || r.includes('helpdesk')) {
        return {
            label: 'Front Desk',
            tone: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
            dot: 'bg-purple-500',
            icon: ClipboardList,
        };
    }
    return {
        label: role || 'Staff',
        tone: 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400',
        dot: 'bg-slate-500',
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

                            // Browser desktop notification if permitted
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Users className="h-4 w-4" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                            Teams
                        </h1>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Real-time hospital communication for doctors, nurses, and staff.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notifications ON / OFF toggle */}
                    <Button
                        variant={notificationsEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleNotifications}
                        className="gap-2 text-xs font-medium"
                        title="Turn sound & alert notifications on or off"
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

            {/* Main Chat Layout */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {/* 2 Channels Sidebar */}
                <Card className="p-3 lg:col-span-1">
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Channels
                    </p>
                    <div className="space-y-1.5">
                        {CHANNELS.map(chan => {
                            const Icon = chan.icon;
                            const isActive = activeChannel === chan.id;
                            return (
                                <button
                                    key={chan.id}
                                    type="button"
                                    onClick={() => setActiveChannel(chan.id)}
                                    className={cn(
                                        'flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-all',
                                        isActive
                                            ? chan.isUrgentChannel
                                                ? 'bg-destructive text-destructive-foreground shadow-sm'
                                                : 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                    )}
                                >
                                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', isActive ? 'text-inherit' : chan.isUrgentChannel ? 'text-destructive' : 'text-muted-foreground')} />
                                    <div className="min-w-0 flex-1">
                                        <p className={cn('text-xs font-semibold', isActive ? 'text-inherit' : 'text-foreground')}>
                                            #{chan.name}
                                        </p>
                                        <p className={cn('mt-0.5 line-clamp-1 text-[11px]', isActive ? 'opacity-85' : 'text-muted-foreground')}>
                                            {chan.desc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Messages & Composer */}
                <Card className="flex h-[620px] flex-col overflow-hidden p-0 lg:col-span-3">
                    {/* Active Channel Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', activeMeta.isUrgentChannel ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground')}>
                                <activeMeta.icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">#{activeMeta.name}</h3>
                                <p className="text-[11px] text-muted-foreground">{activeMeta.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                        {loading && messages.length === 0 ? (
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3 w-28" />
                                            <Skeleton className="h-10 w-full rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                <MessageSquare className="h-10 w-10 stroke-[1.25] text-muted-foreground/40 mb-2" />
                                <p className="text-sm font-medium text-foreground">No messages in #{activeMeta.name}</p>
                                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                                    Send a message to update doctors, nurses, and team members on duty.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const roleCfg = getRoleBadge(msg.senderRole);
                                const isMe = msg.senderName === currentUserName || msg.senderUserId === Number(localStorage.getItem('userId'));
                                const prevMsg = messages[index - 1];
                                const showDate = !prevMsg || formatDate(prevMsg.createdAt) !== formatDate(msg.createdAt);

                                return (
                                    <React.Fragment key={msg.id || index}>
                                        {showDate && (
                                            <div className="relative my-3 flex items-center justify-center">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-border/60" />
                                                </div>
                                                <span className="relative rounded-full bg-card px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border">
                                                    {formatDate(msg.createdAt)}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                'group flex items-start gap-3 rounded-xl p-3 transition-colors',
                                                msg.isUrgent
                                                    ? 'border border-destructive/40 bg-destructive-subtle/50'
                                                    : 'hover:bg-muted/30'
                                            )}
                                        >
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="text-xs font-semibold">
                                                    {initials(msg.senderName || 'Staff')}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {msg.senderName}
                                                    </span>

                                                    {/* Role with Title Badge */}
                                                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', roleCfg.tone)}>
                                                        <span className={cn('h-1.5 w-1.5 rounded-full', roleCfg.dot)} />
                                                        {msg.senderRole || 'Staff'}
                                                        {msg.senderTitle && msg.senderTitle !== msg.senderRole && (
                                                            <span className="opacity-75">· {msg.senderTitle}</span>
                                                        )}
                                                    </span>

                                                    {msg.isUrgent && (
                                                        <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[9px] uppercase tracking-wider font-bold">
                                                            <AlertTriangle className="h-2.5 w-2.5" /> Urgent
                                                        </Badge>
                                                    )}

                                                    <span className="tabular ml-auto text-[11px] text-muted-foreground">
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                </div>

                                                <div className="mt-1 text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                                                    {msg.message}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Tags */}
                    <div className="flex items-center gap-1.5 border-t bg-muted/20 px-4 py-2 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground shrink-0">Tags:</span>
                        {QUICK_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setInputText(p => p ? `${p} [${tag}]` : `[${tag}] `)}
                                className="rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground shrink-0 transition-colors"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Composer */}
                    <form onSubmit={handleSendMessage} className="border-t bg-card p-3">
                        <div className="flex items-center gap-2">
                            <Input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${activeMeta.name}… (Enter to send)`}
                                className="h-10 text-xs"
                                disabled={submitting}
                            />

                            {activeChannel !== 'urgent' && (
                                <Button
                                    type="button"
                                    variant={isUrgent ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => setIsUrgent(v => !v)}
                                    className="h-10 gap-1 text-xs shrink-0"
                                    title="Flag this message as urgent"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{isUrgent ? 'Urgent' : 'Normal'}</span>
                                </Button>
                            )}

                            <Button
                                type="submit"
                                size="sm"
                                disabled={submitting || !inputText.trim()}
                                className="h-10 shrink-0 gap-1.5 px-4 text-xs font-semibold"
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span>Send</span>
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default CareTeamsPage;
