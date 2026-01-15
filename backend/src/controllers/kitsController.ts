import { Request, Response } from 'express';
import { KitsService } from '../services/kits.service';

export const listarKits = async (req: Request, res: Response) => {
    try {
        const kits = await KitsService.listar();
        return res.json({ success: true, data: kits });
    } catch (error: any) {
        console.error('Erro ao listar kits:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao listar kits' 
        });
    }
};

export const buscarKitPorId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const kit = await KitsService.buscarPorId(id);
        
        if (!kit) {
            return res.status(404).json({ 
                success: false, 
                error: 'Kit não encontrado' 
            });
        }
        
        return res.json({ success: true, data: kit });
    } catch (error: any) {
        console.error('Erro ao buscar kit:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao buscar kit' 
        });
    }
};

export const criarKit = async (req: Request, res: Response) => {
    try {
        const { nome, descricao, tipo, preco, items, itensBancoFrio, temItensCotacao } = req.body;
        
        // Validações - permitir criar kit mesmo sem itens de estoque real se tiver itens do banco frio
        if (!nome || !tipo || !preco) {
            return res.status(400).json({
                success: false,
                error: 'Nome, tipo e preço são obrigatórios'
            });
        }

        // Validar que tem pelo menos itens de estoque OU itens do banco frio OU serviços
        const temItensEstoque = items && items.length > 0;
        const temItensExtras = itensBancoFrio && itensBancoFrio.length > 0;
        
        if (!temItensEstoque && !temItensExtras) {
            return res.status(400).json({
                success: false,
                error: 'O kit deve ter pelo menos um item (estoque real, banco frio ou serviço)'
            });
        }

        const kit = await KitsService.criar({
            nome,
            descricao,
            tipo,
            preco,
            items: items || [],
            itensBancoFrio: itensBancoFrio || [],
            temItensCotacao: temItensCotacao || false
        });

        return res.status(201).json({ 
            success: true, 
            data: kit,
            message: 'Kit criado com sucesso' 
        });
    } catch (error: any) {
        console.error('Erro ao criar kit:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao criar kit' 
        });
    }
};

export const atualizarKit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nome, descricao, tipo, preco, items, ativo, itensBancoFrio, temItensCotacao } = req.body;

        // Validar que tem pelo menos itens de estoque OU itens do banco frio OU serviços (se items foi fornecido)
        if (items !== undefined || itensBancoFrio !== undefined) {
            const temItensEstoque = items && items.length > 0;
            const temItensExtras = itensBancoFrio && itensBancoFrio.length > 0;
            
            if (!temItensEstoque && !temItensExtras) {
                return res.status(400).json({
                    success: false,
                    error: 'O kit deve ter pelo menos um item (estoque real, banco frio ou serviço)'
                });
            }
        }

        const kit = await KitsService.atualizar(id, {
            nome,
            descricao,
            tipo,
            preco,
            items,
            ativo,
            itensBancoFrio: itensBancoFrio || [],
            temItensCotacao: temItensCotacao !== undefined ? temItensCotacao : undefined
        });

        return res.json({ 
            success: true, 
            data: kit,
            message: 'Kit atualizado com sucesso' 
        });
    } catch (error: any) {
        console.error('Erro ao atualizar kit:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao atualizar kit' 
        });
    }
};

export const deletarKit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await KitsService.deletar(id);

        return res.json({ 
            success: true, 
            message: 'Kit deletado com sucesso' 
        });
    } catch (error: any) {
        console.error('Erro ao deletar kit:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao deletar kit' 
        });
    }
};

