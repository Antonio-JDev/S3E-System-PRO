import React from 'react';

interface BannerBloqueioFinanceiroProps {
    show: boolean;
    numeroVenda?: string;
    valorTotal?: number;
    onVerDetalhes?: () => void;
}

/**
 * Banner de aviso fixo no topo da tela de orçamento
 * Indica que o PV está bloqueado e mudanças não serão sincronizadas
 */
export const BannerBloqueioFinanceiro: React.FC<BannerBloqueioFinanceiroProps> = ({
    show,
    numeroVenda,
    valorTotal,
    onVerDetalhes
}) => {
    if (!show) return null;

    return (
        <div className="bg-gradient-to-r from-red-600 to-red-700 border-l-4 border-red-900 text-white px-6 py-4 shadow-lg animate-pulse-subtle">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                    {/* Ícone de Cadeado Animado */}
                    <div className="flex-shrink-0">
                        <svg className="w-10 h-10 text-white animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                            ⚠️ ATENÇÃO: Este Pedido está Bloqueado para Alterações
                        </h3>
                        <p className="text-red-100 text-sm mb-2">
                            O Pedido de Venda <strong className="font-bold">{numeroVenda || 'vinculado'}</strong> já foi 
                            <strong> faturado/pago (R$ {valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'})</strong>.
                        </p>
                        <p className="text-red-50 text-sm font-semibold">
                            🚫 Alterações no orçamento <u>NÃO serão refletidas</u> no financeiro (Contas a Receber) 
                            sem o estorno prévio do pedido.
                        </p>
                        <div className="mt-3 flex gap-2 text-xs">
                            <span className="bg-red-800 px-3 py-1 rounded-full font-semibold">
                                Status: BLOQUEADO
                            </span>
                            <span className="bg-red-800 px-3 py-1 rounded-full font-semibold">
                                Sincronização: DESATIVADA
                            </span>
                            <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full font-semibold">
                                Proteção Financeira Ativa
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botão de Ação */}
                {onVerDetalhes && (
                    <button
                        onClick={onVerDetalhes}
                        className="flex-shrink-0 bg-white text-red-700 hover:bg-red-50 font-bold px-4 py-2 rounded-lg transition-colors shadow-lg"
                    >
                        Ver Opções
                    </button>
                )}
            </div>

            {/* Barra de Progresso Decorativa */}
            <div className="mt-3 h-1 bg-red-900 rounded-full overflow-hidden">
                <div className="h-full bg-white opacity-50 w-1/3 animate-pulse"></div>
            </div>
        </div>
    );
};
