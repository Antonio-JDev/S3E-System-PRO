import React from 'react';

export interface MaterialDetailsItem {
  nomeProduto?: string;
  nome?: string;
  sku?: string | null;
  ncm?: string | null;
  categoria?: string | null;
  unidadeMedida?: string;
  quantidade?: number;
  valorUnit?: number;
  preco?: number;
  valorVenda?: number | null;
  descricao?: string | null;
  fornecedor?: { nome: string; cnpj?: string | null } | null;
  material?: { id: string; nome: string; sku?: string | null; categoria?: string | null; unidadeMedida?: string } | null;
}

interface MaterialDetailsModalProps {
  open: boolean;
  onClose: () => void;
  item: MaterialDetailsItem | null;
}

const MaterialDetailsModal: React.FC<MaterialDetailsModalProps> = ({ open, onClose, item }) => {
  if (!open) return null;

  const nome = item?.nomeProduto ?? item?.nome ?? item?.material?.nome ?? '—';
  const sku = item?.sku ?? item?.material?.sku ?? '—';
  const ncm = item?.ncm ?? '—';
  const categoria = item?.categoria ?? item?.material?.categoria ?? '—';
  const unidade = item?.unidadeMedida ?? item?.material?.unidadeMedida ?? '—';
  const quantidade = item?.quantidade ?? '—';
  const valorUnit = item?.valorUnit ?? item?.preco;
  const valorVenda = item?.valorVenda;
  const descricao = item?.descricao ?? '—';
  const fornecedor = item?.fornecedor;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalhes do Material</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {!item ? (
            <p className="text-gray-500 dark:text-gray-400">Nenhum material selecionado.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400 font-medium">Nome</span>
                <p className="text-gray-900 dark:text-white font-medium mt-0.5">{nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">SKU</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{sku}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">NCM</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{ncm}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Categoria</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{categoria}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Unidade</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{unidade}</p>
                </div>
              </div>
              {typeof quantidade !== 'string' && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Quantidade</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{quantidade}</p>
                </div>
              )}
              {(valorUnit != null || valorVenda != null) && (
                <div className="grid grid-cols-2 gap-4">
                  {valorUnit != null && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Valor unitário</span>
                      <p className="text-gray-900 dark:text-white mt-0.5">
                        R$ {Number(valorUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {valorVenda != null && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Valor venda</span>
                      <p className="text-gray-900 dark:text-white mt-0.5">
                        R$ {Number(valorVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {fornecedor && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Fornecedor</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{fornecedor.nome} {fornecedor.cnpj ? `(${fornecedor.cnpj})` : ''}</p>
                </div>
              )}
              {descricao && descricao !== '—' && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Descrição</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{descricao}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialDetailsModal;
