import React, { useState } from 'react';

interface ContractPDFViewerProps {
    children: React.ReactNode;
    /** Número de páginas A4 do preview (1, 2, ...) */
    totalPaginas?: number;
}

/**
 * Visualizador de pré-visualização do contrato, com mesma estrutura do PDFViewer do orçamento:
 * toolbar (Preview do PDF, páginas, zoom, Destino: Salvar como PDF) + área com zoom.
 */
const ContractPDFViewer: React.FC<ContractPDFViewerProps> = ({ children, totalPaginas: totalPaginasProp }) => {
    const [zoom, setZoom] = useState(100);
    const totalPaginas = totalPaginasProp ?? 1;

    const handleZoomIn = () => {
        if (zoom < 200) setZoom(prev => prev + 10);
    };

    const handleZoomOut = () => {
        if (zoom > 50) setZoom(prev => prev - 10);
    };

    const handleResetZoom = () => {
        setZoom(100);
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 dark:bg-gray-900">
            {/* Toolbar de Controles - igual ao PDFViewer do orçamento */}
            <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-white text-sm font-semibold">Preview do PDF</span>
                    <div className="h-6 w-px bg-gray-600"></div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleZoomOut}
                        disabled={zoom <= 50}
                        className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                        title="Diminuir zoom"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>

                    <button
                        onClick={handleResetZoom}
                        className="px-3 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors min-w-[60px]"
                        title="Resetar zoom"
                    >
                        {zoom}%
                    </button>

                    <button
                        onClick={handleZoomIn}
                        disabled={zoom >= 200}
                        className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                        title="Aumentar zoom"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg">
                        Destino: Salvar como PDF
                    </div>
                </div>
            </div>

            {/* Área de Visualização com Scroll e Zoom */}
            <div className="flex-1 overflow-auto bg-gray-800 dark:bg-gray-900 p-6 min-h-0">
                <div
                    className="transition-transform duration-200"
                    style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top center'
                    }}
                >
                    <div className="flex flex-col items-center">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractPDFViewer;
