import React, { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatarUnidadeOrcamento } from '../utils/unitConverter';
import { orcamentosService } from '../services/orcamentosService';
import { toast } from 'sonner';

export interface ItemKitVisualizacao {
    nome?: string;
    codigo?: string;
    tipo?: string;
    quantidade?: number;
    unidadeMedida?: string;
    valorVenda?: number;
    custoUnit?: number;
    custoAgregadoUnit?: number;
    valorUnitario?: number;
    preco?: number;
    dataUltimaCotacao?: string;
    kitId?: string;
    itensDoKit?: any[];
    [key: string]: any;
}

interface ModalItensKitProps {
    open: boolean;
    onClose: () => void;
    itens: ItemKitVisualizacao[];
    nomeKit: string;
    /** Se fornecido, exibe coluna e rodapé de custo/lucro (usa aliquotaMaterial da empresa) */
    empresas?: Array<{ cnpj?: string; aliquotaMaterial?: number }>;
    empresaCNPJ?: string;
    /** Metadados opcionais para auditoria no PDF */
    numeroOrcamento?: number | string;
    usuarioGerador?: string;
    /** Se fornecido, exibe botão "Ver Detalhes" para itens do tipo kit; callback recebe o item */
    onVerDetalhesSubKit?: (item: ItemKitVisualizacao) => void;
}

function formatarTipoItem(tipo: string, item: ItemKitVisualizacao): string {
    const t = tipo || 'MATERIAL';
    const ehKit = t === 'KIT' || item.kitId || (item.itensDoKit && Array.isArray(item.itensDoKit));
    const ehKitUnificado = ehKit && !item.kitId && item.itensDoKit;
    const ehKitCatalogo = ehKit && item.kitId;
    if (t === 'MATERIAL') return '📦 Estoque';
    if (t === 'COTACAO') return '❄️ Banco Frio';
    if (t === 'SERVICO') return '⚙️ Serviço';
    if (ehKitUnificado) return '🎁 Kit Unificado';
    if (ehKitCatalogo) return '📚 Kit Catálogo';
    if (ehKit) return '🎁 Kit';
    return t;
}

const ModalItensKit: React.FC<ModalItensKitProps> = ({
    open,
    onClose,
    itens,
    nomeKit,
    empresas = [],
    empresaCNPJ,
    numeroOrcamento,
    usuarioGerador,
    onVerDetalhesSubKit
}) => {
    useEscapeKey(open, onClose);
    const [gerandoPdf, setGerandoPdf] = useState(false);

    if (!open) return null;

    const showCustoLucro = Boolean(empresas?.length && empresaCNPJ);
    const empresa = showCustoLucro ? empresas.find((e: any) => (e.cnpj || '').replace(/\D/g, '') === (empresaCNPJ || '').replace(/\D/g, '')) : null;
    const aliquotaMaterial = (empresa as any)?.aliquotaMaterial ?? 8;

    const valorTotal = itens.reduce((sum, item) => sum + ((item.valorVenda || 0) * (item.quantidade || 1)), 0);
    const custoTotal = itens.reduce((sum, item) => {
        const custoAgregadoUnit = item.custoAgregadoUnit ?? item.custoUnit ?? item.valorUnitario ?? item.preco ?? 0;
        return sum + (custoAgregadoUnit * (item.quantidade || 1));
    }, 0);
    const lucroLiquido = valorTotal - custoTotal;
    const percentualSobreVenda = valorTotal > 0 ? (lucroLiquido / valorTotal) * 100 : 0;

    const handleGerarPdfItensKit = async () => {
        if (!itens.length || gerandoPdf) return;
        setGerandoPdf(true);
        try {
            const itensPdf = itens.map((item) => ({
                nome: item.nome || 'Item sem nome',
                tipo: item.tipo || 'MATERIAL',
                quantidade: item.quantidade || 1,
                unidadeMedida: formatarUnidadeOrcamento(item.unidadeVenda ?? item.unidadeMedida) || 'un',
            }));

            const response = await orcamentosService.gerarPdfItensKit(
                nomeKit || 'Kit Unificado',
                itensPdf,
                numeroOrcamento,
                usuarioGerador
            );
            if (!response.success || !response.data) {
                toast.error('Falha ao gerar PDF do kit', {
                    description: response.error || 'Não foi possível gerar o PDF agora.'
                });
                return;
            }

            const url = URL.createObjectURL(response.data);
            const janela = window.open(url, '_blank', 'noopener,noreferrer');
            if (!janela) {
                toast.error('Bloqueio de pop-up detectado', {
                    description: 'Permita pop-ups para abrir o PDF em nova aba.'
                });
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error: any) {
            toast.error('Erro ao gerar PDF do kit', {
                description: error?.message || 'Tente novamente em instantes.'
            });
        } finally {
            setGerandoPdf(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-md">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Itens do Kit</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{nomeKit}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Código</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Quantidade</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Valor de Venda</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                    {showCustoLucro && (
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Lucro Líquido</th>
                                    )}
                                    {onVerDetalhesSubKit && (
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {itens.map((itemKit, index) => {
                                    const valorVenda = itemKit.valorVenda || 0;
                                    const quantidade = itemKit.quantidade || 1;
                                    const subtotal = valorVenda * quantidade;
                                    const tipoItem = itemKit.tipo || 'MATERIAL';
                                    const custoAgregadoUnit = showCustoLucro
                                        ? (itemKit.custoAgregadoUnit ?? (itemKit.custoUnit ?? 0) + (valorVenda * aliquotaMaterial / 100))
                                        : 0;
                                    const custoTotalItem = custoAgregadoUnit * quantidade;
                                    const lucroLiquidoItem = subtotal - custoTotalItem;
                                    const percentualSobreVendaItem = subtotal > 0 ? (lucroLiquidoItem / subtotal) * 100 : 0;
                                    const ehKit = tipoItem === 'KIT' || itemKit.kitId || (itemKit.itensDoKit && Array.isArray(itemKit.itensDoKit));
                                    const ehKitUnificado = ehKit && !itemKit.kitId && itemKit.itensDoKit;
                                    const ehKitCatalogo = ehKit && itemKit.kitId;
                                    const corTipo: Record<string, string> = {
                                        'MATERIAL': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                                        'COTACAO': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                                        'SERVICO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                                        'KIT': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    };
                                    const cor = corTipo[tipoItem] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

                                    return (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                <div className="font-medium">{itemKit.nome || 'Item sem nome'}</div>
                                                {itemKit.dataUltimaCotacao && (
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                        📅 Cotação: {(() => {
                                                            try {
                                                                const data = new Date(itemKit.dataUltimaCotacao);
                                                                return !isNaN(data.getTime()) ? data.toLocaleDateString('pt-BR') : 'Sem data';
                                                            } catch {
                                                                return 'Sem data';
                                                            }
                                                        })()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{itemKit.codigo || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cor}`}>
                                                    {formatarTipoItem(tipoItem, itemKit)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                                                {quantidade} {formatarUnidadeOrcamento(itemKit.unidadeVenda ?? itemKit.unidadeMedida)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                                R$ {valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-teal-700 dark:text-teal-400">
                                                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            {showCustoLucro && (
                                                <td className="px-4 py-3 text-right text-sm font-medium text-green-600 dark:text-green-400">
                                                    R$ {lucroLiquidoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percentualSobreVendaItem.toFixed(1)}%)
                                                </td>
                                            )}
                                            {onVerDetalhesSubKit && (
                                                <td className="px-4 py-3 text-center">
                                                    {ehKit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onVerDetalhesSubKit(itemKit)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                                                            title="Ver detalhes do kit"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            Ver Detalhes
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-gray-700 dark:to-gray-700">
                                {(() => {
                                    const totalCols = 6 + (showCustoLucro ? 1 : 0) + (onVerDetalhesSubKit ? 1 : 0);
                                    const colspanLabel = totalCols - 1;
                                    return (
                                        <>
                                            {showCustoLucro && (
                                                <tr>
                                                    <td colSpan={colspanLabel} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        Custo agregado do Kit:
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-base font-bold text-red-600 dark:text-red-400">
                                                        R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    {onVerDetalhesSubKit && <td />}
                                                </tr>
                                            )}
                                            <tr>
                                                <td colSpan={colspanLabel} className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                                                    Valor de Venda Total:
                                                </td>
                                                <td className="px-4 py-3 text-right text-lg font-bold text-teal-700 dark:text-teal-400">
                                                    R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                {onVerDetalhesSubKit && <td />}
                                            </tr>
                                            {showCustoLucro && (
                                                <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                                                    <td colSpan={colspanLabel} className="px-4 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                                                        Lucro líquido do Kit:
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-lg font-bold text-green-600 dark:text-green-400">
                                                        R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            {percentualSobreVenda.toFixed(1)}% sobre venda
                                                        </div>
                                                    </td>
                                                    {onVerDetalhesSubKit && <td />}
                                                </tr>
                                            )}
                                        </>
                                    );
                                })()}
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleGerarPdfItensKit}
                            disabled={gerandoPdf || itens.length === 0}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            title="Gerar PDF com itens, tipos e quantidades do kit"
                        >
                            {gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalItensKit;
