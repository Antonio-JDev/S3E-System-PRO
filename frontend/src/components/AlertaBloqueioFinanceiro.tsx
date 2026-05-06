import React, { useState } from 'react';

interface AlertaBloqueioFinanceiroProps {
    show: boolean;
    numeroVenda?: string;
    valorTotal?: number;
    contasPagas?: number;
    onSolicitarReabertura?: (justificativa: string) => void;
    onClose?: () => void;
}

/**
 * Componente de alerta visual para pedidos bloqueados
 * Exibe quando usuário tenta modificar orçamento vinculado a PV pago
 */
export const AlertaBloqueioFinanceiro: React.FC<AlertaBloqueioFinanceiroProps> = ({
    show,
    numeroVenda,
    valorTotal,
    contasPagas,
    onSolicitarReabertura,
    onClose
}) => {
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [justificativa, setJustificativa] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (!show) return null;

    const handleSolicitarReabertura = async () => {
        if (!justificativa.trim()) {
            alert('Por favor, informe a justificativa para a reabertura.');
            return;
        }

        setEnviando(true);
        try {
            if (onSolicitarReabertura) {
                await onSolicitarReabertura(justificativa);
                setMostrarFormulario(false);
                setJustificativa('');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                {/* Header */}
                <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg flex items-center gap-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                        <h3 className="text-xl font-bold">🚫 Pedido Bloqueado</h3>
                        <p className="text-red-100 text-sm">Proteção de Integridade Financeira Ativada</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-gray-700 font-semibold mb-2">
                            ⚠️ Este pedido já foi faturado/pago e não pode ser modificado diretamente.
                        </p>
                        <p className="text-gray-600 text-sm">
                            Alterações no orçamento <strong>não serão refletidas</strong> no financeiro para proteger a integridade dos dados já registrados.
                        </p>
                    </div>

                    {/* Informações do Pedido */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Pedido de Venda:</span>
                                <p className="font-bold text-gray-900">{numeroVenda || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Valor Total:</span>
                                <p className="font-bold text-gray-900">
                                    R$ {valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">Parcelas Pagas:</span>
                                <p className="font-bold text-green-600">{contasPagas || 0}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Status:</span>
                                <p className="font-bold text-red-600">Bloqueado</p>
                            </div>
                        </div>
                    </div>

                    {/* Opções */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            O que fazer?
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1 ml-7">
                            <li>• <strong>Opção 1:</strong> Estornar os pagamentos primeiro (recomendado)</li>
                            <li>• <strong>Opção 2:</strong> Solicitar reabertura ao administrador (abaixo)</li>
                            <li>• <strong>Opção 3:</strong> Criar um novo orçamento para os itens adicionais</li>
                        </ul>
                    </div>

                    {/* Formulário de Solicitação de Reabertura */}
                    {!mostrarFormulario ? (
                        <button
                            onClick={() => setMostrarFormulario(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Solicitar Reabertura ao Administrador
                        </button>
                    ) : (
                        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                            <label className="block text-sm font-semibold text-blue-900 mb-2">
                                Justificativa para Reabertura:
                            </label>
                            <textarea
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                placeholder="Ex: Cliente solicitou adicionar 50m de cabo 10mm e 3 disjuntores adicionais..."
                                className="w-full border border-blue-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                            />
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleSolicitarReabertura}
                                    disabled={enviando}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors"
                                >
                                    {enviando ? 'Enviando...' : 'Enviar Solicitação'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMostrarFormulario(false);
                                        setJustificativa('');
                                    }}
                                    className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
