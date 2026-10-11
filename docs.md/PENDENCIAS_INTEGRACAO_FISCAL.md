# O que ficou de fora da integração fiscal

Registro do que a comparação com o TOTVS Protheus apontou e **não** entrou na atualização de DRE, CMV e baixa do kit.

O que já está no sistema: NF-e modelo 55 direto na SEFAZ (SC/SVRS), NFS-e no padrão Pública de Itajaí, kit comercial como uma linha na NF-e, e a baixa dos componentes do kit na autorização dessa nota.

## Pendências

- Carta de correção (CC-e) não é enviada à SEFAZ. O fluxo atual é simulado.
- Cancelamento e manifestação do destinatário saem sem a assinatura completa do evento.
- CFOP e impostos do XML estão fixos no código (CSOSN 102, CFOP 5101 e, no regime normal, ICMS, PIS e COFINS cravados). Não há TES que decida CFOP, estoque e financeiro juntos.
- Não há NFC-e, CT-e, MDF-e nem SPED.
- A fila de contingência só anda se o worker estiver rodando (`npm run nfe:fila`).
- Certificado só A1.
- NFS-e só no município no padrão Pública (Itajaí).
