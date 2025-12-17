# Guia de Implementação: Emissão de NF-e com Node.js, Express e Docker

Este documento serve como um guia estruturado ("prompt de comando") para implementar um serviço de emissão de Nota Fiscal Eletrônica (NF-e) usando Node.js, seguindo as melhores práticas de segurança e arquitetura para um ambiente containerizado com Docker.

---

## 1. Arquitetura e Conceitos Fundamentais

Antes de codificar, é crucial entender o papel de cada componente do seu sistema.

### a. Frontend (Sua Interface Web)

- **Função:** Apenas coletar dados do usuário (informações do cliente, produtos, etc.) através de um formulário.
- **Ação:** Ao clicar em "Emitir", o frontend deve empacotar os dados (geralmente em formato JSON) e enviá-los para o backend via uma chamada de API.
- **❌ O que NÃO fazer:** Nunca manipule, leia, ou peça para o usuário fazer upload do certificado digital (.pfx) no frontend.

### b. Backend (Seu Servidor Node.js/Express)

- **Função:** É o cérebro da operação. Ele recebe os dados do frontend, realiza a lógica de negócio e se comunica com serviços externos.
- **Ação:**
    1. Recebe os dados da nota via uma rota de API (ex: `/api/nfe/emitir`).
    2. Lê o arquivo do certificado digital (`.pfx`) e sua senha a partir de um local seguro **no servidor**.
    3. Gera o XML da NF-e.
    4. Assina digitalmente o XML.
    5. Envia o XML assinado para o Web Service da SEFAZ.
    6. Consulta o status do envio.
    7. Salva o XML final autorizado e retorna uma resposta de sucesso para o frontend.

### c. IDE (Cursor)

- **Função:** É apenas a sua ferramenta para escrever o código do frontend e do backend. Ele não participa da execução em produção e não interage com o certificado.

---

## 2. Pré-requisitos Obrigatórios

1. **Certificado Digital A1:** Um arquivo `.pfx` válido e sua respectiva senha.

2. **Credenciamento na SEFAZ:** Sua empresa deve estar autorizada a emitir NF-e no seu estado (SC), tanto no ambiente de **Homologação (testes)** quanto no de **Produção**.

3. **Endpoints dos Web Services:** Os endereços (URLs) corretos da SEFAZ para cada operação (ver seção 5).

---

## 3. Configuração do Certificado Digital com Docker (Método Correto)

**NÃO crie um botão de "upload de certificado".** Trate o certificado como um segredo de infraestrutura.

### Passo 1: Armazene o Certificado no Host (TrueNAS)

- Crie um diretório seguro no seu servidor TrueNAS para guardar o certificado.
- **Exemplo:** `/mnt/pool-principal/docker-secrets/nfe/`
- Coloque o arquivo `seu-certificado.pfx` nesse diretório.

### Passo 2: Configure o `docker-compose.yml`

Edite seu `docker-compose.yml` para injetar o certificado e a senha no container do backend.

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: sua-imagem-backend
    environment:
      # A senha será lida de um arquivo .env para segurança
      - CERT_PASS=${CERTIFICADO_SENHA}
      # Outras variáveis...
    volumes:
      # Mapeia o arquivo do host para um caminho FIXO e SOMENTE-LEITURA dentro do container
      - /mnt/pool-principal/docker-secrets/nfe/seu-certificado.pfx:/etc/secrets/certificate.pfx:ro
    # ... resto da configuração
```

### Passo 3: Crie o arquivo `.env`

No mesmo diretório do `docker-compose.yml`, crie um arquivo chamado `.env`:

```# .env
CERTIFICADO_SENHA=aqui-vai-a-senha-do-seu-pfx
```

### Passo 4: Adapte o Código Node.js

Seu código agora deve ler o certificado de um caminho fixo e a senha de uma variável de ambiente.

```javascript
// No seu serviço de NF-e no Node.js

const fs = require('fs');
const forge = require('node-forge');

// Caminho FIXO dentro do container, definido no docker-compose.yml
const pfxPath = '/etc/secrets/certificate.pfx'; 

// Senha vinda da variável de ambiente
const pfxPass = process.env.CERT_PASS; 

if (!pfxPass) {
    throw new Error('A variável de ambiente CERT_PASS não foi definida!');
}
if (!fs.existsSync(pfxPath)) {
    throw new Error(`Arquivo de certificado não encontrado em ${pfxPath}`);
}

// Lógica para ler o certificado
const pfx = fs.readFileSync(pfxPath);
const cert = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(pfx.toString('binary')),
    pfxPass
);

// Extraia a chave e o certificado em formato PEM para usar com a biblioteca nfe-brasil
const key = forge.pki.privateKeyToPem(cert.keys[0].key);
const certPem = forge.pki.certificateToPem(cert.certs[0].cert);

// Agora `key` e `certPem` estão prontos para serem usados.
```

---

## 4. Roteiro de Implementação no Backend

Use uma biblioteca especializada como a `nfe-brasil` para abstrair a complexidade.

`npm install nfe-brasil`

```javascript
// Exemplo de uma rota no Express
const express = require('express');
const router = express.Router();
const { NFe } = require('nfe-brasil');
// ... (código do passo anterior para carregar 'key' e 'certPem')

router.post('/emitir', async (req, res) => {
    try {
        // 1. DADOS DA NOTA (vem do req.body)
        const dadosNota = req.body; // Simplificação

        // 2. CONFIGURAÇÕES DA BIBLIOTECA
        const nfe = new NFe({
            cert: certPem,      // Certificado em formato PEM
            key: key,           // Chave privada em formato PEM
            cUF: '42',          // Código de SC
            amb: '2',           // 2 para Homologação, 1 para Produção
            // outras configurações...
        });

        // 3. GERAR, VALIDAR E ASSINAR O XML
        const xml = await nfe.criarNFe(dadosNota);
        if (!xml.sucesso) throw new Error(JSON.stringify(xml.erros));

        // 4. ENVIAR LOTE PARA A SEFAZ
        const envio = await nfe.enviarNFe(xml.xml_assinado);
        if (!envio.sucesso) throw new Error(JSON.stringify(envio.erros));
        
        const recibo = envio.recibo;
        console.log('Lote enviado. Recibo:', recibo);
        
        // 5. CONSULTAR RECIBO APÓS ALGUNS SEGUNDOS
        await new Promise(resolve => setTimeout(resolve, 3000));
        const consulta = await nfe.consultarNFe(recibo);

        if (consulta.cStat !== '104') { // 104 = Lote processado
             throw new Error(`Erro na consulta: ${consulta.xMotivo}`);
        }
        
        // 6. GERAR XML FINAL E SALVAR
        const protocolo = consulta.protNFe;
        const xmlFinal = nfe.gerarNFeProc(xml.xml_assinado, protocolo);
        
        // Ex: fs.writeFileSync(`.../${protocolo.infProt.chNFe}-procNFe.xml`, xmlFinal);
        
        res.json({ sucesso: true, mensagem: 'NF-e autorizada!', chave: protocolo.infProt.chNFe });

    } catch (error) {
        console.error(error);
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});
```

---

## 5. Endpoints (WebServices) SEFAZ para Santa Catarina

Santa Catarina é atendida pela Sefaz Virtual do Rio Grande do Sul (SVRS).

### Ambiente de Homologação (Testes)

- **Envio de Lote:** `https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx`
- **Consulta de Recibo:** `https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx`
- **Consulta de Status:** `https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx`
- **Eventos (Cancelamento, etc.):** `https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx`

### Ambiente de Produção (Real)

- **Envio de Lote:** `https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx`
- **Consulta de Recibo:** `https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx`
- **Consulta de Status:** `https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx`
- **Eventos (Cancelamento, etc.):** `https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx`

Use este guia como sua fonte de verdade durante a implementação.
