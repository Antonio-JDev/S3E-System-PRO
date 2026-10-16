/**
 * Unifica fornecedores com o mesmo CNPJ (máscara x só dígitos).
 * Idempotente. Sem --apply apenas conta (dry-run).
 *
 * Local:  npx tsx src/scripts/unificarFornecedoresCnpj.ts
 *         npx tsx src/scripts/unificarFornecedoresCnpj.ts --apply
 * Produção (exige .env.production, não imprime a URL):
 *         npx tsx src/scripts/unificarFornecedoresCnpj.ts --env production
 *         npx tsx src/scripts/unificarFornecedoresCnpj.ts --env production --apply
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { PrismaClient } from '@prisma/client';
import { aplicarUnificacaoFornecedores } from '../services/unificarFornecedoresCnpj.service';

function arquivoEnv(producao: boolean): string | null {
  const candidatos = producao
    ? [
        path.resolve(__dirname, '../../../.env.production'),
        path.resolve(__dirname, '../../.env.production'),
      ]
    : [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../../.env')];
  return candidatos.find((candidato) => fs.existsSync(candidato)) ?? null;
}

function erroSeguro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]')
    .replace(/DATABASE_URL\S*/gi, 'DATABASE_URL[redacted]');
}

function urlComLocalhost(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'postgres') return null;
    parsed.hostname = '127.0.0.1';
    return parsed.toString();
  } catch {
    return null;
  }
}

async function abrirCliente(databaseUrl: string): Promise<PrismaClient> {
  const { PrismaClient: Client } = await import('@prisma/client');
  const client = new Client({
    datasources: { db: { url: databaseUrl } },
    log: ['error'],
  });
  await client.$queryRaw`SELECT 1`;
  return client;
}

async function conectar(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL ausente no ambiente carregado');
  }
  try {
    return await abrirCliente(url);
  } catch (err) {
    const local = urlComLocalhost(url);
    if (!local) throw err;
    return abrirCliente(local);
  }
}

async function main() {
  const aplicar = process.argv.includes('--apply');
  const envIdx = process.argv.indexOf('--env');
  const producao = envIdx >= 0 && process.argv[envIdx + 1] === 'production';
  const arquivo = arquivoEnv(producao);

  if (!arquivo) {
    if (producao) {
      console.error('Arquivo .env.production não encontrado. Produção não foi alterada.');
    } else {
      console.error('Arquivo .env não encontrado.');
    }
    process.exit(1);
  }

  dotenv.config({ path: arquivo });
  console.log(
    `Unificação de fornecedores por CNPJ — ${producao ? 'produção' : 'local'} — ${aplicar ? 'aplicando' : 'dry-run'}`
  );

  let prisma: PrismaClient | null = null;
  try {
    prisma = await conectar();
    const resultado = await aplicarUnificacaoFornecedores(prisma, { dryRun: !aplicar });
    console.log(JSON.stringify(resultado, null, 2));
  } catch (err) {
    console.error(`Falha na unificação: ${erroSeguro(err)}`);
    process.exitCode = 1;
  } finally {
    await prisma?.$disconnect();
  }
}

main();
