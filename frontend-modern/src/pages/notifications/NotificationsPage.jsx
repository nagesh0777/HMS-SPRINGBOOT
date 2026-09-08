import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Bell, Check, CheckCheck, Clock, AlertTriangle,
    Calendar, FlaskConical, Settings, Zap,
} from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Icon and tone per notification kind. Only genuinely clinical kinds carry colour —
 * a system backup notice is grey because it is not a clinical signal.
 */
const typeConfig = {
    appointment_reminder: { icon: Calendar, tone: 'text-info' },
    lab_result: { icon: FlaskConical, tone: 'text-warning' },
    follow_up: { icon: Clock, tone: 'text-info' },
    emergency: { icon: AlertTriangle, tone: 'text-destructive' },
    system: { icon: Settings, tone: 'text-muted-foreground' },
    default: { icon: Bell, tone: 'text-muted-foreground' },
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const res = await axios.get('/api/Notifications');
                if (res.data.Results) setNotifications(res.data.Results);
            } catch (e) {
                console.error('Failed to fetch notifications', e);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/Notifications/${id}/Read`);
            setNotifications(prev => prev.map(n => (n.notificationId === id ? { ...n, isRead: true } : n)));
        } catch (e) {
            console.error('Failed to mark as read', e);
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/api/Notifications/ReadAll');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) {
            console.error('Failed to mark all read', e);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
    });

    const FILTERS = [
        { key: 'all', label: 'All', count: notifications.length },
        { key: 'unread', label: 'Unread', count: unreadCount },
        { key: 'read', label: 'Read', count: notifications.length - unreadCount },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Notifications"
                description="Alerts and reminders from across the hospital."
                icon={Bell}
                actions={
                    unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllRead}>
                            <CheckCheck /> Mark all read
                        </Button>
                    )
                }
            />

            <div className="flex w-fit items-center gap-0.5 rounded-lg border p-0.5">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        aria-pressed={filter === f.key}
                        className={cn(
                            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            filter === f.key
                                ? 'bg-secondary text-secondary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {f.label}
                        <span className="tabular text-xs text-muted-foreground">{f.count}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Bell}
                        title={filter === 'unread' ? "You're all caught up" : 'Nothing to show'}
                        description={
                            filter === 'unread'
                                ? 'Every notification has been read.'
                                : filter === 'read'
                                    ? 'No notifications have been read yet.'
                                    : 'Alerts about appointments, lab results and admissions will appear here.'
                        }
                    />
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map((n, i) => {
                        const tc = typeConfig[n.type] || typeConfig.default;
                        const Icon = tc.icon;
                        const unread = !n.isRead;

                        return (
                            <Card
                                key={n.notificationId || i}
                                onClick={() => unread && markAsRead(n.notificationId)}
                                className={cn(
                                    'group flex items-start gap-3 p-4 transition-colors',
                                    unread && 'cursor-pointer bg-accent/40 hover:bg-accent/60',
                                )}
                            >
                                <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', tc.tone)} />

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className={cn('text-sm', unread ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                                            {n.title}
                                        </p>
                                        {n.priority === 'urgent' && (
                                            <Badge variant="destructive" className="gap-1">
                                                <Zap className="h-2.5 w-2.5" /> Urgent
                                            </Badge>
                                        )}
                                        {unread && <span className="h-1.5 w-1.5 rounded-full bg-info" />}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {n.createdOn ? new Date(n.createdOn).toLocaleString() : ''}
                                    </p>
                                </div>

                                {unread && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Mark as read"
                                                onClick={(e) => { e.stopPropagation(); markAsRead(n.notificationId); }}
                                                className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Mark as read</TooltipContent>
                                    </Tooltip>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
