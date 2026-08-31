import React, { useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

export type RhFolhaToolbarProps = {
    competencia: string;
    onCompetenciaChange: (value: string) => void;
    importAno: string;
    importMes: string;
    onImportAnoChange: (value: string) => void;
    onImportMesChange: (value: string) => void;
    importandoPonto: boolean;
    onImportarPonto: (file: File) => void;
    exportandoContabil: boolean;
    onGerarPlanilhaContabilidade: () => void;
    configAberta: boolean;
    onToggleConfig: () => void;
    configPanel?: React.ReactNode;
};

const RhFolhaToolbar: React.FC<RhFolhaToolbarProps> = ({
    competencia,
    onCompetenciaChange,
    importAno,
    importMes,
    onImportAnoChange,
    onImportMesChange,
    importandoPonto,
    onImportarPonto,
    exportandoContabil,
    onGerarPlanilhaContabilidade,
    configAberta,
    onToggleConfig,
    configPanel,
}) => {
    const pontoFileInputRef = useRef<HTMLInputElement>(null);

    const blocoClass =
        'flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50/80 dark:bg-dark-elevated/50 p-4';

    return (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className={blocoClass}>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <h3 className="font-semibold text-sm sm:text-base">Competência da folha</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        Mês/ano usado nas métricas, totais da tabela e exportação contábil.
                    </p>
                    <input
                        type="month"
                        value={competencia}
                        onChange={(e) => onCompetenciaChange(e.target.value)}
                        className="w-full mt-auto px-3 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className={blocoClass}>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text">
                        <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h3 className="font-semibold text-sm sm:text-base">Importar presença do relógio</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        Envie planilha .xls ou .xlsx do relógio de ponto. Ano e mês abaixo são opcionais.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            min={2000}
                            max={2100}
                            placeholder="Ano (opcional)"
                            value={importAno}
                            onChange={(e) => onImportAnoChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm"
                        />
                        <input
                            type="number"
                            min={1}
                            max={12}
                            placeholder="Mês 1–12 (opc.)"
                            value={importMes}
                            onChange={(e) => onImportMesChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm"
                        />
                    </div>
                    <input
                        ref={pontoFileInputRef}
                        type="file"
                        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onImportarPonto(file);
                            e.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        disabled={importandoPonto}
                        onClick={() => pontoFileInputRef.current?.click()}
                        className="w-full mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-60 transition-colors"
                    >
                        {importandoPonto ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        {importandoPonto ? 'Importando…' : 'Selecionar arquivo e importar'}
                    </button>
                </div>

                <div className={`${blocoClass} md:col-span-2 xl:col-span-1`}>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text">
                        <FileSpreadsheet className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <h3 className="font-semibold text-sm sm:text-base">Planilha para contabilidade</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        Gera arquivo .xls no layout LANÇAMENTOS FOLHA (competência {competencia || '—'}).
                    </p>
                    <button
                        type="button"
                        disabled={exportandoContabil || !competencia}
                        onClick={onGerarPlanilhaContabilidade}
                        className="w-full mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:from-purple-700 hover:to-purple-600 disabled:opacity-60 transition-colors"
                    >
                        {exportandoContabil ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                        )}
                        {exportandoContabil ? 'Gerando…' : 'Gerar planilha para contabilidade'}
                    </button>
                </div>
            </div>

            {configPanel && (
                <div className="border-t border-gray-200 dark:border-dark-border pt-3">
                    <button
                        type="button"
                        onClick={onToggleConfig}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {configAberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Configurar exportação contábil
                    </button>
                    {configAberta && <div className="mt-4">{configPanel}</div>}
                </div>
            )}
        </div>
    );
};

export default RhFolhaToolbar;
