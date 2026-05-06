/**
 * Script de backfill: preenche orcamentistaNome em orçamentos que ainda estão vazios.
 *
 * Objetivo: ao subir a nova versão em produção, não perder a informação de quem
 * criou o orçamento. Orçamentos novos já recebem orcamentistaNome na criação;
 * este script preenche os orçamentos antigos.
 *
 * Estratégia:
 * 1) Para orçamentos com orcamentistaNome NULL, tenta obter o nome do criador
 *    a partir de audit_logs (entity='orcamento', action='CREATE', entityId=id),
 *    usando userName do log ou buscando User pelo userId.
 * 2) Para os que ainda ficarem sem nome, define "Não identificado".
 * 3) Atualiza vendas com vendedorNome NULL para herdar orcamentistaNome do orçamento.
 *
 * Uso (a partir da raiz do backend):
 *   npx ts-node src/scripts/backfill-orcamentista-nome.ts
 * ou:
 *   npm run build && node dist/scripts/backfill-orcamentista-nome.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FALLBACK_NOME = 'Não identificado';

function primeiroNome(nomeCompleto: string | null | undefined): string | null {
  if (!nomeCompleto || typeof nomeCompleto !== 'string') return null;
  const t = nomeCompleto.trim().split(/\s+/)[0];
  return t || null;
}

async function main() {
  console.log('🔧 Backfill orcamentistaNome – iniciando...\n');

  // 1) Orçamentos sem orçamentista definido
  const semNome = await prisma.orcamento.findMany({
    where: { orcamentistaNome: null },
    select: { id: true, numeroSequencial: true }
  });

  console.log(`📋 Orçamentos com orcamentistaNome vazio: ${semNome.length}\n`);

  let preenchidosPorAudit = 0;
  let preenchidosPorUser = 0;
  let preenchidosFallback = 0;

  for (const orc of semNome) {
    let nome: string | null = null;

    // Tentar audit_logs (entity orcamento, criação)
    const log = await prisma.auditLog.findFirst({
      where: {
        entity: 'orcamento',
        entityId: orc.id,
        action: 'CREATE'
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, userName: true }
    });

    if (log?.userName) {
      nome = primeiroNome(log.userName);
      if (nome) preenchidosPorAudit++;
    }

    if (!nome && log?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { name: true }
      });
      nome = primeiroNome(user?.name ?? null);
      if (nome) preenchidosPorUser++;
    }

    if (!nome) {
      nome = FALLBACK_NOME;
      preenchidosFallback++;
    }

    await prisma.orcamento.update({
      where: { id: orc.id },
      data: { orcamentistaNome: nome }
    });

    console.log(`  Orçamento #${orc.numeroSequencial} (${orc.id}) → orcamentistaNome = "${nome}"`);
  }

  // 2) Atualizar vendas com vendedorNome NULL a partir do orçamento
  const resultadoVendas = await prisma.$executeRaw`
    UPDATE vendas v
    SET "vendedorNome" = o."orcamentistaNome"
    FROM orcamentos o
    WHERE v."orcamentoId" = o.id
      AND v."vendedorNome" IS NULL
      AND o."orcamentistaNome" IS NOT NULL
  `;

  console.log(`\n✅ Orçamentos: ${preenchidosPorAudit} por audit (userName), ${preenchidosPorUser} por User (userId), ${preenchidosFallback} com "${FALLBACK_NOME}".`);
  console.log(`✅ Vendas atualizadas (vendedorNome herdado do orçamento): ${resultadoVendas}.\n`);
  console.log('🎉 Backfill concluído.\n');
}

main()
  .catch((e) => {
    console.error('Erro no script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
