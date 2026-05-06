// Verificação TLS: padrão ativada ('1'). Worker usa mesmo CA ICP-Brasil que o app.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
}

import * as fs from 'fs';
import { prisma } from '../lib/prisma';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSoapService } from '../services/nfe-soap.service';
import { NFeSignatureService } from '../services/nfe-signature.service';
import { NFeProcNFeUtil } from '../utils/nfe-procnfe.util';
import NFeFilaService from '../services/nfe-fila.service';
import NFeAuditService from '../services/nfe-audit.service';

/**
 * Worker simples para reprocessar a fila de NF-e em contingência.
 * Idealmente chamado por um job/cron a cada X minutos.
 */
export async function processarFilaNFe(limit = 10) {
  const pendentes = await NFeFilaService.listarPendentes(limit);

  if (pendentes.length === 0) {
    console.log('📭 Fila de NF-e vazia (nenhum item pendente).');
    return;
  }

  console.log(`📦 Processando ${pendentes.length} NF-es em contingência...`);

  for (const item of pendentes) {
    console.log(`➡️ Reenviando NF-e da fila: ${item.id} (notaFiscalId=${item.notaFiscalId})`);

    try {
      // Auditoria/Evento: JOB iniciado para este item
      try {
        if (item.notaFiscalId) {
          await prisma.nfeEvento.create({
            data: {
              notaFiscalId: item.notaFiscalId,
              tipo: 'INFO',
              descricao: 'JOB de Reenvio iniciado'
            }
          });
        }
      } catch (logErr) {
        console.warn('⚠️ Falha ao registrar evento NFe (JOB iniciado):', logErr);
      }

      // Buscar empresa fiscal e certificado
      if (!item.empresaFiscalId) {
        console.warn(`⚠️ Item de fila ${item.id} sem empresaFiscalId. Marcando como FALHA.`);
        await NFeFilaService.atualizarStatus(item.id, 'FALHA', {
          erro: 'Item de fila sem empresaFiscalId'
        });
        continue;
      }

      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: item.empresaFiscalId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        console.warn(
          `⚠️ Empresa fiscal não encontrada ou sem certificado para item de fila ${item.id}.`
        );
        await NFeFilaService.atualizarStatus(item.id, 'FALHA', {
          erro: 'Empresa fiscal não encontrada ou sem certificado'
        });
        continue;
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        console.warn(`⚠️ Arquivo de certificado não encontrado para item de fila ${item.id}.`);
        await NFeFilaService.atualizarStatus(item.id, 'FALHA', {
          erro: 'Arquivo de certificado não encontrado. Reenvie o certificado pela interface.'
        });
        continue;
      }

      // Descriptografar senha
      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado da fila:', error);
        await NFeFilaService.atualizarStatus(item.id, 'FALHA', {
          erro: 'Senha do certificado inválida para reenvio em contingência'
        });
        continue;
      }

      // Carregar certificado em PEM
      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      // Atualizar status para ENVIANDO
      await NFeFilaService.atualizarStatus(item.id, 'ENVIANDO');

      // Reenviar para SEFAZ (respeitando o modo de envio da fila: NORMAL / SVC-AN / SVC-RS)
      const resultado = await NFeSoapService.autorizarNFe(
        item.xmlAssinado,
        item.ambiente as '1' | '2',
        cert,
        key,
        (item.modo as any) || 'NORMAL'
      );

      if (!resultado.sucesso) {
        console.warn(
          `⚠️ Falha ao reenviar NF-e da fila ${item.id}: ${resultado.erro || 'Erro desconhecido'}`
        );

        // Registrar evento: SEFAZ ainda indisponível / agendamento
        try {
          if (item.notaFiscalId) {
            await prisma.nfeEvento.create({
              data: {
                notaFiscalId: item.notaFiscalId,
                tipo: 'ERRO',
                descricao: 'SEFAZ ainda indisponível. Próxima tentativa agendada',
                metadata: { erro: resultado.erro || null }
              }
            });
          }
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar evento NFe (SEFAZ indisponível):', logErr);
        }

        // Backoff simples: +15 minutos
        const proximaTentativa = new Date(Date.now() + 15 * 60 * 1000);

        await NFeFilaService.atualizarStatus(item.id, 'PENDENTE', {
          erro: resultado.erro || 'Erro ao reenviar NF-e em contingência',
          proximaTentativa
        });

        // Auditoria: falha no reenvio em contingência
        await NFeAuditService.registrarEvento({
          action: 'NFE_CONTINGENCIA_REENVIO_FALHA',
          description: 'Falha ao reenviar NF-e em contingência',
          notaFiscalId: item.notaFiscalId || undefined,
          empresaFiscalId: item.empresaFiscalId || undefined,
          ambiente: item.ambiente as '1' | '2',
          status: 'FALHA',
          metadata: {
            filaId: item.id,
            erro: resultado.erro || 'Erro desconhecido',
            modoEnvio: item.modo
          }
        });
        continue;
      }

      // Atualizar NotaFiscal associada, se houver
      if (item.notaFiscalId && resultado.protocolo) {
        try {
          // Extrair chave de acesso e gerar procNFe completo
          const dadosProtocolo = NFeProcNFeUtil.extrairDadosProtocolo(resultado.protocolo);
          const chaveAcesso = dadosProtocolo.chaveAcesso;
          
          // Gerar procNFe completo (XML original + protocolo)
          const procNFe = NFeProcNFeUtil.gerarProcNFe(item.xmlAssinado, resultado.protocolo);

          await prisma.notaFiscal.update({
            where: { id: item.notaFiscalId },
            data: {
              status: 'Autorizada',
              chaveAcesso: chaveAcesso || undefined,
              xmlNFe: procNFe || undefined
            }
          });
          // Registrar evento: nota autorizada via JOB
          try {
            await prisma.nfeEvento.create({
              data: {
                notaFiscalId: item.notaFiscalId,
                tipo: 'SUCESSO',
                descricao: 'Nota Autorizada com Sucesso via JOB',
                metadata: { protocolo: resultado.protocolo }
              }
            });
          } catch (logErr) {
            console.warn('⚠️ Falha ao registrar evento NFe (autorizada via JOB):', logErr);
          }
        } catch (nfError: any) {
          console.warn(
            `⚠️ Não foi possível atualizar NotaFiscal após reenvio (id=${item.notaFiscalId}):`,
            nfError.message
          );
        }
      }

      // Marcar como ENVIADA
      await NFeFilaService.atualizarStatus(item.id, 'ENVIADA');
      console.log(`✅ NF-e da fila ${item.id} reenviada com sucesso.`);

      // Remover item da fila para limpeza
      try {
        await NFeFilaService.remover(item.id);
      } catch (remErr) {
        console.warn('⚠️ Falha ao remover item da fila após sucesso:', remErr);
      }

      // Auditoria: reenvio bem-sucedido em contingência
      await NFeAuditService.registrarEvento({
        action: 'NFE_CONTINGENCIA_REENVIO_SUCESSO',
        description: 'NF-e reenviada com sucesso a partir da fila de contingência',
        notaFiscalId: item.notaFiscalId || undefined,
        empresaFiscalId: item.empresaFiscalId || undefined,
        ambiente: item.ambiente as '1' | '2',
        status: 'Autorizada',
        metadata: {
          filaId: item.id,
          modoEnvio: item.modo,
          resultado
        }
      });
    } catch (error: any) {
      console.error(`❌ Erro inesperado ao processar item de fila ${item.id}:`, error);

      const proximaTentativa = new Date(Date.now() + 30 * 60 * 1000);

      await NFeFilaService.atualizarStatus(item.id, 'PENDENTE', {
        erro: error.message || 'Erro inesperado no worker de fila',
        proximaTentativa
      });

      // Auditoria: erro inesperado no worker
      await NFeAuditService.registrarEvento({
        action: 'NFE_CONTINGENCIA_REENVIO_FALHA',
        description: 'Erro inesperado no worker de reenvio de NF-e em contingência',
        notaFiscalId: item.notaFiscalId || undefined,
        empresaFiscalId: item.empresaFiscalId || undefined,
        ambiente: item.ambiente as '1' | '2',
        status: 'FALHA',
        metadata: {
          filaId: item.id,
          erro: error.message || 'Erro inesperado',
          stack: error.stack || undefined
        }
      });
    }
  }
}

export default {
  processarFilaNFe
};


