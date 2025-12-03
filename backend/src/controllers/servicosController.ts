import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ServicosController {
  static async listarServicos(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, ativo, search } = req.query;
      const where: any = {};
      
      if (tipo) where.tipo = tipo;
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
      const { nome, codigo, descricao, tipo, preco, unidade } = req.body;

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
          preco,
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
      const { nome, codigo, descricao, tipo, preco, unidade, ativo } = req.body;

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
          preco,
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
          if (!servico.codigo || !servico.nome || !servico.tipo || servico.preco === undefined) {
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
                tipo: servico.tipo,
                preco: servico.preco,
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
                tipo: servico.tipo,
                preco: servico.preco,
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
          preco: s.preco,
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
