# 🧪 TESTE RÁPIDO - SISTEMA DE COTAÇÕES

## ✅ **TUDO PRONTO PARA TESTAR!**

---

## 🚀 **TESTE EM 6 PASSOS:**

### **1️⃣ Acesse a Página**

```
Menu Lateral → COMERCIAL → Cotações
```

**Deve aparecer:**

```
🏷️ Cotações de Fornecedores
Banco frio de materiais cotados

[Template] [Exportar] [Importar JSON]
```

---

### **2️⃣ Baixe o Template**

```
Clique: "Template"
```

**Deve baixar:** `template-cotacoes-2025-11-12.json`

**Conteúdo:**

```json
{
  "versao": "1.0",
  "geradoEm": "2025-11-12T...",
  "empresa": "S3E Engenharia Elétrica",
  "instrucoes": "Preencha os campos...",
  "cotacoes": [
    {
      "nome": "EXEMPLO - Cabo de Cobre 2,5mm",
      "ncm": "85444200",
      "valorUnitario": 100.5,
      "fornecedorNome": "Fornecedor Exemplo Ltda",
      "observacoes": "Cotação válida por 30 dias"
    }
  ]
}
```

**Toast:** "✅ Template baixado com sucesso!"

---

### **3️⃣ Edite o Template**

```json
{
  "versao": "1.0",
  "cotacoes": [
    {
      "nome": "Cabo de Cobre 2,5mm - Rolo 100m",
      "ncm": "85444200",
      "valorUnitario": 450.0,
      "fornecedorNome": "Eletromar Distribuidora",
      "observacoes": "Entrega em 7 dias"
    },
    {
      "nome": "Disjuntor Tripolar 32A Siemens",
      "ncm": "85362000",
      "valorUnitario": 85.5,
      "fornecedorNome": "WEG Automação",
      "observacoes": "Pronta entrega"
    },
    {
      "nome": "Tomada 2P+T 10A - Tramontina",
      "ncm": "85362000",
      "valorUnitario": 15.9,
      "fornecedorNome": "Leroy Merlin",
      "observacoes": "Disponível em estoque"
    }
  ]
}
```

---

### **4️⃣ Importe**

```
1. Clique: "Importar JSON"
2. Selecione o arquivo editado
3. Clique: "Importar"
```

**Console Backend:**

```
📥 Importando cotações: cotacoes-*.json
📄 JSON parseado: { versao: '1.0', totalCotacoes: 3 }
✅ Cotação criada: Cabo de Cobre 2,5mm
✅ Cotação criada: Disjuntor Tripolar 32A
✅ Cotação criada: Tomada 2P+T 10A
✅ Importação concluída: { criados: 3, atualizados: 0, erros: 0 }
POST /api/cotacoes/importar 200
```

**Toast:** "✅ Importação concluída: 3 criados, 0 atualizados, 0 erros"

**Tabela atualiza:**

```
┌────────────────────────────────────────────────────────────┐
│ Material            │ NCM    │ Valor    │ Forn.  │ Data   │
├────────────────────────────────────────────────────────────┤
│ Cabo de Cobre      │ 85444  │ R$ 450,00│ Eletro │ 12/11  │
│ Disjuntor Tripolar │ 85362  │ R$ 85,50 │ WEG    │ 12/11  │
│ Tomada 2P+T        │ 85362  │ R$ 15,90 │ Leroy  │ 12/11  │
└────────────────────────────────────────────────────────────┘
```

---

### **5️⃣ Teste Ações**

#### **Visualizar 👁️:**

```
Clique: 👁️ (primeira linha)
Modal abre com:
- Material: Cabo de Cobre 2,5mm - Rolo 100m
- NCM: 85444200
- Valor: R$ 450,00
- Fornecedor: Eletromar Distribuidora
- Data: 12/11/2025 às 19:51
- Observações: Entrega em 7 dias
```

#### **Editar ✏️:**

```
1. Clique: ✏️ (primeira linha)
2. Altere: valorUnitario para 475.00
3. Clique: "Salvar"

Toast: "✅ Cotação atualizada com sucesso!"
Tabela atualiza: R$ 475,00
```

#### **Excluir 🗑️:**

```
1. Clique: 🗑️ (última linha)
2. AlertDialog: "Confirmar Exclusão"
3. Clique: "Excluir"

Toast: "✅ Cotação excluída com sucesso!"
Linha some da tabela
```

---

### **6️⃣ Teste Busca**

```
Digite: "cabo"
Filtro: Mostra apenas "Cabo de Cobre"

Digite: "85362"
Filtro: Mostra "Disjuntor" e "Tomada" (mesmo NCM)

Digite: "weg"
Filtro: Mostra apenas "Disjuntor" (fornecedor WEG)
```

---

## ✅ **VERIFICAÇÕES:**

### **Toasts Funcionando:**

```
✓ Sucesso (verde): Template, Exportar, Importar, Editar, Excluir
✓ Erro (vermelho): Validações, erros de API
✓ Auto-dismiss: 3 segundos
✓ Posição: Top-right
```

### **Modals:**

```
✓ Visualizar: Mostra todos os dados
✓ Editar: Formulário completo, validação
✓ Importar: Upload de JSON
✓ Excluir: AlertDialog com confirmação
✓ Todos fecham corretamente
```

### **Backend:**

```
✓ POST 200 (importar)
✓ GET 200 (listar)
✓ PUT 200 (editar)
✓ DELETE 200 (excluir)
✓ Logs detalhados
```

### **Frontend:**

```
✓ Tabela renderiza
✓ Busca funciona
✓ Botões respondem
✓ Loading states
✓ Sem erros console
✓ Sem erros lint
```

---

## 🎊 **SE TUDO FUNCIONOU:**

```
╔════════════════════════════════════════════╗
║                                             ║
║   🎉 SISTEMA DE COTAÇÕES 100% OK! 🎉       ║
║                                             ║
║   ✓ Backend responde (200)                 ║
║   ✓ Frontend renderiza                     ║
║   ✓ Importação funciona                    ║
║   ✓ CRUD completo funcional                ║
║   ✓ Toasts aparecem                        ║
║   ✓ Modals abrem/fecham                    ║
║   ✓ Busca filtra                           ║
║   ✓ Dados salvam no banco                  ║
║                                             ║
║   🚀 PRONTO PARA USO EM PRODUÇÃO! 🚀       ║
║                                             ║
╚════════════════════════════════════════════╝
```

---

## 🔥 **PRÓXIMO PASSO:**

Integrar com orçamentos para poder usar as cotações ao criar orçamentos!

**Veja:** `INTEGRACAO_ORCAMENTOS.md` (será criado)

---

**TESTE AGORA E APROVEITE! 🎊**
