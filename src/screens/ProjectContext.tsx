'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApi } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

interface DocsResponse {
  success: boolean;
  data?: {
    exists: boolean;
    files: string[];
    selectedFile: string | null;
    content: string;
  };
  timestamp: string;
}

export function ProjectContext({ projectId }: { projectId: string }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const apiPath = useMemo(() => {
    const base = `/api/v1/projects/${projectId}/docs`;
    if (!selectedFile) return base;
    return `${base}?file=${encodeURIComponent(selectedFile)}`;
  }, [projectId, selectedFile]);

  const { data, loading, refetch } = useApi<DocsResponse>(apiPath);
  const payload = data?.data;

  useEffect(() => {
    if (!payload?.selectedFile) return;
    if (!selectedFile) {
      setSelectedFile(payload.selectedFile);
    }
  }, [payload?.selectedFile, selectedFile]);

  const files = payload?.files ?? [];
  const filteredFiles = files.filter((file) => file.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-4 grid min-h-128 grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="bento-card min-h-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4 text-primary" />
            <p className="label-caps">Docs</p>
          </div>
          <button
            onClick={() => void refetch()}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-bold text-text-dim hover:text-accent transition-colors"
          >
            Refresh
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar arquivos .md"
          className="mb-3 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-highlight placeholder:text-text-dim focus:border-primary/60 outline-none transition-colors"
        />

        {loading ? (
          <p className="text-sm text-text-dim">Carregando docs...</p>
        ) : !payload?.exists ? (
          <p className="text-sm text-text-dim">A pasta docs nao existe neste repositorio.</p>
        ) : !files.length ? (
          <p className="text-sm text-text-dim">Nenhum arquivo .md encontrado em docs.</p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto pr-1 lg:max-h-152">
            {filteredFiles.map((file) => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  selectedFile === file
                    ? 'bg-card text-accent border border-border'
                    : 'text-text-dim hover:bg-card/40 hover:text-highlight',
                )}
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate font-mono">{file}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="bento-card min-h-0">
        <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-2">
          <FileText className="size-4 text-primary" />
          <p className="truncate font-mono text-xs text-text-dim">{payload?.selectedFile ?? selectedFile ?? 'Sem arquivo selecionado'}</p>
        </div>

        {loading ? (
          <p className="text-sm text-text-dim">Carregando conteudo...</p>
        ) : !payload?.exists ? (
          <p className="text-sm text-text-dim">Crie a pasta docs no repositorio para visualizar documentacao aqui.</p>
        ) : !payload?.selectedFile ? (
          <p className="text-sm text-text-dim">Selecione um arquivo .md na lateral.</p>
        ) : (
          <article className="max-h-[58vh] overflow-y-auto pr-1 text-sm leading-relaxed text-highlight">
            <div className="space-y-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="mt-2 text-2xl font-bold tracking-tight">{children}</h1>,
                  h2: ({ children }) => <h2 className="mt-4 text-xl font-bold">{children}</h2>,
                  h3: ({ children }) => <h3 className="mt-3 text-lg font-semibold">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-text-dim">{children}</p>,
                  code: ({ children }) => <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs text-accent">{children}</code>,
                  pre: ({ children }) => <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-3 text-xs">{children}</pre>,
                  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-sm text-text-dim">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-sm text-text-dim">{children}</ol>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-text-dim">{children}</blockquote>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/30 hover:decoration-accent">
                      {children}
                    </a>
                  ),
                }}
              >
                {payload.content || '_Arquivo vazio._'}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
