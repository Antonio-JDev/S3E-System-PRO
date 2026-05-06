import { PrismaClient } from '@prisma/client';
import NFeService from '../src/services/nfe.service';

const prisma = new PrismaClient();

async function main(){
  const empresaId = 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('Using empresaId:', empresaId);

  let cliente = await prisma.cliente.findFirst({ where: { cpfCnpj: '47591769000195' } });
  if(!cliente){
    cliente = await prisma.cliente.create({ data: { nome: 'Cliente Teste', cpfCnpj: '47591769000195', email: 'teste@cliente.local' } });
    console.log('Created cliente:', cliente.id);
  } else {
    console.log('Reusing cliente:', cliente.id);
  }

  const orcamento = await prisma.orcamento.create({ data: {
    clienteId: cliente.id,
    titulo: 'Orçamento Teste Emissão Prod',
    descricao: 'Orçamento criado para teste de emissão NF-e PRODUÇÃO Rdocker compose exec -T backend sh -lc "cat > /app/backend/scripts/emit_prod_test.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
import NFeService from '../src/services/nfe.service';

const prisma = new PrismaClient();

async function main(){
  const empresaId = 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('Using empresaId:', empresaId);

  let cliente = await prisma.cliente.findFirst({ where: { cpfCnpj: '47591769000195' } });
  if(!cliente){
    cliente = await prisma.cliente.create({ data: { nome: 'Cliente Teste', cpfCnpj: '47591769000195', email: 'teste@cliente.local' } });
    console.log('Created cliente:', cliente.id);
  } else {
    console.log('Reusing cliente:', cliente.id);
  }

  const orcamento = await prisma.orcamento.create({ data: {
    clienteId: cliente.id,
    titulo: 'Orçamento Teste Emissão Prod',
    descricao: 'Orçamento criado para teste de emissão NF-e PRODUÇÃO R$1,00',
    validade: new Date(Date.now() + 7*24*3600*1000),
    status: 'Aprovado',
    empresaFiscalId: empresaId,
    precoVenda: 1.00,
    descontoValor: 0,
    impostoPercentual: 0
  }});
  console.log('Created orcamento:', orcamento.id);

  const item = await prisma.orcamentoItem.create({ data: {
    orcamentoId: orcamento.id,
    tipo: 'MATERIAL',
    descricao: 'Produto Teste R$1,00',
    quantidade: 1,
    custoUnit: 0,
    precoUnit: 1.00,
    subtotal: 1.00,
    ncm: '00000000',
    unidadeVenda: 'UN'
  }});
  console.log('Created orcamento item:', item.id);

  const venda = await prisma.venda.create({ data: {
    numeroVenda: 'VND-' + Date.now().toString(),
    orcamentoId: orcamento.id,
    valorTotal: 1.00,
    clienteId: cliente.id,
    empresaFiscalId: empresaId,
    status: 'Pendente'
  }});
  console.log('Created venda:', venda.id);

  try{
    console.log('Calling processarEmissao in PRODUCAO (ambiente 1) ...');
    const nfe = await NFeService.processarEmissao(venda.id, empresaId, '1');
    console.log('Result:', JSON.stringify(nfe, null, 2));
  }catch(err:any){
    console.error('Emission error:', err && err.message ? err.message : err);
  }

  process.exit(0);
}

main();
EOF",00',
    validade: new Date(Date.now() + 7*24*3600*1000),
    status: 'Aprovado',
    empresaFiscalId: empresaId,
    precoVenda: 1.00,
    descontoValor: 0,
    impostoPercentual: 0
  }});
  console.log('Created orcamento:', orcamento.id);

  const item = await prisma.orcamentoItem.create({ data: {
    orcamentoId: orcamento.id,
    tipo: 'MATERIAL',
    descricao: 'Produto Teste Rdocker compose exec -T backend sh -lc "cat > /app/backend/scripts/emit_prod_test.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
import NFeService from '../src/services/nfe.service';

const prisma = new PrismaClient();

async function main(){
  const empresaId = 'd6588e41-e964-4df6-9a63-d32df62a5964';
  console.log('Using empresaId:', empresaId);

  let cliente = await prisma.cliente.findFirst({ where: { cpfCnpj: '47591769000195' } });
  if(!cliente){
    cliente = await prisma.cliente.create({ data: { nome: 'Cliente Teste', cpfCnpj: '47591769000195', email: 'teste@cliente.local' } });
    console.log('Created cliente:', cliente.id);
  } else {
    console.log('Reusing cliente:', cliente.id);
  }

  const orcamento = await prisma.orcamento.create({ data: {
    clienteId: cliente.id,
    titulo: 'Orçamento Teste Emissão Prod',
    descricao: 'Orçamento criado para teste de emissão NF-e PRODUÇÃO R$1,00',
    validade: new Date(Date.now() + 7*24*3600*1000),
    status: 'Aprovado',
    empresaFiscalId: empresaId,
    precoVenda: 1.00,
    descontoValor: 0,
    impostoPercentual: 0
  }});
  console.log('Created orcamento:', orcamento.id);

  const item = await prisma.orcamentoItem.create({ data: {
    orcamentoId: orcamento.id,
    tipo: 'MATERIAL',
    descricao: 'Produto Teste R$1,00',
    quantidade: 1,
    custoUnit: 0,
    precoUnit: 1.00,
    subtotal: 1.00,
    ncm: '00000000',
    unidadeVenda: 'UN'
  }});
  console.log('Created orcamento item:', item.id);

  const venda = await prisma.venda.create({ data: {
    numeroVenda: 'VND-' + Date.now().toString(),
    orcamentoId: orcamento.id,
    valorTotal: 1.00,
    clienteId: cliente.id,
    empresaFiscalId: empresaId,
    status: 'Pendente'
  }});
  console.log('Created venda:', venda.id);

  try{
    console.log('Calling processarEmissao in PRODUCAO (ambiente 1) ...');
    const nfe = await NFeService.processarEmissao(venda.id, empresaId, '1');
    console.log('Result:', JSON.stringify(nfe, null, 2));
  }catch(err:any){
    console.error('Emission error:', err && err.message ? err.message : err);
  }

  process.exit(0);
}

main();
EOF",00',
    quantidade: 1,
    custoUnit: 0,
    precoUnit: 1.00,
    subtotal: 1.00,
    ncm: '00000000',
    unidadeVenda: 'UN'
  }});
  console.log('Created orcamento item:', item.id);

  const venda = await prisma.venda.create({ data: {
    numeroVenda: 'VND-' + Date.now().toString(),
    orcamentoId: orcamento.id,
    valorTotal: 1.00,
    clienteId: cliente.id,
    empresaFiscalId: empresaId,
    status: 'Pendente'
  }});
  console.log('Created venda:', venda.id);

  try{
    console.log('Calling processarEmissao in PRODUCAO (ambiente 1) ...');
    const nfe = await NFeService.processarEmissao(venda.id, empresaId, '1');
    console.log('Result:', JSON.stringify(nfe, null, 2));
  }catch(err:any){
    console.error('Emission error:', err && err.message ? err.message : err);
  }

  process.exit(0);
}

main();
