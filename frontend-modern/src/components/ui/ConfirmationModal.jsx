import React, { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info' // 'info', 'warning', 'danger'
}) => {
    // Escape key listener to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getColors = () => {
        switch (type) {
            case 'danger':
                return {
                    iconBg: 'bg-red-50 text-red-600 border-red-100',
                    confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-red-200',
                    icon: <AlertTriangle className="h-6 w-6" />
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
                    confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white shadow-amber-200',
                    icon: <AlertTriangle className="h-6 w-6" />
                };
            case 'success':
                return {
                    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white shadow-emerald-200',
                    icon: <CheckCircle2 className="h-6 w-6" />
                };
            case 'info':
            default:
                return {
                    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
                    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white shadow-blue-200',
                    icon: <Info className="h-6 w-6" />
                };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div 
                className="relative w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Close button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
                >
                    <X size={16} />
                </button>

                {/* Content */}
                <div className="p-6 md:p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className={`p-3 rounded-xl border flex items-center justify-center mb-4 ${colors.iconBg}`}>
                            {colors.icon}
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-slate-900 leading-snug tracking-tight font-display">
                            {title}
                        </h3>

                        {/* Message */}
                        <p className="mt-2.5 text-sm text-slate-500 font-normal leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>

                    {/* Actions Grid */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`w-full sm:w-auto px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.confirmBtn}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>

            {/* Injected style helper for quick custom animation fallback in case tailwind animation is not in file */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scale-up {
                    animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default ConfirmationModal;
