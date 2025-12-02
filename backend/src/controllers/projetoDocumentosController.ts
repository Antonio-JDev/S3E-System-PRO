import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração do multer para uploads de documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cwd = process.cwd();
    // Em produção (Docker), cwd será /app e o volume está mapeado em /app/uploads
    // Em desenvolvimento, usamos sempre backend/uploads para manter um único padrão
    const uploadDir = cwd.endsWith('backend')
      ? path.join(cwd, 'uploads', 'projetos-documentos')
      : path.join(cwd, 'backend', 'uploads', 'projetos-documentos');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, DOC, DOCX, JPG, JPEG ou PNG são permitidos'));
    }
  }
});

export const uploadDocumento = upload.single('arquivo');

/**
 * POST /api/projetos/:projetoId/documentos
 * Upload de documento para um projeto
 */
export const criarDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId } = req.params;
    const { tipo, observacoes } = req.body;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    // Verificar se o projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id: projetoId }
    });

    if (!projeto) {
      // Deletar arquivo se projeto não existe
      fs.unlinkSync(req.file.path);
      res.status(404).json({
        success: false,
        error: 'Projeto não encontrado'
      });
      return;
    }

    // Criar registro no banco
    const documento = await prisma.projetoDocumento.create({
      data: {
        projetoId,
        tipo: tipo || 'OUTRO',
        nome: req.file.originalname,
        nomeArquivo: req.file.filename,
        url: `/uploads/projetos-documentos/${req.file.filename}`,
        observacoes: observacoes || null,
        tamanho: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    res.status(201).json({
      success: true,
      data: documento,
      message: 'Documento enviado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao criar documento:', error);
    
    // Deletar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao fazer upload do documento'
    });
  }
};

/**
 * GET /api/projetos/:projetoId/documentos
 * Listar documentos de um projeto
 */
export const listarDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId } = req.params;

    const documentos = await prisma.projetoDocumento.findMany({
      where: { projetoId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: documentos
    });
  } catch (error: any) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar documentos'
    });
  }
};

/**
 * GET /api/projetos/:projetoId/documentos/:documentoId/visualizar
 * Visualizar/baixar documento de um projeto
 */
export const visualizarDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId, documentoId } = req.params;

    const documento = await prisma.projetoDocumento.findUnique({
      where: { id: documentoId }
    });

    if (!documento || documento.projetoId !== projetoId) {
      res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
      return;
    }

    // Construir caminho do arquivo
    const cwd = process.cwd();
    const filePath = cwd.endsWith('backend')
      ? path.join(cwd, 'uploads', 'projetos-documentos', documento.nomeArquivo)
      : path.join(cwd, 'backend', 'uploads', 'projetos-documentos', documento.nomeArquivo);

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado no servidor'
      });
      return;
    }

    // Configurar headers para visualização
    res.setHeader('Content-Type', documento.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(documento.nome)}"`);
    res.setHeader('Content-Length', documento.tamanho || fs.statSync(filePath).size);

    // Enviar arquivo
    res.sendFile(path.resolve(filePath));
  } catch (error: any) {
    console.error('Erro ao visualizar documento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao visualizar documento'
    });
  }
};

/**
 * DELETE /api/projetos/:projetoId/documentos/:documentoId
 * Deletar documento de um projeto
 */
export const deletarDocumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projetoId, documentoId } = req.params;

    const documento = await prisma.projetoDocumento.findUnique({
      where: { id: documentoId }
    });

    if (!documento || documento.projetoId !== projetoId) {
      res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
      return;
    }

    // Deletar arquivo físico
    const cwd = process.cwd();
    const filePath = cwd.endsWith('backend')
      ? path.join(cwd, 'uploads', 'projetos-documentos', documento.nomeArquivo)
      : path.join(cwd, 'backend', 'uploads', 'projetos-documentos', documento.nomeArquivo);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Deletar registro no banco
    await prisma.projetoDocumento.delete({
      where: { id: documentoId }
    });

    res.json({
      success: true,
      message: 'Documento deletado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar documento'
    });
  }
};

