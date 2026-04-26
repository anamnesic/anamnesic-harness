'use client';

import { useState } from 'react';
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
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { useRepository } from './context/RepositoryContext';
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
import { TerminalPanel as ChatPanel } from './screens/ChatPanel';

const Header = ({ title, subtitle, onBack, rightElement, activeTab }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  activeTab: string;
}) => {
  const { repository } = useRepository();
  const repoPath = repository?.metadata?.localPath;

  return (
  <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-5 backdrop-blur-xl text-highlight">
    <div className="flex min-w-0 items-center gap-4">
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
        <h1 className="text-xl font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && activeTab === 'dashboard' && (
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>
        )}
        {repoPath && (
          <p className="mt-1.5 max-w-[44vw] truncate font-mono text-[10px] text-text-dim" title={repoPath}>
            {repoPath}
          </p>
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
};

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
      return {
        title: 'Chat',
        subtitle: 'Assistente de IA',
        element: (
          <div className="flex-1 p-4">
            <ChatPanel />
          </div>
        ),
        onBack: goHome,
        rightElement: undefined,
      };
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
