# 🔧 Correção do Arquivo .env em Produção

## ❌ Problema Identificado

No servidor de produção (TrueNAS), o arquivo `.env` tem uma **inconsistência** entre `CORS_ORIGIN` e `FRONTEND_URL`:

### Configuração Atual (PROBLEMÁTICA):

```env
FRONTEND_URL=http://192.168.100.228
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080
```

### Problemas:

1. ❌ `FRONTEND_URL` não tem porta (deveria ser `:8080` ou `:80`)
2. ❌ `FRONTEND_URL` não inclui o IP do Tailscale (`100.74.201.62`)
3. ❌ `FRONTEND_URL` não está alinhado com as URLs do `CORS_ORIGIN`
4. ⚠️ Quando o frontend faz requisições, pode estar usando a URL errada

---

## ✅ Solução

### Opção 1: Usar o IP do Tailscale como principal (RECOMENDADO)

Se você acessa principalmente via Tailscale, configure assim:

```env
FRONTEND_URL=http://100.74.201.62:8080
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080
```

### Opção 2: Usar o IP local como principal

Se você acessa principalmente pela rede local:

```env
FRONTEND_URL=http://192.168.100.228:8080
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080
```

### Opção 3: Usar o domínio (se disponível)

Se você tem um domínio configurado:

```env
FRONTEND_URL=http://app.s3eengenharia.com.br:8080
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080
```

---

## 🔍 Por que isso é importante?

O `FRONTEND_URL` é usado para:

1. **Links em emails** (recuperação de senha, notificações)
2. **Redirecionamentos** após login/logout
3. **URLs de callback** em algumas funcionalidades

Se o `FRONTEND_URL` estiver errado:
- ❌ Links em emails podem não funcionar
- ❌ Redirecionamentos podem falhar
- ❌ O frontend pode tentar se conectar ao backend usando URL errada

---

## 📝 Arquivo .env Corrigido (RECOMENDADO)

Aqui está o arquivo `.env` completo e corrigido para produção:

```env
# ========================================
# AMBIENTE DE PRODUÇÃO (S3E ENGENHARIA)
# ========================================

# Banco de Dados
DB_HOST=postgres
DB_PORT=5432
DB_USER=s3e_prod
DB_PASSWORD=Eng.elet30838361
DB_NAME=s3e_producao

# PostgreSQL (DOCKER COMPOSE)
POSTGRES_DB=s3e_producao
POSTGRES_USER=s3e_prod
POSTGRES_PASSWORD=Eng.elet30838361

# Segurança JWT (CRÍTICO!)
JWT_SECRET=dd3eb204de036fe9d4647b69daf77c7c102919cd84a350b0729d2c01f8d6306a

# Configurações
NODE_ENV=production
BACKEND_PORT=3001

# ✅ CORRIGIDO: FRONTEND_URL alinhado com CORS_ORIGIN
# Use o IP do Tailscale se acessar principalmente via Tailscale
FRONTEND_URL=http://100.74.201.62:8080

# CORS - IMPORTANTE para funcionar no TrueNAS e Tailscale
# ✅ Já está correto com todas as URLs necessárias
CORS_ORIGIN=http://192.168.100.228,http://192.168.100.228:8080,http://s3e-system-vpn:8080,http://100.74.201.62:8080,http://app.s3eengenharia.com.br:8080

# PgAdmin Configuration
PGADMIN_EMAIL=contato@s3eengenharia.com.br
PGADMIN_PASSWORD=Eng.elet30838361

# Email/SMTP - Configuração UOL
SMTP_HOST=smtps.uhserver.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@s3eengenharia.com.br
SMTP_PASS=Eng.elet30838361
SMTP_FROM=contato@s3eengenharia.com.br

# ===========================
# SVC-AN (unificado com SVAN)
# ===========================

# Autorização
NFE_SVC_AN_AUT_WSDL=https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx?wsdl

# Retorno de Autorização
NFE_SVC_AN_RETAUT_WSDL=https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx?wsdl

# Status do Serviço
NFE_SVC_AN_STATUS_WSDL=https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx?wsdl
```

---

## 🚀 Como Aplicar a Correção

### No servidor de produção (TrueNAS):

1. **Acesse o servidor via SSH ou interface do TrueNAS**

2. **Edite o arquivo `.env`** na raiz do projeto:
   ```bash
   nano .env
   ```

3. **Altere a linha `FRONTEND_URL`**:
   ```env
   # ANTES (ERRADO):
   FRONTEND_URL=http://192.168.100.228
   
   # DEPOIS (CORRETO - escolha uma opção):
   FRONTEND_URL=http://100.74.201.62:8080  # Se acessar via Tailscale
   # OU
   FRONTEND_URL=http://192.168.100.228:8080  # Se acessar pela rede local
   ```

4. **Salve o arquivo** (Ctrl+O, Enter, Ctrl+X no nano)

5. **Reinicie o container do backend**:
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

6. **Verifique os logs** para confirmar que as variáveis foram carregadas:
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend | grep -i "cors\|frontend"
   ```

---

## ✅ Verificação

Após aplicar a correção, verifique:

1. **Acesse via Tailscale**: `http://100.74.201.62:8080`
2. **Tente fazer login**: Deve funcionar agora
3. **Teste recuperação de senha**: O link no email deve apontar para a URL correta
4. **Verifique logs do backend**: Não deve aparecer erros de CORS

---

## 📌 Notas Importantes

1. **Docker Compose lê automaticamente o arquivo `.env`** na raiz do projeto
2. **Não precisa renomear para `.env.production`** - o docker-compose lê `.env` por padrão
3. **O `CORS_ORIGIN` já está correto** - não precisa alterar
4. **Apenas o `FRONTEND_URL` precisa ser corrigido** para incluir a porta e o IP correto

---

## 🔍 Por que o acesso remoto não funcionava antes?

Antes das correções que fizemos:

1. ❌ O código do CORS não aceitava automaticamente IPs do Tailscale
2. ❌ O `FRONTEND_URL` estava incorreto (sem porta)
3. ❌ O frontend podia estar tentando se conectar usando URL errada

Agora com as correções:

1. ✅ O código do CORS aceita automaticamente IPs do Tailscale (100.x.x.x)
2. ✅ O `FRONTEND_URL` pode ser corrigido para incluir porta e IP correto
3. ✅ O `CORS_ORIGIN` já tem todas as URLs necessárias

---

**Última atualização**: $(date)

