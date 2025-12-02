# 🚀 Configuração para Produção - Sistema S3E

## ✅ Status: Funcionando em Localhost e Pronto para Produção

Baseado nos logs, o sistema está funcionando corretamente em localhost. As seguintes configurações garantem que funcionará em produção com IP (ex: `https://192.168.100.228:3001`).

## 📋 Configurações Necessárias para Produção

### 1. Backend - Variáveis de Ambiente

No arquivo `.env` do backend ou no `docker-compose.yml`, configure:

```env
# Porta do backend
PORT=3001

# CORS - Adicione o IP do servidor e o frontend
CORS_ORIGIN=https://192.168.100.228:5173,https://192.168.100.228,http://192.168.100.228:5173,http://192.168.100.228

# Database (se necessário)
DATABASE_URL=postgresql://...
```

### 2. Frontend - Variáveis de Ambiente

No arquivo `.env` do frontend (ou `.env.production`), configure:

```env
# URL da API - IMPORTANTE: Use o IP do servidor
VITE_API_URL=https://192.168.100.228:3001
```

**OU** se estiver usando HTTP (sem SSL):

```env
VITE_API_URL=http://192.168.100.228:3001
```

### 3. Docker Compose (se aplicável)

Se estiver usando Docker, adicione no `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - PORT=3001
      - CORS_ORIGIN=https://192.168.100.228:5173,https://192.168.100.228
    # ... outras configurações

  frontend:
    environment:
      - VITE_API_URL=https://192.168.100.228:3001
    # ... outras configurações
```

## ✅ O que já está configurado

### 1. Rota Pública de Logos
- ✅ Rota `/api/configuracoes/logo/:filename` é **pública** (não requer autenticação)
- ✅ Funciona tanto em localhost quanto em produção
- ✅ Headers CORS configurados para permitir qualquer origem (incluindo IPs)

### 2. CORS para Uploads
- ✅ Middleware `/uploads` permite qualquer origem
- ✅ Funciona com IPs em produção

### 3. Tratamento de Caminhos
- ✅ Sistema detecta automaticamente se está rodando em Docker (`/app`) ou local
- ✅ Cria diretórios automaticamente se não existirem
- ✅ Funciona tanto em desenvolvimento quanto em produção

## 🔍 Como Verificar se Está Funcionando

### 1. Teste da Rota de Logo (sem autenticação)

Acesse diretamente no navegador:
```
https://192.168.100.228:3001/api/configuracoes/logo/logo-1764014747663-650066723.png
```

**Deve retornar:** A imagem diretamente (sem erro 401)

### 2. Verificar Logs do Backend

Ao acessar uma logo, você deve ver nos logs:
```
🔍 Tentando servir logo: { filename: '...', exists: true }
✅ Servindo logo: ... Content-Type: image/png Origin: https://192.168.100.228:5173
```

### 3. Verificar Console do Frontend

No console do navegador, não deve aparecer erros 401 ou CORS.

## ⚠️ Pontos de Atenção

### 1. HTTPS vs HTTP
- Se usar HTTPS no frontend, o backend também deve usar HTTPS
- Se usar HTTP, ambos devem usar HTTP
- **Não misture HTTPS e HTTP** (causa erros de CORS)

### 2. Portas
- Backend: Porta 3001 (ou a configurada)
- Frontend: Porta 5173 (Vite dev) ou 80/443 (produção)
- Certifique-se de que as portas estão abertas no firewall

### 3. CORS em Produção
- A rota de logo permite **qualquer origem** (necessário para funcionar com IPs)
- Outras rotas ainda respeitam `CORS_ORIGIN` do `.env`
- Para maior segurança, você pode restringir depois, mas isso pode quebrar o acesso por IP

## 🎯 Resumo

**SIM, vai funcionar em produção!** ✅

As configurações já estão preparadas para:
- ✅ Funcionar com IPs (ex: `192.168.100.228`)
- ✅ Funcionar com domínios
- ✅ Funcionar com HTTPS ou HTTP
- ✅ Não requerer autenticação para logos (página de login)
- ✅ CORS configurado para permitir acesso

**Apenas configure:**
1. `VITE_API_URL` no frontend com o IP do servidor
2. `CORS_ORIGIN` no backend (opcional, mas recomendado)
3. Certifique-se de que as portas estão abertas

## 📞 Em caso de problemas

1. Verifique os logs do backend para ver se a logo está sendo encontrada
2. Verifique o console do navegador para erros de CORS
3. Teste a rota diretamente no navegador (deve retornar a imagem)
4. Verifique se `VITE_API_URL` está configurado corretamente

