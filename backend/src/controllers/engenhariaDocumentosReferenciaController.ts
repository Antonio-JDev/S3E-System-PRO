import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middlewares/auth';
import { buildContentDisposition, normalizeUserFilename } from '../utils/filename.util';
import * as docsService from '../services/engenhariaDocumentosReferencia.service';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'engenharia-referencias');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `eng-ref-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok =
      ext === '.pdf' ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf';
    if (ok) cb(null, true);
    else cb(new Error('Apenas arquivos PDF são permitidos'));
  },
});

export const uploadDocumentoReferencia = upload.single('arquivo');

function getUserId(req: Request): string | null {
  const auth = req as AuthRequest;
  return auth.user?.userId ?? (auth.user as any)?.id ?? null;
}

function isPrivilegedRole(req: Request): boolean {
  const role = String((req as AuthRequest).user?.role || '').toLowerCase();
  return role === 'admin' || role === 'administrador' || role === 'desenvolvedor';
}

export async function listarDocumentosReferencia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    const data = await docsService.listarDocumentosUsuario(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao listar documentos de referência:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao listar documentos' });
  }
}

export async function criarDocumentoReferencia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      return;
    }

    const titulo = String(req.body.titulo || '').trim() || normalizeUserFilename(req.file.originalname);
    const categoria = String(req.body.categoria || 'PDF').trim().toUpperCase();

    const documento = await docsService.criarDocumentoUsuario(userId, {
      titulo,
      categoria: ['PDF', 'NORMA', 'OUTRO'].includes(categoria) ? categoria : 'PDF',
      nome: normalizeUserFilename(req.file.originalname) || req.file.originalname,
      nomeArquivo: req.file.filename,
      url: `/uploads/engenharia-referencias/${req.file.filename}`,
      tamanho: req.file.size,
      mimeType: req.file.mimetype,
    });

    res.status(201).json({ success: true, data: documento, message: 'Documento importado com sucesso' });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Erro ao importar documento:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao importar documento' });
  }
}

export async function visualizarDocumentoReferencia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    const { documentoId } = req.params;
    const doc = await docsService.obterDocumentoUsuario(userId, documentoId);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Documento não encontrado' });
      return;
    }

    const filePath = docsService.resolverCaminhoArquivoDocumento(doc.nomeArquivo);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Arquivo não encontrado no servidor' });
      return;
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('inline', doc.nome, 'documento'));
    res.setHeader('Content-Length', doc.tamanho || fs.statSync(filePath).size);
    res.sendFile(path.resolve(filePath));
  } catch (error: any) {
    console.error('Erro ao visualizar documento:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao visualizar documento' });
  }
}

export async function deletarDocumentoReferencia(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      return;
    }
    const ok = await docsService.deletarDocumentoUsuario(userId, req.params.documentoId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Documento não encontrado' });
      return;
    }
    res.json({ success: true, message: 'Documento removido' });
  } catch (error: any) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao deletar documento' });
  }
}

export { isPrivilegedRole };
