'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Eye,
  History,
  Settings2,
  Bell,
  ArrowLeft,
  Activity,
  FolderGit2,
  Bot,
  Camera,
  Lightbulb,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RepositorySelector } from './components/RepositorySelector';
import { Dashboard } from './screens/Dashboard';
import { MemoryLedger } from './screens/MemoryLedger';
import { Observers } from './screens/Observers';
import { ControlCenter } from './screens/ControlCenter';
import { SystemConfig } from './screens/SystemConfig';
import { Agents } from './screens/Agents';
import { Workflows } from './screens/Workflows';
import { Security } from './screens/Security';
import { Snapshots } from './screens/Snapshots';
import { ChatPanel } from './screens/ChatPanel';
import { Decisions } from './screens/Decisions';
import { Tasks } from './screens/Tasks';
import { Workspaces } from './screens/Workspaces';
import { ModelBenchmarks } from './screens/ModelBenchmarks';
import { RedTeaming } from './screens/RedTeaming';
import { Integrations } from './screens/Integrations';
import { Login } from './screens/Login';
import { Breadcrumbs } from './components/Breadcrumbs';
import { OnboardingModal } from './components/OnboardingModal';

const LeftSidebar = ({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) => {
  const mainTabs = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'control', label: 'Segurança', icon: Shield },
    { id: 'agents', label: 'Agentes', icon: Bot },
    { id: 'decisions', label: 'Decisões', icon: Lightbulb },
    { id: 'security', label: 'Auditoria', icon: ShieldCheck },
    { id: 'system', label: 'Núcleo', icon: Settings2 },
  ];

  return (
    <aside className="w-60 flex flex-col border-r border-border bg-card/40 backdrop-blur-xl">
      {/* Logo/Branding */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-highlight">KAIROS</h2>
            <p className="text-[10px] text-text-dim">Sistema de Agentes</p>
          </div>
        </div>
      </div>

      {/* Repository Selector */}
      <div className="p-3 border-b border-border">
        <RepositorySelector hideWhenEmpty />
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id as TabId)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
              active === tab.id
                ? 'bg-primary text-bg font-bold'
                : 'text-text-dim hover:text-accent hover:bg-bg/50',
            )}
          >
            <tab.icon className="size-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Menu Items */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={() => onChange('chat')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
            active === 'chat'
              ? 'bg-primary text-bg font-bold'
              : 'text-text-dim hover:text-accent hover:bg-bg/50',
          )}
        >
          <MessageSquare className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Chat</span>
        </button>
        <button
          onClick={() => onChange('workflows')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
            active === 'workflows'
              ? 'bg-primary text-bg font-bold'
              : 'text-text-dim hover:text-accent hover:bg-bg/50',
          )}
        >
          <Eye className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Workflows</span>
        </button>
      </div>
    </aside>
  );
};

const RightSidebar = ({ onClose }: { onClose: () => void }) => (
  <aside className="w-96 flex flex-col border-l border-border bg-card/40 backdrop-blur-xl">
    <ChatPanel />
  </aside>
);

const Header = ({ title, subtitle, onBack, activeTab }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  activeTab: string;
}) => (
  <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-5 backdrop-blur-xl text-highlight">
    <div className="flex items-center gap-4">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : null}
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
    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors relative group">
      <Bell className="size-5 text-accent group-hover:scale-110 transition-transform" />
      <span className="absolute right-3 top-3 flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
    </button>
  </header>
);

type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'chat' | 'tasks' | 'benchmarks' | 'redteaming' | 'integrations' | 'workspaces';
type TabId = 'dashboard' | 'control' | 'agents' | 'decisions' | 'security' | 'system' | SecondaryTabId;

function useScreenConfig(active: TabId, goHome: () => void, setActive: (id: TabId) => void) {
  switch (active) {
    case 'dashboard':
      return {
        title: 'KAIROS',
        subtitle: 'Painel de Agentes',
        element: <Dashboard onNavigate={setActive} />,
        onBack: undefined,
      };
    case 'benchmarks':
      return { title: 'Benchmarks', subtitle: 'Comparação de desempenho de LLM', element: <ModelBenchmarks />, onBack: goHome };
    case 'redteaming':
      return { title: 'Red Teaming', subtitle: 'Simulação de ataques', element: <RedTeaming />, onBack: goHome };
    case 'workspaces':
      return { title: 'Repositórios', subtitle: 'Seleção global de um único repositório', element: <Workspaces />, onBack: goHome };
    case 'ledger':
      return { title: 'Memória', subtitle: 'Recuperação histórica', element: <MemoryLedger />, onBack: goHome };
    case 'observers':
      return { title: 'Monitoramento', subtitle: 'Observadores com estado', element: <Observers />, onBack: goHome };
    case 'control':
      return {
        title: 'Segurança',
        subtitle: 'Guardrails de segurança',
        element: <ControlCenter />,
        onBack: goHome,
      };
    case 'snapshots':
      return { title: 'Snapshots', subtitle: 'Estado em um ponto no tempo', element: <Snapshots />, onBack: goHome };
    case 'chat':
      return { title: 'Chat', subtitle: 'Assistente de IA', element: <ChatPanel />, onBack: goHome };
    case 'agents':
      return { title: 'Agentes', subtitle: 'Registro de agentes', element: <Agents onNavigate={setActive} />, onBack: goHome };
    case 'tasks':
      return { title: 'Tarefas', subtitle: 'Gerenciamento de tarefas', element: <Tasks />, onBack: goHome };
    case 'workflows':
      return { title: 'Workflows', subtitle: 'Pipelines de automação', element: <Workflows />, onBack: goHome };
    case 'decisions':
      return { title: 'Decisões', subtitle: 'Registro de decisões do projeto', element: <Decisions />, onBack: goHome };
    case 'security':
      return { title: 'Auditoria', subtitle: 'Auditoria de vulnerabilidades', element: <Security onNavigate={setActive} />, onBack: goHome };
    case 'integrations':
      return { title: 'Integrações', subtitle: 'Webhooks externos', element: <Integrations />, onBack: goHome };
    case 'system':
      return {
        title: 'Motor',
        subtitle: 'Configuração do sistema',
        element: <SystemConfig onNavigate={setActive} />,
        onBack: goHome,
      };
    default:
      return {
        title: 'Desconhecido',
        subtitle: 'Página não encontrada',
        element: <div className="flex-1 flex items-center justify-center text-text-dim">Página não encontrada</div>,
        onBack: goHome,
      };
  }
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [showChat, setShowChat] = useState(true);
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
          <div className="flex min-h-screen flex-col bg-bg font-sans text-highlight selection:bg-primary/20">
            {/* Header */}
            <Header
              title={config.title}
              subtitle={config.subtitle}
              onBack={config.onBack}
              activeTab={activeTab}
            />

            {/* Main Layout with Sidebars */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - Repos */}
              <LeftSidebar active={activeTab} onChange={setActiveTab} />

              {/* Main Content */}
              <main className="flex-1 flex flex-col overflow-y-auto">
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

              {/* Right Sidebar - Chat */}
              {showChat && <RightSidebar onClose={() => setShowChat(false)} />}
            </div>
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
