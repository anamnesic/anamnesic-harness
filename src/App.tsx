'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Shield,
  Eye,
  History,
  Settings2,
  Bell,
  ArrowLeft,
  Activity,
  Bot,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RepositorySelector } from './components/RepositorySelector';
import { Dashboard } from './screens/Dashboard';
import { MemoryLedger } from './screens/MemoryLedger';
import { Observers } from './screens/Observers';
import { SystemConfig } from './screens/SystemConfig';
import { Agents } from './screens/Agents';
import { Workflows } from './screens/Workflows';
import { Security } from './screens/Security';
import { Snapshots } from './screens/Snapshots';
import { Decisions } from './screens/Decisions';
import { Tasks } from './screens/Tasks';
import { Workspaces } from './screens/Workspaces';
import { Projects } from './screens/Projects';
import { ModelBenchmarks } from './screens/ModelBenchmarks';
import { RedTeaming } from './screens/RedTeaming';
import { Integrations } from './screens/Integrations';
import { Login } from './screens/Login';
import { Breadcrumbs } from './components/Breadcrumbs';
import { OnboardingModal } from './components/OnboardingModal';
import { TerminalPanel } from './screens/TerminalPanel';

// ── Floating Chat ────────────────────────────────────────────────────────────
interface ChatMsg { id: string; role: 'user' | 'assistant'; text: string }

function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    setStreaming(true);
    setStreamText('');
    scrollBottom();

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kairos-token')}`,
        },
        body: JSON.stringify({ message: text, channelId: 'float', userId: 'current-user', modelIds: [], interactionMode: 'ask' }),
      });
      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'chunk') { acc += d.content ?? ''; setStreamText(acc); scrollBottom(); }
            if (d.type === 'end') {
              setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: acc }]);
              setStreamText('');
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `⚠ ${msg}` }]);
    } finally {
      setStreaming(false);
      scrollBottom();
    }
  }, [input, streaming]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="fixed bottom-24 right-4 z-200 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="Chat IA"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="size-5" /></motion.span>
            : <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageSquare className="size-5" /></motion.span>
          }
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-40 right-4 z-199 flex w-80 flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            style={{ maxHeight: '28rem' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <MessageSquare className="size-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-text-dim">Chat IA</span>
              <button onClick={() => setOpen(false)} className="ml-auto text-text-dim hover:text-accent transition-colors">
                <X className="size-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="scrollbar-kairos flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ minHeight: '12rem' }}>
              {messages.length === 0 && !streaming && (
                <p className="text-center text-xs italic text-text-dim pt-4">Como posso ajudar?</p>
              )}
              {messages.map(m => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap wrap-break-word',
                    m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-bg border border-border text-highlight rounded-bl-sm')}>
                    {m.text}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-bg px-3 py-2 text-xs text-highlight">
                    {streamText
                      ? <span className="whitespace-pre-wrap wrap-break-word">{streamText}</span>
                      : <Loader2 className="size-3 animate-spin text-accent" />}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-3 py-2">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  disabled={streaming}
                  rows={2}
                  placeholder="Digite uma mensagem…"
                  className="scrollbar-kairos flex-1 resize-none rounded bg-transparent text-xs text-highlight placeholder:text-text-dim/50 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className="mb-0.5 shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-30"
                >
                  {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const Header = ({ title, subtitle, onBack, rightElement, activeTab }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  activeTab: string;
}) => (
  <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-5 backdrop-blur-xl text-highlight">
    <div className="flex items-center gap-4">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </div>
      )}
      <div>
        {activeTab !== 'dashboard' && (
          <Breadcrumbs
            items={[
              { label: 'Início', onClick: onBack },
              { label: title, active: true }
            ]}
            className="mb-1"
          />
        )}
        <h1 className="text-xl font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && activeTab === 'dashboard' && (
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3">
      <RepositorySelector />
      {rightElement ?? (
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors relative group">
          <Bell className="size-5 text-accent group-hover:scale-110 transition-transform" />
          <span className="absolute right-3 top-3 flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
        </button>
      )}
    </div>
  </header>
);

const TABS = [
  { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
  { id: 'control', label: 'Segurança', icon: Shield },
  { id: 'agents', label: 'Agentes', icon: Bot },
  { id: 'decisions', label: 'Decisões', icon: Lightbulb },
  { id: 'system', label: 'Núcleo', icon: Settings2 },
] as const;

// Secondary tabs accessible via back navigation (not in bottom nav)
type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'chat' | 'tasks' | 'benchmarks' | 'redteaming' | 'integrations';
type TabId = typeof TABS[number]['id'] | SecondaryTabId;

const BottomNav = ({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex w-[calc(100%-3rem)] max-w-xl">
    <div className="flex w-full gap-1 p-1 bg-card/90 border border-border rounded-2xl backdrop-blur-xl shadow-2xl">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300',
            active === tab.id
              ? 'bg-bg text-highlight shadow-sm border border-border'
              : 'text-text-dim hover:text-accent',
          )}
        >
          <tab.icon className={cn('size-5', active === tab.id && 'text-primary')} />
          <span className="text-[9px] font-bold tracking-widest uppercase">{tab.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const LeftSidebar = ({ onNavigate }: { onNavigate: (id: TabId) => void }) => (
  <aside className="w-64 border-r border-border bg-bg/50 flex flex-col h-screen sticky top-0 overflow-hidden">
    <div className="p-4 border-b border-border/50">
      <RepositorySelector hideWhenEmpty />
    </div>
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {[
        { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
        { id: 'control', label: 'Segurança', icon: Shield },
        { id: 'agents', label: 'Agentes', icon: Bot },
        { id: 'decisions', label: 'Decisões', icon: Lightbulb },
        { id: 'system', label: 'Núcleo', icon: Settings2 },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id as TabId)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-text-dim hover:text-accent hover:bg-card/50 transition-colors"
        >
          <item.icon className="size-4" />
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  </aside>
);


function useScreenConfig(active: TabId, goHome: () => void, setActive: (id: TabId) => void) {
  switch (active) {
    case 'dashboard':
      return {
        title: 'KAIROS',
        subtitle: 'Painel de Agentes',
        element: <Dashboard onNavigate={setActive} />,
        onBack: undefined,
        rightElement: (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActive('benchmarks')}
              className="flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:border-primary/60 transition-colors mr-2"
            >
              <TrendingUp className="size-4" />
              Benchmarks
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        ),
      };
    case 'benchmarks':
      return { title: 'Benchmarks', subtitle: 'Comparação de desempenho de LLM', element: <ModelBenchmarks />, onBack: goHome, rightElement: undefined };
    case 'redteaming':
      return { title: 'Red Teaming', subtitle: 'Simulação de ataques', element: <RedTeaming />, onBack: goHome, rightElement: undefined };
    case 'workspaces':
      return { title: 'Repositórios', subtitle: 'Seleção global de um único repositório', element: <Workspaces />, onBack: undefined, rightElement: undefined };
    case 'ledger':
      return { title: 'Memória', subtitle: 'Recuperação histórica', element: <MemoryLedger />, onBack: goHome, rightElement: undefined };
    case 'observers':
      return { title: 'Monitoramento', subtitle: 'Observadores com estado', element: <Observers />, onBack: goHome, rightElement: undefined };
    case 'control':
      return {
        title: 'Segurança',
        subtitle: 'Auditoria de vulnerabilidades',
        element: <Security />,
        onBack: goHome,
        rightElement: undefined,
      };
    case 'snapshots':
      return { title: 'Snapshots', subtitle: 'Estado em um ponto no tempo', element: <Snapshots />, onBack: goHome, rightElement: undefined };
    case 'chat':
      return { title: 'Chat', subtitle: 'Assistente de IA', element: <div className="flex-1 flex items-center justify-center text-text-dim text-sm">Chat integrado no terminal lateral</div>, onBack: goHome, rightElement: undefined };
    case 'agents':
      return { title: 'Agentes', subtitle: 'Registro de agentes', element: <Agents onNavigate={setActive} />, onBack: goHome, rightElement: undefined };
    case 'tasks':
      return { title: 'Tarefas', subtitle: 'Gerenciamento de tarefas', element: <Tasks />, onBack: goHome, rightElement: undefined };
    case 'workflows':
      return { title: 'Workflows', subtitle: 'Pipelines de automação', element: <Workflows />, onBack: goHome, rightElement: undefined };
    case 'projects':
      return { title: 'Repositórios', subtitle: 'Seleção global de um único repositório', element: <Workspaces />, onBack: undefined, rightElement: undefined };
    case 'decisions':
      return { title: 'Decisões', subtitle: 'Registro de decisões do projeto', element: <Decisions />, onBack: goHome, rightElement: undefined };
    case 'integrations':
      return { title: 'Integrações', subtitle: 'Webhooks externos', element: <Integrations />, onBack: goHome, rightElement: undefined };
    case 'system':
      return {
        title: 'Motor',
        subtitle: 'Configuração do sistema',
        element: <SystemConfig onNavigate={setActive} />,
        onBack: goHome,
        rightElement: (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Ao vivo</span>
          </div>
        ),
      };
    default:
      return {
        title: 'Desconhecido',
        subtitle: 'Página não encontrada',
        element: <div className="flex-1 flex items-center justify-center text-text-dim">Página não encontrada</div>,
        onBack: goHome,
        rightElement: undefined,
      };
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { isAuthenticated, isLoading } = useAuth();
  const config = useScreenConfig(activeTab, () => setActiveTab('dashboard'), setActiveTab);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Activity className="size-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <WorkspaceProvider>
      <RepositoryProvider>
        <ToastProvider>
          <OnboardingModal />
          <div className="flex h-screen overflow-hidden bg-bg font-sans text-highlight selection:bg-primary/20">
            {/* Left Sidebar - Repositories */}
            <aside className="scrollbar-kairos h-screen w-64 shrink-0 border-r border-border bg-card/50 overflow-y-auto flex flex-col">
              <Projects />
            </aside>

            {/* Main Content */}
            <div className="flex h-screen flex-1 flex-col overflow-hidden">
              <Header
                title={config.title}
                subtitle={config.subtitle}
                onBack={config.onBack}
                rightElement={config.rightElement}
                activeTab={activeTab}
              />
              <main className="scrollbar-kairos flex-1 flex flex-col overflow-x-hidden overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col"
                  >
                    {config.element}
                  </motion.div>
                </AnimatePresence>
              </main>
              <BottomNav active={activeTab} onChange={setActiveTab} />
            </div>

            {/* Right Sidebar - Terminal */}
            <TerminalPanel />
          </div>
          {activeTab === 'chat' && <FloatingChat />}
        </ToastProvider>
      </RepositoryProvider>
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
