import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export const CONFIG_DEV_MCP_ID = 'dev-mcp';

const SQL_TABELA = `
CREATE TABLE IF NOT EXISTS "configuracao_dev_mcp" (
    "id" TEXT NOT NULL DEFAULT 'dev-mcp',
    "mcp_api_key" TEXT NOT NULL,
    "gemini_api_key" TEXT,
    "usar_gemini" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configuracao_dev_mcp_pkey" PRIMARY KEY ("id")
)`;

let tabelaPronta = false;

export function gerarChaveMcp(): string {
  return `s3e_${crypto.randomBytes(32).toString('base64url')}`;
}

export function mascararSegredo(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (valor.length <= 8) return '••••••••';
  return `${valor.slice(0, 4)}••••${valor.slice(-4)}`;
}

export function extrairBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const chave = match[1].trim();
  return chave || null;
}

export function chavesIguais(informada: string, salva: string): boolean {
  const a = Buffer.from(informada);
  const b = Buffer.from(salva);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function normalizarBaseUrl(input?: string): string {
  const fallback = `http://localhost:${process.env.PORT || 3001}`;
  if (!input || !input.trim()) return fallback;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    return `${url.protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

export function montarMcpJson(baseUrl: string, apiKey: string) {
  const origem = normalizarBaseUrl(baseUrl);
  return {
    mcpServers: {
      's3e-erp-debug': {
        url: `${origem}/api/mcp`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    },
  };
}

export async function garantirTabelaDevMcp(): Promise<void> {
  if (tabelaPronta) return;
  await prisma.$executeRawUnsafe(SQL_TABELA);
  tabelaPronta = true;
}

async function buscarRegistro() {
  return prisma.configuracaoDevMcp.findUnique({ where: { id: CONFIG_DEV_MCP_ID } });
}

/** Lê a chave vigente sem criar uma nova. Usado na autenticação do MCP. */
export async function lerChaveMcpSalva(): Promise<string | null> {
  try {
    await garantirTabelaDevMcp();
    const registro = await buscarRegistro();
    return registro?.mcpApiKey || null;
  } catch (err) {
    console.warn(
      'MCP: não foi possível ler a chave salva:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function chaveMcpAutorizada(authorization: string | undefined): Promise<boolean> {
  const informada = extrairBearer(authorization);
  if (!informada) return false;
  const salva = await lerChaveMcpSalva();
  if (!salva) return false;
  return chavesIguais(informada, salva);
}

function respostaTela(
  registro: { mcpApiKey: string; geminiApiKey: string | null; usarGemini: boolean },
  baseUrl: string,
  chaveNova: string | null
) {
  const origem = normalizarBaseUrl(baseUrl);
  return {
    mcpKeyMasked: mascararSegredo(registro.mcpApiKey),
    mcpKeyNova: chaveNova,
    chaveRecemGerada: Boolean(chaveNova),
    geminiConfigurada: Boolean(registro.geminiApiKey),
    geminiKeyMasked: mascararSegredo(registro.geminiApiKey),
    usarGemini: registro.usarGemini,
    mcpUrl: `${origem}/api/mcp`,
    headerNome: 'Authorization',
    headerFormato: 'Authorization: Bearer <chave>',
    mcpJson: montarMcpJson(origem, registro.mcpApiKey),
  };
}

/**
 * Primeira leitura da tela DEV cria a chave se ainda não existir.
 * A chave em claro volta só nesse momento (mcpKeyNova). O JSON copiável
 * sempre inclui a chave vigente, apenas para o admin autenticado nesta tela.
 */
export async function lerConfigDevMcp(baseUrl?: string) {
  await garantirTabelaDevMcp();
  const existente = await buscarRegistro();
  if (existente) {
    return respostaTela(existente, baseUrl || '', null);
  }

  const chave = gerarChaveMcp();
  try {
    const criado = await prisma.configuracaoDevMcp.create({
      data: {
        id: CONFIG_DEV_MCP_ID,
        mcpApiKey: chave,
        usarGemini: false,
      },
    });
    return respostaTela(criado, baseUrl || '', chave);
  } catch {
    const deNovo = await buscarRegistro();
    if (!deNovo) throw new Error('Não foi possível criar a configuração do MCP.');
    return respostaTela(deNovo, baseUrl || '', null);
  }
}

export function validarChaveInformada(chave: string): string | null {
  const valor = chave.trim();
  if (valor.length < 16) return 'A chave precisa ter pelo menos 16 caracteres.';
  if (valor.length > 200) return 'A chave pode ter no máximo 200 caracteres.';
  if (/\s/.test(valor)) return 'A chave não pode conter espaços.';
  return null;
}

export async function salvarChaveMcp(chave: string, baseUrl?: string) {
  const erro = validarChaveInformada(chave);
  if (erro) {
    return { ok: false as const, error: erro };
  }
  await garantirTabelaDevMcp();
  const valor = chave.trim();
  const registro = await prisma.configuracaoDevMcp.upsert({
    where: { id: CONFIG_DEV_MCP_ID },
    create: { id: CONFIG_DEV_MCP_ID, mcpApiKey: valor, usarGemini: false },
    update: { mcpApiKey: valor },
  });
  return { ok: true as const, data: respostaTela(registro, baseUrl || '', valor) };
}

export async function gerarESalvarChaveMcp(baseUrl?: string) {
  return salvarChaveMcp(gerarChaveMcp(), baseUrl);
}

export async function salvarGemini(input: {
  geminiApiKey?: string | null;
  usarGemini?: boolean;
  limpar?: boolean;
  baseUrl?: string;
}) {
  await garantirTabelaDevMcp();
  const atual = await buscarRegistro();
  if (!atual) {
    await prisma.configuracaoDevMcp.create({
      data: {
        id: CONFIG_DEV_MCP_ID,
        mcpApiKey: gerarChaveMcp(),
        usarGemini: false,
      },
    });
  }

  const registroAtual = (await buscarRegistro())!;
  let geminiApiKey = registroAtual.geminiApiKey;
  let usarGemini = registroAtual.usarGemini;

  if (input.limpar) {
    geminiApiKey = null;
    usarGemini = false;
  } else {
    if (typeof input.geminiApiKey === 'string') {
      const valor = input.geminiApiKey.trim();
      if (valor) {
        if (valor.length < 10) {
          return { ok: false as const, error: 'A chave Gemini parece curta demais.' };
        }
        if (valor.length > 300) {
          return { ok: false as const, error: 'A chave Gemini excede o tamanho permitido.' };
        }
        geminiApiKey = valor;
      }
    }
    if (typeof input.usarGemini === 'boolean') {
      usarGemini = input.usarGemini;
    }
  }

  const registro = await prisma.configuracaoDevMcp.update({
    where: { id: CONFIG_DEV_MCP_ID },
    data: { geminiApiKey, usarGemini },
  });

  return { ok: true as const, data: respostaTela(registro, input.baseUrl || '', null) };
}
