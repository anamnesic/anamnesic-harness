'use client';

import { useMemo, useState } from 'react';
import { BookText, Brain, Database, FileSearch, Filter, Lightbulb, ShieldAlert, Sparkles, Workflow } from 'lucide-react';
import { useApi } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

interface DecisionFeedItem {
  id: string;
  source: 'proactive' | 'self-optimization' | 'decision-log' | 'system-log' | 'audit';
  category: string;
  title: string;
  summary: string;
  status: 'pending' | 'accepted' | 'rejected' | 'high' | 'medium' | 'low' | 'info';
  timestamp: string;
  sourceFile: string;
  metadata?: Record<string, unknown>;
}

type StatusFilterValue = DecisionFeedItem['status'] | 'all' | 'completed';

const STATUS_LABELS: Record<DecisionFeedItem['status'], string> = {
  pending: 'Em andamento',
  accepted: 'Aprovado',
  rejected: 'Negado',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

interface SourceInventory {
  files: number;
  latestFile: string | null;
  latestTimestamp: string | null;
}

interface DecisionFeedData {
  generatedAt: string;
  total: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  inventory: Record<string, SourceInventory>;
  items: DecisionFeedItem[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

const SOURCE_LABELS: Record<DecisionFeedItem['source'], string> = {
  proactive: 'Proactive Planner',
  'self-optimization': 'Self Optimization',
  'decision-log': 'Decisões Aplicadas',
  'system-log': 'Eventos do Sistema',
  audit: 'Audit LLM',
};

const SOURCE_ICONS: Record<DecisionFeedItem['source'], typeof Brain> = {
  proactive: Brain,
  'self-optimization': Sparkles,
  'decision-log': Workflow,
  'system-log': Database,
  audit: ShieldAlert,
};

const STATUS_TONE: Record<DecisionFeedItem['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-green-500/15 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  info: 'bg-stone-50/10 text-stone-200 border-stone-100/20',
};

function formatWhen(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'sem timestamp';

  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return dt.toLocaleString();
}

export function Decisions() {
  const { data, loading, error, refetch } = useApi<ApiEnvelope<DecisionFeedData>>('/api/v1/decisions/data');
  const [sourceFilter, setSourceFilter] = useState<DecisionFeedItem['source'] | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const feed = data?.data;

  const filteredItems = useMemo(() => {
    const items = feed?.items ?? [];

    return items.filter((item) => {
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed') {
          if (item.status !== 'accepted' && item.status !== 'rejected') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q)
        || item.summary.toLowerCase().includes(q)
        || item.category.toLowerCase().includes(q)
        || item.sourceFile.toLowerCase().includes(q)
      );
    });
  }, [feed?.items, query, sourceFilter, statusFilter]);

  const selected = useMemo(() => {
    if (!filteredItems.length) return null;
    if (!selectedId) return filteredItems[0];
    return filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0];
  }, [filteredItems, selectedId]);

  const sourceFilters: Array<{ value: DecisionFeedItem['source'] | 'all'; label: string; count: number }> = useMemo(() => {
    const bySource = feed?.bySource ?? {};
    return [
      { value: 'all', label: 'Tudo', count: feed?.total ?? 0 },
      { value: 'proactive', label: 'Proactive', count: bySource.proactive ?? 0 },
      { value: 'self-optimization', label: 'Self Opt', count: bySource['self-optimization'] ?? 0 },
      { value: 'decision-log', label: 'Aceites/Rejeições', count: bySource['decision-log'] ?? 0 },
      { value: 'system-log', label: 'System Log', count: bySource['system-log'] ?? 0 },
      { value: 'audit', label: 'Audit', count: bySource.audit ?? 0 },
    ];
  }, [feed?.bySource, feed?.total]);

  const completedCount = (feed?.byStatus?.accepted ?? 0) + (feed?.byStatus?.rejected ?? 0);
  const statusFilters: Array<{ value: StatusFilterValue; label: string; count: number }> = useMemo(() => {
    const byStatus = feed?.byStatus ?? {};
    return [
      { value: 'all', label: 'Todos status', count: feed?.total ?? 0 },
      { value: 'pending', label: 'Em andamento', count: byStatus.pending ?? 0 },
      { value: 'completed', label: 'Concluídas', count: completedCount },
      { value: 'accepted', label: 'Aprovadas', count: byStatus.accepted ?? 0 },
      { value: 'rejected', label: 'Negadas', count: byStatus.rejected ?? 0 },
      { value: 'high', label: 'High', count: byStatus.high ?? 0 },
      { value: 'medium', label: 'Medium', count: byStatus.medium ?? 0 },
      { value: 'low', label: 'Low', count: byStatus.low ?? 0 },
      { value: 'info', label: 'Info', count: byStatus.info ?? 0 },
    ];
  }, [feed?.byStatus, feed?.total, completedCount]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary/60 animate-spin mx-auto" />
          <p className="text-sm text-text-dim">Lendo decisões da IA em data/...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <ShieldAlert className="size-12 text-red-400/70 mx-auto" />
          <div>
            <h3 className="font-bold text-text mb-2">Falha ao carregar dados de decisões</h3>
            <p className="text-sm text-text-dim">
              {error}
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-4 pb-24 space-y-4">
      <div className="bento-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookText className="size-4 text-primary" />
              <p className="label-caps">Wiki operacional</p>
            </div>
            <h2 className="text-lg font-bold text-accent">Decisões que a IA tomou (baseado em data/)</h2>
            <p className="text-xs text-text-dim">
              Última análise: {feed?.generatedAt ? new Date(feed.generatedAt).toLocaleString() : '—'}
            </p>
          </div>
          <button
            onClick={() => void refetch()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
          >
            Reanalisar data/
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bento-card">
          <p className="label-caps">Total de decisões/eventos</p>
          <p className="text-2xl font-bold mt-2">{feed?.total ?? 0}</p>
        </div>
        <div className="bento-card">
          <p className="label-caps">Pendentes / em andamento</p>
          <p className="text-2xl font-bold mt-2 text-yellow-300">{feed?.byStatus?.pending ?? 0}</p>
        </div>
        <div className="bento-card">
          <p className="label-caps">Aprovadas</p>
          <p className="text-2xl font-bold mt-2 text-green-400">{feed?.byStatus?.accepted ?? 0}</p>
        </div>
        <div className="bento-card">
          <p className="label-caps">Negadas</p>
          <p className="text-2xl font-bold mt-2 text-red-400">{feed?.byStatus?.rejected ?? 0}</p>
        </div>
        <div className="bento-card">
          <p className="label-caps">Concluídas</p>
          <p className="text-2xl font-bold mt-2 text-cyan-300">{completedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[20rem_1fr_24rem] gap-4 min-h-[65vh]">
        <aside className="bento-card min-h-0 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-primary" />
            <p className="label-caps">Filtros</p>
          </div>

          <div className="space-y-2">
            {sourceFilters.map((item) => (
              <button
                key={item.value}
                onClick={() => setSourceFilter(item.value)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors',
                  sourceFilter === item.value
                    ? 'border-primary/60 bg-primary/10 text-accent'
                    : 'border-border text-text-dim hover:text-accent',
                )}
              >
                <span className="font-semibold">{item.label}</span>
                <span>{item.count}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-border/60 pt-3 space-y-2">
            <p className="label-caps">Status</p>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
              className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-xs"
            >
              {statusFilters.map((item) => (
                <option key={item.value} value={item.value}>{item.label} ({item.count})</option>
              ))}
            </select>
          </div>

          <div className="mt-4 border-t border-border/60 pt-3 min-h-0 overflow-auto">
            <p className="label-caps mb-2">Inventário data/</p>
            <div className="space-y-2 text-xs text-text-dim">
              {Object.entries(feed?.inventory ?? {}).map(([name, info]) => (
                <div key={name} className="rounded-lg border border-border/60 bg-card/40 px-2.5 py-2">
                  <p className="font-bold text-highlight">{name}</p>
                  <p>arquivos: {info.files}</p>
                  <p className="truncate" title={info.latestFile ?? ''}>último: {info.latestFile ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="bento-card min-h-0 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FileSearch className="size-4 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, resumo, categoria ou arquivo"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs"
            />
          </div>

          <div className="min-h-0 overflow-auto space-y-2 pr-1">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-text-dim py-8 text-center">Nenhum item encontrado para os filtros atuais.</p>
            ) : (
              filteredItems.map((item) => {
                const SourceIcon = SOURCE_ICONS[item.source];
                const selectedRow = selected?.id === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full text-left rounded-xl border p-3 transition-colors',
                      selectedRow
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-card/30 hover:border-border/80',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SourceIcon className="size-3.5 text-primary shrink-0" />
                          <span className="label-caps text-text-dim">{SOURCE_LABELS[item.source]}</span>
                          <span className="label-caps text-text-dim">• {item.category}</span>
                        </div>
                        <p className="font-semibold text-sm text-highlight truncate">{item.title}</p>
                        <p className="text-xs text-text-dim mt-1 line-clamp-2">{item.summary}</p>
                      </div>

                      <div className="shrink-0 text-right space-y-1">
                        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[item.status])}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                        <p className="text-[10px] text-text-dim">{formatWhen(item.timestamp)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="bento-card min-h-0 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="size-4 text-primary" />
            <p className="label-caps">Detalhes da decisão</p>
          </div>

          {!selected ? (
            <p className="text-sm text-text-dim">Selecione uma decisão para visualizar detalhes.</p>
          ) : (
            <div className="min-h-0 overflow-auto space-y-3 pr-1">
              <div>
                <p className="text-base font-bold text-highlight">{selected.title}</p>
                <p className="text-xs text-text-dim mt-1">{selected.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/60 p-2 bg-card/30">
                  <p className="label-caps text-text-dim">Fonte</p>
                  <p className="mt-1 text-highlight">{SOURCE_LABELS[selected.source]}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-2 bg-card/30">
                  <p className="label-caps text-text-dim">Status</p>
                  <p className="mt-1 text-highlight uppercase">{selected.status}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-2 bg-card/30">
                <p className="label-caps text-text-dim">Arquivo de origem</p>
                <p className="mt-1 text-xs font-mono text-highlight break-all">data/{selected.sourceFile}</p>
              </div>

              <div className="rounded-lg border border-border/60 p-2 bg-card/30">
                <p className="label-caps text-text-dim">Timestamp</p>
                <p className="mt-1 text-xs text-highlight">{new Date(selected.timestamp).toLocaleString()}</p>
              </div>

              <div className="rounded-lg border border-border/60 p-2 bg-card/30">
                <p className="label-caps text-text-dim">Metadata</p>
                <pre className="mt-2 text-[11px] text-text-dim whitespace-pre-wrap break-all max-h-72 overflow-auto">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
