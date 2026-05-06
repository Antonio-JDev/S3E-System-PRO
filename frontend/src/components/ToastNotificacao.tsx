import React, { useEffect } from 'react';

export type ToastTipo = 'sucesso' | 'erro' | 'aviso' | 'info';

interface ToastNotificacaoProps {
    show: boolean;
    tipo: ToastTipo;
    titulo: string;
    mensagem: string;
    duracao?: number; // ms
    onClose: () => void;
}

/**
 * Componente de Toast para notificações de sincronização
 */
export const ToastNotificacao: React.FC<ToastNotificacaoProps> = ({
    show,
    tipo,
    titulo,
    mensagem,
    duracao = 5000,
    onClose
}) => {
    useEffect(() => {
        if (show && duracao > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duracao);

            return () => clearTimeout(timer);
        }
    }, [show, duracao, onClose]);

    if (!show) return null;

    const configs = {
        sucesso: {
            bg: 'bg-green-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        erro: {
            bg: 'bg-red-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        aviso: {
            bg: 'bg-yellow-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        info: {
            bg: 'bg-blue-600',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };

    const config = configs[tipo];

    return (
        <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
            <div className={`${config.bg} text-white rounded-lg shadow-2xl max-w-md overflow-hidden`}>
                <div className="flex items-start p-4 gap-3">
                    {/* Ícone */}
                    <div className="flex-shrink-0">
                        {config.icon}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                        <h4 className="font-bold text-lg">{titulo}</h4>
                        <p className="text-sm mt-1 opacity-90">{mensagem}</p>
                    </div>

                    {/* Botão Fechar */}
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Barra de Progresso */}
                {duracao > 0 && (
                    <div className="h-1 bg-white bg-opacity-30 overflow-hidden">
                        <div 
                            className="h-full bg-white"
                            style={{
                                animation: `progress ${duracao}ms linear`
                            }}
                        />
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }

                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};
