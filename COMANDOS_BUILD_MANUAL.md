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
