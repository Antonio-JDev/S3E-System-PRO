import * as fs from 'fs';
import { prisma } from '../lib/prisma';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSignatureService } from '../services/nfe-signature.service';
import { NfseFilaService } from '../services/nfse-fila.service';
import { recepcionarLoteRps } from '../services/nfse-publica-soap.service';

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

      // 3. Enviar
      await NfseFilaService.atualizarStatus(item.id, 'ENVIANDO');

      const resultado = await recepcionarLoteRps(
        item.xmlEnvio,
        item.ambiente === '2',
        cert,
        key
      );

      if (resultado.sucesso && resultado.protocolo) {
        // Sucesso
        console.log(`✅ NFS-e da fila ${item.id} enviada. Protocolo: ${resultado.protocolo}`);
        
        await NfseFilaService.atualizarStatus(item.id, 'ENVIADA');

        // Atualizar tabela Nfse se existir registro para esse lote
        const nfseExistente = await prisma.nfse.findFirst({
            where: {
                empresaFiscalId: item.empresaFiscalId,
                numeroLote: item.numeroLote
            }
        });

        if (nfseExistente) {
             await prisma.nfse.update({
                where: { id: nfseExistente.id },
                data: {
                    protocolo: resultado.protocolo,
                    situacao: 'Pendente', // Aguardando consulta
                    xmlEnvio: item.xmlEnvio,
                    xmlResposta: resultado.xmlResposta
                }
             });
        } else {
            // Cria um registro se não existir
            await prisma.nfse.create({
                data: {
                    empresaFiscalId: item.empresaFiscalId,
                    numeroLote: item.numeroLote,
                    protocolo: resultado.protocolo,
                    situacao: 'Pendente',
                    ambiente: item.ambiente,
                    xmlEnvio: item.xmlEnvio,
                    xmlResposta: resultado.xmlResposta
                }
            });
        }

      } else {
        // Falha no envio SOAP
        console.warn(`⚠️ Falha ao reenviar NFS-e da fila ${item.id}: ${resultado.erro}`);
        const proximaTentativa = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await NfseFilaService.atualizarStatus(item.id, 'PENDENTE', {
          erro: resultado.erro,
          proximaTentativa
        });
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
