import {
  camposAjusteItemDeXml,
  emparelharItensCompraComXml,
  extrairDadosAjusteDeNfe,
  validarIdentidadeNfeCompra,
} from './nfeXmlAjuste.util';

describe('nfeXmlAjuste.util', () => {
  describe('validarIdentidadeNfeCompra', () => {
    it('aceita mesma NF e CNPJ', () => {
      expect(
        validarIdentidadeNfeCompra(
          { numeroNF: '123', fornecedorCNPJ: '12.345.678/0001-99', serieNF: '1' },
          { numeroNF: '123', fornecedorCNPJ: '12345678000199', serieNF: '1', chaveAcesso: null }
        )
      ).toEqual({ ok: true });
    });

    it('rejeita NF diferente', () => {
      const r = validarIdentidadeNfeCompra(
        { numeroNF: '123', fornecedorCNPJ: '12345678000199' },
        { numeroNF: '999', fornecedorCNPJ: '12345678000199', serieNF: null, chaveAcesso: null }
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/NF 999/);
    });

    it('rejeita CNPJ diferente', () => {
      const r = validarIdentidadeNfeCompra(
        { numeroNF: '123', fornecedorCNPJ: '12345678000199' },
        { numeroNF: '123', fornecedorCNPJ: '00000000000000', serieNF: null, chaveAcesso: null }
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/CNPJ/);
    });

    it('aceita CNPJ do fornecedor vinculado quando o snapshot está vazio', () => {
      expect(
        validarIdentidadeNfeCompra(
          { numeroNF: '123', fornecedorCNPJ: '', fornecedorVinculadoCNPJ: '12.345.678/0001-99' },
          { numeroNF: '123', fornecedorCNPJ: '12345678000199', serieNF: null, chaveAcesso: null }
        )
      ).toEqual({ ok: true });
    });

    it('aceita CNPJ do fornecedor vinculado quando o snapshot diverge', () => {
      expect(
        validarIdentidadeNfeCompra(
          {
            numeroNF: '123',
            fornecedorCNPJ: '00000000000000',
            fornecedorVinculadoCNPJ: '12345678000199',
          },
          { numeroNF: '123', fornecedorCNPJ: '12.345.678/0001-99', serieNF: null, chaveAcesso: null }
        )
      ).toEqual({ ok: true });
    });

    it('rejeita NF diferente mesmo com CNPJ do vínculo igual', () => {
      const r = validarIdentidadeNfeCompra(
        {
          numeroNF: '123',
          fornecedorCNPJ: '',
          fornecedorVinculadoCNPJ: '12345678000199',
        },
        { numeroNF: '999', fornecedorCNPJ: '12345678000199', serieNF: null, chaveAcesso: null }
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/NF 999/);
    });

    it('rejeita série divergente quando ambas existem', () => {
      const r = validarIdentidadeNfeCompra(
        { numeroNF: '123', fornecedorCNPJ: '12345678000199', serieNF: '1' },
        { numeroNF: '123', fornecedorCNPJ: '12345678000199', serieNF: '2', chaveAcesso: null }
      );
      expect(r.ok).toBe(false);
    });
  });

  describe('extrairDadosAjusteDeNfe', () => {
    it('extrai EAN, cProd, ICMS totais e por item', () => {
      const root = {
        nfeProc: {
          NFe: {
            infNFe: {
              '@_Id': 'NFe35200112345678000199550010000001231000000000',
              ide: { nNF: '123', serie: '1' },
              emit: { CNPJ: '12345678000199', xNome: 'Fornecedor X' },
              det: {
                '@_nItem': '1',
                prod: {
                  cProd: 'CAB-25',
                  cEAN: '7891234567895',
                  xProd: 'Cabo 2,5mm',
                  NCM: '85444900',
                  qCom: '10',
                  vUnCom: '5.00',
                  vProd: '50.00',
                },
                imposto: {
                  ICMS: { ICMS00: { vICMS: '9.00' } },
                },
              },
              total: {
                ICMSTot: {
                  vICMS: '9.00',
                  vIPI: '1.00',
                  vFrete: '2.00',
                  vOutro: '0',
                  vDesc: '0',
                  vProd: '50.00',
                  vNF: '53.00',
                },
              },
            },
          },
        },
      };

      const dados = extrairDadosAjusteDeNfe(root);
      expect(dados.identidade.numeroNF).toBe('123');
      expect(dados.identidade.fornecedorCNPJ).toBe('12345678000199');
      expect(dados.items).toHaveLength(1);
      expect(dados.items[0].ean).toBe('7891234567895');
      expect(dados.items[0].codigoFornecedor).toBe('CAB-25');
      expect(dados.items[0].valorICMS).toBe(9);
      expect(dados.totais.valorICMS).toBe(9);
      expect(dados.totais.valorIPI).toBe(1);
    });

    it('completa zero à esquerda quando o CNPJ do emitente vem numérico', () => {
      const dados = extrairDadosAjusteDeNfe({
        NFe: {
          infNFe: {
            ide: { nNF: '10', serie: '1' },
            emit: { CNPJ: 1234567800019 },
            det: { prod: { xProd: 'Item', qCom: '1', vUnCom: '1', vProd: '1' } },
            total: { ICMSTot: {} },
          },
        },
      });
      expect(dados.identidade.fornecedorCNPJ).toBe('01234567800019');
    });

    it('trata cEAN SEM GTIN como ean null', () => {
      const root = {
        NFe: {
          infNFe: {
            ide: { nNF: '267079', serie: '1' },
            emit: { CNPJ: '10381875000134' },
            det: {
              '@_nItem': '1',
              prod: {
                cProd: '2163',
                cEAN: 'SEM GTIN',
                cEANTrib: 'SEM GTIN',
                xProd: 'TUBO GALVANIZADO',
                NCM: '73063090',
                qCom: '1',
                vUnCom: '10',
                vProd: '10',
              },
            },
            total: { ICMSTot: { vICMS: '0', vIPI: '0', vFrete: '0', vOutro: '0', vDesc: '0', vProd: '10', vNF: '10' } },
          },
        },
      };
      const dados = extrairDadosAjusteDeNfe(root);
      expect(dados.items[0].codigoFornecedor).toBe('2163');
      expect(dados.items[0].ean).toBeNull();
    });
  });

  describe('camposAjusteItemDeXml', () => {
    it('aplica cProd e EAN quando XML traz valores', () => {
      expect(
        camposAjusteItemDeXml(
          { ean: '7891234567895', codigoFornecedor: '2163', ncm: '73063090' },
          { ncm: null }
        )
      ).toEqual({ ean: '7891234567895', codigoFornecedor: '2163', ncm: '73063090' });
    });

    it('não limpa EAN existente quando XML não traz GTIN', () => {
      expect(
        camposAjusteItemDeXml(
          { ean: null, codigoFornecedor: '2163', ncm: null },
          { ncm: '73063090' }
        )
      ).toEqual({ codigoFornecedor: '2163' });
    });
  });

  describe('emparelharItensCompraComXml', () => {
    it('emparelha por cProd e por índice residual', () => {
      const pares = emparelharItensCompraComXml(
        [
          { id: 'a', nomeProduto: 'Cabo', codigoFornecedor: 'CAB-25', ean: null },
          { id: 'b', nomeProduto: 'Fio', codigoFornecedor: null, ean: null },
        ],
        [
          {
            nItem: 1,
            nomeProduto: 'Cabo 2,5',
            nomeNormalizado: 'cabo 25',
            codigoFornecedor: 'CAB-25',
            ean: '7891234567895',
            ncm: null,
            valorICMS: 1,
            quantidade: 1,
            valorUnit: 1,
            valorTotal: 1,
          },
          {
            nItem: 2,
            nomeProduto: 'Fio',
            nomeNormalizado: 'fio',
            codigoFornecedor: 'X',
            ean: null,
            ncm: null,
            valorICMS: null,
            quantidade: 1,
            valorUnit: 1,
            valorTotal: 1,
          },
        ]
      );
      expect(pares[0]?.compraItemId).toBe('a');
      expect(pares[0]?.xmlItem.ean).toBe('7891234567895');
      expect(pares[1]?.compraItemId).toBe('b');
    });
  });
});
