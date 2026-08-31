# NFS-e Pública/Itajaí v7.4 — Respostas técnicas

## 1. O Node está gerando o XML? Segue o manual de integração?

**Sim.** O backend (Node) gera o XML no serviço
**`nfse-publica-xml.service.ts`**, em memória (concatenação de strings),
seguindo o manual Pública v7.4:

- **Namespace:** `http://www.publica.inf.br`
- **Estrutura:** `EnviarLoteRpsEnvio` → `LoteRps` (com atributo `Id` para
  assinatura) → `ListaRps` → `Rps` → `InfRps` (com `Id`), `IdentificacaoRps`,
  `DataEmissao`, `NaturezaOperacao`, `OptanteSimplesNacional`, `Servico`,
  `Prestador`, `Tomador`
- **Valores:** ponto decimal, sem separador de milhar (ex.: `1234.56`) — função
  `fmtValor()`
- **ItemListaServico:** 6 dígitos (ex.: 14.01.01 → 140101); sem ISS: 990101 —
  função `formatoItemListaServico()`
- **Tags nulas:** omitidas (função `tag()` retorna string vazia para
  `null`/`undefined`/`''`)
- **Código município:** Itajaí 4208203 (default)
- **RpsSubstituido:** opcional, para substituição de nota
- **IBSCBS:** opcional (Reforma Tributária)

O XML gerado é o de **negócio**; o SOAP (envelope +
`<XML><![CDATA[ ... ]]></XML>`) é montado em **`nfse-publica-soap.service.ts`**.

---

## 2. Qual biblioteca faz a leitura/validação do XML contra o XSD?

**libxmljs2** (pacote **`libxmljs2`** no npm).

- Uso em: **`nfse-publica-validator.service.ts`**
- Fluxo: carrega o XSD da pasta `nfse-xsd` (ex.: `enviarLoteRpsEnvio.xsd` ou
  `nfse_v7.xsd`), faz parse do XML gerado e chama `xmlDoc.validate(schemaDoc)`.
- Se a pasta/XSD não existir, a validação é **omitida** (não bloqueia o envio;
  apenas log de aviso).

---

## 3. O backend consegue assinar o XML com o certificado digital?

**Sim.** A assinatura é feita no serviço
**`nfse-publica-signature.service.ts`**:

- **Biblioteca:** **`xml-crypto`** (SignedXml) + **`crypto`** (Node) para a
  chave privada.
- **Padrão:** XML-DSig (<http://www.w3.org/TR/xmldsig-core/>).
- **O que é assinado:** elementos com atributo `Id` (tsIdTag): **LoteRps**
  (envio de lote) e **InfPedidoCancelamento** (cancelamento).
- **KeyInfo:** apenas **X509Certificate** (não inclui X509SubjectName nem
  X509IssuerSerial, conforme manual).
- **Certificado:** carregado a partir do **EmpresaFiscal** selecionado (arquivo
  .pfx + senha descriptografada), via
  **`NFeSignatureService.carregarCertificado()`** (node-forge para extrair PEM
  do PFX).

Ou seja: o backend usa o certificado digital da empresa (PFX) para assinar o XML
antes do envio.

---

## 4. Empresa com 2 CNPJs — certificado do CNPJ correto

O backend **já está preparado** para isso e **passou a garantir** o uso do
certificado certo:

- Cada **CNPJ** é um cadastro de **EmpresaFiscal** (um registro por CNPJ), com
  seu próprio **certificado** (certificadoPath + certificadoSenha).
- Na emissão da NFS-e o usuário escolhe a **empresa (empresaId)**; o backend usa
  **sempre o certificado dessa empresa**.
- Foi adicionada **validação** em **`nfse.service.ts`**:
  - O **CNPJ do prestador** informado no lote deve ser **igual** ao CNPJ da
    empresa selecionada (empresaId).
  - A **Inscrição Municipal do prestador** deve ser a da mesma empresa.
- Se o lote vier com prestador de outro CNPJ, o backend retorna erro e **não**
  assina/envia, evitando usar o certificado de um CNPJ para emitir em nome de
  outro.

**Resumo:** Com 2 CNPJs, cadastre 2 EmpresaFiscal (um por CNPJ), cada um com seu
certificado. Ao emitir NFS-e, selecione a empresa (CNPJ) desejada; o backend usa
o certificado dessa empresa e só aceita lote cujo prestador seja esse mesmo
CNPJ.

---

## 5. Fluxo: pedido de venda (orçamento aprovado) → dados para NFS-e

Quando a venda foi gerada a partir de um **orçamento aprovado** e o orçamento
tem itens do tipo **SERVICO**, os dados são passados para a emissão fiscal
assim:

1. **Backend:** `buscarDadosVendaParaNfse(vendaId, empresaId)` (em
   `nfse.service.ts`):
   - Busca a venda com orçamento e itens (`VendasService.buscarVenda`).
   - Filtra apenas itens do orçamento com **`tipo === 'SERVICO'`**.
   - **Prestador:** CNPJ e Inscrição Municipal da **empresa fiscal**
     selecionada.
   - **Tomador:** nome, CPF/CNPJ, e-mail, telefone, endereço do **cliente** da
     venda.
   - **Itens de serviço:** para cada item SERVICO do orçamento:
     - `discriminacao` = `item.descricao` ou `item.servicoNome` ou "Serviço"
     - `valorServicos` = `item.subtotal`
     - `itemListaServico` = **140101** (padrão; editar na tela se necessário)
     - `issRetido` = 2 (não retido)
   - Sugere `numeroLote` (último lote da empresa + 1), `numeroRps` 1, série "A",
     tipo 1, data/hora atual, natureza 1, optante Simples conforme a empresa.

2. **API:** `GET /api/nfse/dados-venda/:vendaId?empresaId=xxx` retorna esse DTO
   para a tela preencher o formulário.

3. **Frontend (aba NFS-e):** bloco **"Preencher a partir de uma venda"**:
   - Usuário escolhe **Venda** e **Empresa (prestador)** e clica em **"Carregar
     dados da venda"**.
   - O frontend chama a API acima e preenche: tomador, itens de serviço, número
     do lote, número RPS, série, data, natureza, optante Simples.
   - O usuário pode ajustar (ex.: código do item de serviço, discriminação) e
     clicar em **"Enviar lote"**; o backend monta o XML a partir desses dados
     (prestador + tomador + lista de serviços) e segue o fluxo normal (validação
     XSD, assinatura, envio).
