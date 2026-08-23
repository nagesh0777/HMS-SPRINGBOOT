import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, X } from 'lucide-react';

const PromptModal = ({
    isOpen,
    onClose,
    onSubmit,
    title = 'Input Required',
    message = 'Please enter the requested information below:',
    placeholder = 'Type here...',
    inputType = 'text',
    submitText = 'Submit',
    cancelText = 'Cancel'
}) => {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setValue('');
            setError('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Escape and Enter key listeners
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!value.trim()) {
            setError('This field cannot be empty');
            return;
        }
        onSubmit(value);
        onClose();
    };

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
                <form onSubmit={handleSubmit} className="p-6 md:p-8">
                    <div className="flex flex-col">
                        {/* Icon header */}
                        <div className="flex items-center gap-3 border-b border-slate-150 pb-4 mb-5">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
                                    {title}
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Secure Input Panel</p>
                            </div>
                        </div>

                        {/* Message */}
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                            {message}
                        </p>

                        {/* Input Box */}
                        <div className="space-y-1">
                            <input
                                ref={inputRef}
                                type={inputType}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder={placeholder}
                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-semibold outline-none transition-all duration-200 ${
                                    error 
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/20' 
                                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white'
                                }`}
                            />
                            {error && (
                                <p className="text-[11px] font-bold text-red-600 px-1 animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:justify-end border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                        >
                            {submitText}
                        </button>
                    </div>
                </form>
            </div>

            {/* Injected style helper for quick custom animation fallback */}
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

export default PromptModal;
