/**
 * Testes do módulo CRM - AtendimentoCrmController (Funil de Atendimento)
 * Rodar: npm test -- atendimentoCrmController.test.ts
 */

import { Request, Response } from 'express';

jest.mock('@prisma/client', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const del = jest.fn();
  const PrismaClient = jest.fn().mockImplementation(() => ({
    contatoLead: { findMany, findUnique, create, update, delete: del },
  }));
  (PrismaClient as any).__mocks = { findMany, findUnique, create, update, delete: del };
  return { PrismaClient };
});

import * as atendimentoCrmController from './atendimentoCrmController';

const { PrismaClient } = require('@prisma/client');
const mocks = (PrismaClient as any).__mocks as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

describe('atendimentoCrmController (Funil de Atendimento)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
  });

  describe('list', () => {
    it('deve retornar lista de leads quando o banco retorna dados', async () => {
      const leads = [
        {
          id: 'lead-1',
          nome: 'Cliente Teste',
          whatsapp: '11999999999',
          status: 'AGUARDANDO_DOCUMENTO',
          etapa: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cliente: null,
        },
      ];
      mocks.findMany.mockResolvedValue(leads);
      mockReq = { query: {} };

      await atendimentoCrmController.list(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: {
            cliente: { select: { id: true, nome: true, cpfCnpj: true } },
            _count: { select: { orcamentos: true } },
          },
          orderBy: { updatedAt: 'desc' },
        })
      );
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: leads });
    });

    it('deve filtrar por status quando query.status é informado', async () => {
      mocks.findMany.mockResolvedValue([]);
      mockReq = { query: { status: 'EM_ANALISE_TECNICA' } };

      await atendimentoCrmController.list(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'EM_ANALISE_TECNICA' },
        })
      );
    });

    it('deve retornar 500 quando o banco lança erro', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mocks.findMany.mockRejectedValue(new Error('DB error'));
      mockReq = { query: {} };

      await atendimentoCrmController.list(
        mockReq as Request,
        mockRes as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.any(String) })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getById', () => {
    it('deve retornar 404 quando lead não existe', async () => {
      mocks.findUnique.mockResolvedValue(null);
      mockReq = { params: { id: 'id-inexistente' } };

      await atendimentoCrmController.getById(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'id-inexistente' } })
      );
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Lead não encontrado' });
    });

    it('deve retornar lead quando encontrado', async () => {
      const lead = {
        id: 'lead-1',
        nome: 'Lead Teste',
        status: 'PRONTO_PARA_ORCAR',
        etapa: 3,
        cliente: { id: 'cli-1', nome: 'Cliente', cpfCnpj: '12345678000199' },
      };
      mocks.findUnique.mockResolvedValue(lead);
      mockReq = { params: { id: 'lead-1' } };

      await atendimentoCrmController.getById(
        mockReq as Request,
        mockRes as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: lead });
    });
  });

  describe('create', () => {
    it('deve retornar 400 quando nome está vazio', async () => {
      mockReq = { body: { nome: '   ' } };

      await atendimentoCrmController.create(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.create).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Nome é obrigatório' });
    });

    it('deve criar lead e retornar 201 com dados', async () => {
      const created = {
        id: 'lead-new',
        nome: 'Novo Lead',
        whatsapp: '11988887777',
        status: 'AGUARDANDO_DOCUMENTO',
        etapa: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mocks.create.mockResolvedValue(created);
      mockReq = {
        body: {
          nome: 'Novo Lead',
          whatsapp: '11988887777',
          necessidade: 'Energia solar',
        },
      };

      await atendimentoCrmController.create(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nome: 'Novo Lead',
            whatsapp: '11988887777',
            necessidade: 'Energia solar',
            status: 'AGUARDANDO_DOCUMENTO',
            etapa: 1,
          }),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: created });
    });
  });

  describe('update', () => {
    it('deve retornar 404 quando lead não existe (P2025)', async () => {
      const err = new Error('Record not found');
      (err as any).code = 'P2025';
      mocks.update.mockRejectedValue(err);
      mockReq = { params: { id: 'id-inex' }, body: { nome: 'Atualizado' } };

      await atendimentoCrmController.update(
        mockReq as Request,
        mockRes as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Lead não encontrado' });
    });

    it('deve atualizar lead e retornar dados', async () => {
      const updated = {
        id: 'lead-1',
        nome: 'Lead Atualizado',
        status: 'EM_ANALISE_TECNICA',
        etapa: 2,
        viabilidadeTecnica: true,
      };
      mocks.update.mockResolvedValue(updated);
      mockReq = {
        params: { id: 'lead-1' },
        body: { nome: 'Lead Atualizado', etapa: 2, viabilidadeTecnica: true },
      };

      await atendimentoCrmController.update(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.update).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('deve retornar 404 quando lead não existe', async () => {
      mocks.findUnique.mockResolvedValue(null);
      mockReq = { params: { id: 'id-inex' } };

      await atendimentoCrmController.remove(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 'id-inex' } });
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Lead não encontrado' });
    });

    it('deve excluir lead e retornar success', async () => {
      mocks.findUnique.mockResolvedValue({
        id: 'lead-1',
        contaEnergiaUrl: null,
        anexosUrls: null,
      });
      mocks.delete.mockResolvedValue(undefined);
      mockReq = { params: { id: 'lead-1' } };

      await atendimentoCrmController.remove(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Lead excluído',
      });
    });
  });

  describe('uploadContaEnergiaHandler', () => {
    it('deve retornar 400 quando não há arquivo', async () => {
      mockReq = { params: { id: 'lead-1' }, files: [] };

      await atendimentoCrmController.uploadContaEnergiaHandler(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.update).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Nenhum arquivo enviado' });
    });

    it('deve acrescentar anexo em anexosUrls e retornar lead', async () => {
      const leadUpdated = {
        id: 'lead-1',
        nome: 'Lead',
        contaEnergiaUrl: '/uploads/contato-lead/conta-123.pdf',
        anexosUrls: ['/uploads/contato-lead/conta-123.pdf'],
      };
      mocks.findUnique.mockResolvedValue({
        id: 'lead-1',
        nome: 'Lead',
        contaEnergiaUrl: null,
        anexosUrls: null,
      });
      mocks.update.mockResolvedValue(leadUpdated);
      mockReq = {
        params: { id: 'lead-1' },
        files: [{ filename: 'conta-123.pdf' } as Express.Multer.File],
      };

      await atendimentoCrmController.uploadContaEnergiaHandler(
        mockReq as Request,
        mockRes as Response
      );

      expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
      expect(mocks.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          anexosUrls: ['/uploads/contato-lead/conta-123.pdf'],
          contaEnergiaUrl: '/uploads/contato-lead/conta-123.pdf',
        },
      });
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: leadUpdated });
    });
  });
});
