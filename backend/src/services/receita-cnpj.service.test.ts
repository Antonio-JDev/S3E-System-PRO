import { extrairCodigoMunicipioInformado } from '../utils/nfe-emissao.util';
import {
  ConsultaCnpjError,
  escolherMunicipioPorNome,
  consultarCnpj,
  extrairCodigoUfIbge,
  extrairInscricaoEstadualReceita,
  mapearConsultaReceita,
  resetConsultaCnpjEstadoParaTeste,
  type RespostaReceitaWs,
} from './receita-cnpj.service';

const receitaBase: RespostaReceitaWs = {
  status: 'OK',
  nome: 'S3E ENGENHARIA LTDA',
  fantasia: 'S3E',
  cnpj: '12.345.678/0001-90',
  email: 'contato@s3e.test',
  telefone: '(47) 3344-5566',
  logradouro: 'RUA HERCILIO LUZ',
  numero: '100',
  bairro: 'CENTRO',
  municipio: 'ITAJAI',
  uf: 'SC',
  cep: '88.301-000',
  situacao: 'ATIVA',
  porte: 'ME',
  natureza_juridica: '206-2 - Sociedade Empresária Limitada',
  capital_social: '1000.00',
  atividade_principal: [{ code: '43.21-5-00', text: 'Instalação e manutenção elétrica' }],
  qsa: [{ nome: 'MARIA SILVA', qual: '49-Sócio-Administrador' }],
  simples: { optante: true, data_opcao: '01/01/2020', data_exclusao: null },
};

describe('consulta CNPJ ReceitaWS + IBGE', () => {
  beforeEach(() => {
    resetConsultaCnpjEstadoParaTeste();
  });

  it('escolhe o município do IBGE pelo nome da cidade, ignorando acento', () => {
    const escolhido = escolherMunicipioPorNome(
      [
        { id: 4205407, nome: 'Florianópolis' },
        { id: 4208203, nome: 'Itajaí' },
      ],
      'ITAJAI'
    );
    expect(escolhido?.id).toBe(4208203);
  });

  it('lê a IE quando a ReceitaWS envia o campo e marca contribuinte', () => {
    expect(extrairInscricaoEstadualReceita({ ...receitaBase, inscricao_estadual: '255.555.555' })).toEqual({
      inscricaoEstadual: '255.555.555',
      indIEDest: 1,
    });
    expect(extrairInscricaoEstadualReceita({ ...receitaBase, extra: { ie: 'ISENTO' } })).toEqual({
      inscricaoEstadual: 'ISENTO',
      indIEDest: 2,
    });
    expect(extrairInscricaoEstadualReceita(receitaBase).indIEDest).toBe(9);
  });

  it('monta o código do município no JSON que a NF-e já lê', () => {
    const consulta = mapearConsultaReceita({
      cnpj: '12345678000190',
      receita: { ...receitaBase, inscricao_estadual: '255555555' },
      codigoMunicipioIbge: '4208203',
      codigoUfIbge: '42',
      cidadeIbge: 'Itajaí',
      ufIbge: 'SC',
      nomeUf: 'Santa Catarina',
    });

    expect(consulta.codigoMunicipioIbge).toBe('4208203');
    expect(consulta.codigoUfIbge).toBe('42');
    expect(consulta.inscricaoEstadual).toBe('255555555');
    expect(consulta.cidade).toBe('Itajaí');
    expect(extrairCodigoMunicipioInformado({ dadosCnpjWs: consulta.raw })).toBe('4208203');
    const estabelecimento = consulta.raw.estabelecimento as { inscricoes_estaduais: Array<{ inscricao_estadual: string }> };
    expect(estabelecimento.inscricoes_estaduais[0].inscricao_estadual).toBe('255555555');
  });

  it('confirma o código da UF dentro do município do IBGE', () => {
    expect(
      extrairCodigoUfIbge({
        id: 4208203,
        microrregiao: { mesorregiao: { UF: { id: 42, sigla: 'SC', nome: 'Santa Catarina' } } },
      })
    ).toBe('42');
  });

  it('consulta a ReceitaWS, confirma o município no IBGE pelo CEP e respeita 3 buscas por minuto', async () => {
    const chamadas: string[] = [];
    const fetchJson = async (url: string) => {
      chamadas.push(url);
      if (url.includes('receitaws.com.br')) {
        const cnpj = url.split('/').pop();
        return { status: 200, body: { ...receitaBase, cnpj, cep: '88301000', municipio: 'ITAJAI', uf: 'SC' } };
      }
      if (url.includes('viacep.com.br')) {
        return { status: 200, body: { localidade: 'Itajaí', uf: 'SC', ibge: '4208203' } };
      }
      if (url.includes('/municipios/4208203')) {
        return {
          status: 200,
          body: {
            id: 4208203,
            nome: 'Itajaí',
            microrregiao: { mesorregiao: { UF: { id: 42, sigla: 'SC', nome: 'Santa Catarina' } } },
          },
        };
      }
      return { status: 404, body: null };
    };

    const primeira = await consultarCnpj('12345678000190', fetchJson);
    const repetida = await consultarCnpj('12.345.678/0001-90', fetchJson);
    expect(primeira?.codigoMunicipioIbge).toBe('4208203');
    expect(primeira?.codigoUfIbge).toBe('42');
    expect(primeira?.estado).toBe('SC');
    expect(repetida).toEqual(primeira);
    expect(chamadas.filter((url) => url.includes('receitaws.com.br'))).toHaveLength(1);

    await consultarCnpj('11111111000191', fetchJson);
    await consultarCnpj('22222222000191', fetchJson);
    await expect(consultarCnpj('33333333000191', fetchJson)).rejects.toBeInstanceOf(ConsultaCnpjError);
  });

  it('quando o CEP não traz o código, casa o nome da cidade na lista do IBGE', async () => {
    const fetchJson = async (url: string) => {
      if (url.includes('receitaws.com.br')) {
        return { status: 200, body: { ...receitaBase, status: 'OK' } };
      }
      if (url.includes('viacep.com.br')) {
        return { status: 200, body: { localidade: 'Itajaí', uf: 'SC', ibge: '' } };
      }
      if (url.includes('/estados/SC/municipios')) {
        return {
          status: 200,
          body: [
            { id: 4205407, nome: 'Florianópolis' },
            { id: 4208203, nome: 'Itajaí' },
          ],
        };
      }
      return { status: 404, body: null };
    };

    const consulta = await consultarCnpj('12345678000190', fetchJson);
    expect(consulta?.codigoMunicipioIbge).toBe('4208203');
    expect(consulta?.codigoUfIbge).toBe('42');
    expect(consulta?.cidade).toBe('Itajaí');
  });
});
