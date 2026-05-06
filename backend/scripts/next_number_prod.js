const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  const empresaId = process.argv[2] || 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('EmpresaId:', empresaId);
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id: empresaId } });
  if(!empresa){
    console.error('Empresa não encontrada');
    process.exit(1);
  }
  const raw = await prisma.(
    'SELECT MAX(CAST(numero AS INTEGER)) as max FROM notas_fiscais WHERE empresaFiscalId = docker compose exec -T backend sh -lc "cat > /app/backend/scripts/next_number_prod.js <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  const empresaId = process.argv[2] || 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('EmpresaId:', empresaId);
  const empresa = await prisma.empresaFiscal.findUnique({ where: { id: empresaId } });
  if(!empresa){
    console.error('Empresa não encontrada');
    process.exit(1);
  }
  const raw = await prisma.$queryRawUnsafe(
    'SELECT MAX(CAST(numero AS INTEGER)) as max FROM notas_fiscais WHERE "empresaFiscalId" = $1 AND ambiente = $2 AND numero ~ ''^[0-9]+$''',
    empresa.id,
    'PRODUCAO'
  );
  const maxExisting = (raw && raw[0] && raw[0].max) ? Number(raw[0].max) : 0;
  const ultimoConfigurado = empresa.ultimoNumeroNFe ? Number(empresa.ultimoNumeroNFe) : 0;
  const proximo = Math.max(maxExisting, ultimoConfigurado) + 1;
  console.log('CNPJ da empresa:', empresa.cnpj);
  console.log('Último número existente (DB, PRODUÇÃO):', maxExisting);
  console.log('Último número configurado (empresa.ultimoNumeroNFe):', ultimoConfigurado);
  console.log('Próximo número sugerido para Produção (não reservado):', proximo);
  process.exit(0);
}

main();
EOF" AND ambiente =  AND numero ~ ''^[0-9]+$''',
    empresa.id,
    'PRODUCAO'
  );
  const maxExisting = (raw && raw[0] && raw[0].max) ? Number(raw[0].max) : 0;
  const ultimoConfigurado = empresa.ultimoNumeroNFe ? Number(empresa.ultimoNumeroNFe) : 0;
  const proximo = Math.max(maxExisting, ultimoConfigurado) + 1;
  console.log('CNPJ da empresa:', empresa.cnpj);
  console.log('Último número existente (DB, PRODUÇÃO):', maxExisting);
  console.log('Último número configurado (empresa.ultimoNumeroNFe):', ultimoConfigurado);
  console.log('Próximo número sugerido para Produção (não reservado):', proximo);
  process.exit(0);
}

main();
