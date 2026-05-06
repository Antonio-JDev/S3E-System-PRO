# 🔧 Correção: Validação XSD não funciona no Docker

## 📋 Problema Identificado

O backend não encontra os arquivos XSD para validação, mesmo que o volume esteja
montado corretamente. O erro ocorre por **problema de permissões**:

- O volume Docker está montado corretamente ✅
- A pasta `/app/PL_010b_NT2025_002_v1.30` existe no container ✅
- Mas o processo Node.js roda como usuário `nodejs` (UID 1001) ❌
- O diretório no host tem permissões `drwxr-xr-x 2 root root` (apenas root pode
  ler) ❌

## ✅ Solução Aplicada

### **1. Ajustar Permissões no HOST (Recomendado)**

No servidor TrueNAS, execute:

```bash
cd /mnt/S3E_SERVER/Apps/s3e-aplicacao
chmod -R 755 PL_010b_NT2025_002_v1.30
```

Isso permite que todos os usuários (incluindo o usuário `nodejs` dentro do
container) possam ler os arquivos.

### **2. Verificar Permissões Ajustadas**

```bash
ls -la PL_010b_NT2025_002_v1.30
# Deve mostrar: drwxr-xr-x (755)
```

### **3. Reiniciar o Container**

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### **4. Verificar se Funcionou**

```bash
# Verificar logs
docker logs s3e-backend-prod | grep XSD

# Ou testar dentro do container
docker exec s3e-backend-prod ls -la /app/PL_010b_NT2025_002_v1.30
docker exec s3e-backend-prod cat /app/PL_010b_NT2025_002_v1.30/nfe_v4.00.xsd | head -5
```

## 🔍 Como Verificar se Está Funcionando

Após aplicar a correção, você deve ver nos logs:

```
✅ [XSD] Usando caminho: /app/PL_010b_NT2025_002_v1.30
✅ [XSD] Todos os 5 arquivos XSD encontrados em: /app/PL_010b_NT2025_002_v1.30
```

Em vez de:

```
❌ [XSD] Nenhuma pasta de esquemas encontrada!
⚠️  [XSD] Validação XSD completa não estará disponível.
```

## 📝 Notas Técnicas

- O volume Docker está configurado como `read-only` (`:ro`) por segurança
- O processo Node.js roda como usuário não-privilegiado (`nodejs`, UID 1001)
- Permissões `755` no host permitem leitura por qualquer usuário no container
- Não é necessário remover o `:ro` do volume - apenas ajustar permissões no host

## 🚨 Alternativa: Se Não Puder Ajustar Permissões no Host

Se por algum motivo não puder ajustar as permissões no host, você pode:

1. **Remover o `:ro` temporariamente** (menos seguro):

   ```yaml
   - ./PL_010b_NT2025_002_v1.30:/app/PL_010b_NT2025_002_v1.30 # Sem :ro
   ```

2. **Ajustar no comando do container** (funciona apenas sem :ro):

   ```yaml
   command: sh -c "chmod -R 755 /app/PL_010b_NT2025_002_v1.30 && ..."
   ```

Mas **a solução recomendada é ajustar as permissões no host** (passo 1 acima).
