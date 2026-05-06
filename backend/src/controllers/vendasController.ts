import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VendasService, VendaPayload } from '../services/vendas.service';
import { VendaStatus } from '../types/index';
import { prisma } from '../lib/prisma';

const storageContrato = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'contratos-assinados');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.pdf';
        cb(null, `contrato-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});
const uploadContratoAssinadoMulter = multer({
    storage: storageContrato,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /\.pdf$/i.test(path.extname(file.originalname)) || file.mimetype === 'application/pdf';
        if (ok) cb(null, true);
        else cb(new Error('Apenas arquivos PDF são permitidos para o contrato assinado.'));
    }
}).single('arquivo');

export { uploadContratoAssinadoMulter };

export class VendasController {
    /**
     * Verifica disponibilidade de estoque para um orçamento
     */
    static async verificarEstoque(req: Request, res: Response) {
        try {
            const { orcamentoId } = req.params;

            if (!orcamentoId) {
                return res.status(400).json({
                    error: 'ID do orçamento é obrigatório'
                });
            }

            const verificacao = await VendasService.verificarEstoqueOrcamento(orcamentoId);

            res.json({
                success: true,
                data: verificacao
            });

        } catch (error) {
            console.error('Erro ao verificar estoque:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Realiza uma nova venda
     */
    static async realizarVenda(req: Request, res: Response) {
        try {
            const vendaData: VendaPayload = req.body;

            // Validar dados obrigatórios
            if (!vendaData.orcamentoId || !vendaData.clienteId || !vendaData.valorTotal) {
                return res.status(400).json({
                    error: 'Dados obrigatórios ausentes: orcamentoId, clienteId, valorTotal'
                });
            }

            const resultado = await VendasService.realizarVenda(vendaData);

            res.status(201).json({
                success: true,
                message: 'Venda realizada com sucesso',
                data: resultado
            });

        } catch (error) {
            console.error('Erro ao realizar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca dados para o dashboard financeiro
     */
    static async getDashboard(req: Request, res: Response) {
        try {
            const dashboardData = await VendasService.getVendasDashboard();

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista todas as vendas com paginação
     * ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 10 para 1000 para evitar perda de dados em auditoria
     */
    static async listarVendas(req: Request, res: Response) {
        try {
            const { page = 1, limit = 1000 } = req.query;

            const resultado = await VendasService.listarVendas(
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: resultado
            });

        } catch (error) {
            console.error('Erro ao listar vendas:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca uma venda específica
     */
    static async buscarVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            const venda = await VendasService.buscarVenda(id);

            if (!venda) {
                return res.status(404).json({
                    error: 'Venda não encontrada'
                });
            }

            res.json({
                success: true,
                data: venda
            });

        } catch (error) {
            console.error('Erro ao buscar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Cancela uma venda
     */
    static async cancelarVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            const venda = await VendasService.cancelarVenda(id);

            res.json({
                success: true,
                message: 'Venda cancelada com sucesso',
                data: venda
            });

        } catch (error) {
            console.error('Erro ao cancelar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Atualiza o status da venda (ex.: Faturado após emissão de NF-e/NFS-e)
     * Body: { status: string } (Pendente, Concluida, Cancelada, Faturado)
     */
    static async atualizarStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!id) {
                return res.status(400).json({ success: false, error: 'ID da venda é obrigatório' });
            }
            if (!status || typeof status !== 'string') {
                return res.status(400).json({ success: false, error: 'Campo status é obrigatório' });
            }
            const venda = await VendasService.atualizarStatus(id, status.trim());
            res.json({ success: true, data: venda });
        } catch (error) {
            console.error('Erro ao atualizar status da venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Atualização parcial da venda: parcelas (dataVencimento, valorParcela) e NCM dos itens do orçamento.
     * Body: { parcelas?: Array<{ id, dataVencimento?, valorParcela? }>, itensNcm?: Array<{ id, ncm }> }
     */
    static async atualizarVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            if (!id) {
                return res.status(400).json({ success: false, error: 'ID da venda é obrigatório' });
            }
            const venda = await VendasService.atualizarVenda(id, {
                parcelas: body.parcelas,
                itensNcm: body.itensNcm
            });
            return res.json({ success: true, data: venda });
        } catch (error) {
            console.error('Erro ao atualizar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Marca uma conta a receber como paga
     * Body pode conter:
     * - dataPagamento (string ISO)
     * - valorRecebido (number)  ← usado para validações futuras
     * - observacoes (string)
     */
    static async pagarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a receber é obrigatório'
                });
            }

            const conta = await VendasService.pagarConta(id, req.body);

            res.json({
                success: true,
                message: 'Conta marcada como paga',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao pagar conta:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Excluir venda permanentemente
     * Segue o padrão: Venda -> Projeto -> Obra (exclusão em cascata)
     */
    static async excluirVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            // Verificar se venda existe
            const venda = await prisma.venda.findUnique({
                where: { id },
                include: {
                    contasReceber: true,
                    projeto: {
                        include: {
                            obra: {
                                include: {
                                    tarefas: { select: { id: true } }
                                }
                            }
                        }
                    }
                }
            });

            if (!venda) {
                return res.status(404).json({
                    error: 'Venda não encontrada'
                });
            }

            // Verificar se há contas a receber pendentes
            const contasPendentes = venda.contasReceber?.filter(conta => conta.status === 'Pendente') || [];
            if (contasPendentes.length > 0) {
                return res.status(400).json({
                    error: 'Não é possível excluir venda com contas a receber pendentes'
                });
            }

            // Log de auditoria
            console.log('═══════════════════════════════════════════════════════════');
            console.log('⚠️  EXCLUSÃO PERMANENTE DE VENDA');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`💰 Venda: ${venda.numeroVenda} (ID: ${venda.id})`);
            console.log(`💵 Valor Total: R$ ${venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`📅 Data Venda: ${venda.dataVenda.toLocaleString('pt-BR')}`);
            console.log(`⏰ Data/Hora Exclusão: ${new Date().toLocaleString('pt-BR')}`);

            // Excluir em transação para garantir consistência
            await prisma.$transaction(async (tx) => {
                // 1. Se houver projeto vinculado, excluir projeto (que excluirá a obra em cascata)
                if (venda.projetoId && venda.projeto) {
                    const projeto = venda.projeto;
                    console.log(`📋 Projeto vinculado: ${projeto.titulo} (ID: ${projeto.id})`);
                    
                    // Verificar se há obra vinculada ao projeto
                    if (projeto.obra) {
                        const obra = projeto.obra;
                        console.log(`🏗️  Obra vinculada: ${obra.nomeObra} (ID: ${obra.id}, Status: ${obra.status}, Tarefas: ${obra.tarefas.length})`);
                        console.log(`⚠️  A obra vinculada será EXCLUÍDA PERMANENTEMENTE junto com o projeto`);
                        
                        // Excluir obra explicitamente (o onDelete: Cascade já faria isso, mas fazemos explicitamente para logs)
                        await tx.obra.delete({
                            where: { id: obra.id }
                        });
                        console.log(`✅ Obra excluída permanentemente: ${obra.id}`);
                    }
                    
                    // Excluir projeto (o onDelete: Cascade já excluiria a obra, mas já fizemos explicitamente)
                    await tx.projeto.delete({
                        where: { id: projeto.id }
                    });
                    console.log(`✅ Projeto excluído permanentemente: ${projeto.id}`);
                }

                // 2. Excluir contas a receber associadas
                await tx.contaReceber.deleteMany({
                    where: { vendaId: id }
                });
                console.log(`✅ Contas a receber excluídas`);

                // 3. Excluir venda
                await tx.venda.delete({
                    where: { id }
                });
                console.log(`✅ Venda excluída permanentemente: ${venda.id}`);
            });

            console.log('═══════════════════════════════════════════════════════════');

            res.json({
                success: true,
                message: venda.projetoId 
                    ? 'Venda, projeto e obra excluídos com sucesso' 
                    : 'Venda excluída com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Atualiza o valor total da venda e das parcelas (contas a receber) com o valor final do orçamento.
     * Apenas role desenvolvedor (rota protegida por authorize).
     */
    static async atualizarValorDoOrcamento(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'ID da venda é obrigatório' });
            }
            const resultado = await VendasService.atualizarValorDoOrcamento(id);
            res.json({ success: true, data: resultado });
        } catch (error) {
            console.error('Erro ao atualizar valor do orçamento na venda:', error);
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            res.status(400).json({ error: message });
        }
    }

    /**
     * Upload do PDF do contrato assinado pelo cliente (PV)
     * PUT /api/vendas/:id/contrato-assinado + multipart arquivo
     */
    static async uploadContratoAssinado(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ success: false, error: 'ID da venda é obrigatório' });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado. Envie o PDF do contrato assinado.' });
            }
            const venda = await prisma.venda.findUnique({ where: { id } });
            if (!venda) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
                return res.status(404).json({ success: false, error: 'Venda não encontrada' });
            }
            const urlRelativa = `/uploads/contratos-assinados/${path.basename(req.file.path)}`;
            await prisma.venda.update({
                where: { id },
                data: { contratoPdfUrl: urlRelativa, updatedAt: new Date() }
            });
            res.json({
                success: true,
                message: 'Contrato assinado enviado com sucesso.',
                data: { contratoPdfUrl: urlRelativa }
            });
        } catch (error) {
            console.error('Erro ao enviar contrato assinado:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao enviar contrato.'
            });
        }
    }

    /**
     * Atualiza o HTML do contrato editado (Jodit) vinculado ao PV
     * PUT /api/vendas/:id/contrato body: { contratoHtml: string }
     */
    static async updateContratoHtml(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { contratoHtml } = req.body as { contratoHtml?: string };
            if (!id) {
                return res.status(400).json({ success: false, error: 'ID da venda é obrigatório' });
            }
            const venda = await prisma.venda.findUnique({ where: { id } });
            if (!venda) {
                return res.status(404).json({ success: false, error: 'Venda não encontrada' });
            }
            await prisma.venda.update({
                where: { id },
                data: { contratoHtml: contratoHtml ?? null, updatedAt: new Date() }
            });
            res.json({
                success: true,
                message: 'Contrato salvo com sucesso.',
                data: { contratoHtml: contratoHtml ?? null }
            });
        } catch (error) {
            console.error('Erro ao salvar contrato:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao salvar contrato.'
            });
        }
    }
}
