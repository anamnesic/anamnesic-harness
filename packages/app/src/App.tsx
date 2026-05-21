'use client';

import { useState, useEffect, useRef } from 'react';
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
  Menu,
  X,
  MessageSquare,
  Plus,
  PanelLeftClose,
  Columns2,
  RotateCw,
  ChevronDown,
  TerminalSquare,
} from 'lucide-react';
import { TerminalPanel, type TerminalControls } from './screens/TerminalPanel';
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

const Header = ({ title, subtitle, onBack, rightElement, unreadEmailCount, chatOpen, onChatToggle, onTabChange, terminalOpen, onTerminalToggle, onConfigClick, configActive }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  unreadEmailCount?: number;
  chatOpen?: boolean;
  onChatToggle?: () => void;
  onTabChange: (id: TabId) => void;
  terminalOpen?: boolean;
  onTerminalToggle?: () => void;
  onConfigClick?: () => void;
  configActive?: boolean;
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
            <h1 className="text-lg font-bold leading-none tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <RepositorySelector />
          {onTerminalToggle && (
            <button
              onClick={onTerminalToggle}
              title="Terminal"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                terminalOpen
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border text-text-dim hover:border-accent/40 hover:text-accent',
              )}
            >
              <TerminalSquare className="size-4" />
            </button>
          )}
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
          {rightElement}
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
          {onConfigClick && (
            <button
              onClick={onConfigClick}
              title="Núcleo"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                configActive
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-card border-border text-text-dim hover:border-accent/40 hover:text-accent',
              )}
            >
              <Settings2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const TABS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'repo-files', label: 'Arquivos', icon: FileText },
  { id: 'repo-context', label: 'Wiki', icon: BookOpen },
  { id: 'repo-decisions', label: 'Decisoes', icon: Lightbulb },
  { id: 'control', label: 'Segurança', icon: Shield },
  { id: 'agents', label: 'Agentes', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Pencil },
  { id: 'mcp', label: 'MCP', icon: ServerCog },
  { id: 'email', label: 'Email', icon: Mail },
] as const;

// Secondary tabs accessible via back navigation (not in bottom nav)
type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'tasks' | 'redteaming' | 'integrations' | 'inference' | 'system';
type TabId = typeof TABS[number]['id'] | SecondaryTabId;

// ─── Terminal Overlay ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'running' ? 'bg-green-400' :
    status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
    'bg-neutral-500';
  return <span className={cn('inline-block size-2 rounded-full', color)} />;
}

function TerminalOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [height, setHeight] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [controls, setControls] = useState<TerminalControls | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeight(Math.max(200, Math.min(window.innerHeight * 0.85, startHeight + delta)));
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="terminal-overlay"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-[70] flex flex-col"
          style={{ height }}
        >
          <div className={cn(
            'relative flex h-full flex-col rounded-t-2xl border border-b-0 border-border bg-[#0d0d0f]/95 shadow-2xl backdrop-blur-xl overflow-hidden',
            isResizing && 'select-none',
          )}>
            {/* Drag-to-resize handle */}
            <div
              className="absolute inset-x-0 top-0 h-2 cursor-ns-resize z-10 group"
              onMouseDown={handleResizeStart}
              title="Arraste para redimensionar"
            >
              <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-border/60 group-hover:bg-accent/50 transition-colors" />
            </div>

            {/* Title bar — label + controls + close */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 pt-3 pb-2">
              <TerminalSquare className="size-3.5 shrink-0 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Terminal</span>

              {controls && (
                <>
                  <StatusDot status={controls.status} />
                  <div className="flex-1" />

                  <button onClick={controls.onToggleSplit} title={controls.isMaximized ? 'Janela única' : 'Dividir'} className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-card hover:text-accent">
                    <Columns2 className="size-3" />
                  </button>
                  <button onClick={controls.onAdd} title="Nova janela" className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-card hover:text-accent">
                    <Plus className="size-3" />
                  </button>
                  {controls.instanceCount > 1 && (
                    <button onClick={controls.onRemove} title="Fechar janela" className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-card hover:text-red-400">
                      <PanelLeftClose className="size-3" />
                    </button>
                  )}
                  <button onClick={controls.onRestart} title="Reiniciar" className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-card hover:text-accent">
                    <RotateCw className="size-3" />
                  </button>
                </>
              )}

              {!controls && <div className="flex-1" />}

              <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-lg text-text-dim transition-colors hover:text-accent">
                <X className="size-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <TerminalPanel onControlsChange={setControls} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom Dock ────────────────────────────────────────────────────────────

function BottomDock({
  activeTab,
  onTabChange,
  minimized,
  onMinimize,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  minimized: boolean;
  onMinimize: () => void;
}) {
  return (
    <AnimatePresence>
      {!minimized && (
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-end gap-1 rounded-2xl border border-border bg-bg/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
            {TABS.map((tab, i) => (
              <DockItem
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onSelect={() => onTabChange(tab.id)}
                index={i}
              />
            ))}

            {/* Divider */}
            <div className="mx-1 h-8 w-px bg-border/60 self-center" />

            {/* Minimize button */}
            <button
              onClick={onMinimize}
              title="Minimizar dock"
              className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-text-dim hover:text-accent hover:bg-card/60 transition-all group"
            >
              <ChevronDown className="size-4 group-hover:translate-y-0.5 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Min</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockItem({
  tab,
  active,
  onSelect,
  index,
}: {
  tab: { id: string; label: string; icon: React.ElementType };
  active: boolean;
  onSelect: () => void;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onSelect}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ scale: hovered ? 1.18 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-text-dim hover:text-accent',
      )}
    >
      <tab.icon className={cn('size-5', active && 'text-primary')} />
      <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
        {tab.label}
      </span>
      {/* Active indicator dot */}
      {active && (
        <motion.span
          layoutId="dock-active-dot"
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary"
        />
      )}
    </motion.button>
  );
}

// ─── Floating Hamburger ─────────────────────────────────────────────────────

function FloatingMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <AnimatePresence>
      <motion.button
        key="hamburger"
        initial={{ opacity: 0, scale: 0.7, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.7, x: -20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={onClick}
        title="Expandir menu"
        className="fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg/90 text-accent shadow-2xl backdrop-blur-xl hover:text-primary hover:border-primary/40 transition-colors"
      >
        <Menu className="size-5" />
      </motion.button>
    </AnimatePresence>
  );
}

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
        rightElement: undefined,
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
        subtitle: 'Registro de decisões operacionais',
        element: <Decisions />,
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
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [dockMinimized, setDockMinimized] = useState(false);
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
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            title={config.title}
            subtitle={config.subtitle}
            onBack={config.onBack}
            rightElement={config.rightElement}
            unreadEmailCount={unreadEmailCount}
            chatOpen={chatOpen}
            onChatToggle={() => setChatOpen(v => !v)}
            onTabChange={setActiveTab}
            terminalOpen={terminalOpen}
            onTerminalToggle={() => setTerminalOpen(v => !v)}
            onConfigClick={() => setActiveTab('system')}
            configActive={activeTab === 'system'}
          />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="scrollbar-kairos flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-24">
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

      {/* Terminal overlay — slides up over everything */}
      <TerminalOverlay open={terminalOpen} onClose={() => setTerminalOpen(false)} />

      {/* Bottom dock navigation */}
      <BottomDock
        activeTab={activeTab}
        onTabChange={tab => { setActiveTab(tab); setDockMinimized(false); }}
        minimized={dockMinimized}
        onMinimize={() => setDockMinimized(true)}
      />

      {/* Floating hamburger when dock is minimized */}
      {dockMinimized && (
        <FloatingMenuButton onClick={() => setDockMinimized(false)} />
      )}
    </>
  );
}

export default function App() {
  return <AppContent />;
}
