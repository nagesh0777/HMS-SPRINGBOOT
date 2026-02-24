import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Shield, Filter, Search, Clock, User, AlertTriangle,
    FileText, RefreshCw, Database, Activity, Eye
} from 'lucide-react';

const severityConfig = {
    info: { color: 'bg-blue-100 text-blue-700', icon: 'bg-blue-500' },
    warning: { color: 'bg-amber-100 text-amber-700', icon: 'bg-amber-500' },
    critical: { color: 'bg-red-100 text-red-700', icon: 'bg-red-500' },
};

const actionConfig = {
    CREATE: { color: 'bg-green-100 text-green-700', label: 'Created' },
    UPDATE: { color: 'bg-blue-100 text-blue-700', label: 'Updated' },
    DELETE: { color: 'bg-red-100 text-red-700', label: 'Deleted' },
    LOGIN: { color: 'bg-purple-100 text-purple-700', label: 'Login' },
    LOGOUT: { color: 'bg-gray-100 text-gray-600', label: 'Logout' },
    VIEW: { color: 'bg-cyan-100 text-cyan-700', label: 'Viewed' },
    STATUS_CHANGE: { color: 'bg-amber-100 text-amber-700', label: 'Status' },
    EXPORT: { color: 'bg-indigo-100 text-indigo-700', label: 'Export' },
};

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterModule, setFilterModule] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [filterModule, filterAction]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = '/api/AuditLog?';
            if (filterModule) url += `module=${filterModule}&`;
            if (filterAction) url += `action=${filterAction}&`;
            const res = await axios.get(url);
            if (res.data.Results) setLogs(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch audit logs', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/AuditLog/Stats');
            if (res.data.Results) setStats(res.data.Results);
        } catch (e) {
            console.error('Failed to fetch stats', e);
        }
    };

    const filteredLogs = logs.filter(l => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (l.userName || '').toLowerCase().includes(s) ||
            (l.description || '').toLowerCase().includes(s) ||
            (l.entityName || '').toLowerCase().includes(s) ||
            (l.module || '').toLowerCase().includes(s);
    });

    const modules = ['Patient', 'Appointment', 'Doctor', 'Staff', 'Prescription', 'Admission', 'FollowUp', 'System'];
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'STATUS_CHANGE'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Audit Trail</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete system activity log for compliance & security</p>
                </div>
                <button onClick={() => { fetchLogs(); fetchStats(); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white">
                        <Database size={20} className="opacity-50 mb-1" />
                        <p className="text-2xl font-black">{stats.total}</p>
                        <p className="text-xs text-indigo-200">Total Events</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white">
                        <Activity size={20} className="opacity-50 mb-1" />
                        <p className="text-2xl font-black">{stats.byAction?.CREATE || 0}</p>
                        <p className="text-xs text-green-200">Creates</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
                        <Eye size={20} className="opacity-50 mb-1" />
                        <p className="text-2xl font-black">{stats.byAction?.UPDATE || 0}</p>
                        <p className="text-xs text-blue-200">Updates</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-4 text-white">
                        <AlertTriangle size={20} className="opacity-50 mb-1" />
                        <p className="text-2xl font-black">{(stats.bySeverity?.warning || 0) + (stats.bySeverity?.critical || 0)}</p>
                        <p className="text-xs text-red-200">Warnings</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <input type="text" placeholder="Search logs..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Modules</option>
                    {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">All Actions</option>
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {/* Log List */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Shield size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No audit logs found</p>
                    <p className="text-sm mt-1">System activity will appear here</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map((log, i) => {
                        const ac = actionConfig[log.action] || actionConfig.VIEW;
                        return (
                            <motion.div key={log.logId || i}
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="rounded-xl bg-white p-4 ring-1 ring-gray-100 hover:shadow-sm transition-all">
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${ac.color}`}>
                                        {(log.action || '?').substring(0, 3)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-900 text-sm">{log.userName || 'System'}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ac.color}`}>{ac.label}</span>
                                            {log.module && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{log.module}</span>}
                                            {log.severity && log.severity !== 'info' && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${severityConfig[log.severity]?.color || ''}`}>{log.severity}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-0.5">{log.description}</p>
                                        {log.entityName && (
                                            <p className="text-xs text-gray-400 mt-0.5">Entity: {log.entityName} {log.entityId ? `#${log.entityId}` : ''}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                                        <Clock size={10} />
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AuditLogPage;
