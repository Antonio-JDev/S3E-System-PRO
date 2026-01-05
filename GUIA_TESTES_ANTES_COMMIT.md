# 🧪 Guia de Testes Antes do Commit

## 📋 Checklist de Testes

### ✅ Pré-requisitos

1. **Containers rodando em desenvolvimento**:
   ```bash
   docker-compose up -d
   ```

2. **Verificar se os containers estão rodando**:
   ```bash
   docker-compose ps
   ```

3. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend --tail=50
   ```

---

## 🧪 Teste 1: Verificar Configuração SMTP

### Objetivo: Verificar se as variáveis de ambiente estão sendo lidas corretamente

### Passos:

1. **Verificar variáveis no container**:
   ```bash
   docker-compose exec backend env | grep SMTP
   ```

   **Resultado esperado**:
   ```
   SMTP_HOST=smtps.uhserver.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=contato@s3eengenharia.com.br
   SMTP_FROM=contato@s3eengenharia.com.br
   ```

2. **Verificar se o código detecta a porta 465 corretamente**:
   ```bash
   docker-compose logs backend | grep -i "smtp\|email\|465"
   ```

   **Resultado esperado**: Não deve aparecer erros relacionados a SMTP

### ✅ Critério de Sucesso:
- Todas as variáveis SMTP estão configuradas
- Não há erros relacionados a SMTP nos logs

---

## 🧪 Teste 2: Verificar CORS

### Objetivo: Verificar se o CORS está aceitando requisições corretamente

### Passos:

1. **Verificar variáveis CORS no container**:
   ```bash
   docker-compose exec backend env | grep CORS
   ```

2. **Testar requisição local**:
   ```bash
   curl -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        http://localhost:3001/api/auth/login
   ```

   **Resultado esperado**: Deve retornar status 200 ou 204

3. **Testar requisição simulando Tailscale** (IP 100.x.x.x):
   ```bash
   curl -H "Origin: http://100.74.201.62:8080" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        http://localhost:3001/api/auth/login
   ```

   **Resultado esperado**: Deve retornar status 200 ou 204 (em dev mode aceita qualquer origem)

4. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend | grep -i "cors"
   ```

   **Resultado esperado**: Deve aparecer "✅ CORS permitido (dev mode)"

### ✅ Critério de Sucesso:
- Requisições OPTIONS retornam 200/204
- Logs mostram que CORS está permitindo as origens
- Em desenvolvimento, qualquer origem é aceita

---

## 🧪 Teste 3: Testar Login e Autenticação

### Objetivo: Verificar se o login funciona corretamente

### Passos:

1. **Acessar o frontend**: `http://localhost:5173`

2. **Tentar fazer login** com credenciais válidas

3. **Verificar no console do navegador** (F12):
   - Não deve aparecer erros de CORS
   - Token deve ser recebido e armazenado

4. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend | grep -i "login\|auth\|token"
   ```

   **Resultado esperado**: 
   - Deve aparecer "✅ Token válido"
   - Não deve aparecer "🚫 CORS bloqueado"

### ✅ Critério de Sucesso:
- Login funciona sem erros de CORS
- Token é recebido e armazenado
- Usuário consegue acessar áreas protegidas

---

## 🧪 Teste 4: Testar Página de Ferramentas

### Objetivo: Verificar se não há mais erro 500

### Passos:

1. **Fazer login no sistema**

2. **Acessar a página de Ferramentas**

3. **Verificar no console do navegador** (F12):
   - Não deve aparecer erro 500
   - Dados devem carregar corretamente

4. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend | grep -i "ferramentas\|500\|error"
   ```

   **Resultado esperado**: 
   - Não deve aparecer "❌ Erro ao listar ferramentas"
   - Não deve aparecer erro 500 relacionado a userId

5. **Testar operações CRUD** (se possível):
   - Criar uma ferramenta
   - Editar uma ferramenta
   - Deletar uma ferramenta

### ✅ Critério de Sucesso:
- Página carrega sem erro 500
- Dados são exibidos corretamente
- Operações CRUD funcionam (se testadas)

---

## 🧪 Teste 5: Testar Envio de Email (Recuperação de Senha)

### Objetivo: Verificar se o email está configurado corretamente

### Passos:

1. **Acessar página "Esqueci minha senha"**: `http://localhost:5173/forgot-password`

2. **Inserir um email cadastrado no sistema**

3. **Verificar logs do backend**:
   ```bash
   docker-compose logs backend | grep -i "email\|smtp\|recuperação"
   ```

   **Resultado esperado**:
   - Em desenvolvimento: Deve aparecer "[DEV MODE] Email de recuperação de senha"
   - Em produção: Deve aparecer "✅ Email de recuperação enviado para:"

4. **Se SMTP estiver configurado** (com SMTP_PASS no .env):
   - Verificar se o email foi realmente enviado
   - Verificar se o link no email está correto

### ✅ Critério de Sucesso:
- Não há erros relacionados a SMTP
- Em dev mode, o link é logado no console
- Em produção, o email é enviado (se configurado)

---

## 🧪 Teste 6: Testar Função de Email para Alteração de Dados

### Objetivo: Verificar se a nova função de email funciona

### Passos:

1. **Criar um script de teste** (opcional):
   ```typescript
   // test-email.ts
   import { sendUserDataChangeEmail } from './services/email.service';
   
   await sendUserDataChangeEmail(
     'teste@s3eengenharia.com.br',
     'Usuário Teste',
     {
       name: { old: 'Nome Antigo', new: 'Nome Novo' },
       email: { old: 'antigo@email.com', new: 'novo@email.com' }
     },
     'Admin'
   );
   ```

2. **Executar o teste** (se criado):
   ```bash
   docker-compose exec backend npx tsx test-email.ts
   ```

3. **Verificar logs**:
   ```bash
   docker-compose logs backend | grep -i "alteração\|change"
   ```

### ✅ Critério de Sucesso:
- Função executa sem erros
- Logs mostram que o email foi processado

---

## 🧪 Teste 7: Testar Acesso via Tailscale (Simulado)

### Objetivo: Verificar se o CORS aceita IPs do Tailscale

### Passos:

1. **Modificar temporariamente o CORS_ORIGIN** no docker-compose.yml para produção:
   ```yaml
   CORS_ORIGIN: ${CORS_ORIGIN:-http://100.74.201.62:8080}
   ```

2. **Reiniciar o backend**:
   ```bash
   docker-compose restart backend
   ```

3. **Testar requisição simulando Tailscale**:
   ```bash
   curl -H "Origin: http://100.74.201.62:8080" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"email":"teste@teste.com","password":"123456"}' \
        http://localhost:3001/api/auth/login
   ```

4. **Verificar logs**:
   ```bash
   docker-compose logs backend | grep -i "tailscale\|100\."
   ```

   **Resultado esperado**: Deve aparecer "✅ CORS permitido para IP Tailscale"

### ✅ Critério de Sucesso:
- Requisições com origem Tailscale são aceitas
- Logs mostram que o IP foi reconhecido

---

## 📊 Resumo dos Testes

| Teste | Status | Observações |
|-------|--------|-------------|
| 1. Configuração SMTP | ⬜ | Verificar variáveis |
| 2. CORS | ⬜ | Testar requisições |
| 3. Login/Auth | ⬜ | Testar no navegador |
| 4. Página Ferramentas | ⬜ | Verificar erro 500 |
| 5. Email Recuperação | ⬜ | Testar envio |
| 6. Email Alteração | ⬜ | Testar função |
| 7. Tailscale | ⬜ | Simular acesso |

---

## 🚨 Problemas Comuns e Soluções

### Problema: Containers não estão rodando
**Solução**: 
```bash
docker-compose up -d
```

### Problema: Variáveis SMTP não estão sendo lidas
**Solução**: 
- Verificar se o arquivo `.env` existe na raiz
- Verificar se `SMTP_PASS` está configurado
- Reiniciar containers: `docker-compose restart backend`

### Problema: CORS ainda bloqueando
**Solução**: 
- Verificar se está em modo desenvolvimento (NODE_ENV=development)
- Verificar logs do backend para ver qual origem está sendo bloqueada
- Adicionar a origem no CORS_ORIGIN

### Problema: Erro 500 em ferramentas
**Solução**: 
- Verificar logs do backend para ver o erro específico
- Verificar se o usuário está autenticado (token válido)
- Verificar se o banco de dados está acessível

---

## ✅ Checklist Final Antes do Commit

- [ ] Todos os testes passaram
- [ ] Logs não mostram erros críticos
- [ ] Login funciona corretamente
- [ ] Página de ferramentas não dá erro 500
- [ ] CORS está aceitando requisições
- [ ] Configuração SMTP está correta
- [ ] Documentação está completa

---

**Última atualização**: $(date)

