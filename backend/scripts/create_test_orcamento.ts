import { PrismaClient } from '@prisma/client';
import nfeService from '../src/services/nfe.service';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Iniciando script de teste: criar orçamento + venda + gerar preview NF');

    // 1) Criar cliente de teste
    const cliente = await prisma.cliente.create({
      data: {
        nome: `Cliente Teste ${Date.now()}`,
        cpfCnpj: `00000000000${Math.floor(Math.random()*90)+10}`,
        createdAt: new Date()
      }
    });
    console.log('Cliente criado:', cliente.id);

    // 2) Garantir empresa fiscal (usar a primeira existente ou criar)
    let empresa = await prisma.empresaFiscal.findFirst();
    if (!empresa) {
      empresa = await prisma.empresaFiscal.create({
        data: {
          cnpj: '12345678000199',
          razaoSocial: 'Empresa Fiscal Teste LTDA',
          nomeFantasia: 'Empresa Teste',
          inscricaoEstadual: 'ISENTO',
          endereco: 'Rua Teste, 100',
          numero: '100',
          bairro: 'Centro',
          cidade: 'Itajaí',
          estado: 'SC',
          cep: '88300000',
          ativo: true,
          createdAt: new Date()
        }
      });
      console.log('Empresa fiscal criada:', empresa.id);
    } else {
      console.log('Usando empresa fiscal existente:', empresa.id);
    }

    // 3) Criar orçamento com um kit unificado (item do tipo KIT com ncm)
    const orcamento = await prisma.orcamento.create({
      data: {
        clienteId: cliente.id,
        titulo: 'Orçamento Teste Kit NCM',
        validade: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        bdi: 0,
        custoTotal: 100,
        precoVenda: 100,
        empresaCNPJ: '12345678000199',
        items: {
          create: [
            {
              tipo: 'KIT',
              descricao: 'Kit Unificado Teste',
              // nome frontend mapped into descricao in DB
              quantidade: 1,
              custoUnit: 100,
              precoUnit: 100,
              subtotal: 100,
              itensDoKit: [
                { nome: 'Material A', quantidade: 1, precoUnit: 50 },
                { nome: 'Material B', quantidade: 1, precoUnit: 50 }
              ],
              ncm: '85369010'
            }
          ]
        }
      },
      include: { items: true }
    });
    console.log('Orçamento criado:', orcamento.id);
    console.log('Orcamento items:', orcamento.items);

    // 4) Criar venda a partir do orçamento
    const venda = await prisma.venda.create({
      data: {
        numeroVenda: `VND-${Date.now()}`,
        orcamentoId: orcamento.id,
        valorTotal: orcamento.precoVenda,
        clienteId: cliente.id,
        formaPagamento: 'À vista',
        parcelas: 1,
        status: 'Pendente',
        empresaFiscalId: empresa.id
      }
    });
    console.log('Venda criada:', venda.id);

    // 5) Gerar preview do XML de NF-e usando o serviço interno
    console.log('Gerando preview XML (usar empresaFiscalId):', empresa.id);
    const preview = await nfeService.gerarXmlPreview(venda.id, empresa.id, '2', '5101', 'Venda de Mercadoria', '1');
    console.log('Preview válido:', preview.validacao.valido);
    console.log('Produtos gerados para NF:');
    console.log(preview.dados.produtos);
    console.log('XML (trecho inicial):', preview.xml.substring(0, 800));

    console.log('Script finalizado com sucesso.');
  } catch (err) {
    console.error('Erro no script de teste:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

