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

---

> # 📌 ATUALIZAÇÃO — Maio/2026 (Tailscale Funnel + Traefik + Evolution Go)
>
> A partir da versão **1.3.x** o domínio público mudou de
> `app.s3eengenharia.com.br` (alias local em hosts + IP VPN) para
> `truenas.tailad9fda.ts.net` (Tailscale Funnel com cert TLS *.ts.net
> gerenciado pelo próprio Tailscale, **acessível pela internet pública sem
> hosts**). Tudo abaixo continua válido como histórico/rollback. Para
> deploys novos use as instruções desta seção.

## 🆕 Nova arquitetura (1.3.x)

```
Internet ─HTTPS─► Tailscale Funnel (TLS *.ts.net, porta 443 pública)
                       │
                       └─HTTP/80 (local)─► Traefik 2.10
                                              │
                              ┌───────────────┼────────────────┐
                              │               │                │
                              ▼               ▼                ▼
                         Frontend         Backend         Evolution Go
                         (Nginx :80)      (Node :3001)    (whatsmeow :8080)
                              │               │                │
                              ▼               ▼                ▼
                            /             /api/*          /manager/*
                                       (stripPrefix
                                        DESLIGADO!)
```

**Por que mudou:** Tailscale Funnel oferece TLS público gratuito com cert
`*.ts.net`, sem necessidade de DNS público, sem precisar mexer no arquivo
`hosts` de cada PC, e funciona de qualquer lugar (não precisa estar logado
no Tailscale para acessar).

## 🆕 Configurar Tailscale Funnel no servidor TrueNAS

```bash
# 1. Verificar status (tem que estar logado e o nó habilitado pro Funnel)
tailscale status

# 2. Habilitar Funnel apontando 443 público → :80 local (onde o Traefik escuta)
sudo tailscale serve --bg --http 80 http://localhost:80
sudo tailscale funnel 443 on

# 3. Verificar que ficou ativo:
tailscale funnel status
#   esperado: "443 → http://localhost:80 (Funnel on)"

# 4. Testar acesso público (HTTPS):
curl -I https://truenas.tailad9fda.ts.net
```

> ⚠️ Para desativar (rollback): `sudo tailscale funnel 443 off`

## 🆕 Configuração do `.env` de produção (1.3.x)

Veja o template completo em **`.env.prod.md`** (raiz do repo). Resumo das
chaves novas/alteradas que **não existem** na seção antiga deste documento:

```env
# URLs públicas (mudou: HTTPS + sem porta + sem app.s3e...)
NODE_ENV=production
FRONTEND_URL=https://truenas.tailad9fda.ts.net
BACKEND_URL=https://truenas.tailad9fda.ts.net/api
CORS_ORIGIN=https://truenas.tailad9fda.ts.net

# WhatsApp — Evolution Go (substitui Evolution v2 + WAHA + RabbitMQ)
WHATSAPP_PROVIDER_KIND=evolution-go
WHATSAPP_PROVIDER_BASE_URL=http://whatsapp-provider:8080
WHATSAPP_PROVIDER_SESSION=s3e_session_prod
WHATSAPP_PROVIDER_API_KEY=s3e-whatsapp-api-2026
WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN=s3e-whatsapp-api-2026
WHATSAPP_PROVIDER_DASHBOARD_PUBLIC_URL=https://truenas.tailad9fda.ts.net/manager

# Anti-ban (fila/mutex de envio + jitter 2–5s)
WHATSAPP_PROVIDER_SEND_PRESENCE=composing
WHATSAPP_PROVIDER_SEND_DELAY_MS=1500
WHATSAPP_SEND_JITTER_MS_MIN=2000
WHATSAPP_SEND_JITTER_MS_MAX=5000
WHATSAPP_SEND_LOCK_TIMEOUT_MS=120000

# Bancos auxiliares da Evolution Go
EVOLUTION_DATABASE_NAME=evolution
EVOLUTION_GO_CLIENT_NAME=s3e
EVOLUTION_GO_WADEBUG=INFO
```

## 🆕 Configurar webhook + eventos na Evolution Go (PASSO CRÍTICO)

**Sem este passo o backend não recebe mensagens recebidas.** A EvoGo aceita o
webhook só por instância (a env `WEBHOOK_URL` do compose é fallback que ela
**não** consome automaticamente).

Após subir o stack e criar a instância pelo Manager
(`https://truenas.tailad9fda.ts.net/manager`), execute UMA vez:

```bash
# 1. Descobrir o instanceId (UUID) da sua instância:
curl -s -H "apikey: $WHATSAPP_PROVIDER_API_KEY" \
  http://localhost:80/manager/instance/all | jq

# 2. Configurar o webhook URL + TODOS os eventos:
INSTANCE_ID="<UUID retornado acima>"
curl -s -X POST \
  -H "apikey: $WHATSAPP_PROVIDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "http://backend:3001/api/webhooks/whatsapp",
    "subscribe": ["ALL"],
    "immediate": true
  }' \
  http://localhost:80/manager/instance/connect

# 3. Confirmar:
curl -s -H "apikey: $WHATSAPP_PROVIDER_API_KEY" \
  http://localhost:80/manager/instance/info/$INSTANCE_ID | jq '.data.events'
#   esperado: "MESSAGE,SEND_MESSAGE,READ_RECEIPT,PRESENCE,HISTORY_SYNC,
#              CHAT_PRESENCE,CALL,CONNECTION,LABEL,CONTACT,GROUP,
#              NEWSLETTER,QRCODE,BUTTON_CLICK"
```

> ⚠️ **Atenção 1:** o campo correto é `subscribe` (array). Se enviar `events`
> (string) só pega o primeiro evento — bug descoberto em 13/05/2026.
>
> ⚠️ **Atenção 2:** o webhook URL **NÃO** deve passar pelo Traefik nem pelo
> Funnel — é tráfego intra-Docker (`http://backend:3001/...`). Usar HTTPS
> público causa loop e timeouts.
>
> ⚠️ **Atenção 3:** o backend usa o adapter
> `backend/src/utils/whatsappEvolutionGoWebhook.util.ts` (introduzido em
> 13/05/2026) para converter o payload whatsmeow nativo (`{event:"Message",
> data:{Info, Message}}`) para o formato Evolution v2 esperado pelo controller
> (`messages.upsert`). Esse adapter é o que permite reutilizar todo o
> pipeline já testado da v2 com a EvoGo.

## 🆕 Subida em produção (1.3.x)

```bash
# No servidor (TrueNAS Scale ou similar):
cd /caminho/do/projeto
git pull

# 1. Garantir que o arquivo .env existe com o template do .env.prod.md
ls -la .env

# 2. Garantir que os volumes externos existem:
docker volume create apps_postgres_data
docker volume create apps_backend_uploads
docker volume create apps_backend_logs
docker volume create apps_backend_certificados

# 3. Pull das imagens da versão alvo:
docker compose -f docker-compose.prod.yml pull

# 4. Subir:
docker compose -f docker-compose.prod.yml up -d

# 5. Logs:
docker compose -f docker-compose.prod.yml logs -f backend whatsapp-provider

# 6. Configurar webhook (ver seção acima)
```

## 🆕 Endpoints verificáveis (1.3.x)

| Endpoint                                                | Espera-se                          |
| ------------------------------------------------------- | ---------------------------------- |
| `https://truenas.tailad9fda.ts.net`                     | App frontend (login do sistema)    |
| `https://truenas.tailad9fda.ts.net/api/health`          | `{"status":"ok"}`                  |
| `https://truenas.tailad9fda.ts.net/manager`             | Login do Manager Evolution Go      |
| `https://truenas.tailad9fda.ts.net/manager/server/ok`   | `ok` (healthcheck EvoGo)           |

## 🆕 Volumes externos (Maio/2026)

Os volumes do Postgres/backend continuam **externos** (`apps_postgres_data`
etc.) — preservados em rollbacks. Os volumes novos da EvoGo são **locais**
(serão recriados se removidos):

| Volume                     | Tipo      | Conteúdo                                                 |
| -------------------------- | --------- | -------------------------------------------------------- |
| `apps_postgres_data`       | external  | Postgres dos sistemas (s3e_producao, evolution, evogo_*) |
| `apps_backend_uploads`     | external  | Uploads do backend                                       |
| `apps_backend_logs`        | external  | Logs aplicação                                           |
| `apps_backend_certificados`| external  | Certificados NF-e A1                                     |
| `evolution_go_dbdata`      | local     | Sessão WhatsApp (NÃO PERDER — perde QR e precisa parear) |
| `evolution_go_logs`        | local     | Logs whatsmeow                                           |
| `pgadmin_data`             | local     | Config do PgAdmin                                        |
| `redis_data`               | local     | Redis (cache)                                            |

> ⚠️ Se trocar a versão da imagem EvoGo, **não** apague `evolution_go_dbdata`
> — perde a sessão WhatsApp pareada e precisa fazer QR de novo.

## 🆕 Tabela Antes × Agora (rollback rápido)

| Item                       | Antes (até 1.1.6)                                      | Agora (1.3.x)                                                  |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Domínio frontend           | `http://app.s3eengenharia.com.br:8080`                 | `https://truenas.tailad9fda.ts.net`                            |
| Domínio backend            | `http://app.s3eengenharia.com.br:3001`                 | `https://truenas.tailad9fda.ts.net/api`                        |
| TLS                        | HTTP puro (sem TLS)                                    | HTTPS via Tailscale Funnel (cert *.ts.net)                     |
| DNS                        | arquivo `hosts` em cada PC                             | Não precisa — funciona pela internet pública                   |
| VPN                        | Tailscale como rede privada                            | Tailscale só como ponte de TLS público (Funnel)                |
| Hosts manual               | `100.74.201.62 app.s3eengenharia.com.br` em cada PC    | Removido — DNS Tailscale resolve sozinho                       |
| WhatsApp provider          | Evolution API v2 (`atendai/evolution-api`)             | Evolution Go (`evoapicloud/evolution-go:0.7.1`)                |
| Fila de mensagens          | RabbitMQ                                               | Removido (EvoGo entrega webhook HTTP direto)                   |
| Webhook URL                | `http://backend:3000/webhook/whatsapp` (Evolution v2)  | `http://backend:3001/api/webhooks/whatsapp` (EvoGo)            |

## 🩹 Troubleshooting (1.3.x) — incidentes conhecidos

### 1. WhatsApp aparece `connected: false` no painel e backend loga em loop

```
Existing client is disconnected - Connected status: false
Failed to set presence as ... websocket not connected
```

**Causa:** o cliente whatsmeow perdeu a conexão WebSocket com o WhatsApp
(timeout, instabilidade de rede, sessão revogada pelo celular, etc.). A
EvoGo **não** faz auto-reconnect agressivo — uma vez que o WS cai, o
estado fica preso até `connected: false`.

**Sintoma adicional:** chamar `POST /instance/connect` retorna `success`
mas com mensagem `"Instance already running, settings updated without
restarting client"` — ou seja, **não força reconexão**.

**Tratamento (em ordem de impacto crescente):**

```bash
# 1. (suave, raramente funciona) — pedir reconnect:
curl -s -X POST -H "apikey: $WHATSAPP_PROVIDER_API_KEY" \
  -H "Content-Type: application/json" -d '{}' \
  http://localhost:80/manager/instance/reconnect

# 2. (efetivo) — restart só do container EvoGo:
docker compose -f docker-compose.prod.yml restart whatsapp-provider

# 3. (se 2 não resolveu — sessão revogada pelo celular):
#    Refazer o pareamento via QR no Manager
#    (https://truenas.tailad9fda.ts.net/manager).
#    O volume evolution_go_dbdata NÃO é apagado automaticamente; pode
#    sobrescrever a sessão direto pelo Manager.
```

### 2. Backend loga `findGroupInfos: HTTP 400 {"error":"groupJID is required"}`

**Causa:** bug no bridge EvoGo (corrigido em 14/05/2026 — commit do dia)
— enviava `{ number }` mas a EvoGo `/group/info` espera `{ groupJID }`.

**Tratamento:** atualizar para imagem backend ≥ 1.3.1 (que inclui o fix em
`backend/src/services/whatsappEvolutionGoBridge.ts`).

### 3. Mensagens recebidas chegam mas não aparecem no chat da UI

**Causa:** webhook chega no backend mas o adapter EvoGo→v2 não está
sendo chamado (instância backend antiga, sem o
`whatsappEvolutionGoWebhook.util.ts`).

**Sintoma:** log `[WA-WEBHOOK] event não suportado: "Message"`.

**Tratamento:** atualizar imagem backend para ≥ 1.3.1 e re-deploy.

### 4. EvoGo loga `WEBHOOK SKIPPED ===== doWebhook=false`

**Causa:** webhook URL ficou setado na config da instância **depois** de
ela já ter iniciado seu subscriber — a flag interna `doWebhook` ficou
`false` na inicialização e não foi atualizada.

**Tratamento:** restart do EvoGo `docker compose restart whatsapp-provider`
e em seguida chamar `POST /instance/connect` com `subscribe:["ALL"]`
novamente para recriar a subscription.

### 5. Erro repetido `Unique constraint failed on (provider_message_id)`

**Causa:** EvoGo entrega o mesmo Message duas vezes em janela curta
(duplicate delivery do whatsmeow). O `try/catch` do
`whatsappChat.service.ts` já trata o `P2002` silenciosamente, mas o Prisma
ainda imprime o erro no log antes de chegar no catch.

**Impacto:** ZERO — a primeira inserção tem sucesso. Só polui o log.

**Tratamento opcional (não urgente):** trocar `prisma.chatMessage.create`
por `prisma.chatMessage.upsert` com chave `providerMessageId` no service.

## 🔁 Procedimento de rollback (se 1.3.x quebrar produção)

1. Voltar tag das imagens:
   ```bash
   # No docker-compose.prod.yml, trocar:
   #   backend.image:  odev10antonio/s3e-backend:1.1.6
   #   frontend.image: odev10antonio/s3e-frontend:1.1.6
   ```
2. Restaurar `.env` antigo (CORS com IPs/dominio antigo — está comentado em
   `.env.prod.md` linha 33–34).
3. Desabilitar Funnel:
   ```bash
   sudo tailscale funnel 443 off
   sudo tailscale serve reset
   ```
4. Configurar hosts em cada PC (seção "Configuração do Arquivo Hosts" acima).
5. `docker compose -f docker-compose.prod.yml up -d`
6. ⚠️ Se o volume `evolution_go_dbdata` foi criado na 1.3.x, ele **não é
   compatível** com Evolution v2. Mantenha o volume antigo
   `whatsapp_provider_sessions_dev` se ainda existir, ou refaça o pareamento
   via QR no Evolution v2.
