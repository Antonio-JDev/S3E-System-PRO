import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chaveMcpAutorizada } from '../services/configuracaoDevMcp.service';
import {
  getFailedNfeDetails,
  getSystemLogs,
  getUserSessionAudit,
} from './debugMcp.handlers';

function textoJson(dados: unknown) {
  const falha = typeof dados === 'object' && dados !== null && (dados as { ok?: boolean }).ok === false;
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 2) }],
    ...(falha ? { isError: true } : {}),
  };
}

async function executar(fn: () => Promise<Record<string, unknown>>) {
  try {
    return textoJson(await fn());
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'falha desconhecida';
    return textoJson({ ok: false, error: `Erro ao consultar o banco: ${mensagem}` });
  }
}

export async function autenticarChaveMcp(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'Método não permitido no servidor MCP.' });
    return;
  }

  try {
    const header = req.headers.authorization;
    const ok = await chaveMcpAutorizada(typeof header === 'string' ? header : undefined);
    if (!ok) {
      res.status(401).json({
        error: 'Chave de API do MCP ausente ou inválida. Use o header Authorization: Bearer <chave> configurada na página Logs.',
      });
      return;
    }
  } catch (err) {
    console.error('MCP: falha ao validar a chave:', err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Não foi possível validar a chave do MCP no banco.' });
    }
    return;
  }

  next();
}

export async function tratarRequisicaoMcp(req: Request, res: Response): Promise<void> {
  try {
    const { McpServer } = (await import('@modelcontextprotocol/sdk/server/mcp.js')) as {
      McpServer: new (info: { name: string; version: string }) => {
        registerTool: (
          name: string,
          config: Record<string, unknown>,
          cb: (args: Record<string, unknown>) => Promise<unknown>
        ) => void;
        connect: (transport: unknown) => Promise<void>;
        close: () => Promise<void>;
      };
    };
    const { StreamableHTTPServerTransport } = (await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    )) as {
      StreamableHTTPServerTransport: new (options?: {
        sessionIdGenerator?: undefined;
        enableJsonResponse?: boolean;
      }) => {
        handleRequest: (req: unknown, res: unknown, parsedBody?: unknown) => Promise<void>;
        close: () => Promise<void>;
      };
    };

    const server = new McpServer({
      name: 's3e-erp-debug',
      version: '1.0.0',
    });

    server.registerTool(
      'get_system_logs',
      {
        title: 'Logs do sistema',
        description:
          'Lê os últimos registros reais da tabela audit_logs do ERP S3E. O nível (ERROR, WARN ou INFO) é derivado da ação e de metadata.level, porque o banco não tem coluna de nível. Não cria nem altera registros.',
        inputSchema: {
          level: z.enum(['ERROR', 'WARN', 'INFO']).optional().describe('Nível derivado do log'),
          limit: z.number().int().min(1).max(200).optional().describe('Quantidade máxima. Padrão: 50'),
          startDate: z.string().optional().describe('Data inicial ISO-8601, opcional'),
        },
        annotations: { readOnlyHint: true },
      },
      async (args) => executar(() => getSystemLogs(args))
    );

    server.registerTool(
      'get_failed_nfe_details',
      {
        title: 'NF-e com falha',
        description:
          'Consulta notas fiscais com falha ou rejeição já gravadas no ERP (NotaFiscal, fila, eventos, auditoria NF-e e NFS-e com erro). Devolve somente campos que existem no schema, como XML, retorno em observações/último erro e cStat quando estiver na auditoria. Se nfeId não existir, a resposta informa que a nota não foi encontrada.',
        inputSchema: {
          nfeId: z.string().optional().describe('Id, número ou chave de acesso da nota'),
          limit: z.number().int().min(1).max(200).optional().describe('Quantidade quando nfeId não é informado. Padrão: 20'),
        },
        annotations: { readOnlyHint: true },
      },
      async (args) => executar(() => getFailedNfeDetails(args))
    );

    server.registerTool(
      'get_user_session_audit',
      {
        title: 'Auditoria da sessão',
        description:
          'Lista as últimas ações do usuário em audit_logs (login, requisições auditadas, NF-e e demais eventos ligados ao userId). Exige userId. Não altera dados.',
        inputSchema: {
          userId: z.string().describe('Id do usuário no ERP'),
        },
        annotations: { readOnlyHint: true },
      },
      async (args) => executar(() => getUserSessionAudit(args))
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    try {
      const corpo = req.method === 'POST' ? req.body : undefined;
      await transport.handleRequest(req, res, corpo);
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  } catch (err) {
    console.error('MCP: erro ao processar a requisição:', err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Falha interna no servidor MCP.' },
        id: null,
      });
    }
  }
}
