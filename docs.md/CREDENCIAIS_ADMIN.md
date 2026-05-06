# 🔐 Credenciais de Administrador

## ✅ Usuário Admin Criado com Sucesso!

---

## 👤 Dados de Acesso

### Credenciais

```
📧 Email: admin@s3e.com.br
🔑 Senha: 123456
👑 Role: admin
✅ Status: Ativo
```

---

## 🚀 Como Usar

### 1. Acessar o Sistema

1. Abra o navegador
2. Acesse: `http://localhost:5173` (frontend)
3. Você verá a tela de login

### 2. Fazer Login

1. Digite o email: **<admin@s3e.com.br>**
2. Digite a senha: **123456**
3. Clique em "Entrar"
4. ✅ Você será redirecionado para o Dashboard!

### 3. Permissões de Admin

Como admin, você tem acesso a:

- ✅ **Dashboard** - Visão completa
- ✅ **Orçamentos** - Criar, editar, aprovar, rejeitar
- ✅ **Clientes** - CRUD completo
- ✅ **Fornecedores** - CRUD completo
- ✅ **Materiais** - CRUD completo
- ✅ **Compras** - CRUD completo
- ✅ **Obras** - Gerenciamento completo
- ✅ **Financeiro** - Contas a pagar e receber
- ✅ **Configurações** - Gerenciar usuários, sistema
- ✅ **PDF Customization** - Personalizar PDFs
- ✅ **Todas as funcionalidades** - Sem restrições

---

## 🔄 Recriar Usuário Admin

Se precisar recriar o usuário admin no futuro:

```bash
cd backend
npm run seed
```

Este comando:

1. ✅ Deleta o usuário `admin@s3e.com.br` (se existir)
2. ✅ Cria novo usuário admin
3. ✅ Cria configuração do sistema
4. ✅ Mostra as credenciais no console

---

## 📝 Arquivo de Seed

**Localização**: `backend/prisma/seed.ts`

**O que faz**:

- Cria usuário admin com senha criptografada (bcrypt)
- Cria configuração do sistema S3E Engenharia
- Usa `upsert` para não duplicar

**Modificar credenciais**: Se quiser mudar email ou senha, edite o arquivo
`seed.ts`:

```typescript
const admin = await prisma.user.create({
  data: {
    email: "seu-email@aqui.com", // Mudar aqui
    password: hashedPassword, // Hash da senha
    name: "Seu Nome", // Mudar aqui
    role: "admin",
    active: true,
  },
});
```

E rode: `npm run seed`

---

## 🎯 Testando o Sistema

### Fluxo de Teste Completo

#### 1. Login

```
✅ Login com admin@s3e.com.br / 123456
```

#### 2. Cadastros Básicos

```
✅ Criar 2-3 clientes
✅ Criar 2-3 fornecedores
✅ Criar 5-10 materiais no estoque
```

#### 3. Criar Orçamento

```
✅ Clicar em "Orçamentos"
✅ Clicar em "Novo Orçamento"
✅ Preencher dados do cliente
✅ Adicionar itens:
   - Alguns do estoque 📦
   - Alguns manuais ✏️ (cotações)
✅ Salvar orçamento
```

#### 4. Gerar PDF Personalizado

```
✅ Clicar em "PDF" no card do orçamento
✅ Personalizar:
   - Marca d'água (texto ou logo)
   - Cores (escolher template)
   - Conteúdo (marcar o que deseja)
✅ Ver preview
✅ Clicar em "Gerar PDF"
✅ Download automático!
```

#### 5. Salvar Template

```
✅ No modal de PDF, aba "Preview"
✅ Clicar em "Salvar como Template"
✅ Nome: "Template Padrão S3E"
✅ Template salvo no banco!
```

#### 6. Testar Outras Funcionalidades

```
✅ Gerenciar usuários (Configurações)
✅ Ver dashboard com estatísticas
✅ Criar compras
✅ Gerenciar obras
✅ Financeiro (contas a pagar/receber)
```

---

## 🔑 Criar Outros Usuários

Se quiser criar mais usuários para testar permissões diferentes:

### Via Interface (Recomendado)

1. Login como admin
2. Ir em **Configurações** → **Gerenciamento de Usuários**
3. Clicar em **"Novo Usuário"**
4. Preencher dados:
   - Nome
   - Email
   - Senha
   - Role (admin, user, orcamentista, etc.)
5. Salvar

### Via Seed (Adicionar ao seed.ts)

```typescript
// Criar usuário orçamentista
const orcamentista = await prisma.user.create({
  data: {
    email: "orcamentista@s3e.com.br",
    password: await bcrypt.hash("123456", 10),
    name: "João Orçamentista",
    role: "orcamentista",
    active: true,
  },
});

// Criar usuário compras
const compras = await prisma.user.create({
  data: {
    email: "compras@s3e.com.br",
    password: await bcrypt.hash("123456", 10),
    name: "Maria Compras",
    role: "compras",
    active: true,
  },
});
```

---

## ⚠️ Segurança

### ⚠️ IMPORTANTE - Ambiente de Desenvolvimento

- ✅ Senha simples (`123456`) é OK para **desenvolvimento**
- ❌ **NUNCA use senha simples em produção!**

### 🔒 Para Produção

- Use senhas fortes (mín. 12 caracteres, misturadas)
- Ative 2FA (autenticação de dois fatores)
- Troque senhas periodicamente
- Não compartilhe credenciais

---

## 🎯 Roles Disponíveis no Sistema

| Role           | Permissões                | Quando Usar         |
| -------------- | ------------------------- | ------------------- |
| `admin`        | **Tudo**                  | Administrador geral |
| `orcamentista` | Orçamentos, clientes      | Criar propostas     |
| `compras`      | Compras, fornecedores     | Gestão de compras   |
| `gerente`      | Visualização + Aprovações | Gerência            |
| `user`         | Básico                    | Usuário comum       |

---

## 🛠️ Comandos Úteis

### Recriar Admin

```bash
cd backend
npm run seed
```

### Ver Usuários no Banco

```bash
cd backend
npx prisma studio
# Abre interface visual do banco
# Navegue para "users" e veja todos os usuários
```

### Resetar Banco Completo

```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

---

## ✅ Verificação

Para verificar se o usuário foi criado corretamente:

### Opção 1: Tentar Login

1. Acesse o sistema
2. Faça login com as credenciais
3. Se entrar → ✅ Funcionou!

### Opção 2: Prisma Studio

```bash
npx prisma studio
```

1. Abre no navegador (<http://localhost:5555>)
2. Clique em "users"
3. Veja o usuário `admin@s3e.com.br`
4. Verifique role: `admin`

### Opção 3: Console do Banco

```sql
SELECT email, name, role, active
FROM users
WHERE email = 'admin@s3e.com.br';
```

---

## 🎉 Pronto para Testar!

Agora você pode:

1. ✅ **Fazer login** como admin
2. ✅ **Criar orçamentos** com itens do estoque
3. ✅ **Criar orçamentos** com itens manuais (cotações)
4. ✅ **Personalizar PDFs** com marca d'água e cores
5. ✅ **Salvar templates** de PDF
6. ✅ **Gerenciar usuários** do sistema
7. ✅ **Testar todas as funcionalidades** implementadas

---

**Credenciais criadas com sucesso!** 🎊

**Email**: <admin@s3e.com.br>  
**Senha**: 123456  
**Role**: admin  
**Status**: ✅ Ativo e Funcional

**Pode fazer login agora!** 🚀
