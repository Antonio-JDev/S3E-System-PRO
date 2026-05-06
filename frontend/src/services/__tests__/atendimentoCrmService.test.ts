/**
 * Testes do módulo CRM (Funil de Atendimento) - frontend - Vitest
 * Rodar: npm run test -- atendimentoCrmService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { atendimentoCrmService } from '../atendimentoCrmService';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('atendimentoCrmService (Funil de Atendimento)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listar', () => {
    it('deve chamar GET /api/atendimento-crm e retornar data', async () => {
      const leads = [
        {
          id: 'lead-1',
          nome: 'Lead Teste',
          status: 'AGUARDANDO_DOCUMENTO',
          etapa: 1,
          createdAt: '2026-03-09T12:00:00Z',
          updatedAt: '2026-03-09T12:00:00Z',
        },
      ];
      mockGet.mockResolvedValue({ success: true, data: leads });

      const result = await atendimentoCrmService.listar();

      expect(mockGet).toHaveBeenCalledWith('/api/atendimento-crm');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(leads);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].nome).toBe('Lead Teste');
    });

    it('deve enviar query params quando filters são passados', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await atendimentoCrmService.listar({ status: 'EM_ANALISE_TECNICA', etapa: 2 });

      expect(mockGet).toHaveBeenCalledWith(
        '/api/atendimento-crm?status=EM_ANALISE_TECNICA&etapa=2'
      );
    });
  });

  describe('getById', () => {
    it('deve chamar GET /api/atendimento-crm/:id e retornar lead', async () => {
      const lead = {
        id: 'lead-1',
        nome: 'Cliente CRM',
        cpfCnpj: '12345678000199',
        status: 'PRONTO_PARA_ORCAR',
        etapa: 3,
        createdAt: '2026-03-09T12:00:00Z',
        updatedAt: '2026-03-09T12:00:00Z',
      };
      mockGet.mockResolvedValue({ data: { success: true, data: lead } });

      const result = await atendimentoCrmService.getById('lead-1');

      expect(mockGet).toHaveBeenCalledWith('/api/atendimento-crm/lead-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(lead);
      expect(result.data!.nome).toBe('Cliente CRM');
    });
  });

  describe('criar', () => {
    it('deve chamar POST /api/atendimento-crm com body e retornar lead criado', async () => {
      const created = {
        id: 'lead-new',
        nome: 'Novo Lead',
        whatsapp: '11999998888',
        status: 'AGUARDANDO_DOCUMENTO',
        etapa: 1,
        createdAt: '2026-03-09T12:00:00Z',
        updatedAt: '2026-03-09T12:00:00Z',
      };
      mockPost.mockResolvedValue({ data: { success: true, data: created } });

      const result = await atendimentoCrmService.criar({
        nome: 'Novo Lead',
        whatsapp: '11999998888',
        necessidade: 'Energia solar',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/atendimento-crm', {
        nome: 'Novo Lead',
        whatsapp: '11999998888',
        necessidade: 'Energia solar',
      });
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('lead-new');
      expect(result.data!.nome).toBe('Novo Lead');
    });
  });

  describe('atualizar', () => {
    it('deve chamar PUT /api/atendimento-crm/:id com body e retornar lead atualizado', async () => {
      const updated = {
        id: 'lead-1',
        nome: 'Lead Atualizado',
        status: 'EM_ANALISE_TECNICA',
        etapa: 2,
        viabilidadeTecnica: true,
        createdAt: '2026-03-09T12:00:00Z',
        updatedAt: '2026-03-09T12:05:00Z',
      };
      mockPut.mockResolvedValue({ data: { success: true, data: updated } });

      const result = await atendimentoCrmService.atualizar('lead-1', {
        nome: 'Lead Atualizado',
        etapa: 2,
        viabilidadeTecnica: true,
      });

      expect(mockPut).toHaveBeenCalledWith('/api/atendimento-crm/lead-1', {
        nome: 'Lead Atualizado',
        etapa: 2,
        viabilidadeTecnica: true,
      });
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('EM_ANALISE_TECNICA');
    });
  });

  describe('uploadContaEnergia', () => {
    it('deve chamar POST /api/atendimento-crm/:id/upload-conta com FormData (vários arquivos)', async () => {
      const file = new File(['conteudo'], 'conta.pdf', { type: 'application/pdf' });
      const lead = {
        id: 'lead-1',
        nome: 'Lead',
        contaEnergiaUrl: '/uploads/contato-lead/conta-123.pdf',
        anexosUrls: ['/uploads/contato-lead/conta-123.pdf'],
        createdAt: '2026-03-09T12:00:00Z',
        updatedAt: '2026-03-09T12:00:00Z',
      };
      mockPost.mockResolvedValue({ success: true, data: lead });

      const result = await atendimentoCrmService.uploadContaEnergia('lead-1', [file]);

      expect(mockPost).toHaveBeenCalledWith('/api/atendimento-crm/lead-1/upload-conta', expect.any(FormData));
      const formData = mockPost.mock.calls[0][1] as FormData;
      expect(formData.get('contaEnergia')).toBe(file);
      expect(result.success).toBe(true);
      expect(result.data!.contaEnergiaUrl).toBe('/uploads/contato-lead/conta-123.pdf');
    });
  });

  describe('excluir', () => {
    it('deve chamar DELETE /api/atendimento-crm/:id e retornar success', async () => {
      mockDelete.mockResolvedValue({ success: true });

      const result = await atendimentoCrmService.excluir('lead-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/atendimento-crm/lead-1');
      expect(result.success).toBe(true);
    });
  });
});
