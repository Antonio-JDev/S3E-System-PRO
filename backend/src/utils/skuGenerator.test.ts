import { gerarSKUUnico, isSkuNumerico } from './skuGenerator';

jest.mock('../lib/prisma', () => ({ prisma: {} }));

function criarTx(valoresSequencia: number[], skusOcupados: string[] = []) {
  const fila = [...valoresSequencia];
  return {
    $queryRaw: jest.fn(async () => [{ valor: BigInt(fila.shift() as number) }]),
    material: {
      findUnique: jest.fn(async ({ where }: any) => (skusOcupados.includes(where.sku) ? { id: 'x' } : null)),
    },
  };
}

describe('skuGenerator', () => {
  it('isSkuNumerico aceita apenas dígitos', () => {
    expect(isSkuNumerico('100001')).toBe(true);
    expect(isSkuNumerico('HIPDG2')).toBe(false);
    expect(isSkuNumerico('12-34')).toBe(false);
    expect(isSkuNumerico('')).toBe(false);
    expect(isSkuNumerico(undefined)).toBe(false);
  });

  it('usa o próximo valor da sequence como SKU numérico', async () => {
    const tx = criarTx([100780]);
    await expect(gerarSKUUnico(tx)).resolves.toBe('100780');
  });

  it('pula números já usados manualmente', async () => {
    const tx = criarTx([100001, 100002, 100003], ['100001', '100002']);
    await expect(gerarSKUUnico(tx)).resolves.toBe('100003');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it('sem a sequence, cai para MAX(sku)+1', async () => {
    const tx = {
      $queryRaw: jest
        .fn()
        .mockRejectedValueOnce(new Error('relation "material_sku_seq" does not exist'))
        .mockResolvedValueOnce([{ maximo: BigInt(100500) }]),
      material: { findUnique: jest.fn(async () => null) },
    };
    await expect(gerarSKUUnico(tx)).resolves.toBe('100501');
  });
});
