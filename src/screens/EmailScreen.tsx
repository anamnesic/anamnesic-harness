'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Inbox, Star, MailOpen, Clock, Menu } from 'lucide-react';
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

type FolderType = 'inbox' | 'sent' | 'important' | 'label';

export function EmailScreen() {
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [composer, setComposer] = useState({ to: '', subject: '', body: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3b82f6' });

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
                {activeFolder === 'label' && activeLabel
                  ? labels.find(l => l.id === activeLabel)?.name || 'Marcador'
                  : folders.find(f => f.id === activeFolder)?.label || 'Email'}
              </h2>
              <p className="text-sm text-text-dim">
                {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
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

        {/* Message Display */}
        {message && (
          <div className={cn(
            'm-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
            message.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-500' : 'border-red-500/20 bg-red-500/10 text-red-500'
          )}>
            {message.type === 'success' ? <CheckCircle className="size-4" /> : <AlertCircle className="size-4" />}
            {message.text}
          </div>
        )}

        {/* Email List / Composer / Detail View */}
        <div className="flex-1 overflow-y-auto">
          {showComposer ? (
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
              <div className="prose prose-sm max-w-none text-highlight">
                {selectedEmail.body}
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

      {/* Label Creation Modal */}
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
