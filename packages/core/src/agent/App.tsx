'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Shield,
  Settings2,
  Bell,
  ArrowLeft,
  Activity,
  Bot,
  Pencil,
  Lightbulb,
  FileText,
  BookOpen,
  ServerCog,
  Mail,
  MailOpen,
  X,
  MessageSquare,
} from 'lucide-react';
import { apiFetch } from './lib/api';
import { ContextualChat } from './components/ContextualChat';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RepositorySelector } from './components/RepositorySelector';
import { MonitorPanel } from './screens/MonitorPanel';
import { MemoryLedger } from './screens/MemoryLedger';
import { Observers } from './screens/Observers';
import { SystemConfig } from './screens/SystemConfig';
import { AgentManagementScreen } from './screens/AgentManagementScreen';
import { AgentSkillsScreen } from './screens/AgentSkillsScreen';
import { Workflows } from './screens/Workflows';
import { Security } from './screens/Security';
import { Snapshots } from './screens/Snapshots';
import { Decisions } from './screens/Decisions';
import { Tasks } from './screens/Tasks';
import { Workspaces } from './screens/Workspaces';
import { Projects, type ProjectTabId } from './screens/Repo';
import { RedTeaming } from './screens/RedTeaming';
import { Integrations } from './screens/Integrations';
import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { Breadcrumbs } from './components/Breadcrumbs';
import { OnboardingModal } from './components/OnboardingModal';
import { McpScreen } from './components/McpScreen';
import { InferenceHub } from './screens/InferenceHub';
import { EmailScreen } from './screens/EmailScreen';

type NotifEmail = { id: string; from: string; subject: string; createdAt: string };

function NotificationPopup({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  const [emails, setEmails] = useState<NotifEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; data: NotifEmail[] }>('/api/email/list')
      .then(res => {
        if (res.success && res.data) setEmails(res.data.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-bg shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-widest text-text-dim">Notificações</span>
        <button onClick={onClose} className="text-text-dim hover:text-highlight transition-colors">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Mail className="size-5 text-text-dim animate-pulse" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-text-dim">
            <MailOpen className="size-7" />
            <span className="text-xs">Nenhum email</span>
          </div>
        ) : (
          emails.map(email => (
            <button
              key={email.id}
              onClick={() => { onNavigate(); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-card/60 transition-colors text-left border-b border-border/40 last:border-0"
            >
              <Mail className="size-3.5 mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-highlight">{email.subject || '(sem assunto)'}</p>
                <p className="truncate text-[10px] text-text-dim">{email.from}</p>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="border-t border-border px-4 py-2">
        <button
          onClick={() => { onNavigate(); onClose(); }}
          className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-primary transition-colors"
        >
          Ver todos os emails →
        </button>
      </div>
    </div>
  );
}

const Header = ({ title, subtitle, onBack, rightElement, activeTab, onTabChange, unreadEmailCount, chatOpen, onChatToggle }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  activeTab: string;
  onTabChange: (id: TabId) => void;
  unreadEmailCount?: number;
  chatOpen?: boolean;
  onChatToggle?: () => void;
}) => {
  const [showPopup, setShowPopup] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 px-3 py-2 backdrop-blur-xl text-highlight sm:px-5 sm:py-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            {activeTab !== 'dashboard' && (
              <Breadcrumbs
                items={[
                  { label: 'Início', onClick: onBack },
                  { label: title, active: true }
                ]}
                className="mb-1"
              />
            )}
            <h1 className="text-lg font-bold leading-none tracking-tight">{title}</h1>
            {subtitle && (
              <p className={cn(
                'mt-1 text-text-dim',
                activeTab === 'dashboard'
                  ? 'text-[10px] font-bold uppercase tracking-[0.2em]'
                  : 'text-xs'
              )}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="mx-auto min-w-0 flex-1 px-1">
          <div className="mx-auto flex items-center gap-1 rounded-xl border border-border bg-card/60 p-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  activeTab === tab.id
                    ? 'bg-bg text-highlight border border-border'
                    : 'text-text-dim hover:text-accent hover:bg-card/60',
                )}
              >
                <tab.icon className={cn('size-3.5', activeTab === tab.id && 'text-primary')} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RepositorySelector />
          {onChatToggle && (
            <button
              onClick={onChatToggle}
              title="Assistente"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                chatOpen
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border text-text-dim hover:border-accent/40 hover:text-accent',
              )}
            >
              <MessageSquare className="size-4" />
            </button>
          )}
          {rightElement ?? (
            <div className="relative">
              <button
                onClick={() => setShowPopup(v => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors relative group"
              >
                <Bell className="size-4 text-accent group-hover:scale-110 transition-transform" />
                {(unreadEmailCount ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1 shadow">
                    {(unreadEmailCount ?? 0) > 99 ? '99+' : unreadEmailCount}
                  </span>
                )}
              </button>
              {showPopup && (
                <NotificationPopup
                  onClose={() => setShowPopup(false)}
                  onNavigate={() => onTabChange('email' as TabId)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const TABS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'repo-files', label: 'Repo', icon: FileText },
  { id: 'repo-context', label: 'Wiki', icon: BookOpen },
  { id: 'repo-decisions', label: 'Decisoes', icon: Lightbulb },
  { id: 'control', label: 'Segurança', icon: Shield },
  { id: 'agents', label: 'Agentes', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Pencil },
  { id: 'mcp', label: 'MCP', icon: ServerCog },
  { id: 'system', label: 'Núcleo', icon: Settings2 },
  { id: 'email', label: 'Email', icon: Mail },
] as const;

// Secondary tabs accessible via back navigation (not in bottom nav)
type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'tasks' | 'redteaming' | 'integrations' | 'inference';
type TabId = typeof TABS[number]['id'] | SecondaryTabId;

const LeftSidebar = ({ onNavigate }: { onNavigate: (id: TabId) => void }) => (
  <aside className="w-64 border-r border-border bg-bg/50 flex flex-col h-screen sticky top-0 overflow-hidden">
    <div className="p-4 border-b border-border/50">
      <RepositorySelector hideWhenEmpty />
    </div>
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {[
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'control', label: 'Segurança', icon: Shield },
        { id: 'agents', label: 'Agentes', icon: Bot },
        { id: 'skills', label: 'Skills', icon: Pencil },
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


function useScreenConfig(
  active: TabId,
  goHome: () => void,
  setActive: (id: TabId) => void,
  setUnreadEmailCount: (count: number) => void,
) {
  switch (active) {
    case 'dashboard':
      return {
        title: 'KAIROS',
        subtitle: 'Painel Operacional',
        element: <MonitorPanel onNavigate={setActive} />,
        onBack: undefined,
        rightElement: (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        ),
      };
    case 'inference':
      return { title: 'Inference Hub', subtitle: 'Jobs em background e memória semântica', element: <InferenceHub />, onBack: goHome, rightElement: undefined };
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
    case 'agents':
      return { title: 'Agentes', subtitle: 'Registro de agentes', element: <AgentManagementScreen onNavigate={setActive} defaultView="agents" hideViewSwitcher />, onBack: goHome, rightElement: undefined };
    case 'skills':
      return { title: 'Skills', subtitle: 'Gestão de prompts e capacidades', element: <AgentSkillsScreen />, onBack: goHome, rightElement: undefined };
    case 'mcp':
      return {
        title: 'MCP',
        subtitle: 'Conectores do Model Context Protocol',
        element: <McpScreen />,
        onBack: goHome,
        rightElement: undefined,
      };
    case 'tasks':
      return { title: 'Tarefas', subtitle: 'Gerenciamento de tarefas', element: <Tasks />, onBack: goHome, rightElement: undefined };
    case 'workflows':
      return { title: 'Workflows', subtitle: 'Pipelines de automação', element: <Workflows />, onBack: goHome, rightElement: undefined };
    case 'repo-files':
      return {
        title: 'Repositório',
        subtitle: 'Explorer de arquivos',
        element: <Projects embedded activeTab="repository" hideTabBar />,
        onBack: undefined,
        rightElement: undefined,
      };
    case 'repo-context':
      return {
        title: 'Wiki',
        subtitle: 'Wiki do projeto',
        element: <Projects embedded activeTab="context" hideTabBar />,
        onBack: undefined,
        rightElement: undefined,
      };
    case 'repo-decisions':
      return {
        title: 'Decisões',
        subtitle: 'Registro de decisões do repositório',
        element: <Projects embedded activeTab="decisions" hideTabBar />,
        onBack: undefined,
        rightElement: undefined,
      };
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
    case 'email':
      return {
        title: 'Email',
        subtitle: 'Gerenciador de emails via Resend',
        element: <EmailScreen onUnreadCountChange={setUnreadEmailCount} />,
        onBack: goHome,
        rightElement: undefined,
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
  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  const config = useScreenConfig(
    activeTab,
    () => setActiveTab('dashboard'),
    setActiveTab,
    setUnreadEmailCount,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Activity className="size-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onNavigateToSignup={() => {}} />;
  }

  return (
    <>
      <OnboardingModal />
      <div className="flex h-screen overflow-hidden bg-bg font-sans text-highlight selection:bg-primary/20">
        {/* Main Content */}
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            title={config.title}
            subtitle={config.subtitle}
            onBack={config.onBack}
            rightElement={config.rightElement}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadEmailCount={unreadEmailCount}
            chatOpen={chatOpen}
            onChatToggle={() => setChatOpen(v => !v)}
          />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="scrollbar-kairos flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {config.element}
                </motion.div>
              </AnimatePresence>
            </main>
            <ContextualChat
              activeTab={activeTab}
              screenTitle={config.title}
              open={chatOpen}
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}

