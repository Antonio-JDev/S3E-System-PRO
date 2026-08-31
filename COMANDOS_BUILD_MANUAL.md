# Comandos para Build Manual das Imagens Docker

## 📋 Visão Geral

Este documento mostra os comandos para buildar as imagens Docker manualmente,
permitindo ver todo o processo de construção no terminal.

## 🔧 Configuração

- **Backend**: Não precisa de variáveis de ambiente no build (usa .env em
  runtime)
- **Frontend**: Precisa de `VITE_API_URL` no build (fica "chumbado" na imagem)

## 🚀 Comandos para Build Manual

### 1. Build do Backend

```bash
docker build -t odev10antonio/s3e-backend:1.1.6 \
  --target production \
  -f backend/Dockerfile \
  ./backend
```

**O que acontece:**

- Compila o TypeScript
- Instala dependências de produção
- Cria a imagem otimizada
- Você verá todo o processo no terminal

### 2. Build do Frontend

```bash
docker build -t odev10antonio/s3e-frontend:1.1.6 \
  --target production \
  --build-arg VITE_API_URL=http://app.s3eengenharia.com.br:3001 \
  -f frontend/Dockerfile \
  ./frontend
```

**O que acontece:**

- Instala dependências do Node.js
- Builda o frontend com Vite (com o domínio "chumbado")
- Copia para imagem Nginx
- Você verá todo o processo no terminal

**⚠️ IMPORTANTE**: O domínio `http://app.s3eengenharia.com.br:3001` fica
**permanentemente** no código JavaScript compilado do frontend.

### 3. Push para Docker Hub

Após os builds bem-sucedidos:

```bash
# Push do Backend
docker push odev10antonio/s3e-backend:1.1.6

# Push do Frontend
docker push odev10antonio/s3e-frontend:1.1.6
```

## 📝 Exemplo Completo (Passo a Passo)

```bash
# 1. Navegar para a pasta do projeto
cd /caminho/para/S3E-System-PRO

# 2. Verificar se está logado no Docker Hub
docker login

# 3. Build do Backend (você verá todo o processo)
echo "=== BUILDING BACKEND ==="
docker build -t odev10antonio/s3e-backend:1.1.6 \
  --target production \
  -f backend/Dockerfile \
  ./backend

# 4. Build do Frontend (você verá todo o processo)
echo "=== BUILDING FRONTEND ==="
docker build -t odev10antonio/s3e-frontend:1.1.6 \
  --target production \
  --build-arg VITE_API_URL=http://app.s3eengenharia.com.br:3001 \
  -f frontend/Dockerfile \
  ./frontend

# 5. Push do Backend
echo "=== PUSHING BACKEND ==="
docker push odev10antonio/s3e-backend:1.1.6

# 6. Push do Frontend
echo "=== PUSHING FRONTEND ==="
docker push odev10antonio/s3e-frontend:1.1.6

echo "=== CONCLUÍDO ==="
```

## 🔍 Verificar as Imagens Criadas

```bash
# Listar imagens locais
docker images | grep s3e

# Ver detalhes de uma imagem
docker inspect odev10antonio/s3e-frontend:1.1.6

# Ver histórico de build
docker history odev10antonio/s3e-frontend:1.1.6
```

## ⚡ Build Rápido (Sem Ver Detalhes)

Se quiser usar os scripts mas ainda ver o output:

```bash
# Windows
build-and-push.bat 1.1.6

# Linux/Mac
./build-and-push.sh 1.1.6
```

## 🎯 Resumo da Configuração

| Componente   | Onde Configura           | Valor                                                                                               |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Backend**  | `.env` (runtime)         | `BACKEND_URL=http://100.74.201.62:3001`                                                             |
| **Frontend** | Build arg (compile-time) | `VITE_API_URL=http://app.s3eengenharia.com.br:3001`                                                 |
| **CORS**     | `.env` (runtime)         | `CORS_ORIGIN=http://192.168.100.228,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080` |

## ✅ Por Que Essa Configuração?

1. **Backend**: Usa `.env` em runtime, então pode mudar sem rebuild
2. **Frontend**: Vite injeta `VITE_API_URL` no código JavaScript durante o
   build, então precisa rebuildar para mudar
3. **Domínio no Frontend**: Funciona porque o arquivo `hosts` em cada PC mapeia
   o domínio para o IP do Tailscale

## 🐛 Troubleshooting

### Build falha com erro de permissão

```bash
# No Linux/Mac, pode precisar de sudo
sudo docker build ...
```

### Build do frontend não usa a variável

```bash
# Verificar se o build arg está correto
docker build --build-arg VITE_API_URL=http://app.s3eengenharia.com.br:3001 ...
```

### Ver o que foi buildado no frontend

```bash
# Executar container temporário e verificar
docker run --rm odev10antonio/s3e-frontend:1.1.6 cat /usr/share/nginx/html/assets/index-*.js | grep -i "app.s3eengenharia"
```

---

> # 📌 ATUALIZAÇÃO — Maio/2026 (Traefik + Tailscale Funnel + Evolution Go)
>
> A partir da versão **1.3.x** o stack mudou bastante. As seções acima continuam
> válidas como histórico/rollback (até a v1.1.6). Para builds novos use as
> instruções desta seção.

## 🆕 O que mudou no stack 1.3.x

| Componente           | Antes (≤ 1.1.6)                               | Agora (1.3.x)                                                            |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| **Reverse proxy**    | Nginx direto + portas expostas (80/3001)      | Traefik 2.10.7 (PathPrefix por Host)                                     |
| **TLS / Domínio**    | `app.s3eengenharia.com.br` via hosts + IP VPN | Tailscale Funnel `truenas.tailad9fda.ts.net` (cert \*.ts.net automático) |
| **WhatsApp**         | Evolution API v2 (`atendai/evolution-api`)    | **Evolution Go 0.7.1** (`evoapicloud/evolution-go`) — whatsmeow nativo   |
| **Mensageria**       | RabbitMQ + WAHA (Chrome headless)             | Removidos. EvoGo entrega webhook HTTP direto pro backend                 |
| **VITE_API_URL**     | `http://app.s3eengenharia.com.br:3001`        | `https://truenas.tailad9fda.ts.net/api`                                  |
| **Volumes WhatsApp** | `whatsapp_provider_sessions_dev`              | `evolution_go_dbdata` + `evolution_go_logs`                              |

## 🆕 Build da versão 1.3.x

### 1. Backend (igual em estrutura, sem build-args novos)

```bash
docker build -t odev10antonio/s3e-backend:1.3.1 \
  --target production \
  -f backend/Dockerfile \
  ./backend
```

### 2. Frontend (URL nova!)

```bash
docker build -t odev10antonio/s3e-frontend:1.3.1 \
  --target production \
  --build-arg VITE_API_URL=https://truenas.tailad9fda.ts.net/api \
  -f frontend/Dockerfile \
  ./frontend
```

**⚠️ ATENÇÃO:** `VITE_API_URL` mudou de `http://app.s3eengenharia.com.br:3001`
para `https://truenas.tailad9fda.ts.net/api`. O sufixo `/api` é OBRIGATÓRIO
porque o backend Express monta todas as rotas em `/api/*` e o Traefik **não**
faz `stripPrefix /api` (a linha está comentada no compose — veja
`docker-compose.prod.yml` linha 198–202).

### 3. Push para Docker Hub

```bash
docker push odev10antonio/s3e-backend:1.3.1
docker push odev10antonio/s3e-frontend:1.3.1
```

## 🚀 Pipeline completo (1.3.x)

```bash
cd /caminho/para/S3E-System-PRO

docker login

VERSION=1.3.1

echo "=== BUILDING BACKEND $VERSION ==="
docker build -t odev10antonio/s3e-backend:$VERSION \
  --target production -f backend/Dockerfile ./backend

echo "=== BUILDING FRONTEND $VERSION ==="
docker build -t odev10antonio/s3e-frontend:$VERSION \
  --target production \
  --build-arg VITE_API_URL=https://truenas.tailad9fda.ts.net/api \
  -f frontend/Dockerfile ./frontend

echo "=== PUSHING ==="
docker push odev10antonio/s3e-backend:$VERSION
docker push odev10antonio/s3e-frontend:$VERSION

echo "=== CONCLUÍDO ==="
```

## 🆕 Verificar VITE_API_URL embutida (1.3.x)

```bash
docker run --rm odev10antonio/s3e-frontend:1.3.1 \
  sh -c 'cat /usr/share/nginx/html/assets/index-*.js' \
  | grep -oE 'https://truenas\.tailad9fda\.ts\.net/api' | head -1
```

Se retornar `https://truenas.tailad9fda.ts.net/api` o build está correto.

## 🆕 Tabela resumo 1.3.x

| Componente   | Onde Configura           | Valor (produção 1.3.x)                                     |
| ------------ | ------------------------ | ---------------------------------------------------------- |
| **Backend**  | `.env` (runtime)         | `BACKEND_URL=https://truenas.tailad9fda.ts.net/api`        |
| **Frontend** | Build arg (compile-time) | `VITE_API_URL=https://truenas.tailad9fda.ts.net/api`       |
| **CORS**     | `.env` (runtime)         | `CORS_ORIGIN=https://truenas.tailad9fda.ts.net`            |
| **EvoGo**    | `.env` (runtime)         | `WHATSAPP_PROVIDER_KIND=evolution-go`                      |
| **EvoGo TK** | `.env` (runtime)         | `WHATSAPP_PROVIDER_GO_INSTANCE_TOKEN=<token da instância>` |

## 🔁 Rollback rápido (versão anterior)

Caso a 1.3.x apresente problemas, é possível voltar puxando uma tag anterior:

```bash
# No servidor de produção:
docker pull odev10antonio/s3e-backend:1.1.6
docker pull odev10antonio/s3e-frontend:1.1.6

# Edite docker-compose.prod.yml (ou use TAG via .env):
#   backend.image:  odev10antonio/s3e-backend:1.1.6
#   frontend.image: odev10antonio/s3e-frontend:1.1.6

# AVISO: a 1.1.6 não tem o adapter EvoGo nem subscribe:[ALL] — usar com
# Evolution API v2 (atendai/evolution-api), não com EvoGo.
docker compose -f docker-compose.prod.yml up -d
```

Histórico de imagens publicadas (manter por segurança):

| Versão | Stack                                      | Quando usar para rollback                                           |
| ------ | ------------------------------------------ | ------------------------------------------------------------------- |
| 1.1.6  | Nginx + Evolution v2 + WAHA + hosts manual | Se a 1.3.x falhar e for preciso voltar ao DNS antigo (`app.s3e...`) |
| 1.2.x  | Traefik + Let's Encrypt + Evolution v2     | Intermediária — só serve se quiser TLS público com domínio próprio  |
| 1.3.x  | Traefik + Tailscale Funnel + Evolution Go  | **Atual** — webhook nativo whatsmeow, sem WAHA, sem RabbitMQ        |
