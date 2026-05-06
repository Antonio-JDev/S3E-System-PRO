# Configuração de Produção com Tailscale

## 📋 Visão Geral

Este documento explica a configuração de produção do S3E System PRO usando:

- **Servidor Local**: TrueNAS Scale (IP local: `192.168.100.228`)
- **Acesso Remoto**: Tailscale (IP VPN: `100.74.201.62`)
- **Domínio Personalizado**: `app.s3eengenharia.com.br`

## 🔧 Configuração do Ambiente

### 1. Arquivo `.env` de Produção

O arquivo `.env` de produção deve conter:

```env
# Banco de Dados
DB_HOST=postgres
DB_PORT=5432
DB_USER=s3e_prod
DB_PASSWORD=Eng.elet30838361
DB_NAME=s3e_producao

# PostgreSQL (DOCKER COMPOSE)
POSTGRES_DB=s3e_producao
POSTGRES_USER=s3e_prod
POSTGRES_PASSWORD=Eng.elet30838361

# Segurança JWT
JWT_SECRET=dd3eb204de036fe9d4647b69daf77c7c102919cd84a350b0729d2c01f8d6306a

# Configurações
NODE_ENV=production
BACKEND_PORT=3001
FRONTEND_URL=http://100.74.201.62:8080
BACKEND_URL=http://100.74.201.62:3001

# CORS - IMPORTANTE para funcionar no TrueNAS
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080,http://app.s3eengenharia.com.br

# PgAdmin Configuration
PGADMIN_EMAIL=contato@s3eengenharia.com.br
PGADMIN_PASSWORD=Eng.elet30838361

# Email/SMTP - Configuração UOL
SMTP_HOST=smtps.uhserver.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@s3eengenharia.com.br
SMTP_PASS=Eng.elet30838361
SMTP_FROM=contato@s3eengenharia.com.br
```

### 2. Configuração do Arquivo Hosts (Cada PC)

**IMPORTANTE**: Cada computador que acessa o sistema remotamente precisa ter o
arquivo `hosts` configurado para mapear o domínio para o IP do Tailscale.

#### Windows

Edite o arquivo: `C:\Windows\System32\drivers\etc\hosts`

Adicione a linha:

```
100.74.201.62    app.s3eengenharia.com.br
```

#### Linux/Mac

Edite o arquivo: `/etc/hosts`

Adicione a linha:

```
100.74.201.62    app.s3eengenharia.com.br
```

**Nota**: Pode ser necessário executar como administrador/root.

### 3. Build das Imagens Docker

Os scripts de build (`build-and-push.sh` e `build-and-push.bat`) estão
configurados para usar o domínio `app.s3eengenharia.com.br:3001` durante o build
do frontend.

**Comando para build e push:**

```bash
# Windows
build-and-push.bat 1.1.6

# Linux/Mac
./build-and-push.sh 1.1.6
```

Isso irá:

1. Buildar o backend
2. Buildar o frontend com `VITE_API_URL=http://app.s3eengenharia.com.br:3001`
3. Fazer push das imagens para Docker Hub

### 4. Deploy no Servidor TrueNAS Scale

No servidor, execute:

```bash
# Fazer pull das novas imagens
docker-compose -f docker-compose.prod.yml pull

# Subir os containers
docker-compose -f docker-compose.prod.yml up -d
```

## 🌐 Como Funciona

1. **Acesso Local (Rede da Empresa)**:
   - Frontend: `http://192.168.100.228:8080`
   - Backend: `http://192.168.100.228:3001`

2. **Acesso Remoto (via Tailscale)**:
   - Frontend: `http://app.s3eengenharia.com.br:8080` ou
     `http://100.74.201.62:8080`
   - Backend: `http://app.s3eengenharia.com.br:3001` ou
     `http://100.74.201.62:3001`

3. **Mapeamento de Domínio**:
   - O arquivo `hosts` em cada PC mapeia `app.s3eengenharia.com.br` →
     `100.74.201.62`
   - O frontend (buildado com o domínio) faz requisições para
     `app.s3eengenharia.com.br:3001`
   - O sistema operacional resolve o domínio para o IP do Tailscale via arquivo
     hosts
   - A conexão é estabelecida através do túnel Tailscale

## ✅ Verificações

Após o deploy, verifique:

1. **Frontend acessível**:

   ```bash
   curl http://app.s3eengenharia.com.br:8080
   ```

2. **Backend acessível**:

   ```bash
   curl http://app.s3eengenharia.com.br:3001/api/health
   ```

3. **CORS configurado corretamente**:
   - Verifique se todas as origens estão no `CORS_ORIGIN` do `.env`

## 🔄 Atualizações Futuras

Quando precisar atualizar o sistema:

1. Faça as alterações no código
2. Execute o build e push:

   ```bash
   build-and-push.bat [nova-versao]
   ```

3. No servidor, faça pull e reinicie:

   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 📝 Notas Importantes

- ⚠️ **NUNCA** commite o arquivo `.env` de produção no Git
- ⚠️ O arquivo `hosts` precisa ser configurado em **cada PC** que acessa
  remotamente
- ⚠️ Se o IP do Tailscale mudar, atualize o arquivo `hosts` em todos os PCs
- ✅ O domínio `app.s3eengenharia.com.br` é apenas um alias local, não precisa
  de DNS público
