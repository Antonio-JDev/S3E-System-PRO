# =============================================================================
# Modelo de .env para PRODUÇÃO — docker-compose.prod.yml (TrueNAS Scale / servidor)
# =============================================================================
# 1. Copie para o diretório onde está o compose:
#      cp docker-compose.prod.env.example .env
# 2. Substitua ALTERE_* e URLs pelos valores reais do seu ambiente.
# 3. Crie os volumes Docker externos antes do primeiro up (veja rodapé).
# 4. Suba:
#      docker compose -f docker-compose.prod.yml --env-file .env up -d
#
# O compose usa env_file: .env nos serviços postgres, whatsapp-provider, backend, pgadmin.
# A chave da Evolution DEVE ser a mesma no container evolution e no backend (variável abaixo).
# =============================================================================

# --- PostgreSQL (obrigatório) ---

DB_USER=s3e_prod
DB_PASSWORD=**ALTERE_SENHA_POSTGRES_FORTE**
DB_NAME=s3e_producao

# --- JWT (obrigatório) ---

JWT_SECRET=ALTERE_openssl_rand_hex_32_ou_similar
JWT_EXPIRES_IN=7d

# --- URLs públicas (obrigatório ajustar para seu domínio ou IP) ---
# Origem do frontend no navegador (CORS). Ex.: https://app.suaempresa.com ou http://192.168.1.10:8080

CORS_ORIGIN=http://192.168.1.10:8080
FRONTEND_URL=http://192.168.1.10:8080

# Base da API acessível pelo browser e serviços externos (e-mails, etc.). Ex.: http://192.168.1.10:3001

BACKEND_URL=http://192.168.1.10:3001

# --- Evolution API — mesma chave no provedor e no backend (obrigatório) ---

WHATSAPP_PROVIDER_API_KEY=ALTERE_mesmo_valor_que_AUTHENTICATION_API_KEY_evolution
WHATSAPP_PROVIDER_KIND=evolution
WHATSAPP_PROVIDER_SESSION=default
WHATSAPP_PROVIDER_INTEGRATION=WHATSAPP-BAILEYS
# Porta no HOST para Evolution (API + /manager). TrueNAS: libere no firewall.
WHATSAPP_PROVIDER_HTTP_PORT=3333
# URL que o usuário abre para QR code / manager (IP ou DNS do servidor + porta acima).
WHATSAPP_PROVIDER_DASHBOARD_PUBLIC_URL=http://192.168.1.10:3333/manager

# --- Webhook (opcional; reforço se expuser webhook à internet) ---
WHATSAPP_WEBHOOK_SECRET=

# --- SMTP contato (obrigatório se usar recuperação de senha / notificações) ---
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@example.com

# --- SMTP fiscal (NF-e / NFS-e por e-mail; pode igualar ao SMTP_* se for o mesmo servidor) ---

SMTP_FISCAL_HOST=
SMTP_FISCAL_PORT=465
SMTP_FISCAL_SECURE=true
SMTP_FISCAL_USER=
SMTP_FISCAL_PASS=
SMTP_FISCAL_FROM=

# --- PgAdmin (opcional; serviço exposto na porta 5050 do compose) ---

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=ALTERE_SENHA_PGADMIN

# =============================================================================
# Volumes externos — crie UMA VEZ antes de docker compose up:
#   docker volume create apps_postgres_data
#   docker volume create apps_backend_uploads
#   docker volume create apps_backend_logs
#   docker volume create apps_backend_certificados
#   docker volume create apps_whatsapp_provider_sessions
#
# Pastas no host (relativas ao compose): ./backups, ./PL_010b..., ./nfse-xsd — ajuste ou crie no TrueNAS.
# Imagem backend usa tag do compose; frontend publica 8080:80.
# =============================================================================
