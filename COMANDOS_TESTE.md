# 🚀 Comandos para Rodar e Testar o Sistema

## 📋 Opções Disponíveis

### ✅ OPÇÃO 1: Desenvolvimento com Docker (RECOMENDADO para testes)

**Vantagens:**
- ✅ Hot reload automático (mudanças refletem sem rebuild)
- ✅ Não precisa buildar manualmente
- ✅ Melhor para desenvolvimento e testes

**Comandos:**

```bash
# 1. Ir para o diretório do projeto
cd /mnt/S3E_SERVER/Apps/s3e-aplicacao

# 2. Rodar os containers em modo desenvolvimento
docker-compose up --build

# OU em background:
docker-compose up --build -d

# 3. Ver logs do backend
docker-compose logs -f backend

# 4. Parar os containers
docker-compose down
```

**URLs:**
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- Postman: Use `http://localhost:3001/api/...`

---

### ✅ OPÇÃO 2: Produção com Docker (para deploy)

**Vantagens:**
- ✅ Ambiente igual à produção
- ✅ Performance otimizada

**Comandos:**

```bash
# 1. Ir para o diretório do projeto
cd /mnt/S3E_SERVER/Apps/s3e-aplicacao

# 2. Buildar o backend primeiro (se mudou código)
cd backend
npm run build
cd ..

# 3. Rodar containers de produção
docker-compose -f docker-compose.prod.yml up -d

# 4. Ver logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 5. Parar
docker-compose -f docker-compose.prod.yml down
```

**URLs:**
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:80`
- Postman: Use `http://localhost:3001/api/...`

---

### ✅ OPÇÃO 3: Desenvolvimento Local (SEM Docker)

**Vantagens:**
- ✅ Mais rápido para debug
- ✅ Acesso direto aos logs

**Comandos:**

```bash
# 1. Ir para o backend
cd backend

# 2. Instalar dependências (se necessário)
npm install

# 3. Buildar o código TypeScript
npm run build

# 4. Rodar o servidor
npm start

# OU em modo desenvolvimento (hot reload):
npm run dev
```

**URLs:**
- Backend: `http://localhost:3001`
- Postman: Use `http://localhost:3001/api/...`

---

## 🧪 Testes Unitários (Opcional)

**Para rodar testes unitários:**

```bash
cd backend
npm test

# Testes em modo watch (re-executa ao salvar)
npm test -- --watch

# Testes com cobertura
npm test -- --coverage
```

**⚠️ IMPORTANTE:** `npm test` NÃO inicia o servidor, apenas executa testes unitários.

---

## 📝 Checklist para Testar no Postman

### 1. Verificar se o backend está rodando

```bash
# Teste de saúde
curl http://localhost:3001/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 2. Obter Token de Autenticação

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "password": "sua-senha"
  }'
```

### 3. Testar Endpoint de NF-e

```bash
curl -X GET http://localhost:3001/api/nfe/notas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"

**Solução:**
```bash
cd backend
npm install
npm run build
```

### Erro: "Port 3001 already in use"

**Solução:**
```bash
# Verificar o que está usando a porta
netstat -ano | findstr :3001

# Parar o processo ou mudar a porta no .env
```

### Erro: "Database connection failed"

**Solução:**
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Ver logs do banco
docker-compose logs postgres
```

### Container não inicia

**Solução:**
```bash
# Ver logs detalhados
docker-compose logs backend

# Rebuildar do zero
docker-compose down -v
docker-compose up --build
```

---

## 📚 Próximos Passos

1. ✅ Escolha uma opção acima
2. ✅ Rode o backend
3. ✅ Teste no Postman usando o `GUIA_TESTES_NFE.md`
4. ✅ Verifique os logs para debug

---

**Última atualização:** Janeiro 2025

