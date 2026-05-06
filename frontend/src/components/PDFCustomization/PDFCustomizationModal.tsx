import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { usePDFCustomization } from '../../hooks/usePDFCustomization';
import { pdfCustomizationService } from '../../services/pdfCustomizationService';
import { OrcamentoPDFData, CORNER_DESIGNS } from '../../types/pdfCustomization';
import { getUploadUrl } from '../../config/api';
import PDFViewer from './PDFViewer';

// Icons
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

interface PDFCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    orcamentoId: string;
    orcamentoData: OrcamentoPDFData;
}

const PDFCustomizationModal: React.FC<PDFCustomizationModalProps> = ({
    isOpen,
    onClose,
    orcamentoId,
    orcamentoData,
}) => {
    const {
        customization,
        handleCornerDesignChange,
        handleContentChange,
        resetToDefault,
        hasUnsavedChanges
    } = usePDFCustomization();

    const [activeTab, setActiveTab] = useState<'design' | 'preview'>('preview');
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [previewKey, setPreviewKey] = useState(0);
    const [folhasTimbradas, setFolhasTimbradas] = useState<Array<{
        filename: string;
        url: string;
        size: number;
        createdAt: string;
        modifiedAt: string;
    }>>([]);
    const [loadingFolhas, setLoadingFolhas] = useState(false);
    const [uploadingFolha, setUploadingFolha] = useState(false);
    
    // Ref para o componente printable
    const printableRef = useRef<HTMLDivElement>(null);

    // Configurar react-to-print — margin: 0 porque cada página renderiza seu próprio timbre
    const handlePrint = useReactToPrint({
        contentRef: printableRef,
        documentTitle: `Orcamento-${orcamentoData.numero}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 0 !important;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                /* Garantir visibilidade do conteúdo */
                .print-container,
                .print-container * {
                    visibility: visible !important;
                }
            }
        `,
        onBeforePrint: async () => {
            console.log('Preparando para imprimir...');
            // Aguardar carregamento de imagens (timbre)
            if (printableRef.current) {
                const images = printableRef.current.querySelectorAll('img');
                const promises = Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    });
                });
                await Promise.all(promises);
            }
        },
        onAfterPrint: () => {
            console.log('Impressão concluída ou cancelada');
        }
    });

    // NOTE: Lógica de geração/baixar PDF removida — agora o modal só fornece preview e impressão

    // O preview visual do modal é 100% client-side (`PDFViewer`).
    // Em DEV, a geração de preview via backend + múltiplos useEffects (e StrictMode) causava 2-3 requests e rerenders pesados.
    // Mantemos apenas a opção de "atualizar" re-montando o viewer.
    const atualizarPreview = React.useCallback(() => {
        setPreviewKey((k) => k + 1);
    }, []);

    // Carregar folhas timbradas quando o modal abrir
    useEffect(() => {
        if (isOpen) {
            loadFolhasTimbradas();
        }
    }, [isOpen]);

    // Função para carregar lista de folhas timbradas
    const loadFolhasTimbradas = async () => {
        setLoadingFolhas(true);
        try {
            const response = await pdfCustomizationService.listFolhasTimbradas();
            if (response.success && response.data) {
                setFolhasTimbradas(response.data);
            } else {
                // Se der erro 404 ou não houver folhas, apenas mostrar lista vazia
                setFolhasTimbradas([]);
            }
        } catch (error) {
            console.error('Erro ao carregar folhas timbradas:', error);
            // Não mostrar erro ao usuário, apenas lista vazia
            setFolhasTimbradas([]);
        } finally {
            setLoadingFolhas(false);
        }
    };

    // Preview é client-side, então não há geração automática via backend aqui.

    // Deletar folha timbrada
    const handleDeleteFolha = async (filename: string) => {
        if (!confirm('Tem certeza que deseja deletar esta folha timbrada?')) {
            return;
        }

        try {
            const response = await pdfCustomizationService.deleteFolhaTimbrada(filename);
            if (response.success) {
                toast.success('Folha timbrada deletada com sucesso!');
                // Recarregar lista
                await loadFolhasTimbradas();
                // Se a folha deletada estava selecionada, limpar seleção
                if (customization.design.corners.design === 'custom' && 
                    customization.design.corners.image?.includes(filename)) {
                    handleCornerDesignChange({
                        enabled: false,
                        design: 'none',
                        image: undefined
                    });
                }
            } else {
                toast.error(response.error || 'Erro ao deletar folha timbrada');
            }
        } catch (error) {
            console.error('Erro ao deletar folha timbrada:', error);
            toast.error('Erro ao deletar folha timbrada');
        }
    };

    // Selecionar folha timbrada da lista
    const handleSelectFolha = (url: string) => {
        const fullUrl = getUploadUrl(url);
        handleCornerDesignChange({
            enabled: true,
            design: 'custom',
            image: fullUrl
        });
        toast.success('Folha timbrada selecionada!');
    };

    if (!isOpen) return null;

    // Validar props necessárias
    if (!orcamentoId) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md">
                    <h3 className="text-xl font-bold text-red-600 mb-4">Erro</h3>
                    <p className="text-gray-700 dark:text-dark-text mb-4">
                        ID do orçamento não fornecido. Por favor, feche e tente novamente.
                    </p>
                    <button onClick={onClose} className="btn-primary w-full">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    // Validar se customization foi carregado
    if (!customization) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md">
                    <div className="flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                    <p className="text-center text-gray-700 dark:text-dark-text">
                        Carregando configurações...
                    </p>
                </div>
            </div>
        );
    }

    // NOTE: Lógica de geração de PDF via backend removida — mantenha apenas preview e impressão

    // Salvar template
    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Nome obrigatório', {
                description: 'Digite um nome para o template'
            });
            return;
        }

        const promise = (async () => {
            const response = await pdfCustomizationService.saveTemplate(templateName, customization);
            if (response.success) {
                setShowSaveTemplate(false);
                setTemplateName('');
                return templateName;
            } else {
                throw new Error(response.error || 'Erro ao salvar template');
            }
        })();

        toast.promise(promise, {
            loading: 'Salvando template...',
            success: (name) => ({
                title: 'Template salvo!',
                description: `"${name}" está disponível para reutilização`,
                icon: '💾'
            }),
            error: (err) => err.message || 'Erro ao salvar template'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-[#0a1a2f]">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">🎨 Personalizar PDF</h2>
                                <p className="text-xs text-white/80 mt-1">Customize o design e conteúdo do seu orçamento</p>
                            </div>
                            
                            {/* Tabs ao lado do título */}
                            <div className="flex gap-2 ml-4">
                                {[
                                    { id: 'design', label: '🎨 Design', icon: '🎨' },
                                    { id: 'preview', label: '👁️ Pré-visualização', icon: '👁️' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-white text-[#0a1a2f]'
                                                : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Painel de Controles: na aba Preview mesma largura do modal Gerar Contrato (barra estreita); na Design mais largo */}
                    <div className={`overflow-y-auto border-r border-gray-200 dark:border-dark-border ${activeTab === 'preview' ? 'w-56 max-w-[220px] p-4 flex-shrink-0' : 'w-[calc(40%-10px)] p-6'}`}>
                        {/* TAB: Design */}
                        {activeTab === 'design' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">🎨 Design</h3>
                                    
                                    {/* Upload de Folha Timbrada Personalizada */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                                            📄 Folha Timbrada Personalizada
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-3">
                                            Faça upload de uma imagem de fundo personalizada para usar como folha timbrada (PNG ou JPG)
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg"
                                            disabled={uploadingFolha}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setUploadingFolha(true);
                                                    try {
                                                        // Fazer upload para o servidor
                                                        const uploadResponse = await pdfCustomizationService.uploadFolhaTimbrada(file);
                                                        if (uploadResponse.success && uploadResponse.data) {
                                                            const imageUrl = getUploadUrl(uploadResponse.data.url);
                                                            handleCornerDesignChange({ 
                                                                enabled: true,
                                                                design: 'custom',
                                                                image: imageUrl
                                                            });
                                                            toast.success('Folha timbrada carregada e salva!');
                                                            // Recarregar lista
                                                            await loadFolhasTimbradas();
                                                        } else {
                                                            toast.error(uploadResponse.error || 'Erro ao fazer upload');
                                                        }
                                                    } catch (error) {
                                                        console.error('Erro ao fazer upload:', error);
                                                        toast.error('Erro ao fazer upload da folha timbrada');
                                                    } finally {
                                                        setUploadingFolha(false);
                                                        // Limpar input
                                                        e.target.value = '';
                                                    }
                                                }
                                            }}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                                        />
                                        {uploadingFolha && (
                                            <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded flex items-center gap-2 text-xs">
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                                                Enviando...
                                            </div>
                                        )}
                                        {customization.design.corners.enabled && customization.design.corners.design === 'custom' && customization.design.corners.image && (
                                            <div className="mt-2 p-2 bg-green-50 text-green-700 rounded flex items-center gap-2 text-xs">
                                                <span>✓</span> Folha timbrada carregada
                                            </div>
                                        )}

                                        {/* Lista de Folhas Timbradas Já Importadas */}
                                        <div className="mt-6">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                                                📋 Folhas Timbradas Disponíveis:
                                            </p>
                                            {loadingFolhas ? (
                                                <div className="flex flex-col items-center justify-center p-6">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mb-2"></div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Carregando folhas timbradas...</p>
                                                </div>
                                            ) : folhasTimbradas.length === 0 ? (
                                                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Nenhuma folha timbrada importada ainda
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        Faça upload de uma folha timbrada acima para começar
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                                                    {folhasTimbradas.map((folha) => {
                                                        const isSelected = customization.design.corners.design === 'custom' && 
                                                                          (customization.design.corners.image?.includes(folha.filename) || 
                                                                           customization.design.corners.image?.includes(folha.url));
                                                        return (
                                                            <div
                                                                key={folha.filename}
                                                                className={`relative group border-2 rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-md ${
                                                                    isSelected 
                                                                        ? 'border-blue-600 ring-4 ring-blue-300 dark:ring-blue-800 scale-105' 
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
                                                                }`}
                                                                onClick={() => {
                                                                    handleSelectFolha(folha.url);
                                                                    // Preview é client-side; só força re-mount para garantir atualização imediata
                                                                    setTimeout(() => atualizarPreview(), 0);
                                                                }}
                                                                title={folha.filename}
                                                            >
                                                                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-900 relative">
                                                                    <img
                                                                        src={getUploadUrl(folha.url)}
                                                                        alt={folha.filename}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImagem%3C/text%3E%3C/svg%3E';
                                                                        }}
                                                                    />
                                                                    {/* Overlay escuro quando hover */}
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                                </div>
                                                                
                                                                {/* Botão de deletar (vermelho redondo no canto superior direito) */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteFolha(folha.filename);
                                                                    }}
                                                                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                                                                    title="Deletar folha timbrada"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" />
                                                                </button>
                                                                
                                                                {/* Indicador de seleção */}
                                                                {isSelected && (
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-500 text-white text-xs py-2 px-2 text-center font-semibold">
                                                                        ✓ Selecionada
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Badge de seleção no canto superior esquerdo */}
                                                                {isSelected && (
                                                                    <div className="absolute top-2 left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg z-10">
                                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: Preview */}
                        {activeTab === 'preview' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">👁️ Pré-visualização</h3>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                    Preview em tempo real do PDF que será gerado. Ajuste as configurações nas outras abas e clique em "Atualizar Preview".
                                </p>
                                
                                {/* Botões de Ação */}
                                <div className="space-y-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={atualizarPreview}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Atualizar Preview
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetToDefault}
                                        className="btn-ghost w-full"
                                    >
                                        Restaurar Padrão
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Área de Preview - Sempre visível */}
                    <div className="flex-1 overflow-auto">
                        {/* Visualizador de PDF profissional - sempre visível */}
                        <div style={{ height: '100%' }}>
                            <PDFViewer
                                key={`pdf-viewer-${previewKey}`}
                                orcamento={orcamentoData}
                                folhaTimbradaUrl={customization.design.corners.enabled && customization.design.corners.design === 'custom' ? customization.design.corners.image : undefined}
                                opacidade={customization.watermark.opacity}
                                printableRef={printableRef}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-dark-border flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {hasUnsavedChanges && <span className="text-orange-600 dark:text-orange-400">⚠️ Alterações não salvas</span>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    if (printableRef.current) {
                                        handlePrint();
                                        toast.success('Abrindo janela de impressão...');
                                    } else {
                                        toast.error('Erro: Preview não carregado. Vá para aba "Pré-visualização" primeiro.');
                                    }
                                } catch (error) {
                                    console.error('Erro ao imprimir:', error);
                                    toast.error('Erro ao abrir janela de impressão');
                                }
                            }}
                            className="btn-secondary disabled:opacity-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Salvar Template */}
            {showSaveTemplate && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="modal-content max-w-md w-full">
                        <div className="modal-header">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Salvar Template</h3>
                        </div>
                        <div className="modal-body">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Nome do Template</label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="input-field"
                                placeholder="Ex: Orçamento Padrão S3E"
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSaveTemplate(false);
                                    setTemplateName('');
                                }}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="btn-primary"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFCustomizationModal;

