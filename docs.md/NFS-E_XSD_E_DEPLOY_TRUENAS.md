# NFS-e: XSDs e deploy no TrueNAS Scale

## Onde colocar os XSDs da NFS-e (Pública v7.4)

Os XSDs da NFS-e **podem ficar na mesma pasta onde está o
`docker-compose.prod.yml`** no servidor TrueNAS Scale (rede local). O backend
espera uma pasta chamada **`nfse-xsd`** nesse diretório.

### Estrutura esperada

No **mesmo nível** do `docker-compose.prod.yml` (raiz do projeto no servidor),
crie a pasta **`nfse-xsd`** e coloque dentro os arquivos XSD fornecidos pela
prefeitura/Pública:

```
/path/do/projeto/no/truenas/
├── docker-compose.prod.yml
├── .env.production
├── nfse-xsd/                    ← CRIAR ESTA PASTA
│   ├── enviarLoteRpsEnvio.xsd   ← ou o nome que a prefeitura fornecer
│   ├── nfse_v7.xsd              ← alternativo (o código procura por um destes)
│   └── ... (outros XSDs referenciados, se houver)
├── PL_010b_NT2025_002_v1.30/    ← XSDs da NF-e (já existente)
└── ...
```

### Por que na mesma pasta do docker-compose?

- No `docker-compose.prod.yml` o volume está definido assim:

  ```yaml
  - ./nfse-xsd:/app/nfse-xsd:ro
  ```

- O `./` é relativo ao diretório de onde o `docker-compose` é executado, ou
  seja, **a pasta onde está o `docker-compose.prod.yml`**.
- Dentro do container, o backend usa o diretório de trabalho `/app` e procura a
  pasta `nfse-xsd` em `/app/nfse-xsd`. O volume monta a pasta do host exatamente
  aí.

### Pode ficar na raiz do projeto?

**Sim.** No contexto do deploy no TrueNAS, a “raiz do projeto” é justamente a
pasta onde você coloca o `docker-compose.prod.yml` e sobe a aplicação. Então:

- **Raiz do projeto** = pasta onde está o `docker-compose.prod.yml`.
- **`nfse-xsd`** = pasta **dentro** dessa raiz (mesmo nível do
  `docker-compose.prod.yml`).

Não é necessário colocar os XSDs em outro lugar (por exemplo, dentro de
`backend/`). O importante é que a pasta **`nfse-xsd`** exista nessa raiz e seja
montada pelo compose.

---

## Como subir os XSDs no TrueNAS Scale

### 1. Criar a pasta no servidor

No TrueNAS Scale, no dataset/pasta onde está o projeto (onde fica o
`docker-compose.prod.yml`):

1. Crie uma pasta chamada **`nfse-xsd`** (mesmo nível do
   `docker-compose.prod.yml`).
2. Ajuste permissões se necessário (o usuário que roda o container precisa
   conseguir ler os arquivos). Em geral, leitura para o usuário do app já é
   suficiente.

### 2. Copiar os arquivos XSD

- Obtenha os XSDs da NFS-e (Pública v7.4 / Itajaí) com a prefeitura ou no
  manual.
- Copie para dentro de **`nfse-xsd`** no servidor, por exemplo:
  - **SSH/SCP:**  
    `scp enviarLoteRpsEnvio.xsd usuario@ip-do-truenas:/caminho/do/projeto/nfse-xsd/`
  - **Interface do TrueNAS:** use “File Manager” (ou equivalente) e faça upload
    na pasta `nfse-xsd`.
  - **SMB/CIFS:** se o projeto estiver em um share, acesse pela rede e copie os
    arquivos para `nfse-xsd`.

### 3. Nomes de arquivo que o backend procura

O código procura, nessa ordem:

1. **`enviarLoteRpsEnvio.xsd`** dentro de `nfse-xsd`
2. Se não achar, **`nfse_v7.xsd`**

Se os XSDs que você receber tiverem outros nomes, você pode:

- Renomear para um desses (por exemplo `enviarLoteRpsEnvio.xsd`), ou
- Ajustar o código em `backend/src/services/nfse-publica-validator.service.ts`
  (variáveis `xsdPrincipal` e `xsdAlternativo`) para o nome real do arquivo.

### 4. Reiniciar o backend

Depois de criar `nfse-xsd` e colocar os XSDs:

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

Ou, se subir os containers de novo:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

O volume `./nfse-xsd:/app/nfse-xsd:ro` já está configurado no
`docker-compose.prod.yml`; não é preciso alterar nada além de criar a pasta e
colocar os arquivos.

---

## Se não houver XSDs

- Se a pasta **`nfse-xsd`** não existir ou estiver vazia, o backend **não
  bloqueia** o envio da NFS-e.
- A validação XSD é **opcional**: ele apenas registra um aviso em log e segue
  sem validar contra o schema.
- Para garantir que o XML está correto antes de enviar à prefeitura, o ideal é
  colocar os XSDs e usar a validação.

---

## Variável de ambiente (alternativa)

Se preferir usar outro caminho no host (por exemplo, um dataset diferente no
TrueNAS), você pode:

1. Montar esse caminho em um volume com outro nome, por exemplo:

   ```yaml
   - /caminho/absoluto/para/xsds/nfse:/app/nfse-xsd:ro
   ```

2. Ou manter o volume `./nfse-xsd` e, dentro do container, o backend também
   aceita:
   - **`NFSE_XSD_PATH`** ou **`NFSE_PUBLICA_XSD`**: caminho **dentro do
     container** para a pasta de XSDs (ex.: `/app/nfse-xsd`).

A opção mais simples no TrueNAS é: **pasta `nfse-xsd` na mesma pasta do
`docker-compose.prod.yml`**, como descrito acima.
