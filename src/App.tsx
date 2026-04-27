'use client';

import { useMemo, useState } from 'react';
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
  TrendingUp,
  FileText,
  BookOpen,
  ServerCog,
} from 'lucide-react';
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
import { ModelBenchmarks } from './screens/ModelBenchmarks';
import { RedTeaming } from './screens/RedTeaming';
import { Integrations } from './screens/Integrations';
import { Login } from './screens/Login';
import { Signup } from './screens/Signup';
import { Breadcrumbs } from './components/Breadcrumbs';
import { OnboardingModal } from './components/OnboardingModal';
import { McpScreen } from './components/McpScreen';
import { InferenceHub } from './screens/InferenceHub';

const Header = ({ title, subtitle, onBack, rightElement, activeTab, onTabChange }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  activeTab: string;
  onTabChange: (id: TabId) => void;
}) => {
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
        <div className="mx-auto min-w-0 flex-1 overflow-x-auto px-1">
          <div className="mx-auto flex w-max items-center gap-1 rounded-xl border border-border bg-card/60 p-0.5">
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
          {rightElement ?? (
            <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors relative group">
              <Bell className="size-4 text-accent group-hover:scale-110 transition-transform" />
              <span className="absolute right-3 top-3 flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
            </button>
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
] as const;

// Secondary tabs accessible via back navigation (not in bottom nav)
type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'tasks' | 'benchmarks' | 'redteaming' | 'integrations' | 'inference';
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
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, isLoading } = useAuth();

  const config = useScreenConfig(
    activeTab,
    () => setActiveTab('dashboard'),
    setActiveTab,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Activity className="size-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login'
      ? <Login onNavigateToSignup={() => setAuthView('signup')} />
      : <Signup onNavigateToLogin={() => setAuthView('login')} />;
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
          />
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
        </div>
      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
