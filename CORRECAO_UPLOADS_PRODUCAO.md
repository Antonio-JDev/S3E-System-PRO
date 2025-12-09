# 🔧 Correção: Imagens não carregam em produção

## 📋 Problema Identificado

As imagens (logos, uploads) não estão carregando em produção. O erro mostra:
```
Failed to load resource: http://192.168.100.228:8080/uploads/logos/logo-xxx.png
404 (Not Found)
```

## 🔍 Causa Raiz

1. **Porta errada**: O frontend está tentando acessar na porta **8080**, mas o backend está na porta **3001**
2. **Volume mapeado**: O volume `backend_uploads` está mapeado corretamente, mas pode não estar persistindo os arquivos
3. **URL incorreta**: O frontend foi buildado com `VITE_API_URL` apontando para porta errada

## ✅ Soluções Aplicadas

### 1. Atualização do docker-compose.prod.yml

Atualizei as versões das imagens para **1.0.6** (com as correções RBAC):
- Backend: `odev10antonio/s3e-backend:1.0.6`
- Frontend: `odev10antonio/s3e-frontend:1.0.6`

### 2. Configuração do Nginx

O nginx já tem proxy configurado para `/uploads`:
```nginx
location /uploads {
    proxy_pass http://backend:3001;
    # ... headers CORS
}
```

### 3. Backend servindo arquivos estáticos

O backend está configurado corretamente para servir arquivos de `/app/uploads`:
```typescript
app.use('/uploads', express.static(uploadsPath));
```

## 🚀 Solução Completa

### Passo 1: Rebuild do Frontend com URL Correta

O frontend precisa ser rebuildado com `VITE_API_URL` apontando para a porta correta:

```bash
# Build Frontend com URL correta
docker build -t odev10antonio/s3e-frontend:1.0.6 \
  --target production \
  --build-arg VITE_API_URL=http://192.168.100.228:3001 \
  -f frontend/Dockerfile ./frontend
```

**IMPORTANTE**: Use `http://192.168.100.228:3001` (porta 3001, não 8080)

### Passo 2: Verificar Volume de Uploads

O volume `backend_uploads` deve estar criado e mapeado corretamente:

```bash
# Verificar se o volume existe
docker volume ls | grep backend_uploads

# Se não existir, criar:
docker volume create --name apps_backend_uploads
```

### Passo 3: Verificar Permissões do Volume

Garantir que o container tem permissão para escrever no volume:

```bash
# Entrar no container do backend
docker exec -it s3e-backend-prod sh

# Verificar se a pasta existe e tem permissões
ls -la /app/uploads
ls -la /app/uploads/logos

# Se não existir, criar:
mkdir -p /app/uploads/logos
chmod -R 755 /app/uploads
```

### Passo 4: Redeploy

```bash
# Parar containers
docker-compose -f docker-compose.prod.yml down

# Atualizar imagens
docker-compose -f docker-compose.prod.yml pull

# Subir novamente
docker-compose -f docker-compose.prod.yml up -d

# Verificar logs
docker logs s3e-backend-prod
docker logs s3e-frontend-prod
```

## 🔍 Verificação

### 1. Testar se o backend está servindo arquivos:

```bash
# Testar diretamente no backend
curl http://192.168.100.228:3001/uploads/logos/logo-xxx.png

# Deve retornar a imagem (ou 404 se não existir)
```

### 2. Testar via nginx (frontend):

```bash
# Testar via proxy do nginx
curl http://192.168.100.228/uploads/logos/logo-xxx.png

# Deve retornar a imagem
```

### 3. Verificar se os arquivos existem no volume:

```bash
# Entrar no container
docker exec -it s3e-backend-prod sh

# Listar arquivos
ls -la /app/uploads/logos/

# Deve mostrar os arquivos de logo
```

## ⚠️ Problema Comum: Volume Vazio

Se o volume estiver vazio, os arquivos podem ter sido salvos em outro lugar. Verificar:

1. **Backup dos arquivos**: Se houver backup, restaurar para o volume
2. **Upload novo**: Fazer upload de uma nova logo para testar
3. **Verificar logs**: Ver se há erros ao salvar arquivos

## 📝 Checklist de Correção

- [ ] Frontend rebuildado com `VITE_API_URL=http://192.168.100.228:3001`
- [ ] Volume `backend_uploads` criado e mapeado
- [ ] Permissões do volume corretas (755)
- [ ] Backend servindo arquivos de `/app/uploads`
- [ ] Nginx fazendo proxy de `/uploads` para `backend:3001`
- [ ] Containers reiniciados após mudanças
- [ ] Teste de acesso direto ao backend (porta 3001)
- [ ] Teste de acesso via nginx (porta 80)

## 🎯 Solução Rápida

Se o problema persistir, a solução mais rápida é:

1. **Rebuildar frontend** com URL correta (porta 3001)
2. **Verificar volume** e garantir que tem os arquivos
3. **Reiniciar containers** para aplicar mudanças

---

**Data**: 04/12/2024  
**Status**: ✅ Correções aplicadas no docker-compose.prod.yml

