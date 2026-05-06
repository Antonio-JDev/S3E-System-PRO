import React, { useState, useEffect } from 'react';

// ==================== ICONS ====================
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ConverterUnidadeModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        productName: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
        unidadeMedida?: string;
    } | null;
    onSave: (convertedItem: {
        quantity: number;
        unitCost: number;
        totalCost: number;
        unidadeMedida: string;
    }) => void;
}

const ConverterUnidadeModal: React.FC<ConverterUnidadeModalProps> = ({
    isOpen,
    onClose,
    item,
    onSave
}) => {
    const [unidadeDestino, setUnidadeDestino] = useState<string>('m');

    useEffect(() => {
        if (item) {
            // Se a unidade atual for km, m ou cm, permitir conversão
            const unidadeAtual = (item.unidadeMedida || 'un').toLowerCase();
            if (unidadeAtual === 'km') {
                setUnidadeDestino('m');
            } else if (unidadeAtual === 'm') {
                setUnidadeDestino('cm');
            } else if (unidadeAtual === 'cm') {
                setUnidadeDestino('m');
            } else {
                setUnidadeDestino('m');
            }
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const unidadeAtual = (item.unidadeMedida || 'un').toLowerCase();
    
    // Fatores de conversão para metros
    const fatoresParaMetros: { [key: string]: number } = {
        'km': 1000,
        'm': 1,
        'cm': 0.01
    };

    const fatorAtual = fatoresParaMetros[unidadeAtual] || 1;
    const fatorDestino = fatoresParaMetros[unidadeDestino] || 1;

    // Converter quantidade para metros primeiro, depois para unidade destino
    const quantidadeEmMetros = item.quantity * fatorAtual;
    const novaQuantidade = quantidadeEmMetros / fatorDestino;

    // Recalcular valor unitário mantendo o total constante
    const novoValorUnitario = item.totalCost / novaQuantidade;

    const handleSave = () => {
        onSave({
            quantity: novaQuantidade,
            unitCost: novoValorUnitario,
            totalCost: item.totalCost, // Mantém o total inalterado
            unidadeMedida: unidadeDestino
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-strong max-w-md w-full animate-slide-in-up">
                {/* Header */}
                <div className="relative p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-purple-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">Converter Unidade de Medida</h2>
                            <p className="text-sm text-white/80 mt-1">Altere a unidade mantendo o valor total</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Informações do Item */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Item</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.productName}</p>
                    </div>

                    {/* Situação Atual */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Situação Atual
                            </label>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Quantidade</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                                            {item.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {unidadeAtual}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Valor Unitário</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                                            R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {unidadeAtual}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Total do Item</p>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                        R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Nova Unidade */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Converter para
                            </label>
                            <select
                                value={unidadeDestino}
                                onChange={(e) => setUnidadeDestino(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white font-semibold"
                            >
                                {unidadeAtual !== 'km' && <option value="km">Quilômetro (km)</option>}
                                {unidadeAtual !== 'm' && <option value="m">Metro (m)</option>}
                                {unidadeAtual !== 'cm' && <option value="cm">Centímetro (cm)</option>}
                            </select>
                        </div>

                        {/* Nova Situação (Preview) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nova Situação
                            </label>
                            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">Nova Quantidade</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                                            {novaQuantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {unidadeDestino}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">Novo Valor Unitário</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                                            R$ {novoValorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {unidadeDestino}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">Total do Item (inalterado)</p>
                                    <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                                        R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-md font-semibold"
                    >
                        Aplicar Conversão
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConverterUnidadeModal;
