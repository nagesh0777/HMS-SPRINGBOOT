import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Users, AlertTriangle, Send, Shield, Stethoscope,
    ClipboardList, RefreshCw, MessageSquare, Bell, BellOff,
    CheckCheck, Volume2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '../../components/Toast';
import { cn } from '@/lib/utils';
import {
    playNotificationChime,
    isNotificationsEnabled,
    setNotificationsEnabled,
    requestDesktopNotificationPermission,
    showDesktopNotification,
    unlockAudio,
} from '@/lib/teamChatNotifications';

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

const getRoleConfig = (role = '') => {
    const r = (role || '').toLowerCase();
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
    const [allMessages, setAllMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    // Notification states
    const [notifsEnabled, setNotifsEnabled] = useState(isNotificationsEnabled);
    const [browserPerm, setBrowserPerm] = useState(() => (
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
    ));
    const [showPermBanner, setShowPermBanner] = useState(false);

    const messagesEndRef = useRef(null);
    const knownMessageIds = useRef(new Set());
    const sentMessageIds = useRef(new Set());
    const isFirstLoad = useRef(true);

    const currentUserName = (localStorage.getItem('userName') || '').trim().toLowerCase();
    const currentEmpId = localStorage.getItem('employeeId');

    // Unread count in the channel the user is NOT currently watching
    const otherChannel = activeChannel === 'general' ? 'urgent' : 'general';
    const [channelLastReadTime, setChannelLastReadTime] = useState({
        general: Date.now(),
        urgent: Date.now(),
    });

    const activeMeta = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

    // Filter messages for currently active channel
    const currentMessages = useMemo(() => {
        return allMessages.filter(m => (m.channel || 'general').toLowerCase() === activeChannel);
    }, [allMessages, activeChannel]);

    // Calculate unread badge count for the inactive channel
    const otherUnreadCount = useMemo(() => {
        const lastRead = channelLastReadTime[otherChannel] || 0;
        return allMessages.filter(m => {
            const chan = (m.channel || 'general').toLowerCase();
            if (chan !== otherChannel) return false;
            const time = new Date(m.createdAt).getTime();
            return time > lastRead;
        }).length;
    }, [allMessages, otherChannel, channelLastReadTime]);

    // Check if message belongs to current user
    const isFromMe = useCallback((msg) => {
        if (!msg) return false;
        if (sentMessageIds.current.has(msg.id)) return true;
        try {
            const sessionSent = JSON.parse(sessionStorage.getItem("teams_sent_ids") || "[]");
            if (sessionSent.includes(msg.id)) return true;
        } catch (e) { /* ignore */ }
        if (currentEmpId && msg.senderEmployeeId && String(msg.senderEmployeeId) === String(currentEmpId)) return true;
        if (msg.senderName) {
            const sName = msg.senderName.trim().toLowerCase();
            if (sName === currentUserName) return true;
            if (currentUserName === "admin" && sName.includes("admin")) return true;
        }
        return false;
    }, [currentEmpId, currentUserName]);

    // Check browser notification permission status on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = Notification.permission;
            setBrowserPerm(perm);
            if (perm === 'default' && notifsEnabled) {
                setShowPermBanner(true);
            }
        }
    }, [notifsEnabled]);

    // Turn notifications ON or OFF
    const handleToggleNotifications = async (turnOn) => {
        unlockAudio();
        const next = turnOn !== undefined ? turnOn : !notifsEnabled;
        setNotifsEnabled(next);
        setNotificationsEnabled(next);

        if (next) {
            toast.success('Team Chat notifications turned ON');
            playNotificationChime(false);

            // Request browser desktop permission if needed
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                const result = await requestDesktopNotificationPermission();
                setBrowserPerm(result);
                setShowPermBanner(false);
                if (result === 'granted') {
                    showDesktopNotification('Team Chat Notifications Active', 'You will now receive sound and desktop alerts for new messages.');
                }
            }
        } else {
            toast.info('Team Chat notifications turned OFF (Muted)');
            setShowPermBanner(false);
        }
    };

    // Test sound button
    const handleTestSound = () => {
        unlockAudio();
        playNotificationChime(false);
        toast.info('Playing notification sound test...');
    };

    // Request desktop permission from banner
    const handleAllowDesktopAlerts = async () => {
        unlockAudio();
        const res = await requestDesktopNotificationPermission();
        setBrowserPerm(res);
        setShowPermBanner(false);
        if (res === 'granted') {
            playNotificationChime(false);
            toast.success('Desktop notifications enabled!');
            showDesktopNotification('Notifications Enabled', 'Desktop alerts are ready for team messages.');
        } else if (res === 'denied') {
            toast.info('Notifications are blocked by your browser settings.');
        }
    };

    // Poll messages across all channels
    const fetchAllMessages = useCallback(async (silent = false) => {
        if (!silent && isFirstLoad.current) setLoading(true);
        try {
            const res = await axios.get('/api/TeamChat/Messages?channel=all');
            if (res.data?.Results) {
                const freshList = res.data.Results;
                setAllMessages(freshList);

                // Check for new incoming messages for audio/toast/desktop alert
                if (!isFirstLoad.current && notifsEnabled) {
                    const brandNew = freshList.filter(m => !knownMessageIds.current.has(m.id));
                    if (brandNew.length > 0) {
                        // Filter out my own messages
                        const incoming = brandNew.filter(m => !isFromMe(m));
                        if (incoming.length > 0) {
                            const latest = incoming[incoming.length - 1];
                            const isUrgentMsg = Boolean(latest.isUrgent);

                            // Play Audio Chime
                            playNotificationChime(isUrgentMsg);

                            // In-App Toast
                            const chanLabel = latest.channel === 'urgent' ? '🚨 URGENT ALERT' : '💬 General';
                            toast.info(`${chanLabel} from ${latest.senderName} (${latest.senderRole}): ${latest.message.slice(0, 70)}…`);

                            // Browser Desktop Notification
                            showDesktopNotification(
                                `${latest.isUrgent ? '🚨 URGENT CLINICAL ALERT' : 'Team Message'} - ${latest.senderName}`,
                                latest.message
                            );
                        }
                    }
                }

                // Update known IDs
                knownMessageIds.current = new Set(freshList.map(m => m.id));
                isFirstLoad.current = false;
            }
        } catch (e) {
            console.error('Teams fetch error', e);
            if (!silent) toast.error('Could not load messages.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [isFromMe, notifsEnabled, toast]);

    // Initial load + 4 second polling loop
    useEffect(() => {
        fetchAllMessages(false);
        const interval = setInterval(() => fetchAllMessages(true), 4000);
        return () => clearInterval(interval);
    }, [fetchAllMessages]);

    // Channel switch handler
    const handleSwitchChannel = (channelId) => {
        setActiveChannel(channelId);
        setChannelLastReadTime(prev => ({
            ...prev,
            [channelId]: Date.now(),
        }));
    };

    // Auto-scroll on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages.length, activeChannel]);

    // Send Message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        unlockAudio();
        const trimmed = inputText.trim();
        if (!trimmed) return;

        setSubmitting(true);
        try {
            const payload = {
                channel: activeChannel,
                message: trimmed,
                isUrgent: activeChannel === 'urgent' ? true : isUrgent,
            };

            const res = await axios.post('/api/TeamChat/Messages', payload);
            if (res.data?.Results) {
                const saved = res.data.Results;
                sentMessageIds.current.add(saved.id);
                knownMessageIds.current.add(saved.id);
                try {
                    const prev = JSON.parse(sessionStorage.getItem("teams_sent_ids") || "[]");
                    sessionStorage.setItem("teams_sent_ids", JSON.stringify([...prev, saved.id]));
                } catch (e) { /* ignore */ }
                setAllMessages(prev => [...prev, saved]);
            }
            setInputText('');
            setIsUrgent(false);
        } catch (err) {
            console.error('Failed to send message', err);
            toast.error(err.response?.data?.ErrorMessage || 'Could not send message.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    return (
        <div className="space-y-3 pb-16 lg:pb-0">
            {/* Top Header Bar */}
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

                <div className="flex flex-wrap items-center gap-2">
                    {/* Test Sound Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleTestSound}
                        className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Click to test your speaker chime"
                    >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Test Sound</span>
                    </Button>

                    {/* Notification ON/OFF Toggle Button */}
                    {notifsEnabled ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleNotifications(false)}
                            className="h-8 gap-1.5 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 hover:text-emerald-800 transition-all shadow-2xs"
                            title="Notifications are active. Click to turn OFF (Mute)."
                        >
                            <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Notifications: ON</span>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleNotifications(true)}
                            className="h-8 gap-1.5 px-3 text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-all shadow-2xs"
                            title="Notifications are muted. Click to turn ON."
                        >
                            <BellOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Notifications: OFF (Muted)</span>
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => fetchAllMessages(false)}
                        disabled={loading}
                        aria-label="Refresh messages"
                        title="Refresh messages"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Browser Permission Prompt Banner */}
            {showPermBanner && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                        <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                            Allow browser notifications to receive sound and popup alerts when colleagues send messages.
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleAllowDesktopAlerts}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                            Allow Alerts
                        </button>
                        <button
                            type="button"
                            onClick={() => handleToggleNotifications(false)}
                            className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Turn Off
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPermBanner(false)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Dismiss banner"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* WhatsApp-Style Chat Container */}
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-4 min-h-[640px]">
                {/* Left Channels List (WhatsApp style chat sidebar) */}
                <div className="border-b bg-muted/20 p-2.5 lg:border-b-0 lg:border-r lg:col-span-1 flex flex-col justify-between">
                    <div>
                        <div className="px-2 py-1.5 mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Channels</span>
                            <span className="text-[10px] rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5">
                                2 Channels
                            </span>
                        </div>

                        <div className="space-y-1">
                            {CHANNELS.map(chan => {
                                const Icon = chan.icon;
                                const isActive = activeChannel === chan.id;
                                const isOther = chan.id === otherChannel;
                                const unread = isOther ? otherUnreadCount : 0;

                                return (
                                    <button
                                        key={chan.id}
                                        type="button"
                                        onClick={() => handleSwitchChannel(chan.id)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all relative',
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
                                                {unread > 0 && (
                                                    <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                                        {unread}
                                                    </span>
                                                )}
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

                    <div className="p-2 border-t mt-4 text-[11px] text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {notifsEnabled ? (browserPerm === 'granted' ? '🔔 Desktop Active' : '🔔 Audible') : '🔕 Muted'}
                        </span>
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
                        {loading && currentMessages.length === 0 ? (
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                                        <Skeleton className="h-14 w-64 rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        ) : currentMessages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-2">
                                    <MessageSquare className="h-6 w-6 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No messages in {activeMeta.name}</p>
                                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                                    Type a message below to coordinate with on-duty staff.
                                </p>
                            </div>
                        ) : (
                            currentMessages.map((msg, index) => {
                                const roleCfg = getRoleConfig(msg.senderRole);
                                const isSelf = isFromMe(msg);
                                const prevMsg = currentMessages[index - 1];
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
                                        <div className={cn('flex w-full', isSelf ? 'justify-end' : 'justify-start')}>
                                            <div
                                                className={cn(
                                                    'relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs transition-all',
                                                    isSelf
                                                        ? 'bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] rounded-tr-xs'
                                                        : 'bg-card text-foreground dark:bg-[#202c33] dark:text-[#e9edef] border border-border/40 rounded-tl-xs',
                                                    msg.isUrgent && 'ring-2 ring-destructive ring-offset-1'
                                                )}
                                            >
                                                {/* Header inside bubble: Sender Name & Role (for other staff) */}
                                                {!isSelf && (
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
                                                        {isSelf && <CheckCheck className="h-3.5 w-3.5 text-sky-500" />}
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
