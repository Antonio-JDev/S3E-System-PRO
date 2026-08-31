import { prisma } from '../lib/prisma';
import { backfillAliasesFromCompras } from '../services/materialFornecedorAlias.service';

async function main() {
  const gravados = await backfillAliasesFromCompras(prisma as any);
  console.log(`✅ Backfill concluído: ${gravados} vínculo(s) fornecedor → material gravados.`);
}

main()
  .catch((err) => {
    console.error('❌ Falha no backfill de aliases:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
