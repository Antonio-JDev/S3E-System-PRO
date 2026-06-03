import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  projetosEngenhariaService,
  type EngenhariaDocumentoReferencia,
} from '../services/projetosEngenhariaService';

const CATEGORIAS = ['PDF', 'NORMA', 'OUTRO'] as const;

const inputDark =
  'w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-dark-text';

const btnSecondary =
  'text-xs px-2 py-1 rounded-lg font-medium border border-gray-200 dark:border-dark-border bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-slate-700 dark:hover:text-dark-text';

const btnDanger =
  'text-xs px-2 py-1 rounded-lg font-medium border border-red-200 dark:border-red-800/60 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50';

interface EngenhariaBibliotecaDocumentosProps {
  refreshKey?: number;
}

const EngenhariaBibliotecaDocumentos: React.FC<EngenhariaBibliotecaDocumentosProps> = ({
  refreshKey = 0,
}) => {
  const [docs, setDocs] = useState<EngenhariaDocumentoReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<string>('PDF');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBlobUrl, setModalBlobUrl] = useState<string | null>(null);
  const [modalTitulo, setModalTitulo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projetosEngenhariaService.listarDocumentosReferencia();
      if (res.success && Array.isArray(res.data)) {
        setDocs(res.data);
      }
    } catch {
      toast.error('Erro ao carregar biblioteca de documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    return () => {
      if (modalBlobUrl) URL.revokeObjectURL(modalBlobUrl);
    };
  }, [modalBlobUrl]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('arquivo', file);
      fd.append('titulo', titulo.trim() || file.name);
      fd.append('categoria', categoria);
      const res = await projetosEngenhariaService.uploadDocumentoReferencia(fd);
      if (res.success) {
        toast.success('Documento importado');
        setTitulo('');
        if (fileRef.current) fileRef.current.value = '';
        void load();
      } else {
        toast.error(res.error || 'Erro ao importar');
      }
    } catch {
      toast.error('Erro ao importar documento');
    } finally {
      setUploading(false);
    }
  };

  const abrirPdf = async (doc: EngenhariaDocumentoReferencia, novaAba: boolean) => {
    try {
      const blob = await projetosEngenhariaService.obterDocumentoBlob(doc.id);
      const url = URL.createObjectURL(blob);
      if (novaAba) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        if (modalBlobUrl) URL.revokeObjectURL(modalBlobUrl);
        setModalBlobUrl(url);
        setModalTitulo(doc.titulo);
        setModalOpen(true);
      }
    } catch {
      toast.error('Não foi possível abrir o documento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este documento da sua biblioteca?')) return;
    const res = await projetosEngenhariaService.deletarDocumentoReferencia(id);
    if (res.success) {
      toast.success('Documento removido');
      void load();
    } else {
      toast.error(res.error || 'Erro ao remover');
    }
  };

  const fecharModal = () => {
    setModalOpen(false);
    if (modalBlobUrl) {
      URL.revokeObjectURL(modalBlobUrl);
      setModalBlobUrl(null);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-soft overflow-hidden mt-6 mb-4">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-indigo-50 dark:bg-indigo-950/40">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
            <span>📚</span>
            Biblioteca de documentos (PDFs e normas)
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
            Sua biblioteca pessoal — somente você vê os arquivos importados aqui.
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="p-5 border-b border-gray-100 dark:border-dark-border grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: NBR 5410 — trecho iluminação"
              className={inputDark}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
              Categoria
            </label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputDark}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} className="dark:bg-dark-card">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">
              Arquivo PDF
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="w-full text-sm text-gray-700 dark:text-dark-text-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 dark:file:bg-indigo-700"
              required
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {uploading ? 'Importando…' : 'Importar documento'}
            </button>
          </div>
        </form>

        {loading ? (
          <p className="p-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm">
            Carregando biblioteca…
          </p>
        ) : docs.length === 0 ? (
          <p className="p-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm">
            Nenhum documento importado. Envie PDFs ou normas para consulta rápida.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-gray-500 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/90">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50/80 dark:hover:bg-dark-bg/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-dark-text">{d.titulo}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                        {d.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-dark-text-secondary truncate max-w-[200px]">
                      {d.nome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void abrirPdf(d, true)}
                          className={btnSecondary}
                        >
                          Nova aba
                        </button>
                        <button
                          type="button"
                          onClick={() => void abrirPdf(d, false)}
                          className={btnSecondary}
                        >
                          Modal
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(d.id)}
                          className={btnDanger}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && modalBlobUrl && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/70 p-4">
          <div className="flex items-center justify-between mb-2 text-white">
            <h4 className="font-semibold truncate pr-4">{modalTitulo}</h4>
            <button
              type="button"
              onClick={fecharModal}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              Fechar
            </button>
          </div>
          <iframe
            title={modalTitulo}
            src={modalBlobUrl}
            className="flex-1 w-full rounded-xl bg-slate-900 border border-dark-border min-h-[70vh]"
          />
        </div>
      )}
    </>
  );
};

export default EngenhariaBibliotecaDocumentos;
