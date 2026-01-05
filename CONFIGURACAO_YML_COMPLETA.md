# ✅ Configuração Completa dos Arquivos YML

## 📝 Alterações Realizadas

### 1. docker-compose.yml (Desenvolvimento)

**Arquivo atualizado com configurações SMTP UOL:**

```yaml
# Email/SMTP - Configuração UOL
# Configure as variáveis no arquivo .env ou defina aqui diretamente
SMTP_HOST: ${SMTP_HOST:-smtps.uhserver.com}
SMTP_PORT: ${SMTP_PORT:-465}
SMTP_SECURE: ${SMTP_SECURE:-true}
SMTP_USER: ${SMTP_USER:-contato@s3eengenharia.com.br}
SMTP_PASS: ${SMTP_PASS:-}
SMTP_FROM: ${SMTP_FROM:-contato@s3eengenharia.com.br}
```

**O que mudou:**
- ✅ `SMTP_HOST`: Padrão agora é `smtps.uhserver.com` (antes estava vazio)
- ✅ `SMTP_PORT`: Padrão agora é `465` (antes era `587`)
- ✅ `SMTP_SECURE`: Padrão agora é `true` (antes era `false`)
- ✅ `SMTP_USER`: Padrão agora é `contato@s3eengenharia.com.br` (antes estava vazio)
- ✅ `SMTP_FROM`: Padrão agora é `contato@s3eengenharia.com.br` (antes era `noreply@s3eengenharia.com.br`)

### 2. docker-compose.prod.yml (Produção)

**Arquivo atualizado com configurações SMTP UOL:**

```yaml
# Email/SMTP - Configuração UOL
# ⚠️ IMPORTANTE: Configure estas variáveis no arquivo .env.production
# Servidor SMTP: smtps.uhserver.com
# Porta: 465 (SSL/TLS)
# Email: contato@s3eengenharia.com.br
SMTP_HOST: ${SMTP_HOST:-smtps.uhserver.com}
SMTP_PORT: ${SMTP_PORT:-465}
SMTP_SECURE: ${SMTP_SECURE:-true}
SMTP_USER: ${SMTP_USER:-contato@s3eengenharia.com.br}
SMTP_PASS: ${SMTP_PASS}
SMTP_FROM: ${SMTP_FROM:-contato@s3eengenharia.com.br}
```

**O que mudou:**
- ✅ `SMTP_HOST`: Padrão agora é `smtps.uhserver.com` (antes estava vazio)
- ✅ `SMTP_PORT`: Padrão agora é `465` (antes era `587`)
- ✅ `SMTP_SECURE`: Padrão agora é `true` (antes era `false`)
- ✅ `SMTP_USER`: Padrão agora é `contato@s3eengenharia.com.br` (antes estava vazio)
- ✅ `SMTP_FROM`: Padrão agora é `contato@s3eengenharia.com.br` (antes era `noreply@s3eengenharia.com.br`)
- ⚠️ `SMTP_PASS`: **OBRIGATÓRIO** - Deve ser configurado no `.env.production`

---

## 🚀 Como Usar

### Para Desenvolvimento

1. **Crie um arquivo `.env` na raiz do projeto** (copie de `env.example.txt`):
   ```bash
   cp env.example.txt .env
   ```

2. **Edite o arquivo `.env`** e configure:
   ```env
   SMTP_PASS=sua_senha_do_email_aqui
   ```

3. **As outras configurações já estão corretas** nos arquivos YML, mas você pode sobrescrever se necessário:
   ```env
   SMTP_HOST=smtps.uhserver.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=contato@s3eengenharia.com.br
   SMTP_FROM=contato@s3eengenharia.com.br
   ```

4. **Reinicie o container**:
   ```bash
   docker-compose restart backend
   ```

### Para Produção

1. **Crie um arquivo `.env.production` na raiz do projeto** (copie de `env.example.txt`):
   ```bash
   cp env.example.txt .env.production
   ```

2. **Edite o arquivo `.env.production`** e configure **TODAS** as variáveis:
   ```env
   # Banco de Dados
   DB_USER=s3e_prod
   DB_PASSWORD=senha_forte_do_banco
   DB_NAME=s3e_producao
   
   # JWT
   JWT_SECRET=chave_secreta_muito_forte_aqui
   JWT_EXPIRES_IN=7d
   
   # CORS - Adicione o IP do Tailscale
   CORS_ORIGIN=http://100.x.x.x:80,http://100.x.x.x,http://localhost:5173
   FRONTEND_URL=http://100.x.x.x:80
   
   # Email SMTP UOL
   SMTP_HOST=smtps.uhserver.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=contato@s3eengenharia.com.br
   SMTP_PASS=senha_do_email_aqui
   SMTP_FROM=contato@s3eengenharia.com.br
   ```

3. **Reinicie o container**:
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

---

## ✅ Valores Configurados

### Configuração SMTP UOL

| Variável | Valor Padrão | Obrigatório | Descrição |
|----------|--------------|-------------|-----------|
| `SMTP_HOST` | `smtps.uhserver.com` | Não | Servidor SMTP da UOL |
| `SMTP_PORT` | `465` | Não | Porta SSL/TLS |
| `SMTP_SECURE` | `true` | Não | Usa SSL/TLS direto |
| `SMTP_USER` | `contato@s3eengenharia.com.br` | Não | Email de autenticação |
| `SMTP_PASS` | - | **SIM** | Senha do email (configure no .env) |
| `SMTP_FROM` | `contato@s3eengenharia.com.br` | Não | Email remetente |

---

## 🔍 Verificação

### Como verificar se está configurado corretamente:

1. **Verificar variáveis no container**:
   ```bash
   docker-compose exec backend env | grep SMTP
   ```

2. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend | grep -i "smtp\|email"
   ```

3. **Testar envio de email**:
   - Acesse a página "Esqueci minha senha"
   - Digite um email cadastrado
   - Verifique se recebe o email

---

## ⚠️ Importante

1. **NUNCA commite** arquivos `.env` ou `.env.production` no Git
2. **Sempre use senhas fortes** em produção
3. **Configure `SMTP_PASS`** no arquivo `.env` (desenvolvimento) ou `.env.production` (produção)
4. **Reinicie o container** após alterar variáveis de ambiente

---

## 📚 Arquivos Relacionados

- `docker-compose.yml`: Configuração desenvolvimento ✅ Atualizado
- `docker-compose.prod.yml`: Configuração produção ✅ Atualizado
- `env.example.txt`: Template de configuração ✅ Criado
- `INSTRUCOES_CONFIGURACAO_ENV.md`: Instruções detalhadas ✅ Criado

---

**Status**: ✅ Configuração completa e pronta para uso!

