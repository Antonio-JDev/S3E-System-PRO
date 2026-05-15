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

---

> # 📌 ATUALIZAÇÃO — Maio/2026 (v1.3.x: Traefik + Tailscale Funnel + Evolution Go)
>
> Procedimento histórico (acima) **continua válido para rollback** até a
> versão **1.1.6**. Para deploys **novos** (1.3.x ou superior) use as
> instruções desta seção, que substituem o `.env.production.example` por
> um novo template em **`.env.prod.md`** (raiz do repositório).

## 🆕 Novo template de variáveis — `.env.prod.md`

A partir da 1.3.x o template `.env.production.example` foi substituído por
`.env.prod.md` (na raiz do repo). A diferença é que `.env.prod.md` é um
**Markdown** que documenta cada bloco com comentários, e contém um bloco
"COLE A PARTIR DAQUI" que deve ser copiado para um arquivo chamado `.env`
(NÃO `.env.production`) na mesma pasta do `docker-compose.prod.yml`.

```bash
cd /caminho/do/projeto
git pull

# Criar .env a partir do template:
# (copie manualmente o bloco entre "COLE A PARTIR DAQUI" e "FIM do bloco")
nano .env.prod.md      # ler instruções
nano .env              # criar com o conteúdo

# Preencher (no mínimo):
#   JWT_SECRET                            → openssl rand -base64 48
#   DB_PASSWORD                           → senha real Postgres
#   SMTP_PASS                             → senha do email contato@
#   SMTP_FISCAL_PASS                      → senha do email fiscal@
#   WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN   → token da instância EvoGo
```

## 🆕 Pré-requisitos no servidor (1.3.x)

1. **Tailscale instalado e Funnel habilitado**
   ```bash
   tailscale status                                  # nó conectado?
   sudo tailscale serve --bg --http 80 http://localhost:80
   sudo tailscale funnel 443 on
   tailscale funnel status                           # 443 → :80 (Funnel on)
   ```

2. **Volumes externos criados** (mantêm dados em rollback):
   ```bash
   docker volume create apps_postgres_data
   docker volume create apps_backend_uploads
   docker volume create apps_backend_logs
   docker volume create apps_backend_certificados
   ```

3. **Rede do Traefik existente** (criada pelo compose, mas se já existir):
   ```bash
   docker network ls | grep traefik
   ```

## 🆕 Sequência de deploy (1.3.x)

```bash
cd /caminho/do/projeto
git pull

# 1) Garante .env presente (ver seção acima)
ls -la .env

# 2) Puxa as imagens da versão alvo (configurada em docker-compose.prod.yml):
docker compose -f docker-compose.prod.yml --env-file .env pull

# 3) Sobe (idempotente — só recria containers cuja imagem mudou):
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 4) Acompanha logs:
docker compose -f docker-compose.prod.yml --env-file .env logs -f \
  backend whatsapp-provider

# 5) Configurar webhook da Evolution Go (ver detalhe abaixo)
```

## 🆕 Passo crítico: configurar webhook + eventos na EvoGo

**Sem este passo o backend recebe ZERO mensagens.** Execute uma vez após a
instância ser criada e pareada pelo Manager:

```bash
APIKEY="$(grep '^WHATSAPP_PROVIDER_API_KEY=' .env | cut -d= -f2-)"

# Listar instâncias para descobrir o instanceId (UUID):
curl -s -H "apikey: $APIKEY" http://localhost:80/manager/instance/all | jq

# Configurar webhook URL + TODOS os eventos:
INSTANCE_ID="<UUID descoberto acima>"
curl -s -X POST \
  -H "apikey: $APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"http://backend:3001/api/webhooks/whatsapp","subscribe":["ALL"],"immediate":true}' \
  http://localhost:80/manager/instance/connect

# Confirmar (deve listar todos os 14 eventos):
curl -s -H "apikey: $APIKEY" \
  http://localhost:80/manager/instance/info/$INSTANCE_ID | jq '.data | {webhook, events, connected}'
```

> ⚠️ Usar `subscribe` (array). NÃO usar `events` (string) — pega só o primeiro.

## 🆕 Verificações pós-deploy (1.3.x)

```bash
# Frontend acessível (HTTPS público):
curl -I https://truenas.tailad9fda.ts.net

# Backend acessível (via Traefik + Funnel):
curl https://truenas.tailad9fda.ts.net/api/health
# esperado: {"status":"ok","db":"ok","time":"..."}

# Manager EvoGo:
curl https://truenas.tailad9fda.ts.net/manager/server/ok
# esperado: ok

# Status WhatsApp internamente:
docker compose -f docker-compose.prod.yml exec backend \
  curl -s http://whatsapp-provider:8080/instance/status \
  -H "apikey: $WHATSAPP_PROVIDER_API_KEY"
```

## 🆕 Adapter de webhook (importante para entender em incidente)

Em 13/05/2026 foi adicionado o adapter
**`backend/src/utils/whatsappEvolutionGoWebhook.util.ts`** que converte o
formato do webhook da EvoGo (whatsmeow nativo PascalCase) para o formato
Evolution v2 (Baileys camelCase) que o controller existente consome.

Se em produção aparecer no log:

```
[WA-WEBHOOK] event não suportado: "Message"
```

...significa que o adapter **não está sendo chamado**. Causas possíveis:

1. Build da imagem backend foi feita **antes** de 13/05/2026 — refazer build.
2. Variável `WHATSAPP_PROVIDER_KIND` está com valor errado — tem que ser
   `evolution-go` (não `evolution-api` nem `waha`).
3. O webhook está chegando em um path errado (deve ser `/api/webhooks/whatsapp`
   ou subpath `/api/webhooks/whatsapp/...`).

## 🆕 Procedimento de rollback (1.3.x → 1.1.6)

Caso a 1.3.x apresente problemas críticos em produção:

```bash
cd /caminho/do/projeto

# 1) Faça backup do .env atual:
cp .env .env.1.3.x.backup

# 2) Restaure o .env antigo (CORS com IPs + domínio app.s3eengenharia,
#    sem URLs HTTPS, sem WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN etc.).
#    Use o exemplo no início deste documento como guia.

# 3) Edite docker-compose.prod.yml (ou aplique o do tag git):
#       backend.image:  odev10antonio/s3e-backend:1.1.6
#       frontend.image: odev10antonio/s3e-frontend:1.1.6
#    e remova/desabilite o serviço `whatsapp-provider` se for usar a
#    Evolution API v2 do compose antigo.

# 4) Desabilite o Tailscale Funnel (volta a usar IP VPN + hosts):
sudo tailscale funnel 443 off
sudo tailscale serve reset

# 5) Confirme que hosts em cada PC contém:
#    100.74.201.62  app.s3eengenharia.com.br

# 6) Sobe:
docker pull odev10antonio/s3e-backend:1.1.6
docker pull odev10antonio/s3e-frontend:1.1.6
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 7) Healthcheck:
curl http://app.s3eengenharia.com.br:3001/api/health
```

> ⚠️ **Sessão WhatsApp**: o volume `evolution_go_dbdata` (criado pela
> EvoGo 1.3.x) **não é compatível** com Evolution v2. Para usar Evolution v2
> de novo é preciso refazer QR. Se ainda existir o volume antigo
> `whatsapp_provider_sessions_dev`, ele pode ser reaproveitado.

## 🆕 Histórico de imagens publicadas

| Tag    | Stack                                              | Comentário                                                           |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------- |
| 1.1.6  | Nginx direto + Evolution API v2 + WAHA + RabbitMQ  | Última versão pré-Traefik. Roda em `app.s3eengenharia.com.br`.       |
| 1.2.x  | Traefik + Let's Encrypt + Evolution v2             | Intermediária — só serve se quiser TLS com domínio próprio.          |
| 1.3.0  | Traefik + Tailscale Funnel + Evolution Go 0.7.1    | Inicial EvoGo (faltava o adapter de webhook).                        |
| 1.3.1  | Idem + adapter EvoGo webhook + subscribe:[ALL]     | **Atual** — webhook funcionando, anti-ban queue, jumbo emoji.        |

**Importante**: **NÃO** apagar tags antigas do Docker Hub. Elas são o
backup primário de rollback.
