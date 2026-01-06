# 📋 Fluxo de Upload de Certificados NF-e

## ✅ Como Funciona

Quando você faz upload de um certificado `.pfx` pela interface:

### 1. **Upload do Arquivo**
- O arquivo `.pfx` é enviado como **Base64** do frontend para o backend
- O backend recebe via endpoint `POST /api/configuracoes-fiscais` ou `PUT /api/configuracoes-fiscais/:id`

### 2. **Salvamento do Arquivo**
- **Caminho no código**: `path.join(process.cwd(), 'data', 'certificados')`
- **No Docker**: `process.cwd()` = `/app`, então o caminho final é `/app/data/certificados`
- **Nome do arquivo**: `${CNPJ}_${timestamp}.pfx` (ex: `16625927000157_1767639132621.pfx`)
- **Volume Docker**: O arquivo é salvo no volume `backend_certificados` mapeado para `/app/data/certificados`

### 3. **Salvamento da Senha**
- A senha **NÃO** é salva no volume
- A senha é **criptografada** usando `CryptoUtil.encrypt()`
- A senha criptografada é salva no **banco de dados** (campo `certificadoSenha` da tabela `empresas_fiscais`)

### 4. **Salvamento do Caminho**
- O caminho completo do arquivo é salvo no banco: `/app/data/certificados/16625927000157_1767639132621.pfx`
- Isso permite que o sistema encontre o arquivo quando precisar assinar a NF-e

## 📁 Estrutura de Dados

### No Volume Docker (`backend_certificados`)
```
/app/data/certificados/
├── 16625927000157_1767639132621.pfx
├── 12345678000190_1767640000000.pfx
└── ...
```

### No Banco de Dados (`empresas_fiscais`)
```sql
id: uuid
cnpj: '16625927000157'
certificadoPath: '/app/data/certificados/16625927000157_1767639132621.pfx'
certificadoSenha: 'encrypted_hash_aqui'  -- Senha criptografada
certificadoValidade: '2026-01-06'
```

## 🔒 Segurança

### ✅ Boas Práticas Implementadas
1. **Senha criptografada**: A senha nunca é salva em texto puro
2. **Nome único**: Cada certificado tem timestamp para evitar conflitos
3. **Volume isolado**: Certificados ficam em volume separado dos uploads gerais
4. **Path no banco**: Apenas o caminho é salvo, não o conteúdo do arquivo

### ⚠️ Importante
- A senha é criptografada com AES (reversível para uso no sistema)
- O arquivo `.pfx` fica no volume Docker (persistente)
- O caminho e senha criptografada ficam no banco de dados

## 🔍 Verificação

### Verificar se certificado foi salvo no volume:
```bash
# Listar certificados no volume
docker exec s3e-backend-prod ls -la /app/data/certificados/

# Verificar se arquivo específico existe
docker exec s3e-backend-prod ls -la /app/data/certificados/16625927000157_*.pfx
```

### Verificar no banco de dados:
```sql
SELECT 
  cnpj, 
  certificadoPath, 
  certificadoValidade,
  CASE 
    WHEN certificadoSenha IS NOT NULL THEN 'Senha configurada' 
    ELSE 'Sem senha' 
  END as status_senha
FROM empresas_fiscais
WHERE certificadoPath IS NOT NULL;
```

## 🚀 Fluxo Completo

```
1. Usuário faz upload do .pfx + senha
   ↓
2. Frontend envia Base64 + senha para backend
   ↓
3. Backend recebe em POST/PUT /api/configuracoes-fiscais
   ↓
4. Backend decodifica Base64 → Buffer
   ↓
5. Backend salva arquivo em /app/data/certificados/{CNPJ}_{timestamp}.pfx
   ↓
6. Backend criptografa senha usando CryptoUtil.encrypt()
   ↓
7. Backend salva no banco:
   - certificadoPath: '/app/data/certificados/...'
   - certificadoSenha: 'hash_criptografado'
   - certificadoValidade: data + 1 ano
   ↓
8. Arquivo fica no volume Docker (persistente)
9. Dados ficam no banco de dados
```

## ✅ Confirmação

**SIM**, quando você fizer upload do certificado:

1. ✅ O arquivo `.pfx` será salvo em `/app/data/certificados/` (volume `backend_certificados`)
2. ✅ A senha será criptografada e salva no banco de dados (não no volume)
3. ✅ O caminho do arquivo será salvo no banco de dados
4. ✅ O arquivo ficará persistente mesmo após rebuild dos containers

## 🔧 Troubleshooting

### Erro: "Certificado não encontrado"
```bash
# Verificar se o volume está montado
docker exec s3e-backend-prod ls -la /app/data/certificados/

# Se estiver vazio, o volume pode não estar criado
docker volume inspect apps_backend_certificados
```

### Erro: "Permission denied"
```bash
# Ajustar permissões (se necessário)
docker exec s3e-backend-prod chown -R nodejs:nodejs /app/data
docker exec s3e-backend-prod chmod -R 755 /app/data/certificados
```

