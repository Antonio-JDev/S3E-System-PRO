/**
 * Épico 3 — projetosService.buscarPorTermo (search OS na compra avulsa)
 * Rodar: npm run test:run -- projetosService.busca.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projetosService } from '../projetosService';

const mockGet = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('../../config/api', () => ({
  ENDPOINTS: { PROJETOS: '/api/projetos' },
}));

describe('projetosService.buscarPorTermo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama GET /api/projetos/busca com q e limit', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [{ id: 'p1', titulo: 'OS Teste', numeroOs: 'OS-100' }],
    });

    await projetosService.buscarPorTermo('100', 15);

    expect(mockGet).toHaveBeenCalledWith('/api/projetos/busca', { q: '100', limit: 15 });
  });

  it('usa limit padrão 20', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    await projetosService.buscarPorTermo('cliente');
    expect(mockGet).toHaveBeenCalledWith('/api/projetos/busca', { q: 'cliente', limit: 20 });
  });
});
