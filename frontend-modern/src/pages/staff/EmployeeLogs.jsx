import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Skeleton from '../../components/ui/Skeleton';

const EmployeeLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Logs');
            if (res.data.Results) {
                setLogs(res.data.Results);
            }
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    const actionConfig = {
        DELETED:        { label: 'DEL', bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
        CREATED:        { label: 'NEW', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        STATUS_CHANGED: { label: 'STS', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
        UPDATED:        { label: 'UPD', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    };

    const getConfig = (action) => actionConfig[action] || actionConfig['UPDATED'];

    return (
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <ClipboardList size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                            Activity Logs
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {loading ? '—' : logs.length} records
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-500 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-900 hover:text-white active:scale-95 disabled:opacity-40"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Logs list */}
            <div className="divide-y divide-gray-50 p-4 space-y-0">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4 p-4">
                            <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" animation="shimmer" />
                            <div className="flex-1 space-y-2">
                                <Skeleton variant="text" className="h-4 w-1/3" animation="shimmer" />
                                <Skeleton variant="text" className="h-3 w-1/2" animation="shimmer" />
                                <Skeleton variant="text" className="h-2 w-1/4" animation="shimmer" />
                            </div>
                        </div>
                    ))
                ) : logs.length > 0 ? (
                    logs.map((log) => {
                        const cfg = getConfig(log.action);
                        return (
                            <div
                                key={log.logId}
                                className="flex items-start gap-4 rounded-2xl p-4 transition-all hover:bg-gray-50"
                            >
                                {/* Action Badge */}
                                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${cfg.bg} ${cfg.text}`}>
                                    {cfg.label}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-black text-gray-900 truncate">
                                            {log.employeeName}
                                        </p>
                                        <p className="flex-shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            {new Date(log.timestamp).toLocaleString(undefined, {
                                                dateStyle: 'medium', timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                    <p className="mt-0.5 text-xs font-bold text-gray-500 leading-relaxed">
                                        {log.details}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Performed by: {log.performedBy}
                                        </p>
                                        <span className={`ml-auto rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                                            {log.action?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-20 text-center">
                        <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-bold text-gray-400">No activity logs found.</p>
                        <p className="text-xs text-gray-300 mt-1">Employee changes will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeLogs;
