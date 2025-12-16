import { PrismaClient } from '@prisma/client';
import { CryptoUtil } from '../utils/crypto.util';
import { NFeSoapService } from '../services/nfe-soap.service';
import NFeFilaService from '../services/nfe-fila.service';
import NFeAuditService from '../services/nfe-audit.service';

const prisma = new PrismaClient();

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
      const pfxPath = empresa.certificadoPath;
      const { key, cert } = require('../services/nfe-signature.service').NFeSignatureService.carregarCertificado(
        pfxPath,
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
      if (item.notaFiscalId) {
        try {
          await prisma.notaFiscal.update({
            where: { id: item.notaFiscalId },
            data: {
              status: 'Autorizada',
              chaveAcesso: resultado.protocolo || undefined,
              xmlNFe: resultado.protocolo || undefined
            }
          });
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


