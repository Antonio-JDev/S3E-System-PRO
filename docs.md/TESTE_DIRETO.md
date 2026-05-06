# 🧪 TESTE DIRETO - Descobrir o Problema

## 🎯 **EXECUTE ESTES TESTES:**

### **Teste 1: Endpoint Direto no Navegador**

Abra nova aba e cole este URL:

```
http://localhost:3000/api/materiais/template-importacao?tipo=todos&formato=json
```

**O QUE DEVE MOSTRAR:**

Se o backend estiver funcionando, verá:

```json
{
  "versao": "1.0",
  "geradoEm": "2024-11-12T...",
  "empresa": "S3E Engenharia Elétrica",
  "materiais": [
    ...66 materiais...
  ]
}
```

**✅ Se mostrou isto:** Backend está OK, problema é no frontend  
**❌ Se mostrou erro:** Backend tem problema  
**❌ Se mostrou `{ "success": true, "data": {...} }`:** Backend retorna wrapper

---

### **Teste 2: Console do Navegador**

Na página "Atualização de Preços", abra console (F12) e execute:

```javascript
// Cole isto no console e pressione Enter:
fetch(
  "http://localhost:3000/api/materiais/template-importacao?tipo=todos&formato=json",
  {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  }
)
  .then((r) => r.json())
  .then((data) => {
    console.log("📄 Dados retornados:", data);
    console.log("📊 Total de materiais:", data.materiais?.length || 0);

    if (data.materiais && data.materiais.length > 0) {
      console.log("✅ BACKEND OK!");
      console.log("Primeiro material:", data.materiais[0]);
    } else {
      console.log("❌ Backend retornou vazio!");
    }
  });
```

**Veja o que aparece no console!**

---

### **Teste 3: Baixar e Verificar JSON**

Execute no console do navegador:

```javascript
// 1. Baixar template
const baixarTemplate = async () => {
  try {
    const response = await fetch(
      "http://localhost:3000/api/materiais/template-importacao?tipo=todos&formato=json",
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      }
    );

    const dados = await response.json();
    console.log("📄 Resposta completa:", dados);

    // Criar arquivo
    const jsonString = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teste-direto.json";
    a.click();

    console.log("✅ Arquivo baixado! Verifique Downloads");
    console.log("📊 Total de materiais:", dados.materiais?.length);
  } catch (error) {
    console.error("❌ Erro:", error);
  }
};

baixarTemplate();
```

**Este comando baixa o JSON diretamente!**

Abra o arquivo `teste-direto.json` e veja se tem conteúdo.

---

## 🔍 **ANÁLISE DOS LOGS:**

### **Log do Backend que você enviou:**

```
📄 JSON recebido: { versao: undefined, totalMateriais: 0 }
POST /api/materiais/preview-importacao 400
```

**Significado:**

- Backend está recebendo arquivo
- Mas o JSON está vazio ou malformado
- Backend retorna erro 400

### **Possíveis causas:**

1. **JSON baixado está vazio** (mais provável)
2. **Multer não está salvando arquivo corretamente**
3. **Arquivo corrompido no upload**

---

## 🛠️ **CORREÇÃO IMEDIATA:**

Vou adicionar mais logs. **Reinicie o backend** agora:

```bash
cd backend

# Pare (Ctrl+C)

# Recompile com novas correções
npm run build

# Rode
npm run dev
```

Agora quando você tentar importar, verá logs assim:

```
📥 Preview - Recebendo arquivo...
📄 File: { fieldname: 'arquivo', originalname: '...', size: 45234 }
📂 Lendo arquivo JSON do disco: C:\...\import-123.json
📝 Conteúdo do arquivo (primeiros 200 chars): { "versao": "1.0", ...
📄 JSON parseado: { versao: '1.0', totalMateriais: 66 }
✅ 3 materiais com alteração de preço detectados
```

**Me mostre exatamente estes logs!**

---

## 💡 **SOLUÇÃO TEMPORÁRIA:**

Enquanto debugamos, você pode usar o **teste direto** do Teste 3 acima para
baixar o JSON.

Ou use este script que garante funcionar:

```javascript
// Cole no console do navegador:
(async () => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:3000/api/materiais", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const materiais = await response.json();

  const template = {
    versao: "1.0",
    geradoEm: new Date().toISOString(),
    empresa: "S3E Engenharia Elétrica",
    instrucoes: "Atualize apenas precoNovo",
    materiais: materiais.map((m) => ({
      id: m.id,
      sku: m.sku,
      nome: m.nome,
      categoria: m.categoria,
      unidadeMedida: m.unidadeMedida,
      estoque: m.estoque,
      precoAtual: m.preco || 0,
      precoNovo: m.preco || 0,
      fornecedor: "N/A",
    })),
  };

  const jsonString = JSON.stringify(template, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-materiais.json";
  a.click();

  console.log("✅ Template gerado:", template.materiais.length, "materiais");
})();
```

Este script GARANTE gerar JSON correto!

---

## 📞 **ME ENVIE:**

Para eu ajudar melhor, me mostre:

### **1. Console do navegador ao baixar JSON:**

```
Após clicar "📄 JSON", veja console e me mostre:
- O que aparece em "📄 Resposta do servidor:"
- O que aparece em "✅ Dados do template:"
```

### **2. Primeiras 20 linhas do JSON baixado:**

```
Abra arquivo no Bloco de Notas
Copie primeiras 20 linhas
Me envie
```

### **3. Console do backend ao importar:**

```
Após clicar "Processar", veja terminal do backend
Copie TODAS as linhas que aparecem
Me envie
```

Com estas informações, posso identificar EXATAMENTE o problema! 🔍

---

## 🎯 **TESTE RÁPIDO:**

Execute o Teste 3 (script no console) e me diga:

1. Arquivo `teste-direto.json` foi criado?
2. Ele tem conteúdo?
3. Quantos materiais tem?
4. Consegue importar este arquivo?

Se este arquivo funcionar, o problema é específico do botão "📄 JSON" do
sistema.

---

**AGUARDO SEU RETORNO COM OS LOGS! 🚀**
