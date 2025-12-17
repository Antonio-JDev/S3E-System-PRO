import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { CryptoUtil } from '../utils/crypto.util';

const prisma = new PrismaClient();
const CERTIFICADOS_DIR = path.join(process.cwd(), 'data', 'certificados');

// Garantir que o diretório existe
const ensureCertificadosDir = async () => {
  try {
    await fs.mkdir(CERTIFICADOS_DIR, { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretório de certificados:', error);
  }
};

// Listar configurações fiscais
export const getConfiguracoes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const configuracoes = await prisma.empresaFiscal.findMany({
      select: {
        id: true,
        cnpj: true,
        inscricaoEstadual: true,
        razaoSocial: true,
        nomeFantasia: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        email: true,
        regimeTributario: true,
        certificadoValidade: true,
        ativo: true,
        createdAt: true
        // NÃO expor certificadoPath nem certificadoSenha
      },
      orderBy: { razaoSocial: 'asc' }
    });

    res.json(configuracoes);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações fiscais' });
  }
};

// Buscar configuração por ID
export const getConfiguracaoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const config = await prisma.empresaFiscal.findUnique({
      where: { id },
      select: {
        id: true,
        cnpj: true,
        inscricaoEstadual: true,
        razaoSocial: true,
        nomeFantasia: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        email: true,
        regimeTributario: true,
        certificadoValidade: true,
        ativo: true
      }
    });

    if (!config) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
};

// Criar configuração fiscal
export const createConfiguracao = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      cnpj,
      inscricaoEstadual,
      razaoSocial,
      nomeFantasia,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      telefone,
      email,
      regimeTributario,
      certificadoBase64,
      certificadoSenha
    } = req.body;

    // Verificar se CNPJ já existe
    const exists = await prisma.empresaFiscal.findUnique({
      where: { cnpj }
    });

    if (exists) {
      res.status(400).json({ error: 'CNPJ já cadastrado' });
      return;
    }

    let certificadoPath = null;
    let certificadoSenhaCriptografada = null;
    let certificadoValidade = null;

    // Processar certificado se fornecido
    if (certificadoBase64 && certificadoSenha) {
      await ensureCertificadosDir();

      // Criar nome único para o arquivo
      const fileName = `${cnpj.replace(/\D/g, '')}_${Date.now()}.pfx`;
      certificadoPath = path.join(CERTIFICADOS_DIR, fileName);

      // Decodificar base64 e salvar arquivo
      const buffer = Buffer.from(certificadoBase64, 'base64');
      await fs.writeFile(certificadoPath, buffer);

      // Criptografar senha do certificado usando AES (reversível)
      certificadoSenhaCriptografada = CryptoUtil.encrypt(certificadoSenha);

      // TODO: Extrair data de validade do certificado usando node-forge ou similar
      // Por enquanto, definir validade padrão de 1 ano
      certificadoValidade = new Date();
      certificadoValidade.setFullYear(certificadoValidade.getFullYear() + 1);
    }

    const config = await prisma.empresaFiscal.create({
      data: {
        cnpj,
        inscricaoEstadual,
        razaoSocial,
        nomeFantasia,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        telefone,
        email,
        regimeTributario,
        certificadoPath,
        certificadoSenha: certificadoSenhaCriptografada,
        certificadoValidade
      }
    });

    // Retornar sem dados sensíveis
    const { certificadoSenha: _, ...configSafe } = config as any;
    res.status(201).json(configSafe);
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    res.status(500).json({ error: 'Erro ao criar configuração fiscal' });
  }
};

// Atualizar configuração
export const updateConfiguracao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      inscricaoEstadual,
      razaoSocial,
      nomeFantasia,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      telefone,
      email,
      regimeTributario,
      certificadoBase64,
      certificadoSenha,
      ativo
    } = req.body;

    const dataToUpdate: any = {
      inscricaoEstadual,
      razaoSocial,
      nomeFantasia,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      telefone,
      email,
      regimeTributario,
      ativo
    };

    // Atualizar certificado se fornecido
    if (certificadoBase64 && certificadoSenha) {
      await ensureCertificadosDir();

      const config = await prisma.empresaFiscal.findUnique({ where: { id } });
      if (!config) {
        res.status(404).json({ error: 'Configuração não encontrada' });
        return;
      }

      // Deletar certificado antigo se existir
      if (config.certificadoPath) {
        try {
          await fs.unlink(config.certificadoPath);
        } catch (error) {
          console.error('Erro ao deletar certificado antigo:', error);
        }
      }

      // Salvar novo certificado
      const fileName = `${config.cnpj.replace(/\D/g, '')}_${Date.now()}.pfx`;
      const certificadoPath = path.join(CERTIFICADOS_DIR, fileName);
      const buffer = Buffer.from(certificadoBase64, 'base64');
      await fs.writeFile(certificadoPath, buffer);

      dataToUpdate.certificadoPath = certificadoPath;
      dataToUpdate.certificadoSenha = CryptoUtil.encrypt(certificadoSenha);
      
      // Atualizar validade
      const certificadoValidade = new Date();
      certificadoValidade.setFullYear(certificadoValidade.getFullYear() + 1);
      dataToUpdate.certificadoValidade = certificadoValidade;
    }

    const updated = await prisma.empresaFiscal.update({
      where: { id },
      data: dataToUpdate
    });

    const { certificadoSenha: _, ...configSafe } = updated as any;
    res.json(configSafe);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
};

// Deletar configuração
export const deleteConfiguracao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const config = await prisma.empresaFiscal.findUnique({ where: { id } });
    if (!config) {
      res.status(404).json({ error: 'Configuração não encontrada' });
      return;
    }

    // Deletar arquivo do certificado se existir
    if (config.certificadoPath) {
      try {
        await fs.unlink(config.certificadoPath);
      } catch (error) {
        console.error('Erro ao deletar certificado:', error);
      }
    }

    await prisma.empresaFiscal.delete({ where: { id } });

    res.json({ message: 'Configuração deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar configuração:', error);
    res.status(500).json({ error: 'Erro ao deletar configuração' });
  }
};

