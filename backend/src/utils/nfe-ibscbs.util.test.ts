import { xmlGrupoIbscbsItem, xmlGrupoIbscbsTotal } from './nfe-ibscbs.util';

const TAGS_OBRIGATORIAS_ITEM = [
  '<CST>',
  '<cClassTrib>',
  '<gIBSCBS>',
  '<vBC>',
  '<gIBSUF>',
  '<pIBSUF>',
  '<vIBSUF>',
  '<gIBSMun>',
  '<pIBSMun>',
  '<vIBSMun>',
  '<vIBS>',
  '<gCBS>',
  '<pCBS>',
  '<vCBS>',
];

function ordemDasTags(xml: string, tags: string[]): void {
  let cursor = 0;
  for (const tag of tags) {
    const indice = xml.indexOf(tag, cursor);
    expect(indice).toBeGreaterThanOrEqual(0);
    cursor = indice + tag.length;
  }
}

describe('nfe-ibscbs.util', () => {
  it('monta o item com as tags obrigatórias do leiaute, na ordem do XSD', () => {
    const xml = xmlGrupoIbscbsItem({ valorBase: 10 });

    expect(xml.startsWith('<IBSCBS>')).toBe(true);
    expect(xml.endsWith('</IBSCBS>')).toBe(true);
    expect(xml).not.toMatch(/<\?xml/);
    expect(xml).not.toMatch(/>\s+</);
    for (const tag of TAGS_OBRIGATORIAS_ITEM) {
      expect(xml).toContain(tag);
    }
    ordemDasTags(xml, [
      '<IBSCBS>',
      '<CST>000</CST>',
      '<cClassTrib>000000</cClassTrib>',
      '<gIBSCBS>',
      '<vBC>10.00</vBC>',
      '<gIBSUF>',
      '<pIBSUF>0.00</pIBSUF>',
      '<vIBSUF>0.00</vIBSUF>',
      '<gIBSMun>',
      '<pIBSMun>0.00</pIBSMun>',
      '<vIBSMun>0.00</vIBSMun>',
      '<vIBS>0.00</vIBS>',
      '<gCBS>',
      '<pCBS>0.00</pCBS>',
      '<vCBS>0.00</vCBS>',
    ]);
    expect(xml).not.toMatch(/ICMS/);
  });

  it('transforma alíquota omitida em 0.00 e não usa vírgula decimal', () => {
    const xml = xmlGrupoIbscbsItem({
      valorBase: 1500.5,
      aliquotaIbsUf: 1.5,
    });

    expect(xml).toContain('<pIBSUF>1.50</pIBSUF>');
    expect(xml).toContain('<vIBSUF>22.51</vIBSUF>');
    expect(xml).toContain('<pIBSMun>0.00</pIBSMun>');
    expect(xml).toContain('<pCBS>0.00</pCBS>');
    expect(xml).toContain('<vIBSMun>0.00</vIBSMun>');
    expect(xml).toContain('<vCBS>0.00</vCBS>');
    expect(xml).not.toContain(',');
    expect(xmlGrupoIbscbsTotal([{ valorBase: 1500.5, aliquotaIbsUf: 1.5 }])).not.toContain(',');
  });

  it('soma as bases dos itens no total', () => {
    const itens = [{ valorBase: 0.1 }, { valorBase: 0.2 }, { valorBase: 10.55 }];
    const xml = xmlGrupoIbscbsTotal(itens);

    expect(xml).toContain('<vBCIBSCBS>10.85</vBCIBSCBS>');
    expect(xml).toContain('<vIBSUF>0.00</vIBSUF>');
    expect(xml).toContain('<vIBSMun>0.00</vIBSMun>');
    expect(xml).toContain('<vIBS>0.00</vIBS>');
    expect(xml).toContain('<vCBS>0.00</vCBS>');
    expect(xml).not.toContain(',');
    ordemDasTags(xml, [
      '<IBSCBSTot>',
      '<vBCIBSCBS>',
      '<gIBS>',
      '<gIBSUF>',
      '<vDif>',
      '<vDevTrib>',
      '<vIBSUF>',
      '<gIBSMun>',
      '<vIBS>',
      '<vCredPres>',
      '<vCredPresCondSus>',
      '<gCBS>',
      '<vCBS>',
    ]);
  });

  it('soma bases e tributos já arredondados por item', () => {
    const item = {
      valorBase: 200,
      cst: '000',
      cClassTrib: '000001',
      aliquotaIbsUf: 1.5,
      aliquotaIbsMun: 0.5,
      aliquotaCbs: 0.9,
    };
    const xmlItem = xmlGrupoIbscbsItem(item);
    expect(xmlItem).toContain('<CST>000</CST>');
    expect(xmlItem).toContain('<cClassTrib>000001</cClassTrib>');
    expect(xmlItem).toContain('<vIBSUF>3.00</vIBSUF>');
    expect(xmlItem).toContain('<vIBSMun>1.00</vIBSMun>');
    expect(xmlItem).toContain('<vIBS>4.00</vIBS>');
    expect(xmlItem).toContain('<vCBS>1.80</vCBS>');

    const total = xmlGrupoIbscbsTotal([item, { ...item, valorBase: 33.33 }]);
    expect(total).toContain('<vBCIBSCBS>233.33</vBCIBSCBS>');
    expect(total).toContain('<vIBSUF>3.50</vIBSUF>');
    expect(total).toContain('<vIBSMun>1.17</vIBSMun>');
    expect(total).toContain('<vIBS>4.67</vIBS>');
    expect(total).toContain('<vCBS>2.10</vCBS>');
  });

  it('rejeita CST e cClassTrib fora do padrão do XSD', () => {
    expect(() => xmlGrupoIbscbsItem({ valorBase: 1, cst: '49' })).toThrow(/3 dígitos/);
    expect(() => xmlGrupoIbscbsItem({ valorBase: 1, cClassTrib: '12345' })).toThrow(/6 dígitos/);
  });
});
