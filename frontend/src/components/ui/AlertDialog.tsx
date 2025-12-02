import React from 'react';

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'info' | 'warning' | 'danger' | 'success';
    children?: React.ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'info',
    children
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            icon: 'ℹ️',
            iconBg: 'bg-blue-100 dark:bg-blue-900/50',
            buttonBg: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
        },
        warning: {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-800',
            icon: '⚠️',
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
            buttonBg: 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600'
        },
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            icon: '🚨',
            iconBg: 'bg-red-100 dark:bg-red-900/50',
            buttonBg: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600'
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            icon: '✅',
            iconBg: 'bg-green-100 dark:bg-green-900/50',
            buttonBg: 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600'
        }
    };

    const style = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                {/* Header com ícone */}
                <div className={`${style.bg} border-b ${style.border} p-6`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-2xl">{style.icon}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                    </div>
                </div>

                {/* Message / Custom Body */}
                <div className="p-6">
                    {children ? (
                        children
                    ) : (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {message}
                        </p>
                    )}
                </div>

                {/* Buttons */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-3 ${style.buttonBg} text-white rounded-xl transition-all font-semibold shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;

