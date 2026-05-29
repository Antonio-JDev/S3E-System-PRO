import { KitsService } from './kits.service';
import { prisma } from '../lib/prisma';

export type ItemDisponibilidadeKit = {
  tipo: 'MATERIAL' | 'COTACAO' | 'SERVICO' | 'KIT';
  materialId?: string | null;
  cotacaoId?: string | null;
  servicoId?: string | null;
  kitId?: string | null;
  nome: string;
  necessario: number;
  disponivel: number;
  unidadeMedida?: string;
  possuiEstoque: boolean;
  precisaComprar: boolean;
  precisaVincularBancoFrio: boolean;
  caminho?: string;
};

export type ComposicaoDisponibilidadeResult = {
  kitId: string;
  nomeKit: string;
  quantidadeKit: number;
  completo: boolean;
  faltantes: ItemDisponibilidadeKit[];
  itensEstoque: ItemDisponibilidadeKit[];
  itensBancoFrio: ItemDisponibilidadeKit[];
  itensServicos: ItemDisponibilidadeKit[];
  composicao: unknown;
};

function parseItensFaltantes(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export class KitDisponibilidadeService {
  static async verificarKit(
    kitId: string,
    quantidadeKit = 1,
    maxDepth = 6,
  ): Promise<ComposicaoDisponibilidadeResult | null> {
    const composicao = await KitsService.buscarComposicaoPorId(kitId, maxDepth);
    if (!composicao) return null;

    const faltantes: ItemDisponibilidadeKit[] = [];
    const itensEstoque: ItemDisponibilidadeKit[] = [];
    const itensBancoFrio: ItemDisponibilidadeKit[] = [];
    const itensServicos: ItemDisponibilidadeKit[] = [];

    const walk = async (node: any, mult: number, caminho: string) => {
      if (!node) return;

      const itensFaltantes = parseItensFaltantes(node.itensFaltantes);
      for (const extra of itensFaltantes) {
        const tipo = String(extra.tipo || 'COTACAO').toUpperCase();
        const qtd = (Number(extra.quantidade) || 1) * mult * quantidadeKit;
        const nome = extra.nome || extra.materialNome || 'Item extra';

        if (tipo === 'SERVICO') {
          const row: ItemDisponibilidadeKit = {
            tipo: 'SERVICO',
            servicoId: extra.servicoId ?? null,
            nome,
            necessario: qtd,
            disponivel: qtd,
            unidadeMedida: extra.unidadeMedida || extra.unidade || 'UN',
            possuiEstoque: true,
            precisaComprar: false,
            precisaVincularBancoFrio: false,
            caminho,
          };
          itensServicos.push(row);
          continue;
        }

        const vinculadoId = extra.materialVinculadoId || extra.materialId;
        if (vinculadoId) {
          const mat = await prisma.material.findUnique({
            where: { id: vinculadoId },
            select: { id: true, nome: true, estoque: true, unidadeMedida: true },
          });
          const disp = mat?.estoque ?? 0;
          const row: ItemDisponibilidadeKit = {
            tipo: 'MATERIAL',
            materialId: vinculadoId,
            nome: mat?.nome || nome,
            necessario: qtd,
            disponivel: disp,
            unidadeMedida: mat?.unidadeMedida || 'UN',
            possuiEstoque: disp >= qtd,
            precisaComprar: disp < qtd,
            precisaVincularBancoFrio: false,
            caminho,
          };
          itensEstoque.push(row);
          if (!row.possuiEstoque) faltantes.push(row);
        } else {
          const row: ItemDisponibilidadeKit = {
            tipo: 'COTACAO',
            cotacaoId: extra.cotacaoId ?? null,
            nome,
            necessario: qtd,
            disponivel: 0,
            unidadeMedida: extra.unidadeMedida || extra.unidade || 'UN',
            possuiEstoque: false,
            precisaComprar: true,
            precisaVincularBancoFrio: true,
            caminho,
          };
          itensBancoFrio.push(row);
          faltantes.push(row);
        }
      }

      for (const it of node.items || []) {
        const qtdItem = (Number(it.quantidade) || 1) * mult * quantidadeKit;
        const path = caminho ? `${caminho} › ${node.nome || 'Kit'}` : node.nome || 'Kit';

        if (it.material?.id || it.materialId) {
          const mat = it.material || (await prisma.material.findUnique({
            where: { id: it.materialId },
            select: { id: true, nome: true, estoque: true, unidadeMedida: true },
          }));
          if (!mat) continue;
          const disp = Number(mat.estoque ?? 0);
          const row: ItemDisponibilidadeKit = {
            tipo: 'MATERIAL',
            materialId: mat.id,
            nome: mat.nome,
            necessario: qtdItem,
            disponivel: disp,
            unidadeMedida: mat.unidadeMedida || 'UN',
            possuiEstoque: disp >= qtdItem,
            precisaComprar: disp < qtdItem,
            precisaVincularBancoFrio: false,
            caminho: path,
          };
          itensEstoque.push(row);
          if (!row.possuiEstoque) faltantes.push(row);
        } else if (it.kitFilho) {
          await walk(it.kitFilho, (Number(it.quantidade) || 1) * mult, path);
        } else if (it.kitFilhoId) {
          const child = await KitsService.buscarComposicaoPorId(it.kitFilhoId, maxDepth);
          if (child) await walk(child, (Number(it.quantidade) || 1) * mult, path);
        }
      }
    };

    await walk(composicao, 1, composicao.nome || 'Kit');

    const completo = faltantes.length === 0;

    return {
      kitId,
      nomeKit: composicao.nome || 'Kit',
      quantidadeKit,
      completo,
      faltantes,
      itensEstoque,
      itensBancoFrio,
      itensServicos,
      composicao,
    };
  }

  static async verificarItemOrcamentoProjeto(
    projetoId: string,
    orcamentoItemId: string,
  ): Promise<ComposicaoDisponibilidadeResult | null> {
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { orcamentoId: true },
    });
    if (!projeto?.orcamentoId) return null;

    const item = await prisma.orcamentoItem.findFirst({
      where: { id: orcamentoItemId, orcamentoId: projeto.orcamentoId },
      select: { id: true, kitId: true, quantidade: true, tipo: true, descricao: true },
    });
    if (!item || item.tipo !== 'KIT' || !item.kitId) return null;

    return this.verificarKit(item.kitId, Number(item.quantidade) || 1);
  }
}
