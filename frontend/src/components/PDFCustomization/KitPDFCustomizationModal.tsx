import React, { useState } from 'react';
import { toast } from 'sonner';
import { usePDFCustomization } from '../../hooks/usePDFCustomization';
import { KitFerramentasPDFData } from '../../types/pdfCustomization';
import { axiosApiService } from '../../services/axiosApi';

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

interface KitPDFCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    kitId: string;
    kitData: KitFerramentasPDFData;
}

const KitPDFCustomizationModal: React.FC<KitPDFCustomizationModalProps> = ({
    isOpen,
    onClose,
    kitId,
    kitData
}) => {
    const {
        customization,
        handleWatermarkChange,
        handleDesignChange,
        handleContentChange,
        resetToDefault
    } = usePDFCustomization();

    const [activeTab, setActiveTab] = useState<'design' | 'content' | 'preview'>('design');
    const [generating, setGenerating] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [previewHTML, setPreviewHTML] = useState<string>('');
    const [loadingPreview, setLoadingPreview] = useState(false);

    if (!isOpen) return null;

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                handleWatermarkChange({
                    ...customization.watermark,
                    type: 'logo',
                    content: result
                });
                // Atualizar preview automaticamente quando folha timbrada for carregada
                if (activeTab === 'preview') {
                    gerarPreviewHTML();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const gerarPreviewHTML = React.useCallback(async () => {
        try {
            setLoadingPreview(true);
            console.log('🔄 Gerando preview do recibo com personalizações...');

            // Se tiver folha timbrada, usar endpoint personalizado
            if (logoPreview) {
                const formData = new FormData();
                formData.append('opacidade', customization.watermark.opacity.toString());
                
                // Converter base64 para blob
                try {
                    const response = await fetch(logoPreview);
                    const blob = await response.blob();
                    formData.append('folhaTimbrada', blob, 'folha.png');
                } catch (err) {
                    console.warn('Não foi possível converter folha timbrada:', err);
                }

                const response = await axiosApiService.post(
                    `/api/kits-ferramenta/${kitId}/recibo/preview-personalizado`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                if (response.success && response.data?.html) {
                    let html = response.data.html;

                    // Aplicar cores personalizadas
                    html = html.replace(
                        /#2563eb/g,
                        customization.design.colors.primary
                    ).replace(
                        /#1e40af/g,
                        customization.design.colors.secondary
                    );

                    console.log('✅ Preview gerado com sucesso (com folha timbrada)');
                    setPreviewHTML(html);
                } else {
                    throw new Error('Resposta inválida do servidor');
                }
            } else {
                // Sem folha timbrada, usar endpoint normal
                const response = await axiosApiService.get(`/api/kits-ferramenta/${kitId}/recibo`);

                if (response.success && response.data) {
                    let html = response.data as string;

                    // Aplicar cores personalizadas
                    html = html.replace(
                        /#2563eb/g,
                        customization.design.colors.primary
                    ).replace(
                        /#1e40af/g,
                        customization.design.colors.secondary
                    );

                    console.log('✅ Preview gerado com sucesso');
                    setPreviewHTML(html);
                }
            }
        } catch (error: any) {
            console.error('❌ Erro ao gerar preview:', error);
            toast.error('Erro ao gerar preview: ' + (error?.response?.data?.error || error?.message));
        } finally {
            setLoadingPreview(false);
        }
    }, [kitId, logoPreview, customization]);

    // Gerar preview automaticamente quando abrir a aba de preview ou quando folha timbrada/opacidade mudar
    React.useEffect(() => {
        if (isOpen && activeTab === 'preview') {
            gerarPreviewHTML();
        }
    }, [isOpen, activeTab, logoPreview, customization.watermark.opacity, gerarPreviewHTML]);

    const handleGeneratePDF = async () => {
        try {
            setGenerating(true);
            toast.loading('📄 Gerando recibo personalizado...', { id: 'pdf-generation' });

            let html: string;

            // Se tiver folha timbrada, usar endpoint personalizado
            if (logoPreview) {
                const formData = new FormData();
                formData.append('opacidade', customization.watermark.opacity.toString());
                
                // Converter base64 para blob
                try {
                    const response = await fetch(logoPreview);
                    const blob = await response.blob();
                    formData.append('folhaTimbrada', blob, 'folha.png');
                } catch (err) {
                    console.warn('Não foi possível converter folha timbrada:', err);
                }

                const response = await axiosApiService.post(
                    `/api/kits-ferramenta/${kitId}/recibo/preview-personalizado`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                if (response.success && response.data?.html) {
                    html = response.data.html;
                } else {
                    throw new Error('Erro ao gerar recibo personalizado');
                }
            } else {
                // Sem folha timbrada, usar endpoint normal
                const response = await axiosApiService.get(`/api/kits-ferramenta/${kitId}/recibo`);
                if (response.success && response.data) {
                    html = response.data as string;
                } else {
                    throw new Error('Erro ao gerar recibo');
                }
            }

            // Aplicar cores personalizadas
            html = html.replace(
                /#2563eb/g,
                customization.design.colors.primary
            ).replace(
                /#1e40af/g,
                customization.design.colors.secondary
            );

            // Criar uma nova janela e escrever o HTML
            const novaJanela = window.open('', '_blank');
            if (novaJanela) {
                novaJanela.document.write(html);
                novaJanela.document.close();
                toast.success('✅ Recibo gerado com sucesso!', { id: 'pdf-generation' });
                onClose();
            } else {
                toast.error('❌ Não foi possível abrir nova aba. Verifique o bloqueador de pop-ups.', { id: 'pdf-generation' });
            }
        } catch (error: any) {
            console.error('❌ Erro ao gerar PDF:', error);
            toast.error('❌ Erro ao gerar recibo: ' + (error?.response?.data?.error || error?.message), { id: 'pdf-generation' });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-green-600 to-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">🎨 Personalizar Recibo</h2>
                            <p className="text-sm text-white/80 mt-1">Customize o design e conteúdo do recibo de ferramentas</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-6">
                        {[
                            { id: 'design', label: '🎨 Design', icon: '🎨' },
                            { id: 'content', label: '📄 Conteúdo', icon: '📄' },
                            { id: 'preview', label: '👁️ Pré-visualização', icon: '👁️' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white text-green-600 shadow-lg'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Tab: Design */}
                    {activeTab === 'design' && (
                        <div className="space-y-6">
                            {/* Folha Timbrada */}
                            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-6 border border-gray-200 dark:border-dark-border">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
                                    <UploadIcon className="w-5 h-5 text-green-600" />
                                    Folha Timbrada Personalizada
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Faça upload de uma imagem de fundo personalizada para usar como folha timbrada (PNG ou JPG)
                                </p>
                                
                                <div className="flex items-center gap-4">
                                    <label className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
                                            {logoPreview ? (
                                                <div className="space-y-2">
                                                    <img src={logoPreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                                                    <p className="text-sm text-green-600 font-semibold">✅ Imagem carregada</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        Clique para fazer upload
                                                    </p>
                                                    <p className="text-xs text-gray-500">PNG ou JPG</p>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Opacidade */}
                                {logoPreview && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Opacidade da Marca d'água: {Math.round(customization.watermark.opacity * 100)}%
                                        </label>
                                        <input
                                            type="range"
                                            min="10"
                                            max="100"
                                            value={customization.watermark.opacity * 100}
                                            onChange={(e) => handleWatermarkChange({
                                                ...customization.watermark,
                                                opacity: parseInt(e.target.value) / 100
                                            })}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Cores do Template */}
                            <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-6 border border-gray-200 dark:border-dark-border">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">
                                    🎨 Cores do Documento
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Cor Principal
                                        </label>
                                        <input
                                            type="color"
                                            value={customization.design.colors.primary}
                                            onChange={(e) => handleDesignChange({
                                                ...customization.design,
                                                colors: { ...customization.design.colors, primary: e.target.value }
                                            })}
                                            className="w-full h-12 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Cor Secundária
                                        </label>
                                        <input
                                            type="color"
                                            value={customization.design.colors.secondary}
                                            onChange={(e) => handleDesignChange({
                                                ...customization.design,
                                                colors: { ...customization.design.colors, secondary: e.target.value }
                                            })}
                                            className="w-full h-12 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Conteúdo */}
                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">
                                📄 O que incluir no recibo?
                            </h3>

                            {[
                                { key: 'showCompanyHeader', label: 'Cabeçalho da Empresa', description: 'Logo e informações da empresa no topo' },
                                { key: 'showItemCodes', label: 'Códigos das Ferramentas', description: 'Mostrar código de identificação de cada ferramenta' },
                                { key: 'showTechnicalDescriptions', label: 'Descrições Técnicas', description: 'Incluir marca, modelo e categoria das ferramentas' },
                                { key: 'showTermsAndConditions', label: 'Termo de Responsabilidade', description: 'Incluir termo completo de responsabilidade' },
                                { key: 'showSignatures', label: 'Espaços para Assinaturas', description: 'Incluir campos para assinatura do eletricista e administrador' },
                                { key: 'showCompanyFooter', label: 'Rodapé da Empresa', description: 'Informações da empresa no rodapé' }
                            ].map((option) => (
                                <div key={option.key} className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4 border border-gray-200 dark:border-dark-border">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(customization.content as any)[option.key]}
                                            onChange={(e) => handleContentChange({
                                                ...customization.content,
                                                [option.key]: e.target.checked
                                            })}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-dark-text">{option.label}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab: Preview */}
                    {activeTab === 'preview' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                    👁️ Preview do Recibo
                                </h3>
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    Visualize como ficará o recibo com as personalizações aplicadas.
                                </p>
                            </div>

                            {loadingPreview ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <svg className="animate-spin w-12 h-12 mx-auto mb-4 text-green-600" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="text-gray-600">Carregando preview...</p>
                                    </div>
                                </div>
                            ) : previewHTML ? (
                                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Preview do Documento</span>
                                        <button
                                            onClick={gerarPreviewHTML}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                                        >
                                            🔄 Atualizar
                                        </button>
                                    </div>
                                    <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                                        <iframe
                                            srcDoc={previewHTML}
                                            className="w-full border-0"
                                            style={{ height: '800px', transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}
                                            title="Preview do Recibo"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                                    <p className="text-gray-600">Clique em "Atualizar" para gerar o preview</p>
                                    <button
                                        onClick={gerarPreviewHTML}
                                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                                    >
                                        Gerar Preview
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex gap-3 justify-between">
                    <button
                        onClick={resetToDefault}
                        className="px-6 py-3 text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover rounded-xl transition-all font-semibold"
                    >
                        🔄 Restaurar Padrão
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-all shadow-sm font-semibold border border-gray-300 dark:border-dark-border"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGeneratePDF}
                            disabled={generating}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Gerar Recibo
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KitPDFCustomizationModal;

