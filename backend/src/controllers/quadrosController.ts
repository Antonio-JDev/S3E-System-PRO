import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { QuadrosService } from '../services/quadros.service';

export class QuadrosController {
  static async criarQuadro(req: Request, res: Response) {
    try {
      const { nome, descricao, configuracao } = req.body;
      
      if (!nome || !configuracao) {
        res.status(400).json({ 
          success: false, 
          message: 'Nome e configuração são obrigatórios' 
        });
        return;
      }
      
      const quadro = await QuadrosService.criarQuadro(nome, descricao || '', configuracao);
      
      res.status(201).json({ 
        success: true, 
        data: quadro,
        message: 'Quadro elétrico criado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao criar quadro:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro ao criar quadro elétrico' 
      });
    }
  }

  static async listarQuadros(req: Request, res: Response) {
    try {
      const quadros = await QuadrosService.listarQuadros();
      
      res.json({ 
        success: true, 
        data: quadros 
      });
    } catch (error: any) {
      console.error('Erro ao listar quadros:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro ao listar quadros elétricos' 
      });
    }
  }

  static async buscarQuadro(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const quadro = await prisma.kit.findUnique({
        where: { id },
        include: { 
          items: { 
            include: { material: true } 
          } 
        }
      });
      
      if (!quadro || quadro.tipo !== 'quadro-eletrico') {
        res.status(404).json({ 
          success: false, 
          message: 'Quadro elétrico não encontrado' 
        });
        return;
      }
      
      res.json({ 
        success: true, 
        data: quadro 
      });
    } catch (error: any) {
      console.error('Erro ao buscar quadro:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro ao buscar quadro elétrico' 
      });
    }
  }

  static async desativarQuadro(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const quadro = await prisma.kit.update({
        where: { id },
        data: { ativo: false }
      });
      
      res.json({ 
        success: true, 
        data: quadro,
        message: 'Quadro elétrico desativado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao desativar quadro:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro ao desativar quadro elétrico' 
      });
    }
  }

  static async revalidarEstoque(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const resultado = await QuadrosService.revalidarEstoque(id);
      
      if (!resultado.success) {
        res.status(400).json(resultado);
        return;
      }
      
      // Verificar se houve mudança de status
      if (resultado.statusAnterior !== resultado.statusNovo) {
        console.log(`🔄 Status do quadro ${id} mudou: ${resultado.statusAnterior} → ${resultado.statusNovo}`);
      }
      
      res.json({ 
        success: true, 
        data: resultado.data,
        message: `Estoque revalidado - Status: ${resultado.statusNovo}`,
        itensFaltantes: resultado.itensFaltantes,
        statusMudou: resultado.statusAnterior !== resultado.statusNovo
      });
    } catch (error: any) {
      console.error('Erro ao revalidar estoque:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro ao revalidar estoque do quadro' 
      });
    }
  }
}

