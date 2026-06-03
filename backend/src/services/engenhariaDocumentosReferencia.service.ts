import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

export async function listarDocumentosUsuario(userId: string) {
  return prisma.engenhariaDocumentoReferencia.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function criarDocumentoUsuario(
  userId: string,
  data: {
    titulo: string;
    categoria: string;
    nome: string;
    nomeArquivo: string;
    url: string;
    tamanho: number;
    mimeType: string;
  },
) {
  return prisma.engenhariaDocumentoReferencia.create({
    data: {
      userId,
      titulo: data.titulo,
      categoria: data.categoria,
      nome: data.nome,
      nomeArquivo: data.nomeArquivo,
      url: data.url,
      tamanho: data.tamanho,
      mimeType: data.mimeType,
    },
  });
}

export async function obterDocumentoUsuario(userId: string, documentoId: string) {
  const doc = await prisma.engenhariaDocumentoReferencia.findUnique({
    where: { id: documentoId },
  });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

export function resolverCaminhoArquivoDocumento(nomeArquivo: string): string {
  const cwd = process.cwd();
  return path.join(cwd, 'uploads', 'engenharia-referencias', nomeArquivo);
}

export async function deletarDocumentoUsuario(userId: string, documentoId: string) {
  const doc = await obterDocumentoUsuario(userId, documentoId);
  if (!doc) return false;

  const filePath = resolverCaminhoArquivoDocumento(doc.nomeArquivo);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.engenhariaDocumentoReferencia.delete({ where: { id: documentoId } });
  return true;
}
