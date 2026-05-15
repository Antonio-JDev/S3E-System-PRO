import { Request, Response } from 'express';
import {
  ContatoS3eValidationError,
  createContatoS3eManual,
  deleteContatoS3e,
  getContatoS3eById,
  importContatosBatch,
  listContatosS3e,
  updateContatoS3e,
  type ContatoS3eImportRow,
  type ListContatosS3eParams
} from '../services/contatosS3e.service';

/** GET /api/contatos-s3e?search=&revisado=todos|sim|nao&page=1&pageSize=50&orderBy=recentes|nome|criado */
export async function getContatosS3eList(req: Request, res: Response): Promise<void> {
  try {
    const params: ListContatosS3eParams = {
      search: typeof req.query.search === 'string' ? req.query.search : '',
      revisado:
        req.query.revisado === 'sim' || req.query.revisado === 'nao' || req.query.revisado === 'todos'
          ? req.query.revisado
          : 'todos',
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
      orderBy:
        req.query.orderBy === 'nome' || req.query.orderBy === 'criado' || req.query.orderBy === 'recentes'
          ? req.query.orderBy
          : 'recentes'
    };
    const result = await listContatosS3e(params);
    res.json(result);
  } catch (err) {
    console.error('contatos-s3e list:', err);
    res.status(500).json({ error: 'Erro ao listar contatos' });
  }
}

/** GET /api/contatos-s3e/:id */
export async function getContatoS3eByIdController(req: Request, res: Response): Promise<void> {
  try {
    const row = await getContatoS3eById(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Contato não encontrado' });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error('contatos-s3e get:', err);
    res.status(500).json({ error: 'Erro ao buscar contato' });
  }
}

/** POST /api/contatos-s3e — criação manual pela UI */
export async function postContatoS3e(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    if (typeof body.numero !== 'string' || !body.numero.trim()) {
      res.status(400).json({ error: 'Telefone (numero) é obrigatório.' });
      return;
    }
    const row = await createContatoS3eManual({
      numero: body.numero,
      nomeAgenda: typeof body.nomeAgenda === 'string' ? body.nomeAgenda : null,
      empresa: typeof body.empresa === 'string' ? body.empresa : null,
      pushName: typeof body.pushName === 'string' ? body.pushName : null
    });
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof ContatoS3eValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('contatos-s3e create:', err);
    res.status(500).json({ error: 'Erro ao criar contato' });
  }
}

/** PATCH /api/contatos-s3e/:id — edição de campos do contato pela UI */
export async function patchContatoS3e(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const row = await updateContatoS3e(req.params.id, {
      nomeAgenda: typeof body.nomeAgenda === 'string' || body.nomeAgenda === null ? body.nomeAgenda : undefined,
      empresa: typeof body.empresa === 'string' || body.empresa === null ? body.empresa : undefined,
      pushName: typeof body.pushName === 'string' || body.pushName === null ? body.pushName : undefined,
      revisado: typeof body.revisado === 'boolean' ? body.revisado : undefined,
      numero: typeof body.numero === 'string' ? body.numero : undefined
    });
    res.json(row);
  } catch (err) {
    if (err instanceof ContatoS3eValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('contatos-s3e update:', err);
    res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
}

/** DELETE /api/contatos-s3e/:id */
export async function deleteContatoS3eController(req: Request, res: Response): Promise<void> {
  try {
    await deleteContatoS3e(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('contatos-s3e delete:', err);
    res.status(500).json({ error: 'Erro ao remover contato' });
  }
}

/**
 * POST /api/contatos-s3e/import
 * Body: { rows: Array<{ numero, nomeAgenda?, empresa?, pushName? }>, dddPadrao?: string }
 *
 * Aceita um chunk de até 1000 linhas por requisição. O frontend dispara várias
 * chamadas em sequência mostrando barra de progresso.
 */
export async function postContatosS3eImport(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const rawRows = Array.isArray(body.rows) ? body.rows : null;
    if (!rawRows) {
      res.status(400).json({ error: 'Body inválido: faltou "rows" (array).' });
      return;
    }
    if (rawRows.length > 1000) {
      res.status(413).json({ error: 'Lote acima de 1000 linhas. Divida o envio em partes.' });
      return;
    }
    const dddPadrao = typeof body.dddPadrao === 'string' ? body.dddPadrao : '47';

    const rows: ContatoS3eImportRow[] = rawRows.map((r: unknown) => {
      const obj = (r && typeof r === 'object' ? (r as Record<string, unknown>) : {}) as Record<string, unknown>;
      return {
        numero: String(obj.numero ?? obj.telefone ?? obj.phone ?? ''),
        nomeAgenda: typeof obj.nomeAgenda === 'string' ? obj.nomeAgenda : (typeof obj.nome === 'string' ? obj.nome : null),
        empresa: typeof obj.empresa === 'string' ? obj.empresa : null,
        pushName: typeof obj.pushName === 'string' ? obj.pushName : null,
        jid: typeof obj.jid === 'string' ? obj.jid : null
      };
    });

    const summary = await importContatosBatch(rows, { dddPadrao });
    res.json(summary);
  } catch (err) {
    console.error('contatos-s3e import:', err);
    res.status(500).json({ error: 'Erro ao importar contatos' });
  }
}
