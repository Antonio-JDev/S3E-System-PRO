# 📋 Instruções: Volume de Certificados NF-e

## 🔧 Problema Resolvido

O sistema estava tentando acessar certificados em `/app/data/certificados/` mas o volume não estava montado no Docker, causando erro:
```
❌ Erro ao carregar certificado: Certificado não encontrado em: /app/data/certificados/16625927000157_1767639132621.pfx
```

## ✅ Alterações Realizadas

### 1. `docker-compose.prod.yml`
- ✅ Adicionado volume `backend_certificados:/app/data/certificados`
- ✅ Volume configurado como `external: true` (nome: `apps_backend_certificados`)

### 2. `backend/Dockerfile`
- ✅ Adicionado comando para criar diretório `/app/data/certificados` durante o build

## 🚀 Passos para Deploy

### **IMPORTANTE: Criar o volume ANTES de subir os containers**

No servidor TrueNAS, execute:

```bash
# 1. Criar o volume Docker (se ainda não existir)
docker volume create --name apps_backend_certificados

# 2. Verificar se foi criado
docker volume inspect apps_backend_certificados

# 3. Atualizar o docker-compose.prod.yml com a nova versão da imagem
# (editar manualmente ou fazer pull das novas imagens)

# 4. Fazer pull das novas imagens
docker-compose -f docker-compose.prod.yml pull

# 5. Parar os containers
docker-compose -f docker-compose.prod.yml down

# 6. Subir os containers (o volume será montado automaticamente)
docker-compose -f docker-compose.prod.yml up -d

# 7. Verificar se o volume está montado corretamente
docker exec s3e-backend-prod ls -la /app/data/certificados/
```

## 📝 Notas Importantes

1. **Volume Persistente**: O volume `apps_backend_certificados` é persistente e não será perdido ao recriar containers.

2. **Certificados Existentes**: Se você já tinha certificados salvos antes desta alteração, eles podem estar em outro local. Você precisará:
   - Fazer upload novamente dos certificados pela interface
   - OU copiar manualmente os arquivos para o volume (se souber onde estavam)

3. **Permissões**: O diretório será criado automaticamente com as permissões corretas pelo Dockerfile.

4. **Backup**: Certifique-se de fazer backup dos certificados antes de qualquer alteração!

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

```bash
# Verificar se o diretório existe no container
docker exec s3e-backend-prod ls -la /app/data/certificados/

# Verificar logs do backend para confirmar que não há erros
docker logs s3e-backend-prod | grep -i certificado

# Testar upload de certificado pela interface
# (ir em Configurações Fiscais > Adicionar/Editar Empresa Fiscal > Upload de Certificado)
```

## ⚠️ Troubleshooting

### Erro: "volume not found"
```bash
# Criar o volume manualmente
docker volume create --name apps_backend_certificados
```

### Erro: "permission denied"
```bash
# Verificar permissões do volume
docker exec s3e-backend-prod ls -la /app/data/
# Se necessário, ajustar permissões dentro do container
docker exec s3e-backend-prod chown -R nodejs:nodejs /app/data
```

### Certificados não aparecem após upload
- Verificar se o upload foi bem-sucedido (logs do backend)
- Verificar se o arquivo foi salvo no volume:
  ```bash
  docker exec s3e-backend-prod ls -la /app/data/certificados/
  ```

