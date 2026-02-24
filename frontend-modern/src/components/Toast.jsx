import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const typeStyles = {
    success: {
        icon: <CheckCircle size={18} />,
        bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border: '#6ee7b7',
        color: '#065f46',
        iconColor: '#10b981',
        progressColor: '#10b981',
    },
    error: {
        icon: <XCircle size={18} />,
        bg: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
        border: '#fca5a5',
        color: '#991b1b',
        iconColor: '#ef4444',
        progressColor: '#ef4444',
    },
    warning: {
        icon: <AlertTriangle size={18} />,
        bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '#fcd34d',
        color: '#92400e',
        iconColor: '#f59e0b',
        progressColor: '#f59e0b',
    },
    info: {
        icon: <Info size={18} />,
        bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '#93c5fd',
        color: '#1e40af',
        iconColor: '#3b82f6',
        progressColor: '#3b82f6',
    },
};

let globalToastId = 0;

function ToastItem({ toast, onRemove }) {
    const [exiting, setExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const style = typeStyles[toast.type] || typeStyles.info;
    const duration = toast.duration || 4000;

    useEffect(() => {
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [duration]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
        }, duration);
        return () => clearTimeout(timeout);
    }, [toast.id, duration, onRemove]);

    const handleClose = () => {
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    return (
        <div
            style={{
                background: style.bg,
                borderLeft: `4px solid ${style.border}`,
                color: style.color,
                animation: exiting ? 'toastSlideOut 0.3s ease-in forwards' : 'toastSlideIn 0.35s ease-out',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                minWidth: '320px',
                maxWidth: '420px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div style={{ color: style.iconColor, flexShrink: 0, marginTop: '1px' }}>{style.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                    <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px', lineHeight: 1.3 }}>{toast.title}</p>
                )}
                <p style={{ fontSize: '12.5px', lineHeight: 1.5, opacity: 0.9, wordBreak: 'break-word' }}>{toast.message}</p>
            </div>
            <button
                onClick={handleClose}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: style.color,
                    opacity: 0.5,
                    padding: '2px',
                    flexShrink: 0,
                    marginTop: '1px',
                    transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0.5}
            >
                <X size={14} />
            </button>
            {/* Progress bar */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    width: `${progress}%`,
                    backgroundColor: style.progressColor,
                    opacity: 0.4,
                    transition: 'width 0.1s linear',
                    borderRadius: '0 2px 0 12px',
                }}
            />
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info', opts = {}) => {
        const id = ++globalToastId;
        setToasts(prev => [...prev, { id, message, type, title: opts.title, duration: opts.duration }]);
    }, []);

    const toast = useCallback({
        success: (msg, opts) => addToast(msg, 'success', opts),
        error: (msg, opts) => addToast(msg, 'error', opts),
        warning: (msg, opts) => addToast(msg, 'warning', opts),
        info: (msg, opts) => addToast(msg, 'info', opts),
    }, [addToast]);

    // Make toast callable directly as well
    const toastFn = useCallback((msg, type, opts) => addToast(msg, type, opts), [addToast]);
    toastFn.success = (msg, opts) => addToast(msg, 'success', opts);
    toastFn.error = (msg, opts) => addToast(msg, 'error', opts);
    toastFn.warning = (msg, opts) => addToast(msg, 'warning', opts);
    toastFn.info = (msg, opts) => addToast(msg, 'info', opts);

    return (
        <ToastContext.Provider value={toastFn}>
            {children}
            {/* Toast container */}
            <div
                style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                }}
            >
                {toasts.map(t => (
                    <div key={t.id} style={{ pointerEvents: 'auto' }}>
                        <ToastItem toast={t} onRemove={removeToast} />
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(40px) scale(0.95); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes toastSlideOut {
                    from { opacity: 1; transform: translateX(0) scale(1); }
                    to { opacity: 0; transform: translateX(40px) scale(0.95); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}

export default ToastProvider;
