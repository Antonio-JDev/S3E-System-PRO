import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ordemServicosService } from '../ordemServicosService';
import { axiosApiService } from '../axiosApi';

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: vi.fn(),
  },
}));

describe('ordemServicosService.getCockpitResumo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna mapa vazio sem chamar API quando ids vazio', async () => {
    const res = await ordemServicosService.getCockpitResumo([]);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({});
    expect(axiosApiService.get).not.toHaveBeenCalled();
  });

  it('chama endpoint cockpit-resumo com ids unidos', async () => {
    vi.mocked(axiosApiService.get).mockResolvedValue({
      success: true,
      data: {
        p1: {
          diariasEquipeOrcadas: 5,
          diariasEquipeRealizadas: 2,
          custoTempoOrcado: 3000,
          dataPrevisao: null,
          diasCorridos: 4,
          estouroDiarias: false,
          estouroDiasCorridos: false,
        },
      },
    });

    const res = await ordemServicosService.getCockpitResumo(['p1', 'p2']);

    expect(axiosApiService.get).toHaveBeenCalledWith('/api/projetos/cockpit-resumo', {
      ids: 'p1,p2',
    });
    expect(res.success).toBe(true);
    expect(res.data?.p1?.custoTempoOrcado).toBe(3000);
  });
});
