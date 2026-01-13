import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normaliza o tipoServico para o formato do enum
 */
function normalizarTipoServico(tipoServico: string | undefined): 'MAO_DE_OBRA' | 'MONTAGEM' | 'ENGENHARIA' | 'PROJETOS' | 'ADMINISTRATIVO' {
  if (!tipoServico) return 'MAO_DE_OBRA';
  
  // Primeiro remove acentos e normaliza
  const semAcentos = tipoServico
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .trim();
  
  // Substitui espaços por underscore
  const normalizado = semAcentos.replace(/\s+/g, '_');
  
  // Mapeamento de variações comuns
  const mapeamento: Record<string, 'MAO_DE_OBRA' | 'MONTAGEM' | 'ENGENHARIA' | 'PROJETOS' | 'ADMINISTRATIVO'> = {
    'MAO_DE_OBRA': 'MAO_DE_OBRA',
    'MONTAGEM': 'MONTAGEM',
    'ENGENHARIA': 'ENGENHARIA',
    'PROJETOS': 'PROJETOS',
    'PROJETO': 'PROJETOS',
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'ADM': 'ADMINISTRATIVO',
  };
  
  // Se já está no formato correto, retorna direto
  if (mapeamento[normalizado]) {
    return mapeamento[normalizado];
  }
  
  // Verifica se contém palavras-chave
  if (semAcentos.includes('MAO') && semAcentos.includes('OBRA')) {
    return 'MAO_DE_OBRA';
  }
  if (semAcentos.includes('MONTAGEM')) {
    return 'MONTAGEM';
  }
  if (semAcentos.includes('ENGENHARIA')) {
    return 'ENGENHARIA';
  }
  if (semAcentos.includes('PROJETO')) {
    return 'PROJETOS';
  }
  if (semAcentos.includes('ADMINISTRATIVO') || semAcentos.includes('ADM')) {
    return 'ADMINISTRATIVO';
  }
  
  // Fallback
  return 'MAO_DE_OBRA';
}

/**
 * Normaliza o tipo de serviço (capitaliza primeira letra)
 */
function normalizarTipo(tipo: string): string {
  if (!tipo) return 'Outro';
  
  return tipo
    .toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

export class ServicosController {
  static async listarServicos(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, ativo, search } = req.query;
      const where: any = {};
      
      if (tipo) where.tipo = tipo;
      if (req.query.tipoServico) where.tipoServico = req.query.tipoServico; // ✅ NOVO: Filtro por tipo de serviço
      if (ativo !== undefined) where.ativo = ativo === 'true';
      if (search) {
        where.OR = [
          { nome: { contains: search as string, mode: 'insensitive' } },
          { codigo: { contains: search as string, mode: 'insensitive' } },
          { descricao: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const servicos = await prisma.servico.findMany({
        where,
        orderBy: { nome: 'asc' }
      });

      res.status(200).json({ success: true, data: servicos });
    } catch (error: any) {
      console.error('Erro ao listar serviços:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar serviços', error: error.message });
    }
  }

  static async buscarServico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servico = await prisma.servico.findUnique({
        where: { id }
      });

      if (!servico) {
        res.status(404).json({ success: false, message: 'Serviço não encontrado' });
        return;
      }

      res.status(200).json({ success: true, data: servico });
    } catch (error: any) {
      console.error('Erro ao buscar serviço:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar serviço', error: error.message });
    }
  }

  static async criarServico(req: Request, res: Response): Promise<void> {
    try {
      const { nome, codigo, descricao, tipo, tipoServico, preco, custo, unidade } = req.body;

      // Validação básica
      if (!nome || !codigo || !tipo || preco === undefined) {
        res.status(400).json({ 
          success: false, 
          message: 'Nome, código, tipo e preço são obrigatórios' 
        });
        return;
      }

      // Verificar se código já existe
      const servicoExistente = await prisma.servico.findUnique({
        where: { codigo }
      });

      if (servicoExistente) {
        res.status(400).json({ 
          success: false, 
          message: 'Código do serviço já existe' 
        });
        return;
      }

      const novoServico = await prisma.servico.create({
        data: {
          nome,
          codigo,
          descricao,
          tipo,
          tipoServico: tipoServico || 'MAO_DE_OBRA', // ✅ NOVO: Tipo de serviço
          preco,
          custo: custo !== undefined && custo !== null && custo !== '' ? parseFloat(custo) : null, // ✅ NOVO: Custo (aceita vazio, 0 ou valor)
          unidade: unidade || 'un'
        }
      });

      res.status(201).json({ success: true, data: novoServico });
    } catch (error: any) {
      console.error('Erro ao criar serviço:', error);
      res.status(500).json({ success: false, message: 'Erro ao criar serviço', error: error.message });
    }
  }

  static async atualizarServico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, codigo, descricao, tipo, tipoServico, preco, custo, unidade, ativo } = req.body;

      // Verificar se serviço existe
      const servicoExistente = await prisma.servico.findUnique({
        where: { id }
      });

      if (!servicoExistente) {
        res.status(404).json({ success: false, message: 'Serviço não encontrado' });
        return;
      }

      // Se mudou o código, verificar se já existe
      if (codigo && codigo !== servicoExistente.codigo) {
        const codigoExistente = await prisma.servico.findUnique({
          where: { codigo }
        });

        if (codigoExistente) {
          res.status(400).json({ 
            success: false, 
            message: 'Código do serviço já existe' 
          });
          return;
        }
      }

      const servicoAtualizado = await prisma.servico.update({
        where: { id },
        data: {
          nome,
          codigo,
          descricao,
          tipo,
          tipoServico: tipoServico !== undefined ? tipoServico : servicoExistente.tipoServico, // ✅ NOVO: Tipo de serviço
          preco,
          custo: custo !== undefined ? (custo !== null && custo !== '' ? parseFloat(custo) : null) : servicoExistente.custo, // ✅ NOVO: Custo
          unidade,
          ativo
        }
      });

      res.status(200).json({ success: true, data: servicoAtualizado });
    } catch (error: any) {
      console.error('Erro ao atualizar serviço:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar serviço', error: error.message });
    }
  }

  static async desativarServico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servicoDesativado = await prisma.servico.update({
        where: { id },
        data: { ativo: false }
      });

      res.status(200).json({ success: true, data: servicoDesativado });
    } catch (error: any) {
      console.error('Erro ao desativar serviço:', error);
      res.status(500).json({ success: false, message: 'Erro ao desativar serviço', error: error.message });
    }
  }

  static async reativarServico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verificar se serviço existe
      const servicoExistente = await prisma.servico.findUnique({
        where: { id }
      });

      if (!servicoExistente) {
        res.status(404).json({ success: false, message: 'Serviço não encontrado' });
        return;
      }

      if (servicoExistente.ativo) {
        res.status(400).json({ success: false, message: 'Serviço já está ativo' });
        return;
      }

      // Reativar serviço
      const servicoReativado = await prisma.servico.update({
        where: { id },
        data: { ativo: true }
      });

      res.status(200).json({ success: true, data: servicoReativado });
    } catch (error: any) {
      console.error('Erro ao reativar serviço:', error);
      res.status(500).json({ success: false, message: 'Erro ao reativar serviço', error: error.message });
    }
  }


  /**
   * Importa serviços em lote via JSON
   */
  static async importarServicos(req: Request, res: Response): Promise<void> {
    try {
      const { servicos } = req.body;

      if (!servicos || !Array.isArray(servicos)) {
        res.status(400).json({ 
          success: false, 
          message: 'Campo "servicos" deve ser um array' 
        });
        return;
      }

      const resultados = {
        sucesso: 0,
        erros: 0,
        total: servicos.length,
        detalhes: [] as Array<{
          linha: number;
          codigo: string;
          nome: string;
          status: 'sucesso' | 'erro';
          mensagem?: string;
        }>
      };

      // Processar cada serviço
      for (let i = 0; i < servicos.length; i++) {
        const servico = servicos[i];
        const linha = i + 1;

        try {
          // Validação
          if (!servico.codigo || !servico.nome || !servico.tipo || (servico.preco === undefined && servico.preco !== 0)) {
            resultados.erros++;
            resultados.detalhes.push({
              linha,
              codigo: servico.codigo || 'N/A',
              nome: servico.nome || 'N/A',
              status: 'erro',
              mensagem: 'Campos obrigatórios faltando (codigo, nome, tipo, preco)'
            });
            continue;
          }

          // Processar preco (aceita número ou string)
          let precoValue: number;
          if (typeof servico.preco === 'number') {
            precoValue = servico.preco;
          } else {
            const precoParsed = parseFloat(servico.preco);
            if (isNaN(precoParsed) || precoParsed < 0) {
              throw new Error('Preço inválido');
            }
            precoValue = precoParsed;
          }

          // Processar custo (aceita vazio, 0 ou valor)
          let custoValue: number | null = null;
          if (servico.custo !== undefined && servico.custo !== null && servico.custo !== '') {
            if (typeof servico.custo === 'number') {
              custoValue = servico.custo >= 0 ? servico.custo : null;
            } else {
              const custoParsed = parseFloat(servico.custo);
              if (!isNaN(custoParsed) && custoParsed >= 0) {
                custoValue = custoParsed;
              }
            }
          }

          // Normalizar tipoServico
          const tipoServicoNormalizado = normalizarTipoServico(servico.tipoServico);
          
          // Normalizar tipo
          const tipoNormalizado = normalizarTipo(servico.tipo);

          // Verificar se já existe
          const servicoExistente = await prisma.servico.findUnique({
            where: { codigo: servico.codigo }
          });

          if (servicoExistente) {
            // Atualizar serviço existente
            await prisma.servico.update({
              where: { codigo: servico.codigo },
              data: {
                nome: servico.nome,
                descricao: servico.descricao || null,
                tipo: tipoNormalizado,
                tipoServico: tipoServicoNormalizado,
                preco: precoValue,
                custo: custoValue,
                unidade: servico.unidade || 'un',
                ativo: servico.ativo !== false
              }
            });

            resultados.sucesso++;
            resultados.detalhes.push({
              linha,
              codigo: servico.codigo,
              nome: servico.nome,
              status: 'sucesso',
              mensagem: 'Serviço atualizado'
            });
          } else {
            // Criar novo serviço
            await prisma.servico.create({
              data: {
                nome: servico.nome,
                codigo: servico.codigo,
                descricao: servico.descricao || null,
                tipo: tipoNormalizado,
                tipoServico: tipoServicoNormalizado,
                preco: precoValue,
                custo: custoValue,
                unidade: servico.unidade || 'un',
                ativo: servico.ativo !== false
              }
            });

            resultados.sucesso++;
            resultados.detalhes.push({
              linha,
              codigo: servico.codigo,
              nome: servico.nome,
              status: 'sucesso',
              mensagem: 'Serviço criado'
            });
          }
        } catch (error: any) {
          resultados.erros++;
          resultados.detalhes.push({
            linha,
            codigo: servico.codigo || 'N/A',
            nome: servico.nome || 'N/A',
            status: 'erro',
            mensagem: error.message || 'Erro desconhecido'
          });
        }
      }

      res.status(200).json({ 
        success: true, 
        data: resultados,
        message: `Importação concluída: ${resultados.sucesso} sucesso, ${resultados.erros} erros`
      });
    } catch (error: any) {
      console.error('Erro ao importar serviços:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao importar serviços', 
        error: error.message 
      });
    }
  }

  /**
   * Exporta todos os serviços para JSON
   */
  static async exportarServicos(req: Request, res: Response): Promise<void> {
    try {
      const { ativo } = req.query;
      const where: any = {};
      
      if (ativo !== undefined) {
        where.ativo = ativo === 'true';
      }

      const servicos = await prisma.servico.findMany({
        where,
        orderBy: { codigo: 'asc' }
      });

      const exportData = {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        servicos: servicos.map(s => ({
          codigo: s.codigo,
          nome: s.nome,
          descricao: s.descricao || '',
          tipo: s.tipo,
          tipoServico: s.tipoServico, // ✅ NOVO: Tipo de serviço
          preco: s.preco,
          custo: s.custo !== null && s.custo !== undefined ? s.custo : null, // ✅ NOVO: Custo
          unidade: s.unidade,
          ativo: s.ativo
        }))
      };

      res.status(200).json({ success: true, data: exportData });
    } catch (error: any) {
      console.error('Erro ao exportar serviços:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao exportar serviços', 
        error: error.message 
      });
    }
  }
}
