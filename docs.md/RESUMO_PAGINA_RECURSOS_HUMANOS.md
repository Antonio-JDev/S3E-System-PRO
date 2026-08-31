# Resumo – Página de Recursos Humanos

A página **Recursos Humanos** fica dentro do **Gerenciamento Empresarial** (menu
lateral). Nela são concentradas as funções de quadro de funcionários,
folha/vales e estoque de itens de RH (EPIs, uniformes, equipamentos).

---

## Onde fica e quem vê

- **Caminho:** Menu → **Gerenciamento Empresarial** → aba **Recursos Humanos**.
- **Visibilidade:** A aba Recursos Humanos **não é exibida** para os perfis:
  Gerente, Engenheiro Eletricista e Desenhista Industrial (restrição de acesso a
  dados de salários/folha).

---

## Estrutura da página

A página tem **duas abas**:

1. **Funcionários** – cadastro e gestão de colaboradores e vales.
2. **Estoque de Recursos Humanos** – itens (EPIs, uniformes, ferramentas) e
   vinculação a funcionários.

---

## 1. Aba Funcionários

### O que aparece

- **Métricas no topo:**
  - Folha de pagamento (mensal).
  - Vales do mês.
  - Custo total (folha + vales).
- **Tabela de funcionários** com: Nome, Cargo, Salário, Status
  (Ativo/Inativo/Férias/Afastado) e ações.

### O que dá para fazer

| Ação                      | Descrição                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adicionar funcionário** | Cadastra novo colaborador. Há **busca rápida** por usuário já cadastrado no sistema (nome/e-mail) para preencher nome e e-mail e vincular ao funcionário. |
| **Editar**                | Altera dados do funcionário.                                                                                                                              |
| **Ver dados**             | Abre modal com os dados completos do colaborador.                                                                                                         |
| **Histórico**             | Abre modal com **histórico de pagamentos** daquele funcionário.                                                                                           |
| **Deletar**               | Remove o funcionário (com confirmação).                                                                                                                   |
| **Registrar Vale**        | Botão no topo: abre modal para lançar **Vale Transporte**, **Vale Alimentação** ou **Adiantamento** para um funcionário (valor, data, descrição).         |

### Dados do funcionário (formulário)

- Nome, Cargo, Salário, Data de admissão.
- CPF, Telefone, E-mail.
- Status (Ativo, Inativo, Férias, Afastado).
- Dia do pagamento no mês (para integração com Contas a Pagar).
- Tamanhos de uniforme: camisa, calça, bermuda, sapato.

---

## 2. Aba Estoque de Recursos Humanos

### O que é

Controle de itens de RH (EPIs, uniformes, equipamentos) que podem vir de
**compras** (classificação Recursos Humanos) ou ser **inseridos manualmente**
(itens que já existem na empresa, sem compra cadastrada).

### O que aparece

- **Kits de Ferramentas** (se houver): cards com kits de ferramentas dos
  eletricistas (nome do kit, eletricista, quantidade de itens, data de entrega).
- **Filtro:** por funcionário (Todos / Sem vinculação / um funcionário
  específico).
- **Tabela de recursos** com: Item, Quantidade, Valor unitário, Valor total,
  Data da compra, Data de entrega, Eletricista (vinculado ou “Sem vinculação”) e
  ações.

### O que dá para fazer

| Ação                   | Descrição                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adicionar recurso**  | Inclusão **manual**: nome do item, quantidade, valor unitário, valor total, funcionário (opcional), observações. Não exige compra. Itens que vêm de compra (classificação Recursos Humanos) continuam entrando pelo fluxo de compras. |
| **Editar**             | Altera nome, quantidade, valores, funcionário vinculado e observações do item.                                                                                                                                                        |
| **Histórico**          | Abre modal com o histórico de movimentações daquele recurso (recebimento, vinculação, desvinculação, etc.).                                                                                                                           |
| **Vincular / Alterar** | Abre modal para **vincular** o item a um funcionário ou **trocar** o funcionário vinculado (busca por nome, cargo ou CPF).                                                                                                            |
| **Desvincular**        | Remove a vinculação do item com o funcionário (item volta para “Sem vinculação”).                                                                                                                                                     |
| **Excluir**            | Remove o recurso do estoque (com confirmação).                                                                                                                                                                                        |

### Origem dos itens

- **Com compra:** itens criados a partir de compras com classificação **Recursos
  Humanos** (datas de compra e entrega preenchidas; na tabela aparecem quando
  houver compra).
- **Entrada manual:** itens cadastrados pelo botão “Adicionar Recurso”, sem
  compra (campos de data da compra/entrega aparecem como “—”).

---

## Resumo rápido

- **Funcionários:** cadastro, edição, exclusão, ver dados, histórico de
  pagamentos e registro de vales (Transporte, Alimentação, Adiantamento).
  Métricas de folha e custo total.
- **Estoque de RH:** cadastro manual ou via compra; edição;
  vinculação/desvinculação a funcionário; histórico de movimentações; exclusão.
  Filtro por funcionário e exibição dos kits de ferramentas quando existirem.

A página concentra a gestão de pessoas e dos recursos materiais
(EPIs/uniformes/equipamentos) ligados a eles em um único lugar dentro do
Gerenciamento Empresarial.
