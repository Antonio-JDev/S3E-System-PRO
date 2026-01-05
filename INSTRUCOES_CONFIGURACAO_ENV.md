# 📋 Instruções de Configuração - Variáveis de Ambiente

## 🚀 Configuração Rápida

### Para Desenvolvimento

1. **Crie um arquivo `.env` na raiz do projeto** (copie do `.env.example`):

   ```bash
   cp .env.example .env
   ```

2. **Edite o arquivo `.env`** e configure pelo menos:
   - `SMTP_PASS`: Senha do email `contato@s3eengenharia.com.br`
   - `DB_PASSWORD`: Senha do banco de dados (se diferente do padrão)
   - `JWT_SECRET`: Chave secreta para JWT (altere em produção)

3. **As outras configurações já estão com valores padrão corretos**:
   - SMTP_HOST: `smtps.uhserver.com`
   - SMTP_PORT: `465`
   - SMTP_SECURE: `true`
   - SMTP_USER: `contato@s3eengenharia.com.br`
   - SMTP_FROM: `contato@s3eengenharia.com.br`

### Para Produção

1. **Crie um arquivo `.env.production` na raiz do projeto**:
   ```bash
   cp .env.example .env.production
   ```

2. **Edite o arquivo `.env.production`** e configure:
   - `SMTP_PASS`: Senha do email (OBRIGATÓRIO)
   - `DB_PASSWORD`: Senha do banco de dados (OBRIGATÓRIO)
   - `JWT_SECRET`: Chave secreta forte para JWT (OBRIGATÓRIO)
   - `CORS_ORIGIN`: Adicione o IP/domínio do Tailscale
   - `FRONTEND_URL`: URL do frontend em produção

3. **Exemplo de `.env.production`**:
   ```env
   # Banco de Dados
   DB_USER=s3e_prod
   DB_PASSWORD=senha_forte_aqui
   DB_NAME=s3e_producao
   
   # JWT
   JWT_SECRET=chave_secreta_muito_forte_aqui_altere
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

---

## 📝 Variáveis Configuradas nos Arquivos YML

### docker-compose.yml (Desenvolvimento)

As variáveis já estão configuradas com valores padrão que podem ser sobrescritos pelo arquivo `.env`:

```yaml
SMTP_HOST: ${SMTP_HOST:-smtps.uhserver.com}
SMTP_PORT: ${SMTP_PORT:-465}
SMTP_SECURE: ${SMTP_SECURE:-true}
SMTP_USER: ${SMTP_USER:-contato@s3eengenharia.com.br}
SMTP_PASS: ${SMTP_PASS:-}  # ⚠️ Configure no .env
SMTP_FROM: ${SMTP_FROM:-contato@s3eengenharia.com.br}
```

**O que isso significa:**
- Se você criar um arquivo `.env` com `SMTP_PASS=sua_senha`, essa senha será usada
- Se não criar o `.env`, os valores padrão serão usados (exceto `SMTP_PASS` que fica vazio)
- **Recomendação**: Sempre crie o arquivo `.env` e configure pelo menos `SMTP_PASS`

### docker-compose.prod.yml (Produção)

As variáveis estão configuradas para ler do arquivo `.env.production`:

```yaml
SMTP_HOST: ${SMTP_HOST:-smtps.uhserver.com}
SMTP_PORT: ${SMTP_PORT:-465}
SMTP_SECURE: ${SMTP_SECURE:-true}
SMTP_USER: ${SMTP_USER:-contato@s3eengenharia.com.br}
SMTP_PASS: ${SMTP_PASS}  # ⚠️ OBRIGATÓRIO - Configure no .env.production
SMTP_FROM: ${SMTP_FROM:-contato@s3eengenharia.com.br}
```

**O que isso significa:**
- **OBRIGATÓRIO**: Você DEVE criar o arquivo `.env.production` com `SMTP_PASS`
- Os outros valores têm padrões, mas é recomendado configurar todos

---

## ✅ Checklist de Configuração

### Desenvolvimento
- [ ] Criar arquivo `.env` na raiz do projeto
- [ ] Configurar `SMTP_PASS` no `.env`
- [ ] (Opcional) Configurar outras variáveis se necessário
- [ ] Reiniciar containers: `docker-compose restart backend`

### Produção
- [ ] Criar arquivo `.env.production` na raiz do projeto
- [ ] Configurar `SMTP_PASS` no `.env.production`
- [ ] Configurar `DB_PASSWORD` no `.env.production`
- [ ] Configurar `JWT_SECRET` no `.env.production` (use uma chave forte!)
- [ ] Configurar `CORS_ORIGIN` com IP do Tailscale
- [ ] Configurar `FRONTEND_URL` com URL de produção
- [ ] Reiniciar containers: `docker-compose -f docker-compose.prod.yml restart backend`

---

## 🔒 Segurança

### ⚠️ IMPORTANTE - NUNCA FAÇA ISSO:

1. ❌ **NUNCA** commite arquivos `.env` ou `.env.production` no Git
2. ❌ **NUNCA** compartilhe senhas em mensagens ou documentos públicos
3. ❌ **NUNCA** use senhas fracas em produção

### ✅ FAÇA ISSO:

1. ✅ Adicione `.env` e `.env.production` no `.gitignore`
2. ✅ Use senhas fortes em produção
3. ✅ Mantenha o arquivo `.env.example` como referência (sem senhas reais)

---

## 🧪 Como Testar

### 1. Verificar se as variáveis estão sendo lidas

```bash
# Ver logs do backend
docker-compose logs backend | grep SMTP

# Deve mostrar as configurações (sem mostrar a senha)
```

### 2. Testar envio de email

1. Acesse a página de "Esqueci minha senha"
2. Digite um email cadastrado
3. Verifique se recebe o email

### 3. Verificar logs de erro

Se o email não funcionar, verifique os logs:

```bash
docker-compose logs backend | grep -i "email\|smtp\|error"
```

---

## 📚 Arquivos Relacionados

- `.env.example`: Template de configuração (pode ser commitado)
- `.env`: Configuração de desenvolvimento (NÃO commitar)
- `.env.production`: Configuração de produção (NÃO commitar)
- `docker-compose.yml`: Configuração Docker desenvolvimento
- `docker-compose.prod.yml`: Configuração Docker produção

---

## 🆘 Troubleshooting

### Problema: Email não está sendo enviado

**Solução:**
1. Verifique se `SMTP_PASS` está configurado no `.env` ou `.env.production`
2. Verifique se a senha está correta (sem espaços extras)
3. Verifique os logs: `docker-compose logs backend`

### Problema: Erro "SMTP_PASS is required"

**Solução:**
- Configure `SMTP_PASS` no arquivo `.env` (desenvolvimento) ou `.env.production` (produção)

### Problema: CORS bloqueado em produção

**Solução:**
- Adicione o IP do Tailscale em `CORS_ORIGIN` no arquivo `.env.production`

---

**Última atualização**: $(date)

