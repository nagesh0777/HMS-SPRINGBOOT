import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Bell, Check, CheckCheck, Clock, AlertTriangle,
    Calendar, FlaskConical, Stethoscope, Settings, Zap
} from 'lucide-react';

const typeConfig = {
    appointment_reminder: { icon: <Calendar size={16} />, color: 'bg-blue-100 text-blue-600' },
    lab_result: { icon: <FlaskConical size={16} />, color: 'bg-amber-100 text-amber-600' },
    follow_up: { icon: <Clock size={16} />, color: 'bg-purple-100 text-purple-600' },
    emergency: { icon: <AlertTriangle size={16} />, color: 'bg-red-100 text-red-600' },
    system: { icon: <Settings size={16} />, color: 'bg-gray-100 text-gray-600' },
    default: { icon: <Bell size={16} />, color: 'bg-blue-100 text-blue-600' },
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => { fetchNotifications(); }, []);

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

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/Notifications/${id}/Read`);
            setNotifications(prev => prev.map(n =>
                n.notificationId === id ? { ...n, isRead: true } : n
            ));
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

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Bell size={24} className="text-blue-500" /> Notifications
                        {unreadCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadCount}</span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Stay updated with important alerts and reminders</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                        <CheckCheck size={16} /> Mark All Read
                    </button>
                )}
            </div>

            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 w-fit">
                {[
                    { key: 'all', label: `All (${notifications.length})` },
                    { key: 'unread', label: `Unread (${unreadCount})` },
                    { key: 'read', label: 'Read' },
                ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === f.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Bell size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No notifications</p>
                    <p className="text-sm mt-1">{filter === 'unread' ? 'All caught up!' : 'Nothing to show'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((n, i) => {
                        const tc = typeConfig[n.type] || typeConfig.default;
                        return (
                            <motion.div key={n.notificationId || i}
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className={`rounded-xl p-4 ring-1 transition-all hover:shadow-sm cursor-pointer ${n.isRead ? 'bg-white ring-gray-100' : 'bg-blue-50/50 ring-blue-200'}`}
                                onClick={() => !n.isRead && markAsRead(n.notificationId)}>
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tc.color}`}>
                                        {tc.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm ${n.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{n.title}</p>
                                            {n.priority === 'urgent' && <Zap size={12} className="text-red-500" />}
                                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock size={10} /> {n.createdOn ? new Date(n.createdOn).toLocaleString() : ''}
                                        </p>
                                    </div>
                                    {!n.isRead && (
                                        <button onClick={(e) => { e.stopPropagation(); markAsRead(n.notificationId); }}
                                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors" title="Mark as read">
                                            <Check size={14} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
