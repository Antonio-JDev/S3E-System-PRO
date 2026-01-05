# Análise de Problemas e Soluções - S3E System PRO

## 📋 Problemas Identificados

### 1. 🔐 Problema de Autenticação via Tailscale

**Sintoma**: Ao acessar pelo link do Tailscale, a tela carrega mas o backend não autentica o login.

**Causa Raiz**: 
- O CORS (Cross-Origin Resource Sharing) está bloqueando requisições que não estão na lista de origens permitidas
- Quando você acessa via Tailscale, o frontend faz requisições de um IP/domínio que não está configurado no `CORS_ORIGIN`
- O backend está configurado para aceitar apenas origens específicas listadas na variável de ambiente `CORS_ORIGIN`

**Localização do Problema**:
```59:78:backend/src/app.ts
// Determinar origens permitidas para CORS
const defaultOrigins = ['http://localhost', 'http://localhost:80', 'http://localhost:5173'];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Browsers podem enviar origin undefined em requests como curl ou same-origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`🚫 CORS bloqueado para origem: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**Solução**:
1. Adicionar o IP/domínio do Tailscale na variável `CORS_ORIGIN` no arquivo `.env` ou `.env.production`
2. Ou configurar o CORS para aceitar qualquer origem em desenvolvimento (não recomendado para produção)
3. Verificar se o frontend está usando a URL correta do backend ao fazer requisições

---

### 2. ❌ Erro 500 na Página de Ferramentas em Produção (TrueNAS)

**Sintoma**: A página de ferramentas funciona perfeitamente no Docker local, mas em produção no TrueNAS está dando erro 500.

**Causa Raiz Possível**:
- O controller de ferramentas está tentando acessar `req.user.userId` para criar logs de auditoria
- Se o token não estiver sendo passado corretamente ou se houver um problema na decodificação, `req.user` pode ser `undefined`
- Pode haver um problema de conexão com o banco de dados em produção
- Pode haver um problema com a tabela `Ferramenta` no banco de dados (schema diferente ou migração não aplicada)

**Localização do Problema**:
```69:69:backend/src/controllers/ferramentasController.ts
    const userId = (req as any).user?.userId;
```

**Solução**:
1. Verificar se o token está sendo enviado corretamente nas requisições
2. Adicionar tratamento de erro mais robusto para quando `userId` for `undefined`
3. Verificar se as migrações do Prisma foram aplicadas corretamente em produção
4. Verificar logs do backend em produção para identificar o erro específico

---

### 3. 📧 Configuração de Email SMTP para UOL

**Requisitos**:
- Email: `contato@s3eengenharia.com.br`
- Servidor SMTP: `smtps.uhserver.com`
- Porta: `465`
- Segurança: SSL/TLS (requer `secure: true`)
- Autenticação: Sim (senha normal)

**Estado Atual**:
O sistema já possui suporte para SMTP, mas a configuração atual não está otimizada para a porta 465 com SSL/TLS.

**Localização do Código**:
```7:41:backend/src/services/email.service.ts
const createTransporter = () => {
  // Se estiver em desenvolvimento e não houver configuração de email, usar console
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return null; // Retornar null para usar console.log em desenvolvimento
  }

  // Configuração para SMTP customizado
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Para desenvolvimento com certificados auto-assinados
      },
    });
  }
  // ...
};
```

**Problema Identificado**:
- A porta padrão é 587, mas a UOL usa 465
- Para porta 465, `secure` deve ser `true` e não precisa de `tls`
- A configuração atual pode não funcionar corretamente com SSL/TLS na porta 465

**Solução**:
1. Atualizar o código para detectar automaticamente se a porta é 465 e configurar `secure: true`
2. Ajustar a configuração TLS para porta 465
3. Adicionar variáveis de ambiente no docker-compose para configurar o SMTP da UOL

---

## 🔧 Implementações Necessárias

### 1. Correção de CORS para Tailscale
- Adicionar suporte para aceitar requisições de IPs do Tailscale
- Melhorar logging de CORS para debug

### 2. Correção do Erro 500 em Ferramentas
- Adicionar tratamento de erro mais robusto
- Verificar se userId existe antes de usar
- Adicionar logs detalhados para debug

### 3. Configuração de Email SMTP UOL
- Atualizar `email.service.ts` para suportar corretamente porta 465 com SSL/TLS
- Adicionar função para envio de email de validação de alteração de dados
- Configurar variáveis de ambiente no docker-compose

### 4. Funcionalidade de Email para Validação de Alteração de Dados
- Criar função para enviar email quando dados do usuário forem alterados
- Criar template de email para notificação de alteração
- Integrar com o sistema de auditoria existente

---

## 📝 Variáveis de Ambiente Necessárias

Para configurar o email SMTP da UOL, adicione no arquivo `.env` ou `.env.production`:

```env
# Configuração SMTP UOL
SMTP_HOST=smtps.uhserver.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@s3eengenharia.com.br
SMTP_PASS=sua_senha_aqui
SMTP_FROM=contato@s3eengenharia.com.br

# CORS - Adicione o IP/domínio do Tailscale
CORS_ORIGIN=http://localhost:5173,http://seu-ip-tailscale:80,http://seu-ip-tailscale
FRONTEND_URL=http://seu-ip-tailscale:80
```

---

## 🚀 Próximos Passos

1. Implementar correções de CORS
2. Corrigir erro 500 em ferramentas
3. Atualizar configuração de email SMTP
4. Adicionar função de envio de email para validação de alteração de dados
5. Testar todas as correções em ambiente de desenvolvimento
6. Documentar processo de configuração

