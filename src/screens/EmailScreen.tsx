'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Inbox, Star, MailOpen, Clock, Menu, Sun, Moon, Monitor, LayoutTemplate, Pencil, Copy, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

interface Email {
  id: string;
  resendId?: string;
  lastEvent?: string;
  bodyLoaded?: boolean;
  to?: string;
  from: string;
  subject: string;
  body: string;
  status: 'sent' | 'pending' | 'failed' | 'received';
  createdAt: Date;
  read?: boolean;
  important?: boolean;
  labels?: string[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

type FolderType = 'inbox' | 'sent' | 'important' | 'label' | 'templates';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const DARK_CSS = `
  html, body {
    background: #09090b !important;
    color: #e4e4e7 !important;
  }
  a { color: #ec5b13 !important; }
  * { border-color: #27272a !important; }
  img { opacity: .92; }
`;

const LIGHT_CSS = `
  html, body {
    background: #ffffff !important;
    color: #18181b !important;
  }
  a { color: #c44b0e !important; }
`;

const AUTO_CSS = `
  @media (prefers-color-scheme: dark) {
    html, body { background: #09090b !important; color: #e4e4e7 !important; }
    a { color: #ec5b13 !important; }
    * { border-color: #27272a !important; }
    img { opacity: .92; }
  }
  @media (prefers-color-scheme: light) {
    html, body { background: #ffffff !important; color: #18181b !important; }
    a { color: #c44b0e !important; }
  }
`;

const BASE_CSS = `
  html, body {
    font-family: Inter, "Public Sans", ui-sans-serif, system-ui, sans-serif !important;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
    padding: 12px 16px;
    word-break: break-word;
  }
  img { max-width: 100% !important; height: auto !important; border-radius: 6px; }
  table { max-width: 100% !important; }
  pre, code { white-space: pre-wrap; word-break: break-all; }
`;

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-welcome',
    name: 'Boas-vindas',
    subject: 'Bem-vindo(a) ao {{nome}}!',
    body: `<h1 style="font-family:Inter,sans-serif;color:#ec5b13">Olá, {{nome}}! 👋</h1>
<p>Seja muito bem-vindo(a). Estamos felizes em tê-lo(a) conosco.</p>
<p>Qualquer dúvida, é só responder este email.</p>
<p>Abraços,<br/><strong>Equipe Chronokairo</strong></p>`,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'tpl-followup',
    name: 'Follow-up',
    subject: 'Seguimento — {{assunto}}',
    body: `<p>Olá, {{nome}},</p>
<p>Estou entrando em contato para dar seguimento à nossa conversa sobre <strong>{{assunto}}</strong>.</p>
<p>Poderia me dar um retorno até <strong>{{data}}</strong>?</p>
<p>Agradeço desde já.</p>
<p>Atenciosamente,<br/><strong>{{remetente}}</strong></p>`,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'tpl-proposta',
    name: 'Proposta comercial',
    subject: 'Proposta — {{projeto}}',
    body: `<h2 style="font-family:Inter,sans-serif">Proposta Comercial</h2>
<p>Olá, {{nome}},</p>
<p>Segue abaixo nossa proposta para o projeto <strong>{{projeto}}</strong>:</p>
<ul>
  <li>Escopo: {{escopo}}</li>
  <li>Prazo: {{prazo}}</li>
  <li>Investimento: {{valor}}</li>
</ul>
<p>Ficamos à disposição para alinhar os detalhes.</p>
<p>Atenciosamente,<br/><strong>{{remetente}}</strong></p>`,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'tpl-chronokairo',
    name: 'Chronokairo · Agent',
    subject: '{{titulo}}',
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>{{titulo}}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d0d;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#0d0d0d;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:620px;background-color:#111111;border:1px solid #222;border-radius:6px;overflow:hidden;">

          <!-- header bar -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.15em;color:#555;text-transform:uppercase;">
                    CHRONOKAIRO &nbsp;·&nbsp; AGENT
                  </td>
                  <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.08em;color:#444;">
                    {{data}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- divider -->
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#222;"></div></td></tr>

          <!-- title block -->
          <tr>
            <td style="padding:36px 32px 28px 32px;">
              <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;color:#f0f0f0;margin:0 0 8px 0;letter-spacing:-0.02em;">{{titulo}}</h1>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#666;margin:0;">{{subtitulo}}</p>
            </td>
          </tr>

          <!-- section label -->
          <tr>
            <td style="padding:0 32px 12px 32px;">
              <p style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.18em;color:#555;text-transform:uppercase;margin:0 0 16px 0;">{{secao}}</p>
              <ul style="list-style:none;margin:0;padding:0;">
                <li style="margin-bottom:14px;padding-left:12px;border-left:2px solid #333;line-height:1.6;">
                  <code style="display:inline-block;background:#1a1a1a;border:1px solid #333;color:#e2e2e2;font-family:'Courier New',Courier,monospace;font-size:12px;padding:2px 7px;border-radius:4px;margin-right:8px;">{{badge1}}</code>
                  <span style="color:#b0b0b0;">{{item1}}</span>
                </li>
                <li style="margin-bottom:14px;padding-left:12px;border-left:2px solid #333;line-height:1.6;">
                  <code style="display:inline-block;background:#1a1a1a;border:1px solid #333;color:#e2e2e2;font-family:'Courier New',Courier,monospace;font-size:12px;padding:2px 7px;border-radius:4px;margin-right:8px;">{{badge2}}</code>
                  <span style="color:#b0b0b0;">{{item2}}</span>
                </li>
              </ul>
            </td>
          </tr>

          <!-- divider -->
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#1e1e1e;"></div></td></tr>

          <!-- footer -->
          <tr>
            <td style="padding:20px 32px;">
              <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#444;margin:0;">Chronokairo :&gt;</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    createdAt: new Date('2026-05-05'),
    updatedAt: new Date('2026-05-05'),
  },
];

function injectEmailTheme(html: string, theme: 'dark' | 'light' | 'auto'): string {  const themeCSS = theme === 'dark' ? DARK_CSS : theme === 'light' ? LIGHT_CSS : AUTO_CSS;
  const styleTag = `<style>${BASE_CSS}${themeCSS}</style>`;

  // If there's a <head>, inject before </head>; otherwise prepend
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}</head>`);
  }
  if (/<head>/i.test(html)) {
    return html.replace(/<head>/i, `<head>${styleTag}`);
  }
  return `<html><head>${styleTag}</head><body>${html}</body></html>`;
}

export function EmailScreen({ onUnreadCountChange }: { onUnreadCountChange?: (count: number) => void } = {}) {
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [emailTheme, setEmailTheme] = useState<'dark' | 'light' | 'auto'>('auto');
  const [composer, setComposer] = useState({ to: '', subject: '', body: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3b82f6' });

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('kairos-email-templates') : null;
      if (!raw) return DEFAULT_TEMPLATES;
      return JSON.parse(raw) as EmailTemplate[];
    } catch { return DEFAULT_TEMPLATES; }
  });
  const [templateView, setTemplateView] = useState<'list' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [templatePreviewTheme, setTemplatePreviewTheme] = useState<'dark' | 'light'>('dark');

  type ApiEmailRecord = {
    id: string; resendId?: string; to: string; from: string;
    subject: string; html: string; status: string; lastEvent?: string; createdAt: string;
  };

  const mapRecord = (r: ApiEmailRecord): Email => ({
    id: r.id,
    resendId: r.resendId,
    lastEvent: r.lastEvent,
    to: r.to,
    from: r.from,
    subject: r.subject,
    body: r.html,
    status: r.status as Email['status'],
    createdAt: new Date(r.createdAt),
    read: r.status !== 'received',
  });

  const loadEmails = async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: ApiEmailRecord[] }>('/api/email/list');
      if (res.success && res.data) setEmails(res.data.map(mapRecord));
    } catch {
      // silently fail – offline or unauthenticated
    }
  };

  const syncEmails = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch<{ success: boolean; synced: { sent: number; received: number }; data: ApiEmailRecord[] }>('/api/email/sync');
      if (res.success && res.data) {
        setEmails(res.data.map(mapRecord));
        setMessage({ type: 'success', text: `Sincronizado: ${res.synced.sent} enviados · ${res.synced.received} recebidos` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao sincronizar com o Resend.' });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncEmails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const folders = [
    { id: 'inbox' as FolderType, label: 'Caixa de Entrada', icon: Inbox, count: emails.filter(e => e.status === 'received' && !e.read).length },
    { id: 'sent' as FolderType, label: 'Enviados', icon: Send, count: emails.filter(e => e.status === 'sent').length },
    { id: 'important' as FolderType, label: 'Importantes', icon: Star, count: emails.filter(e => e.important).length },
  ];

  const filteredEmails = emails.filter((email) => {
    if (activeFolder === 'inbox') return email.status === 'received';
    if (activeFolder === 'sent') return email.status === 'sent';
    if (activeFolder === 'important') return email.important;
    if (activeFolder === 'label' && activeLabel) return email.labels?.includes(activeLabel);
    return true;
  });

  const handleSend = async () => {
    if (!composer.to || !composer.subject || !composer.body) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await apiFetch<{ success: boolean; data: { id: string; record: { id: string; resendId?: string; to: string; from: string; createdAt: string } } }>('/api/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: composer.to,
          subject: composer.subject,
          html: composer.body,
        }),
      });

      const record = res.data?.record;
      const newEmail: Email = {
        id: record?.id ?? Date.now().toString(),
        resendId: record?.resendId ?? res.data?.id,
        to: composer.to,
        from: record?.from ?? 'agent@chronokairo.com.br',
        subject: composer.subject,
        body: composer.body,
        status: 'sent',
        createdAt: record?.createdAt ? new Date(record.createdAt) : new Date(),
        read: true,
      };

      setEmails((prev) => [newEmail, ...prev.filter((e) => e.id !== newEmail.id)]);
      setActiveFolder('sent');
      setComposer({ to: '', subject: '', body: '' });
      setShowComposer(false);
      setMessage({ type: 'success', text: `Email enviado! ID Resend: ${record?.resendId ?? res.data?.id ?? '—'}` });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar email. Verifique a API key do Resend.' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleImportant = (id: string) => {
    setEmails(emails.map(e => e.id === id ? { ...e, important: !e.important } : e));
  };

  useEffect(() => {
    const count = emails.filter(e => e.status === 'received' && !e.read).length;
    onUnreadCountChange?.(count);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails]);

  const markAsRead = (id: string) => {
    setEmails(emails.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const toggleLabel = (emailId: string, labelId: string) => {
    setEmails(emails.map(e => {
      if (e.id !== emailId) return e;
      const labels = e.labels || [];
      return {
        ...e,
        labels: labels.includes(labelId)
          ? labels.filter(l => l !== labelId)
          : [...labels, labelId]
      };
    }));
  };

  const saveTemplates = (updated: EmailTemplate[]) => {
    setTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairos-email-templates', JSON.stringify(updated));
    }
  };

  const saveTemplate = (tpl: EmailTemplate) => {
    const now = new Date();
    const updated = templates.find(t => t.id === tpl.id)
      ? templates.map(t => t.id === tpl.id ? { ...tpl, updatedAt: now } : t)
      : [...templates, { ...tpl, createdAt: now, updatedAt: now }];
    saveTemplates(updated);
    setTemplateView('list');
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => saveTemplates(templates.filter(t => t.id !== id));

  const useTemplate = (tpl: EmailTemplate) => {
    setComposer({ to: '', subject: tpl.subject, body: tpl.body });
    setActiveFolder('inbox');
    setShowComposer(true);
  };

  const addLabel = () => {
    if (!newLabel.name) return;
    const id = newLabel.name.toLowerCase().replace(/\s+/g, '-');
    setLabels([...labels, { id, name: newLabel.name, color: newLabel.color }]);
    setNewLabel({ name: '', color: '#3b82f6' });
    setShowLabelModal(false);
  };

  const removeLabel = (labelId: string) => {
    setLabels(labels.filter(l => l.id !== labelId));
    setEmails(emails.map(e => ({
      ...e,
      labels: e.labels?.filter(l => l !== labelId)
    })));
  };

  return (
    <div className="flex h-full">
      {/* Right Sidebar */}
      <aside className="w-64 border-r border-border bg-bg/50 flex flex-col h-full">
        <div className="p-4 border-b border-border/50">
          <button
            onClick={() => setShowComposer(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            Novo Email
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Templates shortcut */}
          <button
            onClick={() => { setActiveFolder('templates'); setSelectedEmail(null); setTemplateView('list'); setEditingTemplate(null); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors',
              activeFolder === 'templates'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-text-dim hover:text-accent hover:bg-card/50'
            )}
          >
            <LayoutTemplate className="size-4" />
            <span className="flex-1 text-left">Templates</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', activeFolder === 'templates' ? 'bg-primary text-white' : 'bg-card text-text-dim')}>
              {templates.length}
            </span>
          </button>

          <div className="my-2 border-t border-border/40" />

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                setActiveFolder(folder.id);
                setActiveLabel(null);
                setSelectedEmail(null);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors',
                activeFolder === folder.id && !activeLabel
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-dim hover:text-accent hover:bg-card/50'
              )}
            >
              <folder.icon className="size-4" />
              <span className="flex-1 text-left">{folder.label}</span>
              {folder.count > 0 && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  activeFolder === folder.id && !activeLabel
                    ? 'bg-primary text-white'
                    : 'bg-card text-text-dim'
                )}>
                  {folder.count}
                </span>
              )}
            </button>
          ))}

          {/* Labels Section */}
          {labels.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Marcadores</span>
                <button
                  onClick={() => setShowLabelModal(true)}
                  className="text-text-dim hover:text-accent transition-colors"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => {
                    setActiveFolder('label');
                    setActiveLabel(label.id);
                    setSelectedEmail(null);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors group',
                    activeFolder === 'label' && activeLabel === label.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-dim hover:text-accent hover:bg-card/50'
                  )}
                >
                  <div className="size-3 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-left">{label.name}</span>
                  <span className="text-[10px]">
                    {emails.filter(e => e.labels?.includes(label.id)).length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLabel(label.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </nav>
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-text-dim">
            <Clock className="size-3" />
            {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-bg/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {activeFolder === 'templates'
                  ? 'Templates'
                  : activeFolder === 'label' && activeLabel
                  ? labels.find(l => l.id === activeLabel)?.name || 'Marcador'
                  : folders.find(f => f.id === activeFolder)?.label || 'Email'}
              </h2>
              <p className="text-sm text-text-dim">
                {activeFolder === 'templates'
                  ? `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}`
                  : `${filteredEmails.length} ${filteredEmails.length === 1 ? 'email' : 'emails'}`}
              </p>
            </div>
            <button
              onClick={syncEmails}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-card transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {/* Message Display — errors only */}
        {message?.type === 'error' && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            <AlertCircle className="size-4" />
            {message.text}
          </div>
        )}

        {/* Email List / Composer / Detail View */}
        <div className="flex-1 overflow-y-auto">
          {activeFolder === 'templates' ? (
            <div className="p-6">
              {templateView === 'edit' && editingTemplate ? (
                /* ── Template editor ── */
                <div className="w-full">
                  <div className="mb-4 flex items-center gap-3">
                    <button onClick={() => { setTemplateView('list'); setEditingTemplate(null); }} className="text-xs text-text-dim hover:text-accent">← Voltar</button>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-dim flex-1">
                      {templates.find(t => t.id === editingTemplate.id) ? 'Editar Template' : 'Novo Template'}
                    </h3>
                  </div>
                  <div className="flex gap-6 items-stretch">
                    {/* left: form */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Nome do template</label>
                        <input
                          type="text"
                          value={editingTemplate.name}
                          onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                          placeholder="Ex: Boas-vindas"
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Assunto</label>
                        <input
                          type="text"
                          value={editingTemplate.subject}
                          onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                          placeholder="Assunto do email (use {{variavel}} para placeholders)"
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Corpo (HTML)</label>
                        <textarea
                          value={editingTemplate.body}
                          onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                          placeholder="<p>Olá, {{nome}}!</p>"
                          rows={18}
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none resize-none"
                        />
                        <p className="mt-1 text-[10px] text-text-dim">Use <code className="bg-card px-1 rounded">{'{{variavel}}'}</code> como placeholders que serão substituídos ao usar o template.</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setTemplateView('list'); setEditingTemplate(null); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card transition-colors">Cancelar</button>
                        <button
                          onClick={() => saveTemplate(editingTemplate)}
                          disabled={!editingTemplate.name || !editingTemplate.subject}
                          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          Salvar Template
                        </button>
                      </div>
                    </div>
                    {/* right: preview */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Pré-visualização</label>
                      <div className="flex-1 rounded-lg overflow-hidden border border-border">
                        {editingTemplate.body ? (
                          <iframe
                            srcDoc={injectEmailTheme(editingTemplate.body, 'dark')}
                            className="w-full h-full border-0"
                            style={{ minHeight: 400 }}
                            sandbox="allow-same-origin"
                            title="preview"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[400px] text-xs text-text-dim">Escreva o corpo para ver a prévia</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Template list ── */
                <>
                  <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-dim">Templates de Email</h3>
                    <div className="flex items-center gap-2 ml-auto">
                      {/* thumbnail theme toggle */}
                      <div className="flex items-center rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => setTemplatePreviewTheme('dark')}
                          className={cn('px-2.5 py-1 text-[11px] flex items-center gap-1 transition-colors', templatePreviewTheme === 'dark' ? 'bg-card text-accent' : 'text-text-dim hover:bg-card/50')}
                        >
                          <Moon className="size-3" /> Escuro
                        </button>
                        <button
                          onClick={() => setTemplatePreviewTheme('light')}
                          className={cn('px-2.5 py-1 text-[11px] flex items-center gap-1 transition-colors', templatePreviewTheme === 'light' ? 'bg-card text-accent' : 'text-text-dim hover:bg-card/50')}
                        >
                          <Sun className="size-3" /> Claro
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTemplate({ id: crypto.randomUUID(), name: '', subject: '', body: '', createdAt: new Date(), updatedAt: new Date() });
                          setTemplateView('edit');
                        }}
                        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="size-3.5" />
                        Novo template
                      </button>
                    </div>
                  </div>
                  {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-dim">
                      <LayoutTemplate className="mb-3 size-12 opacity-30" />
                      <p className="text-sm">Nenhum template criado</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {templates.map(tpl => (
                        <div
                          key={tpl.id}
                          className="group rounded-xl border border-border bg-card flex flex-col overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                        >
                          {/* Scaled thumbnail preview */}
                          <div
                            className="relative overflow-hidden bg-[#09090b] cursor-zoom-in"
                            style={{ height: 200 }}
                            onClick={() => setPreviewingTemplate(tpl)}
                            title="Clique para visualizar em tela cheia"
                          >
                            {tpl.body ? (
                              <iframe
                                srcDoc={injectEmailTheme(tpl.body, templatePreviewTheme)}
                                className="border-0 pointer-events-none absolute top-0 left-0"
                                style={{
                                  width: '250%',
                                  height: 500,
                                  transform: 'scale(0.4)',
                                  transformOrigin: 'top left',
                                }}
                                sandbox="allow-same-origin"
                                title={tpl.name}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-text-dim/40">
                                <LayoutTemplate className="size-10" />
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={e => { e.stopPropagation(); setPreviewingTemplate(tpl); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg/90 text-xs font-bold hover:bg-bg transition-colors shadow"
                              >
                                <MailOpen className="size-3.5" />
                                Visualizar
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); useTemplate(tpl); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow"
                              >
                                <Send className="size-3.5" />
                                Usar
                              </button>
                            </div>
                          </div>

                          {/* Card footer */}
                          <div className="p-3 flex flex-col gap-2 border-t border-border/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate leading-tight">{tpl.name}</p>
                                <p className="text-[11px] text-text-dim truncate mt-0.5">{tpl.subject}</p>
                              </div>
                              <div className="flex shrink-0 gap-0.5">
                                <button
                                  onClick={() => { setEditingTemplate({ ...tpl }); setTemplateView('edit'); }}
                                  title="Editar"
                                  className="p-1.5 rounded-lg text-text-dim hover:bg-bg hover:text-accent transition-colors"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const c = { ...tpl, id: crypto.randomUUID(), name: tpl.name + ' (cópia)', createdAt: new Date(), updatedAt: new Date() };
                                    saveTemplates([...templates, c]);
                                  }}
                                  title="Duplicar"
                                  className="p-1.5 rounded-lg text-text-dim hover:bg-bg hover:text-accent transition-colors"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteTemplate(tpl.id)}
                                  title="Excluir"
                                  className="p-1.5 rounded-lg text-text-dim hover:bg-bg hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-text-dim/60">
                              Atualizado {new Date(tpl.updatedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : showComposer ? (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-dim">Compor Email</h3>
                <button
                  onClick={() => setShowComposer(false)}
                  className="text-xs text-text-dim hover:text-accent"
                >
                  Cancelar
                </button>
              </div>
              <div className="space-y-3 max-w-2xl">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Para</label>
                  <input
                    type="email"
                    value={composer.to}
                    onChange={(e) => setComposer({ ...composer, to: e.target.value })}
                    placeholder="destinatario@exemplo.com"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Assunto</label>
                  <input
                    type="text"
                    value={composer.subject}
                    onChange={(e) => setComposer({ ...composer, subject: e.target.value })}
                    placeholder="Assunto do email"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Mensagem</label>
                  <textarea
                    value={composer.body}
                    onChange={(e) => setComposer({ ...composer, body: e.target.value })}
                    placeholder="Conteúdo do email..."
                    rows={8}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowComposer(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className="p-6">
              <div className="mb-4 flex items-center gap-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center gap-2 text-xs text-text-dim hover:text-accent"
                >
                  ← Voltar
                </button>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => toggleImportant(selectedEmail.id)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      selectedEmail.important ? 'text-yellow-500 bg-yellow-500/10' : 'text-text-dim hover:bg-card'
                    )}
                  >
                    <Star className="size-4" />
                  </button>
                  <div className="relative group">
                    <button className="p-2 rounded-lg text-text-dim hover:bg-card transition-colors">
                      <Menu className="size-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-bg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <div className="p-2">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">Adicionar Marcador</p>
                        {labels.map(label => (
                          <button
                            key={label.id}
                            onClick={() => toggleLabel(selectedEmail.id, label.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-card transition-colors"
                          >
                            <div className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                            <span className="flex-1 text-left">{label.name}</span>
                            {selectedEmail.labels?.includes(label.id) && (
                              <CheckCircle className="size-3 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg text-text-dim hover:bg-card transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{selectedEmail.subject}</h2>
              <div className="flex items-center gap-3 mb-4 text-xs text-text-dim">
                <span>De: {selectedEmail.from}</span>
                {selectedEmail.to && <span>Para: {selectedEmail.to}</span>}
                <span>{selectedEmail.createdAt.toLocaleString('pt-BR')}</span>
                {selectedEmail.resendId && (
                  <span className="ml-auto font-mono bg-card px-2 py-0.5 rounded text-[10px]" title="Resend ID">
                    ID: {selectedEmail.resendId}
                  </span>
                )}
              </div>
              {selectedEmail.labels && selectedEmail.labels.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {selectedEmail.labels.map(labelId => {
                    const label = labels.find(l => l.id === labelId);
                    return label ? (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: label.color + '20', color: label.color }}
                      >
                        {label.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {/* Theme toggle + actions */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim mr-2">Tema do email</span>
                {([['dark', Moon], ['light', Sun], ['auto', Monitor]] as const).map(([t, Icon]) => (
                  <button
                    key={t}
                    onClick={() => setEmailTheme(t)}
                    title={t === 'dark' ? 'Escuro' : t === 'light' ? 'Claro' : 'Automático'}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                      emailTheme === t
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'text-text-dim hover:bg-card border border-transparent',
                    )}
                  >
                    <Icon className="size-3" />
                    {t === 'dark' ? 'Escuro' : t === 'light' ? 'Claro' : 'Auto'}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (selectedEmail.body) {
                        navigator.clipboard.writeText(selectedEmail.body);
                      }
                    }}
                    disabled={!selectedEmail.body}
                    title="Copiar HTML do email"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-dim hover:bg-card border border-transparent hover:border-border transition-colors disabled:opacity-40"
                  >
                    <Copy className="size-3" />
                    Copiar HTML
                  </button>
                  <button
                    onClick={() => {
                      const tpl: EmailTemplate = {
                        id: crypto.randomUUID(),
                        name: selectedEmail.subject || 'Template sem título',
                        subject: selectedEmail.subject || '',
                        body: selectedEmail.body || '',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      };
                      saveTemplates([...templates, tpl]);
                      setActiveFolder('templates');
                      setSelectedEmail(null);
                      setEditingTemplate(tpl);
                      setTemplateView('edit');
                    }}
                    disabled={!selectedEmail.body}
                    title="Salvar este email como template"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-40"
                  >
                    <LayoutTemplate className="size-3" />
                    Salvar como template
                  </button>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-border">
                {isLoadingBody ? (
                  <div className="flex items-center gap-2 text-text-dim text-sm py-8 px-4">
                    <RefreshCw className="size-4 animate-spin" />
                    Carregando conteúdo…
                  </div>
                ) : selectedEmail.body ? (
                  <iframe
                    key={`${selectedEmail.id}-${emailTheme}`}
                    srcDoc={injectEmailTheme(selectedEmail.body, emailTheme)}
                    className="w-full min-h-[400px] border-0"
                    sandbox="allow-same-origin"
                    title={selectedEmail.subject}
                    onLoad={(e) => {
                      const iframe = e.currentTarget;
                      if (iframe.contentDocument?.body) {
                        iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + 'px';
                      }
                    }}
                  />
                ) : (
                  <p className="text-text-dim text-sm italic p-4">Sem conteúdo disponível</p>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Mail className="mb-3 size-12 text-text-dim/50" />
                  <p className="text-sm text-text-dim">Nenhum email encontrado</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.read) markAsRead(email.id);
                      // Lazy-load HTML body if not yet fetched
                      if (!email.bodyLoaded && email.resendId) {
                        setIsLoadingBody(true);
                        apiFetch<{ success: boolean; data: { html?: string; text?: string } }>(
                          `/api/email/${email.resendId}`,
                        )
                          .then((res) => {
                            const html = res.data?.html ?? res.data?.text ?? '';
                            setEmails((prev) =>
                              prev.map((e) =>
                                e.id === email.id ? { ...e, body: html, bodyLoaded: true } : e,
                              ),
                            );
                            setSelectedEmail((prev) =>
                              prev?.id === email.id ? { ...prev, body: html, bodyLoaded: true } : prev,
                            );
                          })
                          .catch(() => {/* silently ignore */})
                          .finally(() => setIsLoadingBody(false));
                      }
                    }}
                    className={cn(
                      'flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors hover:bg-card/50',
                      !email.read && 'bg-primary/5'
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImportant(email.id);
                      }}
                      className={cn(
                        'shrink-0',
                        email.important ? 'text-yellow-500' : 'text-text-dim/40 hover:text-yellow-500'
                      )}
                    >
                      <Star className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm', !email.read && 'font-bold')}>
                          {email.from}
                        </span>
                        {!email.read && (
                          <span className="rounded-full bg-primary h-2 w-2" />
                        )}
                        {email.lastEvent && (
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                            email.lastEvent === 'delivered' || email.lastEvent === 'opened'
                              ? 'bg-green-500/10 text-green-500'
                              : email.lastEvent === 'bounced' || email.lastEvent === 'complained'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-card text-text-dim',
                          )}>
                            {email.lastEvent}
                          </span>
                        )}
                      </div>
                      <p className={cn('truncate text-sm', !email.read && 'font-bold')}>
                        {email.subject}
                      </p>
                      <p className="truncate text-xs text-text-dim">
                        {email.body}
                      </p>
                      {email.labels && email.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {email.labels.slice(0, 3).map(labelId => {
                            const label = labels.find(l => l.id === labelId);
                            return label ? (
                              <span
                                key={label.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ backgroundColor: label.color + '20', color: label.color }}
                              >
                                {label.name}
                              </span>
                            ) : null;
                          })}
                          {email.labels.length > 3 && (
                            <span className="text-[9px] text-text-dim">+{email.labels.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-text-dim">
                      {email.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {email.resendId && (
                      <span className="shrink-0 font-mono text-[9px] text-text-dim/60 hidden sm:block" title={`Resend ID: ${email.resendId}`}>
                        #{email.resendId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {/* Template full-screen preview modal */}
      {previewingTemplate && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewingTemplate(null)}
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg/95 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <LayoutTemplate className="size-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{previewingTemplate.name}</p>
                <p className="text-[11px] text-text-dim truncate">{previewingTemplate.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setTemplatePreviewTheme('dark')}
                  className={cn('px-2.5 py-1 text-[11px] flex items-center gap-1 transition-colors', templatePreviewTheme === 'dark' ? 'bg-card text-accent' : 'text-text-dim hover:bg-card/50')}
                >
                  <Moon className="size-3" /> Escuro
                </button>
                <button
                  onClick={() => setTemplatePreviewTheme('light')}
                  className={cn('px-2.5 py-1 text-[11px] flex items-center gap-1 transition-colors', templatePreviewTheme === 'light' ? 'bg-card text-accent' : 'text-text-dim hover:bg-card/50')}
                >
                  <Sun className="size-3" /> Claro
                </button>
              </div>
              <button
                onClick={() => { useTemplate(previewingTemplate); setPreviewingTemplate(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                <Send className="size-3.5" />
                Usar template
              </button>
              <button
                onClick={() => { setEditingTemplate({ ...previewingTemplate }); setTemplateView('edit'); setPreviewingTemplate(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold hover:bg-card/80 transition-colors"
              >
                <Pencil className="size-3.5" />
                Editar
              </button>
              <button onClick={() => setPreviewingTemplate(null)} className="p-1.5 rounded-lg text-text-dim hover:bg-card transition-colors ml-1">
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="max-w-2xl mx-auto rounded-xl overflow-hidden border border-border shadow-2xl">
              <iframe
                srcDoc={injectEmailTheme(previewingTemplate.body, templatePreviewTheme)}
                className="w-full border-0"
                style={{ minHeight: 600 }}
                sandbox="allow-same-origin"
                title={previewingTemplate.name}
                onLoad={e => {
                  const f = e.currentTarget;
                  if (f.contentDocument?.body) f.style.height = Math.max(600, f.contentDocument.body.scrollHeight + 32) + 'px';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border border-border bg-bg p-6 shadow-2xl">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-dim">Criar Marcador</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Nome</label>
                <input
                  type="text"
                  value={newLabel.name}
                  onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                  placeholder="Nome do marcador"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-dim">Cor</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewLabel({ ...newLabel, color })}
                      className={cn(
                        'size-8 rounded-full border-2 transition-transform hover:scale-110',
                        newLabel.color === color ? 'border-white scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newLabel.color}
                    onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                    className="size-8 cursor-pointer rounded-full border border-border"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowLabelModal(false);
                    setNewLabel({ name: '', color: '#3b82f6' });
                  }}
                  className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-card transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addLabel}
                  disabled={!newLabel.name}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
