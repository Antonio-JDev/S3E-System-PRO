import * as fs from 'fs';
import { prisma } from '../lib/prisma';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSignatureService } from '../services/nfe-signature.service';
import { NfseFilaService } from '../services/nfse-fila.service';
import { enviarDpsAssinada } from '../services/nfse-nacional-api.service';

export async function processarFilaNfse(limit = 10) {
  const pendentes = await NfseFilaService.listarPendentes(limit);

  if (pendentes.length === 0) {
    return;
  }

  console.log(`📦 Processando ${pendentes.length} NFS-es em contingência...`);

  for (const item of pendentes) {
    console.log(`➡️ Reenviando NFS-e da fila: ${item.id} (Lote=${item.numeroLote})`);

    try {
      // 1. Carregar empresa fiscal
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: item.empresaFiscalId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        console.warn(`⚠️ Empresa fiscal não encontrada ou sem certificado (Item ${item.id}).`);
        await NfseFilaService.atualizarStatus(item.id, 'FALHA', { erro: 'Empresa sem certificado' });
        continue;
      }

      // 2. Resolver certificado
      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        await NfseFilaService.atualizarStatus(item.id, 'FALHA', { erro: 'Arquivo de certificado não encontrado' });
        continue;
      }

      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        await NfseFilaService.atualizarStatus(item.id, 'FALHA', { erro: 'Senha do certificado inválida' });
        continue;
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      const xmlNacional = item.xmlEnvio.includes('http://www.sped.fazenda.gov.br/nfse');
      if (!xmlNacional) {
        await NfseFilaService.atualizarStatus(item.id, 'FALHA', {
          erro: 'Lote da Pública não é mais recebido em Itajaí. Desde 01/07/2026 a emissão é exclusiva pelo Sistema Nacional.'
        });
        continue;
      }

      await NfseFilaService.atualizarStatus(item.id, 'ENVIANDO');

      const resultado = await enviarDpsAssinada(
        item.xmlEnvio,
        item.ambiente === '1' ? '1' : '2',
        cert,
        key
      );

      if (resultado.sucesso && (resultado.chaveAcesso || resultado.idDps)) {
        console.log(`NFS-e nacional da fila ${item.id} autorizada. Chave: ${resultado.chaveAcesso || '-'}`);
        await NfseFilaService.atualizarStatus(item.id, 'ENVIADA');

        const nfseExistente = await prisma.nfse.findFirst({
          where: {
            empresaFiscalId: item.empresaFiscalId,
            numeroLote: item.numeroLote
          },
          orderBy: { createdAt: 'desc' }
        });

        const dadosNota = {
          protocolo: resultado.idDps || undefined,
          chaveAcesso: resultado.chaveAcesso,
          numeroNfse: resultado.numeroNfse,
          situacao: 'Processado',
          xmlEnvio: item.xmlEnvio,
          xmlResposta: resultado.xmlRetorno,
          erro: null
        };

        if (nfseExistente) {
          await prisma.nfse.update({
            where: { id: nfseExistente.id },
            data: dadosNota
          });
        } else {
          await prisma.nfse.create({
            data: {
              empresaFiscalId: item.empresaFiscalId,
              numeroLote: item.numeroLote,
              ambiente: item.ambiente,
              ...dadosNota
            }
          });
        }
      } else {
        console.warn(`Falha ao reenviar NFS-e da fila ${item.id}: ${resultado.erro}`);
        if (resultado.reenviar) {
          const proximaTentativa = new Date(Date.now() + 15 * 60 * 1000);
          await NfseFilaService.atualizarStatus(item.id, 'PENDENTE', {
            erro: resultado.erro,
            proximaTentativa
          });
        } else {
          await NfseFilaService.atualizarStatus(item.id, 'FALHA', { erro: resultado.erro });
        }
      }

    } catch (error: any) {
      console.error(`❌ Erro inesperado worker NFS-e fila ${item.id}:`, error);
      const proximaTentativa = new Date(Date.now() + 30 * 60 * 1000);
      await NfseFilaService.atualizarStatus(item.id, 'PENDENTE', {
        erro: error.message,
        proximaTentativa
      });
    }
  }
}
