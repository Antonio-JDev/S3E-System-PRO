import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import {
  importContatosS3e,
  type ContatoS3eImportRowInput,
  type ContatoS3eImportSummary
} from '../../services/contatosS3eService';

export interface ImportarContatosCsvModalProps {
  open: boolean;
  onClose: () => void;
  onImportFinished: (summary: ContatoS3eImportSummary) => void;
}

type ParsedRow = Record<string, string>;
type MappingKey = 'numero' | 'nomeAgenda' | 'empresa' | 'pushName';

const REQUIRED: MappingKey = 'numero';

const NAME_HINTS: Record<MappingKey, string[]> = {
  numero: ['numero', 'número', 'telefone', 'celular', 'phone', 'fone', 'whatsapp'],
  nomeAgenda: ['nome_agenda', 'nome', 'name', 'contato', 'cliente'],
  empresa: ['empresa', 'company', 'org', 'organização', 'organizacao'],
  pushName: ['push_name', 'pushname', 'apelido']
};

function guessHeader(headers: string[], key: MappingKey): string | '' {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of NAME_HINTS[key]) {
    const idx = lower.findIndex((h) => h === hint || h.includes(hint));
    if (idx >= 0) return headers[idx];
  }
  return '';
}

const CHUNK_SIZE = 500;
const MAX_PREVIEW_ROWS = 6;

export const ImportarContatosCsvModal: React.FC<ImportarContatosCsvModalProps> = ({
  open,
  onClose,
  onImportFinished
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    numero: '',
    nomeAgenda: '',
    empresa: '',
    pushName: ''
  });
  const [dddPadrao, setDddPadrao] = useState('47');
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [finalSummary, setFinalSummary] = useState<ContatoS3eImportSummary | null>(null);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  function resetState() {
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({ numero: '', nomeAgenda: '', empresa: '', pushName: '' });
    setParsing(false);
    setUploading(false);
    setProgress(null);
    setFinalSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handlePickFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (res) => {
        const parsedHeaders = res.meta.fields?.map((f) => f.trim()).filter(Boolean) ?? [];
        const parsedRows = (res.data as ParsedRow[]).filter((r) => r && Object.keys(r).length > 0);
        setHeaders(parsedHeaders);
        setRows(parsedRows);
        setMapping({
          numero: guessHeader(parsedHeaders, 'numero'),
          nomeAgenda: guessHeader(parsedHeaders, 'nomeAgenda'),
          empresa: guessHeader(parsedHeaders, 'empresa'),
          pushName: guessHeader(parsedHeaders, 'pushName')
        });
        setParsing(false);
        if (parsedRows.length === 0) {
          toast.warning('CSV vazio ou sem linhas válidas.');
        }
      },
      error: (err) => {
        setParsing(false);
        toast.error(`Erro ao ler CSV: ${err.message}`);
      }
    });
  }

  const preview = useMemo(() => rows.slice(0, MAX_PREVIEW_ROWS), [rows]);

  const canImport = !!mapping.numero && rows.length > 0 && !uploading && !parsing;

  async function handleImport() {
    if (!mapping.numero) {
      toast.error('Selecione a coluna que contém o número de telefone.');
      return;
    }
    if (rows.length === 0) {
      toast.error('Nenhuma linha para importar.');
      return;
    }

    setUploading(true);
    setProgress({ processed: 0, total: rows.length });
    setFinalSummary(null);

    const aggregate: ContatoS3eImportSummary = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      results: []
    };

    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const slice = rows.slice(i, i + CHUNK_SIZE);
        const payload: ContatoS3eImportRowInput[] = slice.map((r) => ({
          numero: String(r[mapping.numero] ?? '').trim(),
          nomeAgenda: mapping.nomeAgenda ? String(r[mapping.nomeAgenda] ?? '').trim() || null : null,
          empresa: mapping.empresa ? String(r[mapping.empresa] ?? '').trim() || null : null,
          pushName: mapping.pushName ? String(r[mapping.pushName] ?? '').trim() || null : null
        }));

        const resp = await importContatosS3e({ rows: payload, dddPadrao });
        if (!resp.success || !resp.data) {
          throw new Error(resp.error || 'Falha ao importar lote');
        }
        aggregate.total += resp.data.total;
        aggregate.created += resp.data.created;
        aggregate.updated += resp.data.updated;
        aggregate.skipped += resp.data.skipped;
        aggregate.errors += resp.data.errors;
        aggregate.results.push(...resp.data.results);

        setProgress({ processed: i + slice.length, total: rows.length });
      }

      setFinalSummary(aggregate);
      onImportFinished(aggregate);
      toast.success(
        `Importação concluída: ${aggregate.created} novos, ${aggregate.updated} atualizados, ${aggregate.skipped} ignorados.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar contatos');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="flex max-h-[min(92vh,720px)] w-[min(96vw,52rem)] max-w-3xl flex-col gap-0 overflow-hidden border-gray-200 bg-white p-0 dark:border-dark-border dark:bg-dark-card sm:max-w-3xl">
        <DialogHeader className="space-y-1 border-b border-gray-200 px-6 pb-4 pt-6 pr-14 text-left dark:border-dark-border">
          <DialogTitle className="text-lg text-gray-900 dark:text-white">Importar contatos via CSV</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-dark-text-secondary">
            Envia em lotes de {CHUNK_SIZE}. Números são sanitizados automaticamente (remove
            <code className="px-1">+</code> <code className="px-1">-</code> <code className="px-1">()</code> e adiciona DDI 55).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <section className="rounded-lg border border-dashed border-gray-300 p-4 text-sm dark:border-dark-border">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePickFile(file);
                  }}
                />
                {fileName ? 'Trocar arquivo' : 'Selecionar arquivo .csv'}
              </label>
              {fileName && (
                <span className="truncate text-gray-700 dark:text-dark-text-secondary">{fileName}</span>
              )}
              {parsing && <span className="text-gray-500">Lendo arquivo…</span>}
              {rows.length > 0 && (
                <span className="text-gray-600 dark:text-dark-text-secondary">
                  <strong>{rows.length}</strong> linhas detectadas
                </span>
              )}
            </div>
          </section>

          {headers.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Mapeamento de colunas</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(['numero', 'nomeAgenda', 'empresa', 'pushName'] as MappingKey[]).map((key) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary">
                      {key === 'numero'
                        ? 'Telefone (obrigatório)'
                        : key === 'nomeAgenda'
                          ? 'Nome (agenda)'
                          : key === 'empresa'
                            ? 'Empresa'
                            : 'Push name (apelido WhatsApp)'}
                    </span>
                    <select
                      className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-dark-border dark:bg-dark-card-secondary"
                      value={mapping[key]}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                    >
                      <option value="">— Ignorar —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {key === REQUIRED && !mapping[key] && (
                      <span className="text-xs text-amber-600">Selecione a coluna do telefone</span>
                    )}
                  </label>
                ))}
              </div>
              <label className="flex w-32 flex-col gap-1">
                <span className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary">DDD padrão</span>
                <input
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-dark-border dark:bg-dark-card-secondary"
                  value={dddPadrao}
                  onChange={(e) => setDddPadrao(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="47"
                />
                <span className="text-[11px] text-gray-500 dark:text-dark-text-secondary">
                  usado quando o número vier sem DDD
                </span>
              </label>
            </section>
          )}

          {preview.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pré-visualização (primeiras {preview.length} linhas)</h3>
              <div className="max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-dark-border">
                <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-dark-border">
                  <thead className="bg-gray-50 dark:bg-dark-card-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-dark-text-secondary">Telefone</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-dark-text-secondary">Nome</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-dark-text-secondary">Empresa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {preview.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-mono">{mapping.numero ? r[mapping.numero] || '—' : '—'}</td>
                        <td className="px-3 py-1.5">{mapping.nomeAgenda ? r[mapping.nomeAgenda] || '—' : '—'}</td>
                        <td className="px-3 py-1.5">{mapping.empresa ? r[mapping.empresa] || '—' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {progress && (
            <section className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-700 dark:text-dark-text-secondary">
                <span>Enviando lote ao servidor</span>
                <span>
                  {progress.processed}/{progress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-card-secondary">
                <div
                  className="h-full bg-brand-blue transition-all"
                  style={{ width: `${Math.round((progress.processed / progress.total) * 100)}%` }}
                />
              </div>
            </section>
          )}

          {finalSummary && (
            <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
              <p className="font-medium">Importação concluída</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                <li>Total enviado: {finalSummary.total}</li>
                <li>Criados: {finalSummary.created}</li>
                <li>Atualizados: {finalSummary.updated}</li>
                <li>Ignorados (números inválidos): {finalSummary.skipped}</li>
                {finalSummary.errors > 0 && <li>Erros no servidor: {finalSummary.errors}</li>}
              </ul>
            </section>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200 px-6 py-3 dark:border-dark-border">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-card-secondary"
            onClick={onClose}
            disabled={uploading}
          >
            {finalSummary ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            onClick={handleImport}
            disabled={!canImport}
          >
            {uploading ? 'Importando…' : 'Importar contatos'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportarContatosCsvModal;
