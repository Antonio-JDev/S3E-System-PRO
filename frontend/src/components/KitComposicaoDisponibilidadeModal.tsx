import React from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, Package, Snowflake, Wrench } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export type ItemDisponibilidadeKit = {
  tipo: string;
  materialId?: string | null;
  nome: string;
  necessario: number;
  disponivel: number;
  unidadeMedida?: string;
  possuiEstoque: boolean;
  precisaComprar: boolean;
  precisaVincularBancoFrio: boolean;
  caminho?: string;
};

export type ComposicaoDisponibilidadeData = {
  kitId: string;
  nomeKit: string;
  quantidadeKit: number;
  completo: boolean;
  faltantes: ItemDisponibilidadeKit[];
  itensEstoque: ItemDisponibilidadeKit[];
  itensBancoFrio: ItemDisponibilidadeKit[];
  itensServicos: ItemDisponibilidadeKit[];
};

interface KitComposicaoDisponibilidadeModalProps {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  data: ComposicaoDisponibilidadeData | null;
}

const KitComposicaoDisponibilidadeModal: React.FC<KitComposicaoDisponibilidadeModalProps> = ({
  open,
  onClose,
  loading,
  data,
}) => {
  useEscapeKey(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-dark-border">
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Composição do kit — {data?.nomeKit ?? '…'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Estoque real, banco frio e serviços (mesma visão do catálogo)
            </p>
            {data && (
              <div className="mt-2">
                <Badge variant={data.completo ? 'success' : 'destructive'}>
                  {data.completo ? 'Kit completo' : `Kit incompleto — ${data.faltantes.length} pendência(s)`}
                </Badge>
                <span className="ml-2 text-xs text-gray-500">Qtd. no orçamento: {data.quantidadeKit}</span>
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <p className="text-center text-sm text-gray-500 py-12">Carregando composição…</p>
          )}
          {!loading && data && (
            <>
              {data.itensEstoque.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 mb-2">
                    <Package className="w-4 h-4" />
                    Itens do estoque real ({data.itensEstoque.length})
                  </h3>
                  <div className="space-y-2">
                    {data.itensEstoque.map((it, i) => (
                      <ItemRow key={`e-${i}`} item={it} variant="estoque" />
                    ))}
                  </div>
                </section>
              )}
              {data.itensBancoFrio.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">
                    <Snowflake className="w-4 h-4" />
                    Itens do banco frio ({data.itensBancoFrio.length})
                  </h3>
                  <div className="space-y-2">
                    {data.itensBancoFrio.map((it, i) => (
                      <ItemRow key={`b-${i}`} item={it} variant="banco" />
                    ))}
                  </div>
                </section>
              )}
              {data.itensServicos.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-400 mb-2">
                    <Wrench className="w-4 h-4" />
                    Serviços ({data.itensServicos.length})
                  </h3>
                  <div className="space-y-2">
                    {data.itensServicos.map((it, i) => (
                      <ItemRow key={`s-${i}`} item={it} variant="servico" />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function ItemRow({
  item,
  variant,
}: {
  item: ItemDisponibilidadeKit;
  variant: 'estoque' | 'banco' | 'servico';
}) {
  const bg =
    variant === 'estoque'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : variant === 'banco'
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800';

  return (
    <div className={`p-3 rounded-lg border text-sm ${bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-dark-text">{item.nome}</p>
          {item.caminho && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={item.caminho}>
              {item.caminho}
            </p>
          )}
          {variant !== 'servico' && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
              Necessário: {item.necessario} {item.unidadeMedida || 'UN'} · Disponível: {item.disponivel}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {variant === 'servico' ? (
            <Badge variant="outline">Serviço</Badge>
          ) : item.possuiEstoque ? (
            <Badge variant="success">Disponível</Badge>
          ) : item.precisaVincularBancoFrio ? (
            <Badge variant="destructive">Vincular / Comprar</Badge>
          ) : (
            <Badge variant="destructive">Comprar</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default KitComposicaoDisponibilidadeModal;
