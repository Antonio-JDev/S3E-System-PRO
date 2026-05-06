import NFeFilaService from '../src/services/nfe-fila.service';
import worker from '../src/workers/nfe-fila.worker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const notaId = process.argv[2];
  if (!notaId) {
    console.error('Usage: tsx reprocessNota.ts <notaId>');
    process.exit(1);
  }

  const nota = await prisma.notaFiscal.findUnique({ where: { id: notaId } });
  if (!nota) {
    console.error('Nota not found:', notaId);
    process.exit(1);
  }

  // Enfileirar
  const registro = await NFeFilaService.enfileirar({
    notaFiscalId: nota.id,
    empresaFiscalId: nota.empresaFiscalId || undefined,
    ambiente: nota.ambiente === 'PRODUCAO' || nota.ambiente === '1' ? '1' : '2',
    modo: 'NORMAL',
    xmlAssinado: nota.xmlNFe || ''
  });

  console.log('Enfileirado:', registro.id);

  // Processar 1 item imediatamente
  try {
    await worker.processarFilaNFe(1);
    console.log('Worker processou a fila (1 item)');
  } catch (e:any) {
    console.error('Erro ao processar fila:', e);
  }

  process.exit(0);
}

main();
