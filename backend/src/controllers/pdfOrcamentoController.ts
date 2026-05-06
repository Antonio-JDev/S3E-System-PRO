import { Request, Response } from 'express';
import { PDFOrcamentoService } from '../services/pdfOrcamento.service';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import type { AuthRequest } from '../middlewares/auth';
import { resolveMarcaDaguaFromUserTemplate } from '../utils/orcamentoPdfPersonalization.util';

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'));
        }
    }
});

export class PDFOrcamentoController {
    // Exportar middleware de upload para uso nas rotas
    static uploadMiddleware = upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'folhaTimbrada', maxCount: 1 }
    ]);

    /**
     * Gera nome do arquivo PDF no formato: Orcamento-[número] -[nome do cliente].pdf
     */
    private static async gerarNomeArquivo(orcamentoId: string): Promise<string> {
        try {
            console.log('🔍 Buscando dados do orçamento para gerar nome do arquivo:', orcamentoId);
            
            const orcamento = await prisma.orcamento.findUnique({
                where: { id: orcamentoId },
                select: {
                    numeroSequencial: true,
                    cliente: {
                        select: { nome: true }
                    }
                }
            });

            if (!orcamento) {
                console.warn('⚠️ Orçamento não encontrado, usando ID como fallback');
                return `Orcamento-${orcamentoId.substring(0, 8)}.pdf`;
            }

            const numero = orcamento.numeroSequencial;
            const nomeCliente = orcamento.cliente?.nome || 'Cliente';
            
            console.log('📋 Dados encontrados:', { numero, nomeCliente });
            
            if (!numero) {
                console.warn('⚠️ Número sequencial não encontrado, usando ID como fallback');
                return `Orcamento-${orcamentoId.substring(0, 8)} -${nomeCliente}.pdf`;
            }
            
            // Remover caracteres especiais do nome do cliente para o nome do arquivo
            const nomeClienteLimpo = nomeCliente
                .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos
                .replace(/\s+/g, ' ') // Normaliza espaços
                .trim()
                .substring(0, 50); // Limita tamanho
            
            const nomeArquivo = `Orcamento-${numero} -${nomeClienteLimpo}.pdf`;
            console.log('✅ Nome do arquivo gerado:', nomeArquivo);
            
            return nomeArquivo;
        } catch (error) {
            console.error('❌ Erro ao gerar nome do arquivo:', error);
            return `Orcamento-${orcamentoId.substring(0, 8)}.pdf`;
        }
    }

    /**
     * POST /api/orcamentos/:id/pdf/preview-personalizado
     * Gera preview do PDF personalizado com uploads
     */
    static async gerarPreviewPersonalizado(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { opacidade = '0.05' } = req.body;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const userId = (req as AuthRequest).user?.userId;

            console.log('📄 Gerando preview personalizado para orçamento:', id);

            let logoUrl: string | undefined;
            let folhaTimbradaUrl: string | undefined;

            // Converter imagens para data URLs
            if (files?.logo?.[0]) {
                const logoBuffer = files.logo[0].buffer;
                const logoBase64 = logoBuffer.toString('base64');
                logoUrl = `data:${files.logo[0].mimetype};base64,${logoBase64}`;
            }

            if (files?.folhaTimbrada?.[0]) {
                const folhaBuffer = files.folhaTimbrada[0].buffer;
                const folhaBase64 = folhaBuffer.toString('base64');
                folhaTimbradaUrl = `data:${files.folhaTimbrada[0].mimetype};base64,${folhaBase64}`;
            }

            const base = userId ? await resolveMarcaDaguaFromUserTemplate(userId) : { tipo: 'template' as const, opacidade: 0.05 };
            const opParsed = parseFloat(String(opacidade));
            const opacidadeFinal = Number.isFinite(opParsed) ? Math.min(1, Math.max(0, opParsed)) : base.opacidade;

            const marcaDaguaConfig = {
                tipo: 'template' as const,
                opacidade: opacidadeFinal,
                logoUrl: logoUrl ?? base.logoUrl,
                folhaTimbradaUrl: folhaTimbradaUrl ?? base.folhaTimbradaUrl
            };

            const html = await PDFOrcamentoService.gerarHTMLOrcamento(id, marcaDaguaConfig);

            res.json({
                success: true,
                data: { html }
            });

        } catch (error: any) {
            console.error('❌ Erro ao gerar preview personalizado:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar preview personalizado',
                error: error.message
            });
        }
    }

    /**
     * POST /api/orcamentos/:id/pdf/download-personalizado
     * Gera e baixa PDF personalizado com uploads
     */
    static async gerarPDFPersonalizado(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { opacidade = '0.05' } = req.body;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const userId = (req as AuthRequest).user?.userId;

            console.log('📄 Gerando PDF personalizado para orçamento:', id);

            let logoUrl: string | undefined;
            let folhaTimbradaUrl: string | undefined;

            // Converter imagens para data URLs
            if (files?.logo?.[0]) {
                const logoBuffer = files.logo[0].buffer;
                const logoBase64 = logoBuffer.toString('base64');
                logoUrl = `data:${files.logo[0].mimetype};base64,${logoBase64}`;
            }

            if (files?.folhaTimbrada?.[0]) {
                const folhaBuffer = files.folhaTimbrada[0].buffer;
                const folhaBase64 = folhaBuffer.toString('base64');
                folhaTimbradaUrl = `data:${files.folhaTimbrada[0].mimetype};base64,${folhaBase64}`;
            }

            const base = userId ? await resolveMarcaDaguaFromUserTemplate(userId) : { tipo: 'template' as const, opacidade: 0.05 };
            const opParsed = parseFloat(String(opacidade));
            const opacidadeFinal = Number.isFinite(opParsed) ? Math.min(1, Math.max(0, opParsed)) : base.opacidade;

            const marcaDaguaConfig = {
                tipo: 'template' as const,
                opacidade: opacidadeFinal,
                logoUrl: logoUrl ?? base.logoUrl,
                folhaTimbradaUrl: folhaTimbradaUrl ?? base.folhaTimbradaUrl
            };

            const pdfBuffer = await PDFOrcamentoService.gerarPDF(id, marcaDaguaConfig);
            const nomeArquivo = await PDFOrcamentoController.gerarNomeArquivo(id);

            console.log('📄 Nome do arquivo gerado:', nomeArquivo);

            // Codificar nome do arquivo para evitar problemas com caracteres especiais
            const nomeArquivoEncoded = encodeURIComponent(nomeArquivo);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivoEncoded}"; filename*=UTF-8''${nomeArquivoEncoded}`);
            res.setHeader('Content-Length', pdfBuffer.length.toString());

            res.send(pdfBuffer);

            console.log('✅ PDF personalizado gerado e enviado com sucesso');

        } catch (error: any) {
            console.error('❌ Erro ao gerar PDF personalizado:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar PDF personalizado',
                error: error.message
            });
        }
    }

    /**
     * GET /api/orcamentos/:id/pdf/download
     * Gera e retorna o PDF binário para download
     */
    static async gerarPDFDownload(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { opacidade } = req.query;

            const marcaDaguaConfig = {
                tipo: 'template' as const,
                opacidade: opacidade ? parseFloat(opacidade as string) : 0.05
            };

            console.log('📄 Gerando PDF com Puppeteer para orçamento:', id);

            const pdfBuffer = await PDFOrcamentoService.gerarPDF(id, marcaDaguaConfig);
            const nomeArquivo = await PDFOrcamentoController.gerarNomeArquivo(id);

            console.log('📄 Nome do arquivo gerado:', nomeArquivo);

            // Codificar nome do arquivo para evitar problemas com caracteres especiais
            const nomeArquivoEncoded = encodeURIComponent(nomeArquivo);

            // Configurar headers para download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivoEncoded}"; filename*=UTF-8''${nomeArquivoEncoded}`);
            res.setHeader('Content-Length', pdfBuffer.length.toString());

            res.send(pdfBuffer);

            console.log('✅ PDF gerado e enviado com sucesso');

        } catch (error: any) {
            console.error('❌ Erro ao gerar PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar PDF do orçamento',
                error: error.message
            });
        }
    }

    /**
     * GET /api/orcamentos/:id/pdf/html
     * Retorna HTML pronto para impressão/PDF
     */
    static async gerarHTML(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { opacidade, tipo } = req.query;

            const marcaDaguaConfig = {
                tipo: (tipo as any) || 'template',
                opacidade: opacidade ? parseFloat(opacidade as string) : 0.05
            };

            const html = await PDFOrcamentoService.gerarHTMLOrcamento(id, marcaDaguaConfig);

            // Retornar HTML para o navegador renderizar
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);

        } catch (error: any) {
            console.error('❌ Erro ao gerar HTML do orçamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar PDF do orçamento',
                error: error.message
            });
        }
    }
}

