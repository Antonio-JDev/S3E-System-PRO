import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';

interface EditarFracionamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        id?: string;
        compraId?: string;
        productName: string;
        quantity: number;
        quantidadeFracionada?: number;
        tipoEmbalagem?: string;
        unidadeEmbalagem?: string;
    } | null;
    onSave: (fracionamento: {
        quantidadeFracionada?: number;
        tipoEmbalagem?: string;
        unidadeEmbalagem?: string;
    }) => void;
}

const EditarFracionamentoModal: React.FC<EditarFracionamentoModalProps> = ({
    isOpen,
    onClose,
    item,
    onSave
}) => {
    const [fracionamentoAtivo, setFracionamentoAtivo] = useState(false);
    const [quantidadeFracionada, setQuantidadeFracionada] = useState<string>('');
    const [tipoEmbalagem, setTipoEmbalagem] = useState<string>('CAIXA');
    const [unidadeEmbalagem, setUnidadeEmbalagem] = useState<string>('cx');

    useEffect(() => {
        if (item && isOpen) {
            const temFracionamento = item.quantidadeFracionada && item.quantidadeFracionada > 0;
            setFracionamentoAtivo(temFracionamento);
            setQuantidadeFracionada(temFracionamento ? String(item.quantidadeFracionada) : '');
            setTipoEmbalagem(item.tipoEmbalagem || 'CAIXA');
            setUnidadeEmbalagem(item.unidadeEmbalagem || 'cx');
        }
    }, [item, isOpen]);

    const handleSave = async () => {
        if (fracionamentoAtivo && (!quantidadeFracionada || parseFloat(quantidadeFracionada) <= 0)) {
            toast.error('Informe a quantidade de unidades por embalagem');
            return;
        }

        const fracionamentoData = {
            quantidadeFracionada: fracionamentoAtivo && quantidadeFracionada ? parseFloat(quantidadeFracionada) : undefined,
            tipoEmbalagem: fracionamentoAtivo ? tipoEmbalagem : undefined,
            unidadeEmbalagem: fracionamentoAtivo ? unidadeEmbalagem : undefined
        };

        // Se o item tem compraId e itemId, atualizar no backend
        if (item?.compraId && item?.id) {
            try {
                await axiosApiService.put(
                    `/api/compras/${item.compraId}/items/${item.id}/fracionamento`,
                    fracionamentoData
                );
                toast.success('Fracionamento atualizado no servidor!');
            } catch (error: any) {
                console.error('Erro ao atualizar fracionamento no servidor:', error);
                toast.warning('Fracionamento atualizado localmente, mas houve erro ao salvar no servidor');
            }
        }

        onSave(fracionamentoData);
        onClose();
    };

    if (!isOpen || !item) return null;

    const quantidadeTotalUnidades = fracionamentoAtivo && quantidadeFracionada
        ? item.quantity * parseFloat(quantidadeFracionada)
        : item.quantity;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-md w-full animate-slide-in-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">📦 Configurar Fracionamento</h3>
                            <p className="text-sm text-blue-100 mt-1">{item.productName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4 border border-gray-200 dark:border-dark-border">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quantidade na compra:</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity} unidades</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="fracionamentoCheckbox"
                            checked={fracionamentoAtivo}
                            onChange={(e) => {
                                setFracionamentoAtivo(e.target.checked);
                                if (!e.target.checked) {
                                    setQuantidadeFracionada('');
                                    setTipoEmbalagem('CAIXA');
                                    setUnidadeEmbalagem('cx');
                                }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="fracionamentoCheckbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Este item vem em caixa/pacote
                        </label>
                    </div>

                    {fracionamentoAtivo && (
                        <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Quantidade de unidades por embalagem *
                                </label>
                                <input
                                    type="number"
                                    value={quantidadeFracionada}
                                    onChange={(e) => setQuantidadeFracionada(e.target.value)}
                                    placeholder="Ex: 100"
                                    min="1"
                                    step="1"
                                    required={fracionamentoAtivo}
                                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de embalagem
                                </label>
                                <select
                                    value={tipoEmbalagem}
                                    onChange={(e) => {
                                        setTipoEmbalagem(e.target.value);
                                        const unidades: { [key: string]: string } = {
                                            'CAIXA': 'cx',
                                            'PACOTE': 'pct',
                                            'FARDO': 'fardo',
                                            'OUTRO': 'un'
                                        };
                                        setUnidadeEmbalagem(unidades[e.target.value] || 'un');
                                    }}
                                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                                >
                                    <option value="CAIXA">Caixa</option>
                                    <option value="PACOTE">Pacote</option>
                                    <option value="FARDO">Fardo</option>
                                    <option value="OUTRO">Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Unidade da embalagem
                                </label>
                                <input
                                    type="text"
                                    value={unidadeEmbalagem}
                                    onChange={(e) => setUnidadeEmbalagem(e.target.value)}
                                    placeholder="Ex: cx, pct"
                                    className="w-full px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>

                            {quantidadeFracionada && (
                                <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                        📦 {item.quantity} {tipoEmbalagem.toLowerCase()}(s) × {quantidadeFracionada} un = <strong>{quantidadeTotalUnidades} unidades</strong> no estoque
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-all font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-semibold"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarFracionamentoModal;
