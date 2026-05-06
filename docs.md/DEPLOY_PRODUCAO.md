# Deploy em Produção (S3E System PRO)

## Arquivos que sobem para o GitHub

- `docker-compose.yml` e `docker-compose.prod.yml` – **não contêm senhas** (valores vêm do `.env.production` no servidor).
- `.env.production.example` – template com placeholders (pode ser commitado).
- **Nunca** commitar `.env.production` com senhas reais.

## No servidor (primeira vez)

1. **Clonar ou atualizar o repositório**
   ```bash
   cd /caminho/do/projeto
   git pull
   ```

2. **Criar o arquivo de ambiente de produção**
   ```bash
   cp .env.production.example .env.production
   nano .env.production   # ou vim / seu editor
   ```

3. **Substituir os placeholders no `.env.production`**
   - `SUA_SENHA_POSTGRES` → senha real do PostgreSQL
   - `SUA_JWT_SECRET` → valor forte (ex.: `openssl rand -hex 32`)
   - `SUA_SENHA_EMAIL_CONTATO` → senha do e-mail contato@s3eengenharia.com.br
   - `SUA_SENHA_EMAIL_FISCAL` → senha do e-mail fiscal@s3eengenharia.com.br

4. **Subir os containers**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

## E-mails (uhserver.com)

- **Contato** (recuperação de senha, notificações): `contato@s3eengenharia.com.br`  
  - SMTP: smtps.uhserver.com, porta 465, SSL/TLS.
- **Fiscal** (NFS-e e NF-e): `fiscal@s3eengenharia.com.br`  
  - SMTP: smtps.uhserver.com, porta 465, SSL/TLS.

As variáveis `SMTP_*` e `SMTP_FISCAL_*` já vêm preenchidas no `.env.production.example`; no servidor basta definir as senhas em `SMTP_PASS` e `SMTP_FISCAL_PASS` no `.env.production`.
