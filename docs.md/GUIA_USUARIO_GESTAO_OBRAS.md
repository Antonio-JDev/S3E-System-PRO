# 📖 Guia do Usuário - Gestão de Obras

## 🎯 Para Que Serve?

O módulo de **Gestão de Obras** permite gerenciar a alocação das **3 equipes de
campo** (Equipe A, B e C) nos diferentes projetos da empresa.

Você pode:

- ✅ Ver quais equipes estão disponíveis ou ocupadas
- ✅ Criar novas alocações de equipes a projetos
- ✅ Visualizar o calendário mensal de alocações
- ✅ Acompanhar o status de cada alocação
- ✅ Iniciar, concluir ou cancelar alocações

---

## 🚀 Como Acessar

1. Faça **login** no sistema S3E
2. No menu lateral esquerdo, procure a seção **"Operacional"**
3. Clique em **"Gestão de Obras"** (ícone de calendário com pessoas)

---

## 📋 Tela Principal

### O que você verá:

```
┌─────────────────────────────────────────────────┐
│  BARRA DO TOPO                                  │
│  Gestão de Obras | [+ Nova Alocação]           │
├──────────┬──────────────────────────────────────┤
│  EQUIPES │  CALENDÁRIO                          │
│          │                                      │
│  Equipe A│  ◀ Março 2025  [Hoje]  ▶            │
│  🔴 OCUP │                                      │
│          │  Dom Seg Ter ... Sáb                │
│  Equipe B│   1   2  [A] ... 7                  │
│  🔴 OCUP │   8  [B] [B] ... 14                 │
│          │  ...                                │
│  Equipe C│                                      │
│  🟢 DISP │  LISTA DE ALOCAÇÕES                 │
│          │  ┌─────────────────────────────────┐│
│          │  │ Equipe A - Projeto XYZ         ││
│  📊 DADOS│  │ [Iniciar] [Cancelar]           ││
│  Total: 3│  └─────────────────────────────────┘│
│  Disp: 1 │                                      │
└──────────┴──────────────────────────────────────┘
```

---

## 👥 Entendendo a Sidebar de Equipes

### Card de Equipe:

```
┌────────────────────┐
│ Equipe A           │ ← Nome da equipe
│ MONTAGEM           │ ← Tipo da equipe
│ Membros: 2         │ ← Quantas pessoas
│ 🔴 OCUPADA         │ ← Status atual
│                    │
│ Projeto: Obra XYZ  │ ← Se ocupada, mostra
│ Até: 28/03/2025    │   onde está alocada
└────────────────────┘
```

### Status das Equipes:

| Indicador                 | Significado                           |
| ------------------------- | ------------------------------------- |
| 🟢 **DISPONÍVEL**         | Equipe está livre para ser alocada    |
| 🔴 **OCUPADA** (pulsando) | Equipe está trabalhando em um projeto |

### Tipos de Equipe:

- **MONTAGEM** (🔵 Azul): Especializada em montagem de equipamentos
- **CAMPO** (🟢 Verde): Trabalho em campo, instalações externas
- **DISTINTA** (🟣 Roxo): Equipe multifuncional

---

## 📅 Usando o Calendário

### Navegação:

| Botão    | O que faz            |
| -------- | -------------------- |
| **◀**    | Volta 1 mês          |
| **Hoje** | Retorna ao mês atual |
| **▶**    | Avança 1 mês         |

### Lendo o Calendário:

```
Dom  Seg  Ter  Qua  Qui  Sex  Sáb
                1    2    3    4
 5    6   [A]  [A]  [A]  10   11
```

- **[A]**, **[B]**, **[C]** = Equipes alocadas naquele dia
- Clique em um evento para ver detalhes

### Cores dos Eventos:

- **🟡 Amarelo**: Alocação planejada (ainda não iniciada)
- **🔵 Azul**: Alocação em andamento (trabalho ativo)
- **🟢 Verde**: Alocação concluída (finalizada)
- **🔴 Vermelho**: Alocação cancelada

---

## ➕ Como Criar uma Nova Alocação

### Passo a Passo:

#### 1. Abrir o Modal

Clique no botão **[+ Nova Alocação]** no canto superior direito.

#### 2. Preencher o Formulário

##### Campo 1: Equipe\*

```
Selecione uma equipe disponível:
┌──────────────────────────────────────┐
│ Equipe B - CAMPO (2 membros)        │
│ Equipe C - DISTINTA (2 membros)     │
└──────────────────────────────────────┘
```

💡 **Dica:** Apenas equipes **disponíveis** aparecem na lista.

##### Campo 2: Projeto/Obra\*

```
ID do Projeto:
┌──────────────────────────────────────┐
│ projeto-123                          │
└──────────────────────────────────────┘
```

💡 **Dica:** Digite o código do projeto (ex: `projeto-subestacao-abc`)

##### Campo 3: Data de Início\*

```
┌──────────────────────────────────────┐
│ 01/04/2025                           │
└──────────────────────────────────────┘
```

##### Campo 4: Duração (dias úteis)\*

```
┌──────────────────────────────────────┐
│ 20                                   │
└──────────────────────────────────────┘
```

💡 **Referência:**

- 5 dias = 1 semana
- 10 dias = 2 semanas
- 20 dias = 1 mês
- 40 dias = 2 meses

##### Campo 5: Observações (opcional)

```
┌──────────────────────────────────────┐
│ Instalação de subestação 500kVA.    │
│ Equipe precisará de veículo 4x4.    │
└──────────────────────────────────────┘
```

#### 3. Confirmar

Clique em **[Criar Alocação]**.

#### 4. Resultado

✅ **Sucesso:** "Alocação criada com sucesso!"  
❌ **Erro:** Aparecerá uma mensagem explicando o problema (ex: "Conflito! Equipe
já está alocada neste período")

---

## ⚙️ Gerenciando Alocações

### Encontrar uma Alocação:

Role a página até a seção **"Alocações do Mês"**.

Cada alocação aparece em um card:

```
┌──────────────────────────────────────────┐
│ 🔵 Equipe A                              │ ← Tipo colorido
│ ⏳ Em Andamento                          │ ← Status
│                                          │
│ Projeto: Instalação Subestação ABC      │
│ Cliente: Indústria XYZ Ltda             │
│ 📅 Início: 01/03/2025                   │
│ 📅 Fim Previsto: 28/03/2025             │
│                                          │
│ [▶ Concluir]  [✕ Cancelar]             │ ← Ações
└──────────────────────────────────────────┘
```

---

### Ações Disponíveis:

#### 🟡 Se a alocação está **Planejada**:

##### [▶ Iniciar]

- **Quando usar:** Quando a equipe chegar no local e começar o trabalho
- **O que faz:** Muda o status para **"Em Andamento"** (azul)

##### [✕ Cancelar]

- **Quando usar:** Se o projeto for adiado ou cancelado
- **O que faz:** Solicita um motivo e cancela a alocação

---

#### 🔵 Se a alocação está **Em Andamento**:

##### [✓ Concluir]

- **Quando usar:** Quando o trabalho da equipe for finalizado
- **O que faz:** Marca como **"Concluída"** (verde)
- **Opcional:** Pode informar a data real de conclusão

##### [✕ Cancelar]

- **Quando usar:** Se precisar interromper o trabalho
- **O que faz:** Cancela a alocação (mesmo estando em andamento)

---

#### 🟢 Se a alocação está **Concluída**:

✅ Não há ações. A alocação foi finalizada com sucesso.

---

#### 🔴 Se a alocação está **Cancelada**:

❌ Não há ações. A alocação foi cancelada.

---

## 💡 Dicas e Boas Práticas

### ✅ Fazer:

1. **Verificar disponibilidade antes de alocar**
   - Olhe a sidebar para ver equipes disponíveis
   - Ou use o filtro de equipes disponíveis no modal

2. **Planejar com antecedência**
   - Crie alocações com status "Planejada"
   - Inicie apenas quando o trabalho começar de fato

3. **Manter o calendário atualizado**
   - Marque como "Em Andamento" quando iniciar
   - Conclua assim que finalizar

4. **Usar observações**
   - Anote informações importantes
   - Facilita para quem consultar depois

5. **Conferir conflitos**
   - O sistema avisa se houver conflito
   - Escolha outra equipe ou outro período

### ❌ Evitar:

1. **Não alocar a mesma equipe duas vezes no mesmo período**
   - O sistema não permite, mas evita tentativas

2. **Não deixar alocações "Planejadas" por muito tempo**
   - Inicie quando o trabalho começar

3. **Não cancelar sem motivo**
   - Sempre informe o motivo do cancelamento

4. **Não esquecer de concluir**
   - Marque como concluída para liberar a equipe

---

## 🔍 Cenários Comuns

### Cenário 1: Novo Projeto Chegou

**Situação:** Cliente aprovou projeto de instalação elétrica.

**Passos:**

1. Abra "Gestão de Obras"
2. Veja na sidebar quais equipes estão disponíveis
3. Clique em [+ Nova Alocação]
4. Selecione a equipe disponível (ex: Equipe C)
5. Informe o ID do projeto
6. Escolha data de início (ex: 01/04/2025)
7. Defina duração (ex: 20 dias = 1 mês)
8. Adicione observação: "Instalação de subestação"
9. [Criar Alocação]
10. ✅ Equipe C agora aparece como OCUPADA no calendário

---

### Cenário 2: Equipe Chegou no Local

**Situação:** Equipe A chegou na obra para começar.

**Passos:**

1. Encontre a alocação da Equipe A (status: Planejada)
2. Clique em [▶ Iniciar]
3. ✅ Status muda para "Em Andamento" (azul)

---

### Cenário 3: Trabalho Finalizado

**Situação:** Equipe B concluiu a instalação.

**Passos:**

1. Encontre a alocação da Equipe B (status: Em Andamento)
2. Clique em [✓ Concluir]
3. (Opcional) Informe a data real de conclusão
4. ✅ Status muda para "Concluída" (verde)
5. ✅ Equipe B volta a aparecer como DISPONÍVEL

---

### Cenário 4: Cliente Adiou Projeto

**Situação:** Cliente pediu para adiar o início da obra.

**Passos:**

1. Encontre a alocação (status: Planejada)
2. Clique em [✕ Cancelar]
3. Digite o motivo: "Cliente adiou por 60 dias"
4. Confirme
5. ✅ Status muda para "Cancelada" (vermelho)
6. ✅ Equipe volta a aparecer como DISPONÍVEL

---

### Cenário 5: Verificar Disponibilidade Futura

**Situação:** Preciso saber quais equipes estarão livres em maio.

**Passos:**

1. Use os botões ▶ para navegar até maio
2. Observe o calendário:
   - Dias sem alocações = equipes disponíveis
   - Dias com [A], [B], [C] = equipes ocupadas
3. Planeje suas alocações baseado nisso

---

## 🆘 Problemas Comuns

### "Não consigo criar alocação"

**Possíveis causas:**

1. ❌ Equipe já está ocupada nesse período
   - **Solução:** Escolha outra equipe ou outro período

2. ❌ Campos obrigatórios não preenchidos
   - **Solução:** Preencha todos os campos marcados com \*

3. ❌ ID do projeto inválido
   - **Solução:** Verifique o código do projeto

---

### "Equipes não aparecem no dropdown"

**Causa:** Nenhuma equipe está disponível no período.

**Solução:**

1. Veja no calendário quando as equipes ficarão livres
2. Ajuste a data de início da alocação

---

### "Alocação não aparece no calendário"

**Possíveis causas:**

1. Você está vendo outro mês
   - **Solução:** Navegue até o mês correto

2. Criação falhou mas você não viu o erro
   - **Solução:** Tente criar novamente

---

### "Botões de ação não funcionam"

**Causa:** Pode ser problema de permissão.

**Solução:**

- Verifique se você tem perfil de **admin**
- Apenas admins podem iniciar/concluir/cancelar alocações

---

## 📞 Suporte

Se precisar de ajuda:

1. **Veja a documentação completa:** `FRONTEND_GESTAO_OBRAS.md`
2. **Consulte exemplos de API:** `EXEMPLOS_API_GESTAO_EQUIPES.md`
3. **Entre em contato com o administrador do sistema**

---

## 📚 Glossário

| Termo            | Significado                                                    |
| ---------------- | -------------------------------------------------------------- |
| **Alocação**     | Vínculo de uma equipe a um projeto por um período              |
| **Dias úteis**   | Dias de trabalho (segunda a sexta), excluindo finais de semana |
| **Planejada**    | Alocação criada mas ainda não iniciada                         |
| **Em Andamento** | Equipe está trabalhando no projeto                             |
| **Concluída**    | Trabalho finalizado com sucesso                                |
| **Cancelada**    | Alocação foi cancelada antes ou durante execução               |
| **Conflito**     | Tentativa de alocar uma equipe já ocupada no período           |
| **Disponível**   | Equipe está livre para ser alocada                             |
| **Ocupada**      | Equipe está trabalhando em algum projeto                       |

---

## ✅ Checklist Rápido

Antes de criar uma alocação, verifique:

- [ ] A equipe está **disponível** no período?
- [ ] O **ID do projeto** está correto?
- [ ] A **data de início** é válida?
- [ ] A **duração** está adequada? (5-40 dias típico)
- [ ] Há alguma **observação importante** para registrar?

Após criar:

- [ ] A alocação apareceu no **calendário**?
- [ ] O **status** está correto (Planejada)?
- [ ] A equipe agora aparece como **OCUPADA**?

Durante o trabalho:

- [ ] Iniciou a alocação quando a equipe chegou?
- [ ] Está acompanhando o progresso?
- [ ] Vai concluir quando finalizar?

---

**Versão:** 1.0.0  
**Última atualização:** 22 de outubro de 2025  
**Para:** Usuários do Sistema S3E  
**Suporte:** Administrador do Sistema
