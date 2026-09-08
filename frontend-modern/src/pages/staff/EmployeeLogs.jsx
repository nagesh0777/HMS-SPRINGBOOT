import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/Skeleton';

const ACTION_BADGE = {
    DELETED: { label: 'Deleted', variant: 'destructive' },
    CREATED: { label: 'Created', variant: 'success' },
    STATUS_CHANGED: { label: 'Status changed', variant: 'warning' },
    UPDATED: { label: 'Updated', variant: 'info' },
};

const EmployeeLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Logs');
            if (res.data.Results) setLogs(res.data.Results);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    const getBadge = (action) => ACTION_BADGE[action] || ACTION_BADGE.UPDATED;

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardList className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold">Activity logs</h2>
                        <p className="text-xs text-muted-foreground">{loading ? '—' : logs.length} records</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                </Button>
            </div>

            <div className="divide-y p-2">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4 p-4">
                            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))
                ) : logs.length > 0 ? (
                    logs.map((log) => {
                        const badge = getBadge(log.action);
                        return (
                            <div key={log.logId} className="flex items-start gap-4 rounded-lg p-4 transition-colors hover:bg-accent/30">
                                <Badge variant={badge.variant} className="mt-0.5 shrink-0">{badge.label}</Badge>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-sm font-semibold">{log.employeeName}</p>
                                        <p className="shrink-0 text-xs text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <p className="mt-0.5 text-sm text-muted-foreground">{log.details}</p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">Performed by: {log.performedBy}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <EmptyState icon={ClipboardList} title="No activity logs found" description="Employee changes will appear here." />
                )}
            </div>
        </Card>
    );
};

export default EmployeeLogs;
