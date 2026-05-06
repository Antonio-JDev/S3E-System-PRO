import React, { forwardRef } from 'react';

interface Props {
  nfse: any;
  servico?: any;
  prestador?: any;
  tomador?: any;
  brasaoDataUrl?: string | null;
  logoDataUrl?: string | null;
  qrDataUrl?: string | null;
}

const PrintableNfse = forwardRef<HTMLDivElement, Props>(({ nfse, servico, prestador, tomador, brasaoDataUrl, logoDataUrl, qrDataUrl }, ref) => {
  const valorTotal = nfse?.valorTotal ?? servico?.valorServicos ?? 0;
  return (
    <div ref={ref} style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10, color: '#000', padding: 6 }}>
      <div style={{ display: 'flex', height: 110, alignItems: 'center' }}>
        <div style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {brasaoDataUrl ? <img src={brasaoDataUrl} alt="brasao" style={{ width: 80, height: 'auto' }} /> : <div style={{ width: 80, height: 80, border: '1px solid #000' }} />}
        </div>
        <div style={{ width: '60%', textAlign: 'center', paddingLeft: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>MUNICÍPIO DE ITAJAÍ</div>
          <div style={{ fontWeight: 700 }}>SECRETARIA MUNICIPAL DA FAZENDA</div>
          <div style={{ fontSize: 9 }}>Rua Alberto Werner, 100, Vila Operária, CEP: 88304-053 - ITAJAÍ/SC</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 6 }}>NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e</div>
        </div>
        <div style={{ width: '25%', paddingLeft: 8, boxSizing: 'border-box' }}>
          <div style={{ border: '1px solid #000', padding: 6, minHeight: 66 }}>
            <div style={{ fontSize: 7, textTransform: 'uppercase' }}>Número e Série da NFS-e</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{nfse?.numeroNfse || '-'}</div>
            <div style={{ fontSize: 7, marginTop: 6, textTransform: 'uppercase' }}>Data e Hora da Emissão</div>
            <div>{nfse?.createdAt ? new Date(nfse.createdAt).toLocaleString('pt-BR') : '-'}</div>
          </div>
          <div style={{ marginTop: 6, textAlign: 'right' }}>
            {qrDataUrl && <img src={qrDataUrl} alt="qr" style={{ width: 72 }} />}
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #000', marginTop: 8, padding: 6, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '18%', paddingRight: 8 }}>
          {logoDataUrl ? <img src={logoDataUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: 80 }} /> : null}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>PRESTADOR DE SERVIÇOS</div>
          <div style={{ marginTop: 6 }}>
            <div><strong>CNPJ:</strong> {prestador?.cnpj || '-'}</div>
            <div><strong>Inscrição Municipal:</strong> {prestador?.inscricaoMunicipal || '-'}</div>
            <div><strong>Nome fantasia:</strong> {prestador?.nomeFantasia || ''}</div>
            <div><strong>Razão social:</strong> {prestador?.razaoSocial || ''}</div>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #000', marginTop: 8, padding: 6 }}>
        <div style={{ fontWeight: 700 }}>TOMADOR DE SERVIÇOS</div>
        <div style={{ marginTop: 6 }}>
          <div><strong>Razão social:</strong> {tomador?.razaoSocial || '-'}</div>
          <div><strong>CNPJ/CPF:</strong> {tomador?.cnpj || '-'}</div>
          <div><strong>Endereço:</strong> {tomador?.endereco || '-'}</div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4 }}>DISCRIMINAÇÃO DOS SERVIÇOS</div>
        <div style={{ minHeight: 120, border: '1px solid #000', padding: 8, whiteSpace: 'pre-wrap', marginTop: 6 }}>
          {servico?.discriminacao || '-'}
        </div>
      </div>

      <div style={{ border: '1px solid #000', marginTop: 8, padding: 6 }}>
        <div style={{ fontWeight: 700 }}>VALOR TOTAL DO SERVIÇO: R$ {Number(valorTotal).toFixed(2)}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: 6, fontSize: 9 }}>Valor Serviços</th>
              <th style={{ border: '1px solid #000', padding: 6, fontSize: 9 }}>Base de Cálculo</th>
              <th style={{ border: '1px solid #000', padding: 6, fontSize: 9 }}>Alíquota ISS</th>
              <th style={{ border: '1px solid #000', padding: 6, fontSize: 9 }}>Valor ISS retido</th>
              <th style={{ border: '1px solid #000', padding: 6, fontSize: 9 }}>Valor ISS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>{servico?.valorServicos || '-'}</td>
              <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>{servico?.baseCalculo || '-'}</td>
              <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>{servico?.aliquota || '-'}</td>
              <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>{servico?.valorIssRetido || '-'}</td>
              <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>{servico?.valorIss || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ border: '1px solid #000', marginTop: 8, padding: 6 }}>
        <div style={{ fontWeight: 700 }}>INFORMAÇÕES COMPLEMENTARES</div>
        <div style={{ marginTop: 6 }}>{servico?.informacoesComplementares || '-'}</div>
      </div>
    </div>
  );
});

export default PrintableNfse;

