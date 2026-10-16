import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { usePDFCustomization } from '../../hooks/usePDFCustomization';
import { pdfCustomizationService } from '../../services/pdfCustomizationService';
import { OrcamentoPDFData } from '../../types/pdfCustomization';
import { getUploadUrl } from '../../config/api';

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
        handleWatermarkChange,
        resetToDefault,
        hasUnsavedChanges,
    } = usePDFCustomization();

    const [previewReloadToken, setPreviewReloadToken] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [folhasTimbradas, setFolhasTimbradas] = useState<Array<{
        filename: string;
        url: string;
        size: number;
        createdAt: string;
        modifiedAt: string;
    }>>([]);
    const [loadingFolhas, setLoadingFolhas] = useState(false);
    const [uploadingFolha, setUploadingFolha] = useState(false);
    const [baixandoPdf, setBaixandoPdf] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const previewUrlRef = useRef<string | null>(null);
    const previewAbortRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const revokePreviewUrl = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewUrl(null);
    }, []);

    const handleBaixarPdf = async () => {
        if (!orcamentoId || !customization) {
            toast.error('Aguarde o carregamento da personalização.');
            return;
        }
        setBaixandoPdf(true);
        try {
            const result = await pdfCustomizationService.downloadPersonalizedPDF(orcamentoId, customization);
            if (result.success) {
                toast.success('PDF gerado com a folha timbrada selecionada.');
            } else {
                toast.error(result.error || 'Erro ao gerar PDF');
            }
        } catch (error) {
            console.error('Erro ao baixar PDF:', error);
            toast.error('Erro ao gerar PDF do orçamento');
        } finally {
            setBaixandoPdf(false);
        }
    };

    const atualizarPreview = useCallback(() => {
        setPreviewReloadToken((k) => k + 1);
    }, []);

    // Animação de entrada do drawer
    useEffect(() => {
        if (!isOpen) {
            setDrawerVisible(false);
            return;
        }
        const id = window.requestAnimationFrame(() => setDrawerVisible(true));
        return () => window.cancelAnimationFrame(id);
    }, [isOpen]);

    // Trava scroll do body enquanto o drawer está aberto
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    // Esc fecha o painel
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Preview = PDF real do backend (pdfmake), sem paginação DOM no browser
    useEffect(() => {
        if (!isOpen || !orcamentoId || !customization) {
            previewAbortRef.current?.abort();
            revokePreviewUrl();
            setPreviewLoading(false);
            setPreviewError(null);
            return;
        }

        const controller = new AbortController();
        previewAbortRef.current?.abort();
        previewAbortRef.current = controller;

        setPreviewLoading(true);
        setPreviewError(null);

        const timer = window.setTimeout(() => {
            void (async () => {
                const result = await pdfCustomizationService.fetchPreviewPdfBlob(
                    orcamentoId,
                    customization,
                    controller.signal
                );
                if (controller.signal.aborted) return;
                if (result.error === 'aborted') return;

                if (!result.success || !result.blob) {
                    setPreviewError(result.error || 'Não foi possível gerar o preview');
                    revokePreviewUrl();
                    setPreviewLoading(false);
                    return;
                }

                const pdfBlob =
                    result.blob.type === 'application/pdf'
                        ? result.blob
                        : new Blob([result.blob], { type: 'application/pdf' });
                const nextUrl = URL.createObjectURL(pdfBlob);
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                }
                previewUrlRef.current = nextUrl;
                setPreviewUrl(nextUrl);
                setPreviewLoading(false);
            })();
        }, 400);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [
        isOpen,
        orcamentoId,
        customization,
        customization.watermark.opacity,
        customization.design.corners.enabled,
        customization.design.corners.design,
        customization.design.corners.image,
        previewReloadToken,
        revokePreviewUrl,
    ]);

    useEffect(() => {
        if (!isOpen) {
            previewAbortRef.current?.abort();
            revokePreviewUrl();
        }
    }, [isOpen, revokePreviewUrl]);

    useEffect(() => {
        return () => {
            previewAbortRef.current?.abort();
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            void loadFolhasTimbradas();
        }
    }, [isOpen]);

    const loadFolhasTimbradas = async () => {
        setLoadingFolhas(true);
        try {
            const response = await pdfCustomizationService.listFolhasTimbradas();
            if (response.success && response.data) {
                setFolhasTimbradas(response.data);
            } else {
                setFolhasTimbradas([]);
            }
        } catch (error) {
            console.error('Erro ao carregar folhas timbradas:', error);
            setFolhasTimbradas([]);
        } finally {
            setLoadingFolhas(false);
        }
    };

    const handleDeleteFolha = async (filename: string) => {
        if (!confirm('Tem certeza que deseja deletar esta folha timbrada?')) {
            return;
        }

        try {
            const response = await pdfCustomizationService.deleteFolhaTimbrada(filename);
            if (response.success) {
                toast.success('Folha timbrada deletada com sucesso!');
                await loadFolhasTimbradas();
                if (
                    customization.design.corners.design === 'custom' &&
                    customization.design.corners.image?.includes(filename)
                ) {
                    handleCornerDesignChange({
                        enabled: false,
                        design: 'none',
                        image: undefined,
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

    const handleSelectFolha = (url: string) => {
        const fullUrl = getUploadUrl(url);
        handleCornerDesignChange({
            enabled: true,
            design: 'custom',
            image: fullUrl,
        });
        toast.success('Folha timbrada selecionada!');
    };

    const handleClearFolha = () => {
        handleCornerDesignChange({
            enabled: false,
            design: 'none',
            image: undefined,
        });
        toast.success('Folha timbrada removida.');
    };

    const handleUploadFolha = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFolha(true);
        try {
            const uploadResponse = await pdfCustomizationService.uploadFolhaTimbrada(file);
            if (uploadResponse.success && uploadResponse.data) {
                const imageUrl = getUploadUrl(uploadResponse.data.url);
                handleCornerDesignChange({
                    enabled: true,
                    design: 'custom',
                    image: imageUrl,
                });
                toast.success('Folha timbrada carregada e salva!');
                await loadFolhasTimbradas();
            } else {
                toast.error(uploadResponse.error || 'Erro ao fazer upload');
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            toast.error('Erro ao fazer upload da folha timbrada');
        } finally {
            setUploadingFolha(false);
            e.target.value = '';
        }
    };

    if (!isOpen) return null;

    if (!orcamentoId) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="max-w-md rounded-2xl bg-white p-6 dark:bg-dark-card">
                    <h3 className="mb-4 text-xl font-bold text-red-600">Erro</h3>
                    <p className="mb-4 text-gray-700 dark:text-dark-text">
                        ID do orçamento não fornecido. Por favor, feche e tente novamente.
                    </p>
                    <button type="button" onClick={onClose} className="btn-primary w-full">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    if (!customization) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="max-w-md rounded-2xl bg-white p-6 dark:bg-dark-card">
                    <div className="mb-4 flex items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                    </div>
                    <p className="text-center text-gray-700 dark:text-dark-text">
                        Carregando configurações...
                    </p>
                </div>
            </div>
        );
    }

    const orcamentoLabel =
        orcamentoData.numeroSequencial != null
            ? `Orçamento #${orcamentoData.numeroSequencial}`
            : orcamentoData.numero
              ? `Orçamento ${orcamentoData.numero}`
              : 'Orçamento';

    const selectedFolha =
        customization.design.corners.enabled &&
        customization.design.corners.design === 'custom' &&
        customization.design.corners.image;

    return (
        <>
            {/* Overlay */}
            <button
                type="button"
                aria-label="Fechar personalização de PDF"
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                    drawerVisible ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {/* Drawer lateral direito — wrapper em tela cheia */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdf-customization-title"
                className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-out lg:w-[85vw] xl:w-[80vw] ${
                    drawerVisible ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header fixo */}
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                        <h2
                            id="pdf-customization-title"
                            className="truncate text-lg font-semibold text-white sm:text-xl"
                        >
                            Personalizar PDF
                        </h2>
                        <p className="truncate text-xs text-slate-400 sm:text-sm">
                            {orcamentoLabel}
                            {orcamentoData.cliente?.nome ? ` · ${orcamentoData.cliente.nome}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        aria-label="Fechar"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                {/* Corpo: sidebar + canvas */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Sidebar — galeria + controles */}
                    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-slate-950/40 p-4 sm:w-80">
                        <div>
                            <h3 className="mb-1 text-sm font-semibold text-white">Folhas Timbradas</h3>
                            <p className="mb-3 text-xs text-slate-400">
                                Selecione uma folha para o fundo do PDF. O preview atualiza automaticamente.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                disabled={uploadingFolha}
                                onChange={handleUploadFolha}
                                className="hidden"
                            />
                            <button
                                type="button"
                                disabled={uploadingFolha}
                                onClick={() => fileInputRef.current?.click()}
                                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/60 px-3 py-3 text-sm text-slate-200 transition-colors hover:border-blue-500 hover:bg-slate-800 disabled:opacity-50"
                            >
                                <UploadIcon className="h-5 w-5" />
                                {uploadingFolha ? 'Enviando…' : 'Enviar nova folha'}
                            </button>

                            {selectedFolha ? (
                                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
                                    <span>✓ Folha selecionada</span>
                                    <button
                                        type="button"
                                        onClick={handleClearFolha}
                                        className="font-medium text-emerald-200 underline-offset-2 hover:underline"
                                    >
                                        Remover
                                    </button>
                                </div>
                            ) : null}

                            {loadingFolhas ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                    <p className="text-xs text-slate-400">Carregando folhas…</p>
                                </div>
                            ) : folhasTimbradas.length === 0 ? (
                                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                                    <p className="text-sm text-slate-400">Nenhuma folha importada ainda</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Envie uma imagem PNG ou JPG acima
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {folhasTimbradas.map((folha) => {
                                        const isSelected =
                                            customization.design.corners.design === 'custom' &&
                                            (customization.design.corners.image?.includes(folha.filename) ||
                                                customization.design.corners.image?.includes(folha.url));
                                        return (
                                            <div
                                                key={folha.filename}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleSelectFolha(folha.url)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleSelectFolha(folha.url);
                                                    }
                                                }}
                                                title={folha.filename}
                                                className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 ring-2 ring-blue-500/40'
                                                        : 'border-slate-700 hover:border-slate-500'
                                                }`}
                                            >
                                                <div className="aspect-[3/4] bg-slate-800">
                                                    <img
                                                        src={getUploadUrl(folha.url)}
                                                        alt={folha.filename}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src =
                                                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23334155" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%2394a3b8"%3EImagem%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleDeleteFolha(folha.filename);
                                                    }}
                                                    className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity hover:bg-red-500 group-hover:opacity-100"
                                                    title="Deletar folha timbrada"
                                                >
                                                    <XMarkIcon className="h-3.5 w-3.5" />
                                                </button>
                                                {isSelected ? (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 py-1 text-center text-[10px] font-semibold text-white">
                                                        Selecionada
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Controles */}
                        <div className="border-t border-slate-800 pt-4">
                            <h3 className="mb-3 text-sm font-semibold text-white">Ajustes</h3>
                            <label className="mb-1 block text-xs font-medium text-slate-300">
                                Opacidade da marca d&apos;água:{' '}
                                {Math.round(customization.watermark.opacity * 100)}%
                            </label>
                            <input
                                type="range"
                                min={5}
                                max={100}
                                value={Math.round(customization.watermark.opacity * 100)}
                                onChange={(e) =>
                                    handleWatermarkChange({
                                        opacity: Number(e.target.value) / 100,
                                    })
                                }
                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
                            />
                            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                Preview gerado no servidor com pdfmake (mesmo arquivo do download).
                            </p>
                        </div>
                    </aside>

                    {/* Canvas do PDF */}
                    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-slate-950 p-3 sm:p-4">
                        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-100 shadow-inner dark:bg-zinc-900">
                            {previewLoading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/70">
                                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                    <p className="text-sm text-slate-300">Gerando preview no servidor…</p>
                                </div>
                            )}
                            {previewError && !previewLoading ? (
                                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                                    <p className="text-sm text-red-400">{previewError}</p>
                                    <button type="button" onClick={atualizarPreview} className="btn-primary">
                                        Tentar novamente
                                    </button>
                                </div>
                            ) : null}
                            {previewUrl && !previewError ? (
                                <iframe
                                    title={`Preview PDF ${orcamentoLabel}`}
                                    src={previewUrl}
                                    className="h-full min-h-0 w-full flex-1 border-0 bg-slate-100 dark:bg-zinc-900"
                                />
                            ) : null}
                            {!previewUrl && !previewLoading && !previewError ? (
                                <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                                    <p className="text-sm text-slate-500">O preview aparecerá aqui.</p>
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>

                {/* Footer fixo */}
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-5">
                    <div className="min-w-0 text-sm text-slate-400">
                        {hasUnsavedChanges ? (
                            <span className="text-amber-400">Alterações não salvas</span>
                        ) : (
                            <span className="hidden sm:inline">Ajuste a folha e baixe o PDF</span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetToDefault}
                            className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Restaurar Padrão
                        </button>
                        <button
                            type="button"
                            onClick={atualizarPreview}
                            disabled={previewLoading}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                        >
                            {previewLoading ? 'Gerando…' : 'Atualizar Preview'}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleBaixarPdf}
                            disabled={baixandoPdf}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
                                />
                            </svg>
                            {baixandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                        </button>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default PDFCustomizationModal;
