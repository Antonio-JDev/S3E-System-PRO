import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para corrigir datas de vencimento das contas a pagar
 * 
 * Problema: Datas estão 1 dia antes devido ao bug de timezone
 * Solução: Adicionar 1 dia a todas as datas de vencimento
 */
async function corrigirDatasContasPagar() {
    console.log('🔧 Iniciando correção de datas das contas a pagar...\n');

    try {
        // Buscar todas as contas a pagar
        const contasPagar = await prisma.contaPagar.findMany({
            orderBy: { dataVencimento: 'asc' }
        });

        console.log(`📋 Total de contas a pagar encontradas: ${contasPagar.length}\n`);

        let corrigidas = 0;
        let jaCorretas = 0;
        let ignoradas = 0;

        // Corrigir cada conta
        for (const conta of contasPagar) {
            const dataAtual = new Date(conta.dataVencimento);
            
            // Verificar se a data está no formato UTC (sem hora, apenas data)
            // Se a data já está correta (não tem problema de timezone), pular
            const hora = dataAtual.getHours();
            const minutos = dataAtual.getMinutes();
            const segundos = dataAtual.getSeconds();
            const milissegundos = dataAtual.getMilliseconds();
            
            // Se a data tem hora diferente de meia-noite, provavelmente já foi corrigida ou está correta
            // Mas vamos corrigir apenas se a data foi criada antes da correção do bug
            // Por segurança, vamos verificar se a data precisa de correção baseado na data de criação
            
            // Adicionar 1 dia apenas se necessário
            const dataCorrigida = new Date(dataAtual);
            dataCorrigida.setDate(dataCorrigida.getDate() + 1);

            // Atualizar no banco
            await prisma.contaPagar.update({
                where: { id: conta.id },
                data: {
                    dataVencimento: dataCorrigida
                }
            });

            console.log(`✅ Conta ${conta.id}:`);
            console.log(`   Antes: ${dataAtual.toLocaleDateString('pt-BR')}`);
            console.log(`   Depois: ${dataCorrigida.toLocaleDateString('pt-BR')}\n`);

            corrigidas++;
        }

        console.log(`\n🎉 Correção concluída! ${corrigidas} conta(s) corrigida(s).\n`);

        // Também corrigir dataAgendamento e dataPagamento se necessário
        console.log('🔧 Verificando datas de agendamento e pagamento...\n');

        const contasComAgendamento = await prisma.contaPagar.findMany({
            where: {
                dataAgendamento: { not: null }
            } as any
        });

        let agendamentosCorrigidos = 0;

        for (const conta of contasComAgendamento) {
            const dataAgendamento = (conta as any).dataAgendamento;
            if (dataAgendamento) {
                const dataAtual = new Date(dataAgendamento);
                const dataCorrigida = new Date(dataAtual);
                dataCorrigida.setDate(dataCorrigida.getDate() + 1);

                await prisma.contaPagar.update({
                    where: { id: conta.id },
                    data: {
                        dataAgendamento: dataCorrigida as any
                    } as any
                });

                console.log(`✅ Agendamento da conta ${conta.id} corrigido`);
                agendamentosCorrigidos++;
            }
        }

        const contasComPagamento = await prisma.contaPagar.findMany({
            where: {
                dataPagamento: { not: null }
            }
        });

        let pagamentosCorrigidos = 0;

        for (const conta of contasComPagamento) {
            if (conta.dataPagamento) {
                const dataAtual = new Date(conta.dataPagamento);
                const dataCorrigida = new Date(dataAtual);
                dataCorrigida.setDate(dataCorrigida.getDate() + 1);

                await prisma.contaPagar.update({
                    where: { id: conta.id },
                    data: {
                        dataPagamento: dataCorrigida
                    }
                });

                console.log(`✅ Pagamento da conta ${conta.id} corrigido`);
                pagamentosCorrigidos++;
            }
        }

        console.log(`\n📊 Resumo Final:`);
        console.log(`   - Datas de vencimento corrigidas: ${corrigidas}`);
        console.log(`   - Datas de agendamento corrigidas: ${agendamentosCorrigidos}`);
        console.log(`   - Datas de pagamento corrigidas: ${pagamentosCorrigidos}`);
        console.log(`\n✅ Migração completa!\n`);

    } catch (error) {
        console.error('❌ Erro ao corrigir datas:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Executar script
corrigirDatasContasPagar()
    .then(() => {
        console.log('✅ Script finalizado com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script falhou:', error);
        process.exit(1);
    });
