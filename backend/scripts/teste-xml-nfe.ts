import { NFeService } from '../src/services/nfe.service';

async function main() {
  const service = new NFeService();

  // Gera um XML de exemplo usando o mock interno
  const dados = await service.mockSalesOrder('teste-xml');
  const xml = service.generateNFeXML(dados);

  const camposObrigatorios = [
    '<xPais>BRASIL</xPais>',
    '<ICMSTot>',
    '<vBC>',
    '<vICMS>',
    '<vICMSDeson>',
    '<vFCPUFDest>',
    '<vICMSUFDest>',
    '<vICMSUFRemet>',
    '<vFCP>',
    '<vBCST>',
    '<vST>',
    '<vFCPST>',
    '<vFCPSTRet>',
    '<vProd>',
    '<vFrete>',
    '<vSeg>',
    '<vDesc>',
    '<vII>',
    '<vIPI>',
    '<vIPIDevol>',
    '<vPIS>',
    '<vCOFINS>',
    '<vOutro>',
    '<vNF>',
    '<vTotTrib>',
    '<pag>',
    '<detPag>',
    '<tPag>',
    '<vPag>',
  ];

  const faltantes: string[] = [];

  for (const campo of camposObrigatorios) {
    if (!xml.includes(campo)) {
      faltantes.push(campo);
    }
  }

  if (faltantes.length === 0) {
    console.log('✅ XML COMPLETO - Todos os campos obrigatórios básicos estão presentes.');
  } else {
    console.log('❌ FALTAM CAMPOS OBRIGATÓRIOS NO XML:');
    for (const campo of faltantes) {
      console.log(`  - ${campo}`);
    }
  }
}

main().catch((err) => {
  console.error('Erro ao testar XML da NF-e:', err);
  process.exit(1);
});


