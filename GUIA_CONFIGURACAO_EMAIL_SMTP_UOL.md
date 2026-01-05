# Guia de Configuração de Email SMTP UOL

## 📧 Configuração do Servidor SMTP

O sistema S3E System PRO agora está configurado para trabalhar com o servidor SMTP da UOL usando SSL/TLS na porta 465.

### Informações do Servidor

- **Email**: `contato@s3eengenharia.com.br`
- **Servidor SMTP**: `smtps.uhserver.com`
- **Porta**: `465`
- **Segurança**: SSL/TLS (requer `secure: true`)
- **Autenticação**: Sim (senha normal)

---

## 🔧 Configuração no Docker Compose

### Para Ambiente de Desenvolvimento

Edite o arquivo `docker-compose.yml` e adicione as seguintes variáveis de ambiente no serviço `backend`:

```yaml
backend:
  environment:
    # ... outras variáveis ...
    
    # Configuração SMTP UOL
    SMTP_HOST: smtps.uhserver.com
    SMTP_PORT: 465
    SMTP_SECURE: "true"
    SMTP_USER: contato@s3eengenharia.com.br
    SMTP_PASS: sua_senha_aqui
    SMTP_FROM: contato@s3eengenharia.com.br
```

### Para Ambiente de Produção

Edite o arquivo `docker-compose.prod.yml` e adicione as mesmas variáveis:

```yaml
backend:
  environment:
    # ... outras variáveis ...
    
    # Configuração SMTP UOL
    SMTP_HOST: ${SMTP_HOST:-smtps.uhserver.com}
    SMTP_PORT: ${SMTP_PORT:-465}
    SMTP_SECURE: ${SMTP_SECURE:-true}
    SMTP_USER: ${SMTP_USER:-contato@s3eengenharia.com.br}
    SMTP_PASS: ${SMTP_PASS}
    SMTP_FROM: ${SMTP_FROM:-contato@s3eengenharia.com.br}
```

**⚠️ IMPORTANTE**: Para produção, use um arquivo `.env.production` para armazenar as credenciais de forma segura:

```env
# .env.production
SMTP_HOST=smtps.uhserver.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@s3eengenharia.com.br
SMTP_PASS=sua_senha_segura_aqui
SMTP_FROM=contato@s3eengenharia.com.br
```

---

## ✅ Funcionalidades Implementadas

### 1. Recuperação de Senha

O sistema já possui funcionalidade completa de recuperação de senha que envia emails automaticamente:

- **Endpoint**: `POST /api/auth/forgot-password`
- **Body**: `{ "email": "usuario@exemplo.com" }`
- O sistema gera um token temporário (válido por 1 hora) e envia um email com link para redefinição

### 2. Notificação de Alteração de Dados

Nova funcionalidade implementada para enviar email quando dados do usuário forem alterados:

- **Função**: `sendUserDataChangeEmail()` em `backend/src/services/email.service.ts`
- **Uso**: Pode ser chamada após atualizar dados do usuário
- **Exemplo de uso**:

```typescript
import { sendUserDataChangeEmail } from '../services/email.service';

// Após atualizar dados do usuário
const changes = {
  name: { old: 'João Silva', new: 'João Santos Silva' },
  email: { old: 'joao@exemplo.com', new: 'joao.silva@exemplo.com' }
};

await sendUserDataChangeEmail(
  user.email,
  user.name,
  changes,
  'Admin' // Nome de quem fez a alteração (opcional)
);
```

---

## 🧪 Testando a Configuração

### 1. Testar Conexão SMTP

O sistema possui uma função para testar a conexão com o servidor de email. Você pode criar um endpoint temporário ou usar o console:

```typescript
import { testEmailConnection } from './services/email.service';

// Testar conexão
const isConnected = await testEmailConnection();
if (isConnected) {
  console.log('✅ Email configurado corretamente!');
} else {
  console.log('❌ Erro na configuração de email');
}
```

### 2. Testar Envio de Email

Após configurar, teste o envio de email de recuperação de senha:

1. Acesse a página de "Esqueci minha senha"
2. Digite um email cadastrado no sistema
3. Verifique se o email foi recebido

---

## 🔍 Troubleshooting

### Problema: Email não está sendo enviado

**Soluções**:
1. Verifique se todas as variáveis de ambiente estão configuradas corretamente
2. Verifique se a senha está correta (sem espaços extras)
3. Verifique os logs do backend para erros específicos
4. Teste a conexão SMTP usando a função `testEmailConnection()`

### Problema: Erro de autenticação

**Soluções**:
1. Verifique se `SMTP_USER` e `SMTP_PASS` estão corretos
2. Certifique-se de que está usando a senha normal (não senha de app)
3. Verifique se a conta de email está ativa

### Problema: Timeout na conexão

**Soluções**:
1. Verifique se o servidor `smtps.uhserver.com` está acessível
2. Verifique se a porta 465 não está bloqueada por firewall
3. Em ambiente Docker, verifique se a rede permite conexões SMTP

---

## 📝 Notas Importantes

1. **Segurança**: Nunca commite arquivos `.env` ou `.env.production` com credenciais no repositório
2. **Porta 465**: Esta porta requer `secure: true` e usa SSL/TLS diretamente (não STARTTLS)
3. **Desenvolvimento**: Em modo desenvolvimento, se o SMTP não estiver configurado, o sistema apenas loga no console
4. **Produção**: Sempre configure o SMTP em produção para funcionalidades de email funcionarem

---

## 🚀 Próximos Passos

1. Configure as variáveis de ambiente no `docker-compose.yml` ou `docker-compose.prod.yml`
2. Reinicie os containers: `docker-compose restart backend`
3. Teste o envio de email de recuperação de senha
4. Integre a função `sendUserDataChangeEmail()` nos controllers que atualizam dados do usuário

---

## 📚 Referências

- Documentação do Nodemailer: https://nodemailer.com/about/
- Configuração SMTP UOL: Informações fornecidas pelo usuário
- Documentação SSL/TLS: https://nodemailer.com/smtp/secure/

