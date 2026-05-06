import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';

const cwd = process.cwd();
const uploadDir = path.join(cwd, 'uploads', 'contato-lead');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = (file.originalname || 'conta').replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `conta-${uniqueSuffix}-${safeName}`);
  }
});

const uploadContaEnergia = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|jpeg|jpg|png|webp/i;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mimetypeOk = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
    if (allowed.test(ext) && mimetypeOk) {
      cb(null, true);
    } else {
      cb(new Error('Apenas PDF ou imagens (JPEG, PNG, WEBP) são permitidos'));
    }
  }
});

/** Até 8 arquivos por requisição; o total no lead também não pode passar de 8. */
export const MAX_ANEXOS_LEAD = 8;

export const uploadContaEnergiaMiddleware = uploadContaEnergia.array('contaEnergia', MAX_ANEXOS_LEAD);

function normalizeAnexosUrls(lead: {
  anexosUrls?: unknown;
  contaEnergiaUrl?: string | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const raw = lead.anexosUrls;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const u = item.trim();
        if (u && !seen.has(u)) {
          seen.add(u);
          out.push(u);
        }
      }
    }
  }
  const legacy = lead.contaEnergiaUrl?.trim();
  if (legacy && !seen.has(legacy)) {
    out.unshift(legacy);
    seen.add(legacy);
  }
  return out.slice(0, MAX_ANEXOS_LEAD);
}

export type ContatoLeadStatus = 'AGUARDANDO_DOCUMENTO' | 'EM_ANALISE_TECNICA' | 'PRONTO_PARA_ORCAR' | 'NAO_ATENDE' | 'CONVERTIDO';

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { status, etapa } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') where.status = status;
    if (etapa != null && etapa !== '') where.etapa = Number(etapa);

    const leads = await prisma.contatoLead.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        _count: { select: { orcamentos: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: leads });
  } catch (e: any) {
    console.error('atendimentoCrm list:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao listar leads' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const lead = await prisma.contatoLead.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        _count: { select: { orcamentos: true } },
      },
    });
    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (e: any) {
    console.error('atendimentoCrm getById:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao buscar lead' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as {
      nome: string;
      whatsapp?: string;
      cpfCnpj?: string;
      necessidade?: string;
      mediaKwhMes?: number;
      observacoes?: string;
      status?: string;
      etapa?: number;
      logradouro?: string;
      numero?: string;
      bairro?: string;
      cep?: string;
      cidade?: string;
      estado?: string;
    };
    if (!body.nome || !body.nome.trim()) {
      res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      return;
    }
    const lead = await prisma.contatoLead.create({
      data: {
        nome: body.nome.trim(),
        whatsapp: body.whatsapp?.trim() || null,
        cpfCnpj: body.cpfCnpj?.trim() || null,
        necessidade: body.necessidade?.trim() || null,
        mediaKwhMes: body.mediaKwhMes != null ? Number(body.mediaKwhMes) : null,
        observacoes: body.observacoes?.trim() || null,
        status: (body.status as ContatoLeadStatus) || 'AGUARDANDO_DOCUMENTO',
        etapa: body.etapa != null ? Number(body.etapa) : 1,
        logradouro: body.logradouro?.trim() || null,
        numero: body.numero?.trim() || null,
        bairro: body.bairro?.trim() || null,
        cep: body.cep?.trim() || null,
        cidade: body.cidade?.trim() || null,
        estado: body.estado?.trim() || null
      }
    });
    res.status(201).json({ success: true, data: lead });
  } catch (e: any) {
    console.error('atendimentoCrm create:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao criar lead' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as {
      nome?: string;
      whatsapp?: string;
      cpfCnpj?: string;
      necessidade?: string;
      mediaKwhMes?: number;
      contaEnergiaUrl?: string;
      observacoesTecnicas?: string;
      viabilidadeTecnica?: boolean;
      condicoesNaoAtender?: string;
      observacoes?: string;
      status?: string;
      etapa?: number;
      clienteId?: string | null;
      logradouro?: string;
      numero?: string;
      bairro?: string;
      cep?: string;
      cidade?: string;
      estado?: string;
    };
    const lead = await prisma.contatoLead.update({
      where: { id },
      data: {
        ...(body.nome !== undefined && { nome: body.nome.trim() }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp?.trim() || null }),
        ...(body.cpfCnpj !== undefined && { cpfCnpj: body.cpfCnpj?.trim() || null }),
        ...(body.necessidade !== undefined && { necessidade: body.necessidade?.trim() || null }),
        ...(body.mediaKwhMes !== undefined && { mediaKwhMes: body.mediaKwhMes == null ? null : Number(body.mediaKwhMes) }),
        ...(body.contaEnergiaUrl !== undefined && { contaEnergiaUrl: body.contaEnergiaUrl || null }),
        ...(body.observacoesTecnicas !== undefined && { observacoesTecnicas: body.observacoesTecnicas?.trim() || null }),
        ...(body.viabilidadeTecnica !== undefined && { viabilidadeTecnica: body.viabilidadeTecnica }),
        ...(body.condicoesNaoAtender !== undefined && { condicoesNaoAtender: body.condicoesNaoAtender?.trim() || null }),
        ...(body.observacoes !== undefined && { observacoes: body.observacoes?.trim() || null }),
        ...(body.status !== undefined && { status: body.status as ContatoLeadStatus }),
        ...(body.etapa !== undefined && { etapa: Number(body.etapa) }),
        ...(body.clienteId !== undefined && { clienteId: body.clienteId || null }),
        ...(body.logradouro !== undefined && { logradouro: body.logradouro?.trim() || null }),
        ...(body.numero !== undefined && { numero: body.numero?.trim() || null }),
        ...(body.bairro !== undefined && { bairro: body.bairro?.trim() || null }),
        ...(body.cep !== undefined && { cep: body.cep?.trim() || null }),
        ...(body.cidade !== undefined && { cidade: body.cidade?.trim() || null }),
        ...(body.estado !== undefined && { estado: body.estado?.trim() || null })
      }
    });
    res.json({ success: true, data: lead });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
      return;
    }
    console.error('atendimentoCrm update:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao atualizar lead' });
  }
}

export async function uploadContaEnergiaHandler(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const unlinkUploaded = () => {
    for (const f of files) {
      try {
        const p = path.join(uploadDir, f.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  };

  try {
    const { id } = req.params;
    if (!files.length) {
      res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      return;
    }

    const existing = await prisma.contatoLead.findUnique({ where: { id } });
    if (!existing) {
      unlinkUploaded();
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
      return;
    }

    const current = normalizeAnexosUrls(existing);
    const remaining = MAX_ANEXOS_LEAD - current.length;
    if (remaining <= 0) {
      unlinkUploaded();
      res.status(400).json({
        success: false,
        error: `Limite de ${MAX_ANEXOS_LEAD} anexos atingido para este lead.`,
      });
      return;
    }

    if (files.length > remaining) {
      unlinkUploaded();
      res.status(400).json({
        success: false,
        error: `Só é possível adicionar mais ${remaining} arquivo(s) (máx. ${MAX_ANEXOS_LEAD} no total). Envie menos arquivos ou remova anexos antes.`,
      });
      return;
    }

    const newUrls = files.map((f) => `/uploads/contato-lead/${f.filename}`);
    const merged = [...current, ...newUrls].slice(0, MAX_ANEXOS_LEAD);

    const lead = await prisma.contatoLead.update({
      where: { id },
      data: {
        anexosUrls: merged,
        contaEnergiaUrl: merged[0] ?? null,
      },
    });
    res.json({ success: true, data: lead });
  } catch (e: any) {
    unlinkUploaded();
    if (e?.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
      return;
    }
    console.error('atendimentoCrm uploadContaEnergia:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao enviar arquivo' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.contatoLead.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Lead não encontrado' });
      return;
    }

    const urls = normalizeAnexosUrls(existing);
    const uploadDirResolved = path.resolve(uploadDir);
    for (const rel of urls) {
      if (typeof rel !== 'string' || !rel.startsWith('/uploads/contato-lead/')) continue;
      const baseName = path.basename(rel);
      if (!baseName || baseName === '.' || baseName === '..') continue;
      const abs = path.resolve(path.join(uploadDir, baseName));
      if (!abs.startsWith(uploadDirResolved + path.sep) && abs !== uploadDirResolved) continue;
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }

    await prisma.contatoLead.delete({ where: { id } });
    res.json({ success: true, message: 'Lead excluído' });
  } catch (e: any) {
    console.error('atendimentoCrm remove:', e);
    res.status(500).json({ success: false, error: e?.message || 'Erro ao excluir lead' });
  }
}
