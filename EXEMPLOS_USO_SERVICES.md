# Exemplos Práticos de Uso dos Services

Este documento contém exemplos práticos de como usar os services do frontend em componentes React.

---

## 📦 Materiais - Listagem com Pesquisa

```typescript
import React, { useState, useEffect } from 'react';
import { materiaisService, Material } from '@/services';

function ListaMateriais() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMateriais();
  }, [search]);

  async function loadMateriais() {
    setLoading(true);
    setError(null);
    
    const response = await materiaisService.getMateriais({
      search,
      ativo: true,
    });

    if (response.success && response.data) {
      setMateriais(response.data);
    } else {
      setError(response.error || 'Erro ao carregar materiais');
    }
    
    setLoading(false);
  }

  async function registrarEntrada(materialId: string, quantidade: number) {
    const response = await materiaisService.registrarMovimentacao({
      materialId,
      tipo: 'entrada',
      quantidade,
      motivo: 'Compra',
    });

    if (response.success) {
      alert('Movimentação registrada com sucesso!');
      loadMateriais(); // Recarregar lista
    } else {
      alert(`Erro: ${response.error}`);
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <input
        type="text"
        placeholder="Pesquisar materiais..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Estoque</th>
            <th>Preço</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {materiais.map((material) => (
            <tr key={material.id}>
              <td>{material.codigo}</td>
              <td>{material.descricao}</td>
              <td>{material.quantidadeEstoque} {material.unidade}</td>
              <td>R$ {material.precoUnitario.toFixed(2)}</td>
              <td>
                <button onClick={() => registrarEntrada(material.id, 10)}>
                  Adicionar 10
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🛒 Compras - Upload de XML

```typescript
import React, { useState } from 'react';
import { comprasService, ParsedXMLData } from '@/services';

function UploadNotaFiscal() {
  const [xmlContent, setXmlContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedXMLData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      await parseXML(content);
    };
    reader.readAsText(file);
  }

  async function parseXML(content: string) {
    setLoading(true);
    
    const response = await comprasService.parseXML(content);
    
    if (response.success && response.data) {
      setParsedData(response.data);
    } else {
      alert(`Erro ao parsear XML: ${response.error}`);
    }
    
    setLoading(false);
  }

  async function criarCompra() {
    if (!parsedData) return;

    // Aqui você precisaria mapear os itens do XML para os IDs dos materiais
    // Este é apenas um exemplo simplificado
    const response = await comprasService.createCompra({
      fornecedorId: 'ID_DO_FORNECEDOR', // Buscar pelo CNPJ
      dataCompra: new Date().toISOString().split('T')[0],
      observacoes: 'Importado de XML',
      itens: parsedData.itens.map(item => ({
        materialId: 'ID_DO_MATERIAL', // Buscar pelo código
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
      })),
    });

    if (response.success) {
      alert('Compra criada com sucesso!');
      setParsedData(null);
    } else {
      alert(`Erro: ${response.error}`);
    }
  }

  return (
    <div>
      <h2>Upload de Nota Fiscal (XML)</h2>
      
      <input
        type="file"
        accept=".xml"
        onChange={handleFileUpload}
      />

      {loading && <div>Processando XML...</div>}

      {parsedData && (
        <div>
          <h3>Dados Extraídos</h3>
          <p>Fornecedor: {parsedData.fornecedor?.nome}</p>
          <p>CNPJ: {parsedData.fornecedor?.cnpj}</p>
          <p>Valor Total: R$ {parsedData.valorTotal.toFixed(2)}</p>
          
          <h4>Itens ({parsedData.itens.length})</h4>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Preço Unit.</th>
              </tr>
            </thead>
            <tbody>
              {parsedData.itens.map((item, index) => (
                <tr key={index}>
                  <td>{item.codigo}</td>
                  <td>{item.descricao}</td>
                  <td>{item.quantidade}</td>
                  <td>R$ {item.precoUnitario.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={criarCompra}>
            Criar Compra
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 💰 Vendas - Realizar Venda com Parcelas

```typescript
import React, { useState, useEffect } from 'react';
import { vendasService, orcamentosService, Orcamento } from '@/services';

function RealizarVenda() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [selectedOrcamento, setSelectedOrcamento] = useState<string>('');
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrcamentosAprovados();
  }, []);

  async function loadOrcamentosAprovados() {
    const response = await orcamentosService.getOrcamentos({
      status: 'aprovado',
    });

    if (response.success && response.data) {
      setOrcamentos(response.data);
    }
  }

  async function realizarVenda() {
    if (!selectedOrcamento) {
      alert('Selecione um orçamento');
      return;
    }

    const orcamento = orcamentos.find(o => o.id === selectedOrcamento);
    if (!orcamento) return;

    const valorParcela = orcamento.valorTotal / numeroParcelas;
    const dataVenda = new Date();

    const parcelas = Array.from({ length: numeroParcelas }, (_, i) => {
      const dataVencimento = new Date(dataVenda);
      dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);

      return {
        numeroParcela: i + 1,
        dataVencimento: dataVencimento.toISOString().split('T')[0],
        valor: valorParcela,
      };
    });

    setLoading(true);

    const response = await vendasService.realizarVenda({
      orcamentoId: selectedOrcamento,
      dataVenda: dataVenda.toISOString().split('T')[0],
      parcelas,
    });

    if (response.success) {
      alert('Venda realizada com sucesso!');
      setSelectedOrcamento('');
      setNumeroParcelas(1);
      loadOrcamentosAprovados();
    } else {
      alert(`Erro: ${response.error}`);
    }

    setLoading(false);
  }

  return (
    <div>
      <h2>Realizar Venda</h2>

      <div>
        <label>Orçamento Aprovado:</label>
        <select
          value={selectedOrcamento}
          onChange={(e) => setSelectedOrcamento(e.target.value)}
        >
          <option value="">Selecione...</option>
          {orcamentos.map((orc) => (
            <option key={orc.id} value={orc.id}>
              {orc.numero} - {orc.cliente?.nome} - R$ {orc.valorTotal.toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Número de Parcelas:</label>
        <input
          type="number"
          min="1"
          max="12"
          value={numeroParcelas}
          onChange={(e) => setNumeroParcelas(parseInt(e.target.value))}
        />
      </div>

      {selectedOrcamento && (
        <div>
          <h3>Resumo</h3>
          <p>Valor Total: R$ {orcamentos.find(o => o.id === selectedOrcamento)?.valorTotal.toFixed(2)}</p>
          <p>Valor por Parcela: R$ {(orcamentos.find(o => o.id === selectedOrcamento)?.valorTotal || 0 / numeroParcelas).toFixed(2)}</p>
        </div>
      )}

      <button onClick={realizarVenda} disabled={loading || !selectedOrcamento}>
        {loading ? 'Processando...' : 'Confirmar Venda'}
      </button>
    </div>
  );
}
```

---

## 💳 Contas a Pagar - Dashboard de Alertas

```typescript
import React, { useState, useEffect } from 'react';
import { contasPagarService, ContaPagar } from '@/services';

function DashboardContasPagar() {
  const [contasAtrasadas, setContasAtrasadas] = useState<ContaPagar[]>([]);
  const [contasAVencer, setContasAVencer] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlertas();
  }, []);

  async function loadAlertas() {
    setLoading(true);

    const [atrasadas, aVencer] = await Promise.all([
      contasPagarService.getContasEmAtraso(),
      contasPagarService.getContasAVencer(7), // Próximos 7 dias
    ]);

    if (atrasadas.success && atrasadas.data) {
      setContasAtrasadas(atrasadas.data);
    }

    if (aVencer.success && aVencer.data) {
      setContasAVencer(aVencer.data);
    }

    setLoading(false);
  }

  async function pagarConta(id: string, valor: number) {
    const response = await contasPagarService.pagarConta(id, {
      dataPagamento: new Date().toISOString().split('T')[0],
      valorPago: valor,
      formaPagamento: 'PIX',
    });

    if (response.success) {
      alert('Pagamento registrado!');
      loadAlertas();
    } else {
      alert(`Erro: ${response.error}`);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Alertas de Contas a Pagar</h2>

      {/* Contas Atrasadas */}
      <div style={{ backgroundColor: '#ffebee', padding: '1rem', marginBottom: '1rem' }}>
        <h3>⚠️ Contas Atrasadas ({contasAtrasadas.length})</h3>
        {contasAtrasadas.length === 0 ? (
          <p>Nenhuma conta atrasada</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contasAtrasadas.map((conta) => (
                <tr key={conta.id}>
                  <td>{conta.fornecedor?.nome}</td>
                  <td>{conta.descricao}</td>
                  <td>{new Date(conta.dataVencimento).toLocaleDateString()}</td>
                  <td>R$ {conta.valor.toFixed(2)}</td>
                  <td>
                    <button onClick={() => pagarConta(conta.id, conta.valor)}>
                      Pagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contas a Vencer */}
      <div style={{ backgroundColor: '#fff3e0', padding: '1rem' }}>
        <h3>📅 Contas a Vencer (Próximos 7 dias) ({contasAVencer.length})</h3>
        {contasAVencer.length === 0 ? (
          <p>Nenhuma conta a vencer nos próximos 7 dias</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contasAVencer.map((conta) => (
                <tr key={conta.id}>
                  <td>{conta.fornecedor?.nome}</td>
                  <td>{conta.descricao}</td>
                  <td>{new Date(conta.dataVencimento).toLocaleDateString()}</td>
                  <td>R$ {conta.valor.toFixed(2)}</td>
                  <td>
                    <button onClick={() => pagarConta(conta.id, conta.valor)}>
                      Pagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 Relatórios - Dashboard Financeiro

```typescript
import React, { useState, useEffect } from 'react';
import { relatoriosService, DashboardCompleto } from '@/services';

function DashboardFinanceiro() {
  const [dashboard, setDashboard] = useState<DashboardCompleto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const response = await relatoriosService.getDashboardCompleto();

    if (response.success && response.data) {
      setDashboard(response.data);
    }

    setLoading(false);
  }

  if (loading) return <div>Carregando dashboard...</div>;
  if (!dashboard) return <div>Erro ao carregar dashboard</div>;

  return (
    <div>
      <h2>Dashboard Financeiro</h2>

      {/* Cards de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h4>Total Vendas</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            R$ {dashboard.resumo.totalVendas.toFixed(2)}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
          <h4>Total Recebido</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            R$ {dashboard.resumo.totalRecebido.toFixed(2)}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <h4>Total Pendente</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            R$ {dashboard.resumo.totalPendente.toFixed(2)}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#ffebee', borderRadius: '8px' }}>
          <h4>Total a Pagar</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            R$ {dashboard.resumo.totalPagar.toFixed(2)}
          </p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
          <h4>Saldo Atual</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            R$ {dashboard.resumo.saldoAtual.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Alertas */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff9c4', borderRadius: '8px' }}>
        <h3>⚠️ Alertas</h3>
        <ul>
          <li>Contas atrasadas: {dashboard.alertas.contasAtrasadas}</li>
          <li>Contas a vencer: {dashboard.alertas.contasVencer}</li>
          <li>Estoques baixos: {dashboard.alertas.estoquesBaixos}</li>
        </ul>
      </div>

      {/* Vendas Recentes */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Vendas Recentes</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.vendasRecentes.map((venda, index) => (
              <tr key={index}>
                <td>{new Date(venda.dataVenda).toLocaleDateString()}</td>
                <td>{venda.cliente?.nome}</td>
                <td>R$ {venda.valorTotal.toFixed(2)}</td>
                <td>{venda.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🏗️ Obras - Gerenciar Equipes e Alocações

```typescript
import React, { useState, useEffect } from 'react';
import { obrasService, Equipe, Alocacao } from '@/services';
import { projetosService } from '@/services';

function GerenciarObras() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulário de alocação
  const [novaAlocacao, setNovaAlocacao] = useState({
    equipeId: '',
    projetoId: '',
    dataInicio: '',
    dataFim: '',
  });

  useEffect(() => {
    loadDados();
  }, []);

  async function loadDados() {
    setLoading(true);

    const [equipesRes, alocacoesRes, projetosRes] = await Promise.all([
      obrasService.listarEquipes({ todas: false }),
      obrasService.listarAlocacoes(),
      projetosService.getProjetos(),
    ]);

    if (equipesRes.success && equipesRes.data) setEquipes(equipesRes.data);
    if (alocacoesRes.success && alocacoesRes.data) setAlocacoes(alocacoesRes.data);
    if (projetosRes.success && projetosRes.data) setProjetos(projetosRes.data);

    setLoading(false);
  }

  async function criarEquipe() {
    const nome = prompt('Nome da equipe:');
    const responsavel = prompt('Responsável:');

    if (!nome || !responsavel) return;

    const response = await obrasService.criarEquipe({
      nome,
      responsavel,
      membros: [responsavel],
      especialidades: [],
    });

    if (response.success) {
      alert('Equipe criada!');
      loadDados();
    } else {
      alert(`Erro: ${response.error}`);
    }
  }

  async function alocarEquipe() {
    if (!novaAlocacao.equipeId || !novaAlocacao.projetoId || 
        !novaAlocacao.dataInicio || !novaAlocacao.dataFim) {
      alert('Preencha todos os campos');
      return;
    }

    const response = await obrasService.alocarEquipe(novaAlocacao);

    if (response.success) {
      alert('Equipe alocada com sucesso!');
      setNovaAlocacao({ equipeId: '', projetoId: '', dataInicio: '', dataFim: '' });
      loadDados();
    } else {
      alert(`Erro: ${response.error}`);
    }
  }

  async function iniciarAlocacao(id: string) {
    const response = await obrasService.iniciarAlocacao(id);
    if (response.success) {
      alert('Alocação iniciada!');
      loadDados();
    }
  }

  async function concluirAlocacao(id: string) {
    const response = await obrasService.concluirAlocacao(id);
    if (response.success) {
      alert('Alocação concluída!');
      loadDados();
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Gerenciar Obras</h2>

      {/* Lista de Equipes */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Equipes ({equipes.length})</h3>
          <button onClick={criarEquipe}>Nova Equipe</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {equipes.map((equipe) => (
            <div key={equipe.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>{equipe.nome}</h4>
              <p><strong>Responsável:</strong> {equipe.responsavel}</p>
              <p><strong>Membros:</strong> {equipe.membros.length}</p>
              <p><strong>Especialidades:</strong> {equipe.especialidades.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário de Nova Alocação */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Nova Alocação</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <select
            value={novaAlocacao.equipeId}
            onChange={(e) => setNovaAlocacao({ ...novaAlocacao, equipeId: e.target.value })}
          >
            <option value="">Selecione a equipe...</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nome}</option>
            ))}
          </select>

          <select
            value={novaAlocacao.projetoId}
            onChange={(e) => setNovaAlocacao({ ...novaAlocacao, projetoId: e.target.value })}
          >
            <option value="">Selecione o projeto...</option>
            {projetos.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.nome}</option>
            ))}
          </select>

          <input
            type="date"
            value={novaAlocacao.dataInicio}
            onChange={(e) => setNovaAlocacao({ ...novaAlocacao, dataInicio: e.target.value })}
          />

          <input
            type="date"
            value={novaAlocacao.dataFim}
            onChange={(e) => setNovaAlocacao({ ...novaAlocacao, dataFim: e.target.value })}
          />
        </div>
        <button onClick={alocarEquipe} style={{ marginTop: '1rem' }}>
          Alocar Equipe
        </button>
      </div>

      {/* Lista de Alocações */}
      <div>
        <h3>Alocações Atuais ({alocacoes.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Projeto</th>
              <th>Período</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alocacoes.map((alocacao) => (
              <tr key={alocacao.id}>
                <td>{alocacao.equipe?.nome}</td>
                <td>{alocacao.projeto?.nome}</td>
                <td>
                  {new Date(alocacao.dataInicio).toLocaleDateString()} - {' '}
                  {new Date(alocacao.dataFim).toLocaleDateString()}
                </td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 
                      alocacao.status === 'EmAndamento' ? '#4caf50' :
                      alocacao.status === 'Concluida' ? '#9e9e9e' :
                      alocacao.status === 'Cancelada' ? '#f44336' : '#2196f3',
                    color: 'white',
                  }}>
                    {alocacao.status}
                  </span>
                </td>
                <td>
                  {alocacao.status === 'Agendada' && (
                    <button onClick={() => iniciarAlocacao(alocacao.id)}>
                      Iniciar
                    </button>
                  )}
                  {alocacao.status === 'EmAndamento' && (
                    <button onClick={() => concluirAlocacao(alocacao.id)}>
                      Concluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 📄 PDF - Gerar e Baixar Orçamento

```typescript
import React, { useState } from 'react';
import { pdfService } from '@/services';

function GerarPDFOrcamento({ orcamentoId }: { orcamentoId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    
    try {
      const blob = await pdfService.gerarOrcamentoPDFDownload(orcamentoId);
      pdfService.downloadPDF(blob, `orcamento-${orcamentoId}.pdf`);
    } catch (error) {
      alert(`Erro ao gerar PDF: ${error}`);
    }
    
    setLoading(false);
  }

  async function handleView() {
    setLoading(true);
    
    try {
      const blob = await pdfService.gerarOrcamentoPDFView(orcamentoId);
      pdfService.viewPDF(blob);
    } catch (error) {
      alert(`Erro ao gerar PDF: ${error}`);
    }
    
    setLoading(false);
  }

  return (
    <div>
      <button onClick={handleDownload} disabled={loading}>
        {loading ? 'Gerando...' : '📥 Baixar PDF'}
      </button>
      <button onClick={handleView} disabled={loading}>
        {loading ? 'Gerando...' : '👁️ Visualizar PDF'}
      </button>
    </div>
  );
}
```

---

## 💡 Dicas de Boas Práticas

### 1. **Custom Hooks para Reutilização**

```typescript
// hooks/useMateriais.ts
import { useState, useEffect } from 'react';
import { materiaisService, Material } from '@/services';

export function useMateriais(search?: string) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await materiaisService.getMateriais({ search });
      
      if (response.success && response.data) {
        setMateriais(response.data);
        setError(null);
      } else {
        setError(response.error || 'Erro desconhecido');
      }
      
      setLoading(false);
    }
    
    load();
  }, [search]);

  return { materiais, loading, error, refetch: () => load() };
}

// Uso no componente
function MeuComponente() {
  const { materiais, loading, error } = useMateriais('cabo');
  
  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  
  return <div>{/* Renderizar materiais */}</div>;
}
```

### 2. **Tratamento de Erros Centralizado**

```typescript
// utils/apiErrorHandler.ts
export function handleApiError(error: string | undefined) {
  if (error?.includes('401') || error?.includes('Unauthorized')) {
    // Redirecionar para login
    window.location.href = '/login';
  } else if (error?.includes('403')) {
    alert('Você não tem permissão para realizar esta ação');
  } else {
    alert(`Erro: ${error}`);
  }
}

// Uso
const response = await materiaisService.getMateriais();
if (!response.success) {
  handleApiError(response.error);
}
```

### 3. **Loading States Globais com Context**

```typescript
// contexts/LoadingContext.tsx
import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext<{
  loading: boolean;
  setLoading: (loading: boolean) => void;
}>({ loading: false, setLoading: () => {} });

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {loading && <div className="global-loading">Carregando...</div>}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
```

---

**Última atualização:** 27/10/2025
