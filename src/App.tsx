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
  Boxes,
  FolderKanban,
  Bot,
  Camera,
} from 'lucide-react';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { Dashboard } from './screens/Dashboard';
import { MemoryLedger } from './screens/MemoryLedger';
import { Observers } from './screens/Observers';
import { ControlCenter } from './screens/ControlCenter';
import { SystemConfig } from './screens/SystemConfig';
import { Projects } from './screens/Projects';
import { Agents } from './screens/Agents';
import { Workflows } from './screens/Workflows';
import { Security } from './screens/Security';
import { Snapshots } from './screens/Snapshots';
import { ChatPanel } from './screens/ChatPanel';

const Header = ({ title, subtitle, onBack, rightElement }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}) => (
  <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-5 backdrop-blur-xl text-highlight">
    <div className="flex items-center gap-4">
        <WorkspaceSelector />
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
        <h1 className="text-xl font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {rightElement ?? (
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors">
          <Bell className="size-5 text-accent" />
        </button>
      )}
    </div>
  </header>
);

const TABS = [
  { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
  { id: 'control', label: 'Safety', icon: Shield },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'security', label: 'Audit', icon: ShieldCheck },
  { id: 'system', label: 'Core', icon: Settings2 },
] as const;

// Secondary tabs accessible via back navigation (not in bottom nav)
type SecondaryTabId = 'ledger' | 'observers' | 'workflows' | 'snapshots' | 'chat';
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

function useScreenConfig(active: TabId, goHome: () => void, setActive: (id: TabId) => void) {
  switch (active) {
    case 'dashboard':
      return {
        title: 'KAIROS',
        subtitle: 'Agent Dashboard',
        element: <Dashboard onNavigate={setActive} />,
        onBack: undefined,
        rightElement: (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
        ),
      };
    case 'ledger':
      return { title: 'Ledger', subtitle: 'Historical Retrieval', element: <MemoryLedger />, onBack: goHome, rightElement: undefined };
    case 'observers':
      return { title: 'Monitoring', subtitle: 'Stateful Observers', element: <Observers />, onBack: goHome, rightElement: undefined };
    case 'control':
      return {
        title: 'Security',
        subtitle: 'Safety Guardrails',
        element: <ControlCenter />,
        onBack: goHome,
        rightElement: (
          <button
            onClick={() => setActive('snapshots')}
            className="flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:border-primary/60 transition-colors"
            aria-label="Snapshots"
          >
            <Camera className="size-4" />
            Snapshots
          </button>
        ),
      };
    case 'snapshots':
      return { title: 'Snapshots', subtitle: 'Point-in-time State', element: <Snapshots />, onBack: goHome, rightElement: undefined };
    case 'chat':
      return { title: 'Chat', subtitle: 'AI Assistant', element: <ChatPanel />, onBack: goHome, rightElement: undefined };
    case 'agents':
      return { title: 'Agents', subtitle: 'Agent Registry', element: <Agents />, onBack: goHome, rightElement: undefined };
    case 'workflows':
      return { title: 'Workflows', subtitle: 'Automation Pipelines', element: <Workflows />, onBack: goHome, rightElement: undefined };
    case 'projects':
      return { title: 'Projects', subtitle: 'Manage Projects', element: <Projects />, onBack: goHome, rightElement: undefined };
    case 'security':
      return { title: 'Security', subtitle: 'Vulnerability Audit', element: <Security />, onBack: goHome, rightElement: undefined };
    case 'system':
      return {
        title: 'Engine',
        subtitle: 'System Configuration',
        element: <SystemConfig />,
        onBack: goHome,
        rightElement: (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Live</span>
          </div>
        ),
      };
    default:
      return {
        title: 'Unknown',
        subtitle: 'Page not found',
        element: <div className="flex-1 flex items-center justify-center text-text-dim">Page not found</div>,
        onBack: goHome,
        rightElement: undefined,
      };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const config = useScreenConfig(activeTab, () => setActiveTab('dashboard'), setActiveTab);

  return (
    <WorkspaceProvider>
      <ToastProvider>
      <div className="flex min-h-screen flex-col bg-bg font-sans text-highlight selection:bg-primary/20">
        <Header
          title={config.title}
          subtitle={config.subtitle}
          onBack={config.onBack}
          rightElement={config.rightElement}
        />
        <main className="flex-1 flex flex-col overflow-x-hidden">
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
      </ToastProvider>
    </WorkspaceProvider>
  );
}
