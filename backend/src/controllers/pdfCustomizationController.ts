import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import DynamicPDFService from '../services/DynamicPDFService';
import { PDFCustomization, OrcamentoPDFData } from '../types/pdfCustomization';

const prisma = new PrismaClient();

// Configuração do multer para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const cwd = process.cwd();
        const uploadDir = cwd.endsWith('backend')
            ? path.join(cwd, 'uploads', 'pdf-customization')
            : path.join(cwd, 'backend', 'uploads', 'pdf-customization');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});

export const uploadWatermark = upload.single('watermark');
export const uploadCornerDesign = upload.single('cornerDesign');

export class PDFCustomizationController {
    /**
     * POST /api/pdf/generate-custom
     * Gera PDF personalizado
     */
    static async generateCustomPDF(req: Request, res: Response): Promise<void> {
        try {
            const { orcamentoData, customization } = req.body as {
                orcamentoData: OrcamentoPDFData;
                customization: PDFCustomization;
            };

            console.log('📄 Gerando PDF personalizado...');

            // Validação básica
            if (!orcamentoData || !customization) {
                res.status(400).json({
                    success: false,
                    message: 'Dados do orçamento e customização são obrigatórios'
                });
                return;
            }

            // Gerar PDF
            const pdfBuffer = await DynamicPDFService.generatePDF(orcamentoData, customization);

            // Configurar headers para download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Orcamento_${orcamentoData.numero}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer);
        } catch (error: any) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar PDF personalizado',
                error: error.message
            });
        }
    }

    /**
     * POST /api/pdf-customization/templates
     * Salva template de personalização
     */
    static async saveTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { templateName, customization, description } = req.body;
            const userId = (req as any).userId; // Do middleware de autenticação

            if (!templateName || !customization) {
                res.status(400).json({
                    success: false,
                    message: 'Nome do template e customização são obrigatórios'
                });
                return;
            }

            // Salvar no banco usando Prisma
            const template = await prisma.pDFTemplate.create({
                data: {
                    userId,
                    templateName,
                    description,
                    customization: customization, // Prisma armazena JSON automaticamente
                    isDefault: false
                }
            });

            res.status(201).json({
                success: true,
                data: template,
                message: 'Template salvo com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao salvar template:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao salvar template',
                error: error.message
            });
        }
    }

    /**
     * GET /api/pdf-customization/templates
     * Lista templates do usuário
     */
    static async listTemplates(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).userId;

            const templates = await prisma.pDFTemplate.findMany({
                where: {
                    userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            res.json({
                success: true,
                data: templates
            });
        } catch (error: any) {
            console.error('Erro ao listar templates:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar templates',
                error: error.message
            });
        }
    }

    /**
     * GET /api/pdf-customization/templates/:id
     * Carrega template específico
     */
    static async loadTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).userId;

            const template = await prisma.pDFTemplate.findFirst({
                where: {
                    id,
                    userId // Garantir que o usuário só acesse seus próprios templates
                }
            });

            if (!template) {
                res.status(404).json({
                    success: false,
                    message: 'Template não encontrado'
                });
                return;
            }

            res.json({
                success: true,
                data: template
            });
        } catch (error: any) {
            console.error('Erro ao carregar template:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao carregar template',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/pdf-customization/templates/:id
     * Deleta template
     */
    static async deleteTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).userId;

            // Verificar se o template existe e pertence ao usuário
            const template = await prisma.pDFTemplate.findFirst({
                where: {
                    id,
                    userId
                }
            });

            if (!template) {
                res.status(404).json({
                    success: false,
                    message: 'Template não encontrado'
                });
                return;
            }

            // Deletar template
            await prisma.pDFTemplate.delete({
                where: {
                    id
                }
            });

            res.json({
                success: true,
                message: 'Template deletado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao deletar template:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao deletar template',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/pdf-customization/templates/:id
     * Atualiza template existente
     */
    static async updateTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { templateName, customization, description } = req.body;
            const userId = (req as any).userId;

            // Verificar se o template existe e pertence ao usuário
            const template = await prisma.pDFTemplate.findFirst({
                where: {
                    id,
                    userId
                }
            });

            if (!template) {
                res.status(404).json({
                    success: false,
                    message: 'Template não encontrado'
                });
                return;
            }

            // Atualizar template
            const updatedTemplate = await prisma.pDFTemplate.update({
                where: {
                    id
                },
                data: {
                    templateName,
                    customization,
                    description
                }
            });

            res.json({
                success: true,
                data: updatedTemplate,
                message: 'Template atualizado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao atualizar template:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar template',
                error: error.message
            });
        }
    }

    /**
     * POST /api/pdf/upload-watermark
     * Upload de imagem para marca d'água
     */
    static async uploadWatermarkImage(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo foi enviado'
                });
                return;
            }

            const url = `/uploads/pdf-customization/${req.file.filename}`;

            res.json({
                success: true,
                data: { url },
                message: 'Imagem carregada com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao fazer upload:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao fazer upload da imagem',
                error: error.message
            });
        }
    }

    /**
     * POST /api/pdf/upload-corner-design
     * Upload de design de canto customizado
     */
    static async uploadCornerDesignImage(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum arquivo foi enviado'
                });
                return;
            }

            const url = `/uploads/pdf-customization/${req.file.filename}`;

            res.json({
                success: true,
                data: { url },
                message: 'Design carregado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao fazer upload:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao fazer upload do design',
                error: error.message
            });
        }
    }
}

export default new PDFCustomizationController();

