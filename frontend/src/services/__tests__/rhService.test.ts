/**
 * Vitest — rhService (gerenciamentoService): rotas RH / ponto.
 * Rodar: npm run test:run -- rhService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rhService } from '../gerenciamentoService';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    upload: (...args: unknown[]) => mockUpload(...args),
  },
}));

describe('rhService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ success: true, data: {} });
    mockPut.mockResolvedValue({ success: true, data: {} });
    mockPost.mockResolvedValue({ success: true, data: {} });
    mockDelete.mockResolvedValue({ success: true });
    mockUpload.mockResolvedValue({ success: true, data: { importados: 1 } });
  });

  it('buscarConfigPonto chama GET /api/rh/config-ponto/:id', async () => {
    await rhService.buscarConfigPonto('fid-1');
    expect(mockGet).toHaveBeenCalledWith('/api/rh/config-ponto/fid-1');
  });

  it('salvarConfigPonto chama PUT com corpo', async () => {
    await rhService.salvarConfigPonto('fid-1', {
      trabalhaFimDeSemana: true,
      valorHoraFimDeSemana: 55,
    });
    expect(mockPut).toHaveBeenCalledWith('/api/rh/config-ponto/fid-1', {
      trabalhaFimDeSemana: true,
      valorHoraFimDeSemana: 55,
    });
  });

  it('listarLancamentos envia query params', async () => {
    await rhService.listarLancamentos('f1', 2026, 3);
    expect(mockGet).toHaveBeenCalledWith('/api/rh/lancamentos', {
      funcionarioId: 'f1',
      ano: 2026,
      mes: 3,
    });
  });

  it('criarLancamento faz POST /api/rh/lancamentos', async () => {
    await rhService.criarLancamento({
      funcionarioId: 'f1',
      referenciaAno: 2026,
      referenciaMes: 4,
      categoria: 'FALTA',
      valor: 100,
      descricao: 'teste',
    });
    expect(mockPost).toHaveBeenCalledWith('/api/rh/lancamentos', {
      funcionarioId: 'f1',
      referenciaAno: 2026,
      referenciaMes: 4,
      categoria: 'FALTA',
      valor: 100,
      descricao: 'teste',
    });
  });

  it('excluirLancamento faz DELETE', async () => {
    await rhService.excluirLancamento('lan-99');
    expect(mockDelete).toHaveBeenCalledWith('/api/rh/lancamentos/lan-99');
  });

  it('sincronizarParcelaFolha faz POST /api/rh/sincronizar-parcela', async () => {
    await rhService.sincronizarParcelaFolha({
      funcionarioId: 'f1',
      referenciaAno: 2026,
      referenciaMes: 3,
    });
    expect(mockPost).toHaveBeenCalledWith('/api/rh/sincronizar-parcela', {
      funcionarioId: 'f1',
      referenciaAno: 2026,
      referenciaMes: 3,
    });
  });

  it('importarPresencaXls usa upload com FormData e ano/mês', async () => {
    const file = new File(['x'], 'presenca.xls', { type: 'application/vnd.ms-excel' });
    await rhService.importarPresencaXls(file, 2026, 3);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [url, fd] = mockUpload.mock.calls[0];
    expect(url).toBe('/api/ponto/importar-presenca');
    expect(fd).toBeInstanceOf(FormData);
    expect((fd as FormData).get('file')).toBe(file);
    expect((fd as FormData).get('ano')).toBe('2026');
    expect((fd as FormData).get('mes')).toBe('3');
  });
});
