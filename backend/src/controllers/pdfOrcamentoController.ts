import { Request, Response } from 'express';
import { PDFOrcamentoService } from '../services/pdfOrcamento.service';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import type { AuthRequest } from '../middlewares/auth';
import {
    buildMarcaDaguaFromPdfCustomization,
    resolveMarcaDaguaFromUserTemplate,
    resolveUploadPathToDataUrl,
    type OrcamentoPdfMarcaDaguaConfig,
} from '../utils/orcamentoPdfPersonalization.util';
import type { MarcaDaguaConfig } from '../services/pdfOrcamento.service';

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
     * Mesma folha/opacidade do modal, do template do usuário ou do arquivo enviado.
     * Upload tem prioridade; em seguida a URL /uploads e o JSON de personalização.
     */
    private static async montarMarcaDagua(req: Request): Promise<MarcaDaguaConfig> {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const userId = (req as AuthRequest).user?.userId;
        const body = (req.body ?? {}) as Record<string, unknown>;
        const base: OrcamentoPdfMarcaDaguaConfig = userId
            ? await resolveMarcaDaguaFromUserTemplate(userId)
            : { tipo: 'template', opacidade: 0.05 };

        let fromBody: OrcamentoPdfMarcaDaguaConfig | null = null;
        const rawCustom = body.pdfCustomization;
        if (typeof rawCustom === 'string' && rawCustom.trim()) {
            try {
                fromBody = buildMarcaDaguaFromPdfCustomization(JSON.parse(rawCustom));
            } catch {
                fromBody = null;
            }
        } else if (rawCustom && typeof rawCustom === 'object') {
            fromBody = buildMarcaDaguaFromPdfCustomization(rawCustom);
        }

        const urlFromField = resolveUploadPathToDataUrl(
            typeof body.folhaTimbradaUrl === 'string' ? body.folhaTimbradaUrl : null
        );

        let logoUrl = fromBody?.logoUrl ?? base.logoUrl;
        let folhaTimbradaUrl = urlFromField ?? fromBody?.folhaTimbradaUrl ?? base.folhaTimbradaUrl;

        if (files?.logo?.[0]) {
            logoUrl = `data:${files.logo[0].mimetype};base64,${files.logo[0].buffer.toString('base64')}`;
        }
        if (files?.folhaTimbrada?.[0]) {
            folhaTimbradaUrl = `data:${files.folhaTimbrada[0].mimetype};base64,${files.folhaTimbrada[0].buffer.toString('base64')}`;
        }

        const opRaw = body.opacidade ?? req.query?.opacidade;
        const opParsed = opRaw != null && String(opRaw) !== '' ? parseFloat(String(opRaw)) : Number.NaN;
        const opacidade = Number.isFinite(opParsed)
            ? Math.min(1, Math.max(0, opParsed))
            : (fromBody?.opacidade ?? base.opacidade);

        return {
            tipo: 'template',
            opacidade,
            ...(logoUrl ? { logoUrl } : {}),
            ...(folhaTimbradaUrl ? { folhaTimbradaUrl } : {}),
        };
    }

    /**
     * POST /api/orcamentos/:id/pdf/preview-personalizado
     * Gera o mesmo PDF pdfmake do download, com Content-Disposition: inline (preview no browser).
     */
    static async gerarPreviewPersonalizado(req: Request, res: Response) {
        try {
            const { id } = req.params;

            console.log('📄 Gerando preview PDF (pdfmake) para orçamento:', id);

            const marcaDaguaConfig = await PDFOrcamentoController.montarMarcaDagua(req);
            const pdfBuffer = await PDFOrcamentoService.gerarPDF(id, marcaDaguaConfig);
            const nomeArquivo = await PDFOrcamentoController.gerarNomeArquivo(id);
            const nomeArquivoEncoded = encodeURIComponent(nomeArquivo);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `inline; filename="${nomeArquivoEncoded}"; filename*=UTF-8''${nomeArquivoEncoded}`
            );
            res.setHeader('Content-Length', pdfBuffer.length.toString());
            res.setHeader('Cache-Control', 'no-store');

            res.send(pdfBuffer);

            console.log('✅ Preview PDF gerado e enviado');
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

            console.log('📄 Gerando PDF personalizado para orçamento:', id);

            const marcaDaguaConfig = await PDFOrcamentoController.montarMarcaDagua(req);
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
            const marcaDaguaConfig = await PDFOrcamentoController.montarMarcaDagua(req);

            console.log('📄 Gerando PDF com pdfmake para orçamento:', id);

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
            const marcaDaguaConfig = await PDFOrcamentoController.montarMarcaDagua(req);
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

