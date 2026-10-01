import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { getBackendUrl } from '../config/api';

type McpJson = {
  mcpServers: {
    's3e-erp-debug': {
      url: string;
      headers: { Authorization: string };
    };
  };
};

type ConfigDevMcp = {
  mcpKeyMasked: string | null;
  mcpKeyNova: string | null;
  chaveRecemGerada: boolean;
  geminiConfigurada: boolean;
  geminiKeyMasked: string | null;
  usarGemini: boolean;
  mcpUrl: string;
  headerFormato: string;
  mcpJson: McpJson;
};

function aplicarBaseUrl(json: McpJson, baseUrl: string): McpJson {
  const bruto = baseUrl.trim() || 'http://localhost:3001';
  const comProtocolo = /^https?:\/\//i.test(bruto) ? bruto : `http://${bruto}`;
  const base = comProtocolo.replace(/\/$/, '');
  const servidor = json.mcpServers['s3e-erp-debug'];
  return {
    mcpServers: {
      's3e-erp-debug': {
        url: `${base}/api/mcp`,
        headers: servidor?.headers || { Authorization: 'Bearer <chave>' },
      },
    },
  };
}

const SESSAO_CHAVE_NOVA = 's3e.dev.mcp.chaveNova';

const DevMcpPanel: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState(() => getBackendUrl() || 'http://localhost:3001');
  const [config, setConfig] = useState<ConfigDevMcp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoChave, setSalvandoChave] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [salvandoGemini, setSalvandoGemini] = useState(false);
  const [novaChaveMcp, setNovaChaveMcp] = useState('');
  const [chaveGemini, setChaveGemini] = useState('');
  const [usarGemini, setUsarGemini] = useState(false);
  const [chaveRecemGerada, setChaveRecemGerada] = useState<string | null>(null);

  const aplicarResposta = useCallback((data: ConfigDevMcp) => {
    setConfig(data);
    setUsarGemini(Boolean(data.usarGemini));
    setChaveGemini('');
    setNovaChaveMcp('');
    if (data.chaveRecemGerada && data.mcpKeyNova) {
      sessionStorage.setItem(SESSAO_CHAVE_NOVA, data.mcpKeyNova);
      setChaveRecemGerada(data.mcpKeyNova);
      return;
    }
    setChaveRecemGerada(sessionStorage.getItem(SESSAO_CHAVE_NOVA));
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const origem = getBackendUrl() || 'http://localhost:3001';
      const resposta = await axiosApiService.get<ConfigDevMcp>('/api/dev/mcp', { baseUrl: origem });
      if (!ativo) return;
      setCarregando(false);
      if (!resposta.success || !resposta.data) {
        toast.error(resposta.error || 'Não foi possível carregar a configuração do MCP.');
        return;
      }
      aplicarResposta(resposta.data);
    })();
    return () => {
      ativo = false;
    };
  }, [aplicarResposta]);

  const jsonExibido = useMemo(() => {
    if (!config?.mcpJson) return '';
    return JSON.stringify(aplicarBaseUrl(config.mcpJson, baseUrl), null, 2);
  }, [config, baseUrl]);

  const copiarJson = async () => {
    if (!jsonExibido) return;
    try {
      await navigator.clipboard.writeText(jsonExibido);
      toast.success('JSON copiado. Cole em Cursor Settings → MCP.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const gerarChave = async () => {
    setGerando(true);
    const resposta = await axiosApiService.post<ConfigDevMcp>('/api/dev/mcp/chave/gerar', { baseUrl });
    setGerando(false);
    if (!resposta.success || !resposta.data) {
      toast.error(resposta.error || 'Não foi possível gerar a chave.');
      return;
    }
    aplicarResposta(resposta.data);
    toast.success('Nova chave gerada. Ela aparece uma vez no aviso e no JSON abaixo.');
  };

  const salvarChave = async () => {
    const valor = novaChaveMcp.trim();
    if (!valor) {
      toast.error('Informe a nova chave do MCP ou use o botão de gerar.');
      return;
    }
    setSalvandoChave(true);
    const resposta = await axiosApiService.put<ConfigDevMcp>('/api/dev/mcp/chave', {
      mcpApiKey: valor,
      baseUrl,
    });
    setSalvandoChave(false);
    if (!resposta.success || !resposta.data) {
      toast.error(resposta.error || 'Não foi possível salvar a chave.');
      return;
    }
    aplicarResposta(resposta.data);
    toast.success('Chave do MCP atualizada.');
  };

  const salvarGemini = async (limpar = false) => {
    setSalvandoGemini(true);
    const resposta = await axiosApiService.put<ConfigDevMcp>('/api/dev/mcp/gemini', {
      geminiApiKey: limpar ? undefined : chaveGemini.trim() || undefined,
      usarGemini: limpar ? false : usarGemini,
      limpar,
      baseUrl,
    });
    setSalvandoGemini(false);
    if (!resposta.success || !resposta.data) {
      toast.error(resposta.error || 'Não foi possível salvar a chave Gemini.');
      return;
    }
    aplicarResposta(resposta.data);
    toast.success(limpar ? 'Chave Gemini removida.' : 'Configuração Gemini salva.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">MCP de debug</h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          Agentes de IA leem logs, NF-e rejeitada e auditoria de sessão no servidor local.
          A chave fica no banco e pode ser trocada aqui. Depois de salva, o campo mostra só o trecho mascarado.
          O JSON abaixo inclui a chave vigente para colar no Cursor — ele só sai nesta tela, para quem está autenticado.
        </p>
      </div>

      {carregando && !config ? (
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Carregando configuração...</p>
      ) : null}

      {chaveRecemGerada ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold mb-1">Chave nova (mostrada uma vez)</p>
          <p className="text-sm mb-2">Guarde se precisar. Ao recarregar a aba, o campo volta mascarado. O JSON copiável continua com a chave atual.</p>
          <code className="block break-all text-sm font-mono">{chaveRecemGerada}</code>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => {
              sessionStorage.removeItem(SESSAO_CHAVE_NOVA);
              setChaveRecemGerada(null);
            }}
          >
            Ocultar chave
          </button>
        </div>
      ) : null}

      <div className="card-secondary border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 space-y-4">
        <h4 className="font-bold text-gray-900 dark:text-dark-text">Chave de API do MCP</h4>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          Chave vigente: <strong className="font-mono">{config?.mcpKeyMasked || 'ainda não gerada'}</strong>
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text" htmlFor="mcp-chave-nova">
          Nova chave
        </label>
        <input
          id="mcp-chave-nova"
          type="password"
          autoComplete="off"
          value={novaChaveMcp}
          onChange={(e) => setNovaChaveMcp(e.target.value)}
          placeholder="Cole uma chave ou gere uma nova"
          className="input-field w-full"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={salvarChave} disabled={salvandoChave} className="btn-primary disabled:opacity-60">
            {salvandoChave ? 'Salvando...' : 'Salvar chave'}
          </button>
          <button type="button" onClick={gerarChave} disabled={gerando} className="btn-secondary disabled:opacity-60">
            {gerando ? 'Gerando...' : 'Gerar nova chave'}
          </button>
        </div>
      </div>

      <div className="card-secondary border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 space-y-4">
        <h4 className="font-bold text-gray-900 dark:text-dark-text">Chave Gemini</h4>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          Opcional, só fica guardada para uso futuro. Esta tela não chama a API da Gemini.
          {config?.geminiConfigurada ? (
            <> Chave salva: <strong className="font-mono">{config.geminiKeyMasked}</strong></>
          ) : (
            <> Nenhuma chave salva.</>
          )}
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-dark-text">
          <input
            type="checkbox"
            checked={usarGemini}
            onChange={(e) => setUsarGemini(e.target.checked)}
          />
          Usar chave Gemini como provedor
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text" htmlFor="gemini-chave">
          Substituir chave
        </label>
        <input
          id="gemini-chave"
          type="password"
          autoComplete="off"
          value={chaveGemini}
          onChange={(e) => setChaveGemini(e.target.value)}
          placeholder={config?.geminiConfigurada ? 'Deixe em branco para manter a chave atual' : 'Cole a chave Gemini'}
          className="input-field w-full"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => salvarGemini(false)} disabled={salvandoGemini} className="btn-primary disabled:opacity-60">
            {salvandoGemini ? 'Salvando...' : 'Salvar Gemini'}
          </button>
          <button
            type="button"
            onClick={() => salvarGemini(true)}
            disabled={salvandoGemini || !config?.geminiConfigurada}
            className="btn-secondary disabled:opacity-60"
          >
            Limpar chave
          </button>
        </div>
      </div>

      <div className="card-secondary border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 space-y-4">
        <h4 className="font-bold text-gray-900 dark:text-dark-text">Configuração para o Cursor</h4>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          Copie o JSON e cole em <strong>Cursor Settings → MCP</strong> (arquivo mcp.json), ou na configuração MCP de outra IDE.
          O header autenticado é <code className="font-mono">Authorization: Bearer &lt;chave&gt;</code>.
          A URL aponta para o backend local; ajuste o host se a porta for outra.
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text" htmlFor="mcp-base-url">
          Host do backend
        </label>
        <input
          id="mcp-base-url"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="input-field w-full font-mono"
          placeholder="http://localhost:3001"
        />
        <textarea
          readOnly
          value={jsonExibido}
          rows={12}
          className="input-field w-full font-mono text-xs"
          aria-label="JSON do mcp.json"
        />
        <button type="button" onClick={copiarJson} disabled={!jsonExibido} className="btn-primary disabled:opacity-60">
          Copiar JSON
        </button>
      </div>
    </div>
  );
};

export default DevMcpPanel;
