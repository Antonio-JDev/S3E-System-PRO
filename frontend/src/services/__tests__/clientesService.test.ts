import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clientesService } from '../clientesService';

const mockGet = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('clientesService.listar — parâmetro busca para API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ success: true, data: [] });
  });

  it('envia search como busca no query string (correção PayloadTooLarge indireta na busca do drawer)', async () => {
    await clientesService.listar({ search: 'jorge' });

    expect(mockGet).toHaveBeenCalledWith('/api/clientes', { busca: 'jorge' });
  });

  it('não envia busca vazia', async () => {
    await clientesService.listar({ search: '   ' });

    expect(mockGet).toHaveBeenCalledWith('/api/clientes', {});
  });
});
