import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Search,
  ExternalLink,
  Github,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Server,
  Layers,
} from 'lucide-react';
import { getBackendUrl } from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  security?: unknown[];
}

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, Partial<Record<string, OpenApiOperation>>>;
}

interface DocsMeta {
  title: string;
  version: string;
  description?: string;
  totalPaths: number;
  totalOperations: number;
  tags: Array<{ name: string; description?: string }>;
  operationsByTag: Record<string, number>;
}

interface EndpointRow {
  id: string;
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  secured: boolean;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  POST: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  PUT: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  PATCH: 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800',
  DELETE: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
};

async function fetchOpenApi(): Promise<OpenApiSpec> {
  const base = getBackendUrl();
  const res = await fetch(`${base}/api/docs/openapi.json`);
  if (!res.ok) throw new Error('Não foi possível carregar a especificação OpenAPI');
  return res.json();
}

async function fetchMeta(): Promise<DocsMeta> {
  const base = getBackendUrl();
  const res = await fetch(`${base}/api/docs/meta`);
  if (!res.ok) throw new Error('Não foi possível carregar metadados');
  const json = await res.json();
  return json.data;
}

function parseEndpoints(spec: OpenApiSpec): EndpointRow[] {
  const rows: EndpointRow[] = [];
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

  for (const [path, item] of Object.entries(spec.paths || {})) {
    if (!item) continue;
    for (const method of methods) {
      const op = item[method.toLowerCase()] as OpenApiOperation | undefined;
      if (!op) continue;
      rows.push({
        id: `${method}:${path}`,
        method,
        path,
        tag: op.tags?.[0] || 'Outros',
        summary: op.summary || `${method} ${path}`,
        secured: Array.isArray(op.security) && op.security.length > 0,
      });
    }
  }

  return rows.sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR') || a.path.localeCompare(b.path));
}

const MethodBadge: React.FC<{ method: string }> = ({ method }) => (
  <span
    className={`inline-flex min-w-[4.25rem] justify-center px-2 py-0.5 text-[11px] font-bold rounded-md border ${METHOD_STYLES[method] || 'bg-gray-100 text-gray-700'}`}
  >
    {method}
  </span>
);

const DocumentacaoSistemaPage: React.FC<{ toggleSidebar?: () => void }> = () => {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: spec, isLoading, error } = useQuery({
    queryKey: ['openapi-spec'],
    queryFn: fetchOpenApi,
    staleTime: 5 * 60 * 1000,
  });

  const { data: meta } = useQuery({
    queryKey: ['openapi-meta'],
    queryFn: fetchMeta,
    staleTime: 5 * 60 * 1000,
  });

  const endpoints = useMemo(() => (spec ? parseEndpoints(spec) : []), [spec]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, EndpointRow[]>();

    for (const ep of endpoints) {
      if (tagFilter !== 'all' && ep.tag !== tagFilter) continue;
      if (q) {
        const hay = `${ep.method} ${ep.path} ${ep.summary} ${ep.tag}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const list = map.get(ep.tag) || [];
      list.push(ep);
      map.set(ep.tag, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [endpoints, search, tagFilter]);

  const toggleTag = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const expandAll = () => setExpandedTags(new Set(grouped.map(([t]) => t)));
  const collapseAll = () => setExpandedTags(new Set());

  const copyPath = async (ep: EndpointRow) => {
    const base = getBackendUrl();
    await navigator.clipboard.writeText(`${base}${ep.path}`);
    setCopiedId(ep.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const swaggerUrl = `${getBackendUrl()}/api/docs/swagger`;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando documentação da API…</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
        <p className="font-semibold text-red-800 dark:text-red-200">Falha ao carregar documentação</p>
        <p className="text-sm text-red-600 dark:text-red-300 mt-2">
          Verifique se o backend está online e a rota <code className="text-xs">/api/docs/openapi.json</code> está acessível.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#0b1220]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1a2f] via-indigo-900 to-violet-900 text-white shadow-xl mb-8">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#fff,transparent_50%)]" />
          <div className="relative p-8 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium mb-4">
                  <BookOpen className="w-4 h-4" />
                  Documentação da API
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{spec.info.title}</h1>
                <p className="mt-3 text-indigo-100/90 text-sm sm:text-base leading-relaxed">
                  Referência completa das rotas REST do backend S3E System. Use a busca por módulo ou endpoint.
                  Para testar requisições interativamente, abra o Swagger UI.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <a
                  href={swaggerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 transition shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Swagger UI
                </a>
                <a
                  href="https://github.com/S3Eengenharia/app-s3e-systen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 transition"
                >
                  <Github className="w-4 h-4" />
                  Repositório no GitHub
                </a>
              </div>
            </div>

            {meta && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Layers, label: 'Módulos', value: meta.tags.length },
                  { icon: Server, label: 'Rotas', value: meta.totalPaths },
                  { icon: BookOpen, label: 'Operações', value: meta.totalOperations },
                  { icon: Shield, label: 'Versão', value: meta.version },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3">
                    <Icon className="w-5 h-5 text-indigo-200 mb-1" />
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-indigo-200">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="mb-6 text-sm">
          <span className="text-blue-700 dark:text-blue-300 underline decoration-blue-500 underline-offset-2 font-medium">
            fac autenticacao com google da S3E
          </span>
        </div>

        {/* Auth hint */}
        <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold">Autenticação JWT</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">
              A maioria das rotas exige <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/50">Authorization: Bearer &lt;token&gt;</code>.
              Obtenha o token em <strong>POST /api/auth/login</strong>. Rotas públicas incluem login, webhooks e alguns assets.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="sticky top-0 z-20 mb-6 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por rota, método ou módulo…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm min-w-[200px]"
            >
              <option value="all">Todos os módulos</option>
              {(meta?.tags || spec.tags || []).map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({meta?.operationsByTag?.[t.name] ?? '—'})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={expandAll} className="px-4 py-3 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800">
                Expandir
              </button>
              <button type="button" onClick={collapseAll} className="px-4 py-3 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800">
                Recolher
              </button>
            </div>
          </div>
        </div>

        {/* Endpoint groups */}
        <div className="space-y-4 pb-16">
          {grouped.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Nenhum endpoint encontrado para os filtros atuais.</p>
          ) : (
            grouped.map(([tag, items]) => {
              const open = expandedTags.has(tag) || search.length > 0 || tagFilter !== 'all';
              const tagDesc = (meta?.tags || spec.tags || []).find((t) => t.name === tag)?.description;

              return (
                <section
                  key={tag}
                  className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                  >
                    {open ? (
                      <ChevronDown className="w-5 h-5 text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tag}</h2>
                      {tagDesc && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tagDesc}</p>}
                    </div>
                    <span className="shrink-0 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                      {items.length} rotas
                    </span>
                  </button>

                  {open && (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800">
                      {items.map((ep) => (
                        <li
                          key={ep.id}
                          className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <MethodBadge method={ep.method} />
                            <div className="min-w-0">
                              <code className="text-sm font-mono text-gray-800 dark:text-indigo-200 break-all">
                                {ep.path}
                              </code>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ep.summary}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                            {ep.secured ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> JWT
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                                Público
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => copyPath(ep)}
                              className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                              title="Copiar URL completa"
                            >
                              {copiedId === ep.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentacaoSistemaPage;
