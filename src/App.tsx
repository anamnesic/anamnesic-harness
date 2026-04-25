'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ListTodo,
  Cpu,
  Settings2,
  Bell,
  Menu,
  ArrowLeft,
  ChevronRight,
  Shield,
  Activity,
  History,
  Eye,
  Filter,
  Download,
  Terminal,
  FolderOpen,
  Code2,
  MemoryStick,
  CpuIcon,
  CircleCheck,
  CircleAlert,
  AlertTriangle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Shared Components ---

const Header = ({ title, subtitle, onBack, rightElement }: any) => (
  <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-5 backdrop-blur-xl text-highlight">
    <div className="flex items-center gap-4">
      {onBack ? (
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {rightElement || (
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:border-accent/40 transition-colors">
          <Bell className="size-5 text-accent" />
        </button>
      )}
    </div>
  </header>
);

// --- Screens ---

const Dashboard = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full"
  >
    <div className="grid grid-cols-4 gap-4">
      {/* Hero Card */}
      <div className="bento-card col-span-4 md:col-span-2 md:row-span-2 overflow-hidden">
        <span className="label-caps">Status Priority</span>
        <h2 className="text-3xl font-bold tracking-tighter mt-2 mb-4">Agent Active & Observing</h2>
        <div className="mt-auto space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-dim font-medium">System Health</span>
              <span className="text-xs font-bold text-green-500">OPTIMAL</span>
            </div>
            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="h-full bg-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-bg/50 p-3 rounded-xl border border-border">
              <p className="text-[8px] uppercase font-bold text-text-dim tracking-widest mb-1">LATENCY</p>
              <p className="text-lg font-bold font-mono">12ms</p>
            </div>
            <div className="bg-bg/50 p-3 rounded-xl border border-border">
              <p className="text-[8px] uppercase font-bold text-text-dim tracking-widest mb-1">LOAD</p>
              <p className="text-lg font-bold font-mono">4.2%</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4">
          <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
        </div>
      </div>

      {/* Suggested Card */}
      <div className="bento-card col-span-4 md:col-span-2">
        <span className="label-caps">Proactive Suggestion</span>
        <h3 className="text-lg font-bold tracking-tight">Refactor Auth Middleware</h3>
        <p className="text-xs text-text-dim mt-2 line-clamp-2">I\'ve noticed repetitive patterns in your routing logic. I can abstract these into a single utility to reduce bundle size by ~4KB.</p>
        <button className="mt-6 bg-highlight text-bg py-2.5 rounded-xl font-bold text-xs hover:bg-accent transition-colors">
          Apply Optimization
        </button>
      </div>

      {/* Stats Card */}
      <div className="bento-card col-span-2 md:col-span-1">
        <span className="label-caps">Memory</span>
        <div className="stat mt-auto">
          <p className="text-3xl font-bold tracking-tighter">1.2GB</p>
          <p className="text-[10px] text-text-dim mt-1">Consolidation Scheduled</p>
        </div>
      </div>

      {/* Network Card */}
      <div className="bento-card col-span-2 md:col-span-1">
        <span className="label-caps">Uptime</span>
        <div className="stat mt-auto">
          <p className="text-3xl font-bold tracking-tighter">14d</p>
          <p className="text-[10px] text-text-dim mt-1">Operational</p>
        </div>
      </div>

      {/* Logs Card */}
      <div className="bento-card col-span-4 lg:col-span-2">
        <span className="label-caps">Recent Actions</span>
        <div className="space-y-4 mt-2">
          {[
            { icon: Code2, title: 'Optimized loop.ts', time: '2m' },
            { icon: MemoryStick, title: 'Memory Reset', time: '15m' },
            { icon: Shield, title: 'Security Audit', time: '1h' }
          ].map((action, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-border text-accent group-hover:text-highlight transition-colors">
                  <action.icon className="size-4" />
                </div>
                <span className="text-sm font-medium text-accent group-hover:text-highlight transition-colors">{action.title}</span>
              </div>
              <span className="text-[10px] font-bold text-text-dim">{action.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot Card */}
      <div className="bento-card col-span-4 lg:col-span-2 bg-no-repeat bg-cover bg-center overflow-hidden min-h-[160px]" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=2000&auto=format&fit=crop')" }}>
        <div className="absolute inset-0 bg-bg/60 backdrop-blur-[2px]" />
        <div className="relative z-10 mt-auto">
          <span className="label-caps !text-white/80">Infrastructure</span>
          <h4 className="text-white font-bold text-lg">Snapshot Monitor</h4>
          <p className="text-white/60 text-xs mt-1">All regions operational.</p>
        </div>
      </div>
    </div>
  </motion.div>
);

const MemoryLedger = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
  >
    <div className="mb-8 flex items-center justify-between">
      <h2 className="text-2xl font-bold tracking-tight">Memory Ledger</h2>
      <button className="rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-accent/40 transition-colors">Export Log</button>
    </div>

    <div className="relative pl-8 space-y-12">
      <div className="absolute left-[11px] top-0 h-[calc(100%-10px)] w-[1px] bg-border" />

      {[
        {
          type: 'OBSERVATION',
          title: 'File Change Detected',
          time: '10:45 AM',
          icon: Activity,
          content: 'System identified modifications in project_manifest.json. Version incremented to v1.0.2.',
          tags: ['system_watcher', 'v1.0.2']
        },
        {
          type: 'SLEEP CYCLE',
          title: 'Neural Recovery',
          time: '07:30 AM',
          icon: Shield,
          content: 'Memory consolidation focused on architecture patterns identified during yesterday\'s development session.',
          stats: { duration: '8h 12m', status: 'OPTIMAL' }
        }
      ].map((entry: any, i) => (
        <div key={i} className="relative">
          <div className="absolute left-[-26px] top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bg ring-4 ring-bg">
            <div className="size-2 rounded-full bg-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-dim tracking-widest">{entry.type}</span>
              <span className="text-[10px] font-bold text-text-dim">{entry.time}</span>
            </div>
            <div className={cn(
              "bento-card",
              entry.stats && "bg-highlight text-bg border-none"
            )}>
              <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
              {entry.stats && (
                <div className="flex gap-4 mb-3 border-b border-bg/10 pb-3">
                  <div>
                    <p className="text-[8px] font-bold opacity-40 uppercase">Duration</p>
                    <p className="text-sm font-bold">{entry.stats.duration}</p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-[8px] font-bold opacity-40 uppercase text-right">Status</p>
                    <p className="text-xs font-bold">{entry.stats.status}</p>
                  </div>
                </div>
              )}
              <p className={cn("text-sm leading-relaxed", entry.stats ? "opacity-80" : "text-accent")}>
                {entry.content}
              </p>
              {entry.tags && (
                <div className="mt-4 flex gap-2">
                  {entry.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-border rounded text-[10px] font-bold text-text-dim">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xs px-6">
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-sm font-bold text-bg shadow-2xl transition-all hover:bg-accent active:scale-95">
        <Plus className="size-5" />
        New Entry
      </button>
    </div>
  </motion.div>
);

const Observers = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full"
  >
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl font-bold tracking-tight">Active Nodes</h2>
      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">3 Online</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { title: 'FS Watcher', status: 'Active', icon: FolderOpen, subtitle: '/src/components' },
        { title: 'Terminal', status: 'Listening', icon: Terminal, subtitle: 'npm start' },
        { title: 'API Monitor', status: 'Paused', icon: Code2, subtitle: 'REST Hooks', inactive: true }
      ].map((obs, i) => (
        <div key={i} className={cn(
          "bento-card",
          obs.inactive && "opacity-50 grayscale"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-border text-accent">
              <obs.icon className="size-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">{obs.status}</span>
              {!obs.inactive && <div className="size-2 rounded-full bg-green-500 animate-pulse" />}
            </div>
          </div>
          <h4 className="font-bold text-highlight">{obs.title}</h4>
          <p className="text-xs text-text-dim mt-1">{obs.subtitle}</p>
          <div className="mt-auto pt-6 flex justify-end">
            <div className={cn(
              "h-6 w-11 rounded-full p-1 transition-colors relative cursor-pointer",
              !obs.inactive ? "bg-primary" : "bg-border"
            )}>
              <div className={cn(
                "h-4 w-4 bg-white rounded-full shadow-sm transition-transform",
                !obs.inactive ? "translate-x-5" : "translate-x-0"
              )} />
            </div>
          </div>
        </div>
      ))}

      <div className="bento-card md:col-span-2">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Shield className="size-5 fill-current" />
          <span className="label-caps !mb-0 font-black">Context Safety</span>
        </div>
        <p className="text-sm text-text-dim leading-relaxed mb-6">Exclusion patterns active to prevent credential leakage.</p>
        <div className="flex flex-wrap gap-2">
          {['.env*', 'node_modules', '*_secret.json'].map(tag => (
            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-border rounded-xl text-[10px] font-bold text-accent">
              <ChevronRight className="size-3 text-primary" />
              {tag}
            </span>
          ))}
          <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-colors">
            Configure
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

const ControlCenter = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 p-6 pb-32 max-w-5xl mx-auto w-full"
  >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[
        { label: 'Guardrails', value: '12', status: 'MODULAR', color: 'primary' },
        { label: 'Integrity', value: '100%', status: 'STABLE', color: 'accent' },
        { label: 'Violations', value: '0', status: 'TODAY', color: 'text-dim' }
      ].map((stat, i) => (
        <div key={i} className="bento-card">
          <span className="label-caps">{stat.label}</span>
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-4xl font-black tracking-tight">{stat.value}</span>
            <span className={cn("text-[9px] font-black tracking-[0.2em] px-2 py-1 rounded bg-border", i === 0 ? "text-primary" : "text-text-dim")}>
              {stat.status}
            </span>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bento-card !p-0 overflow-hidden border-2 border-primary/20">
        <div className="h-48 relative">
          <img
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000&auto=format&fit=crop"
            className="w-full h-full object-cover grayscale brightness-75"
            alt="Industrial"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute top-4 right-4 bg-red-600 px-2 py-1 rounded text-[8px] font-black text-white uppercase tracking-widest shadow-xl">CRITICAL</div>
        </div>
        <div className="p-6">
          <span className="label-caps !text-primary">Action Request</span>
          <h4 className="text-xl font-bold tracking-tight">Zone Alpha Override</h4>
          <p className="text-xs text-text-dim mt-2 leading-relaxed">Unit 084 requesting bypass for high-voltage recalibration.</p>
          <div className="flex gap-3 mt-8">
            <button className="flex-1 bg-highlight text-bg rounded-xl py-3 font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity">Authorize</button>
            <button className="flex-1 border border-border text-accent rounded-xl py-3 font-black text-[10px] tracking-widest uppercase hover:bg-card transition-colors">Discard</button>
          </div>
        </div>
      </div>

      <div className="bento-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Audit Stream</h3>
          <Download className="size-4 text-text-dim" />
        </div>
        <div className="space-y-4">
          {[
            { time: '14:22', label: 'Throttle Adj', outcome: 'AUTO' },
            { time: '13:58', label: 'Port Scan', outcome: 'BLOCKED' },
            { time: '13:45', label: 'HVAC Shift', outcome: 'MANUAL' }
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-text-dim">{log.time}</span>
                <span className="text-xs font-bold tracking-tight">{log.label}</span>
              </div>
              <span className={cn(
                "text-[8px] font-black tracking-widest px-2 py-0.5 rounded",
                log.outcome === 'BLOCKED' ? "bg-red-900/20 text-red-500" : "bg-primary/10 text-primary"
              )}>{log.outcome}</span>
            </div>
          ))}
        </div>
        <button className="mt-auto pt-6 text-[9px] font-black tracking-widest text-text-dim uppercase text-center w-full hover:text-accent">
          Full Historical View
        </button>
      </div>
    </div>
  </motion.div>
);

const SystemConfig = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full space-y-4"
  >
    <div className="bento-card">
      <span className="label-caps">Runtime Environment</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[
          { label: 'Node.js', val: 'v20.11.0', icon: 'https://nodejs.org/static/images/logo.svg' },
          { label: 'pnpm', val: '8.15.4', icon: null }
        ].map(env => (
          <div key={env.label} className="bg-bg border border-border p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {env.icon ? (
                <img src={env.icon} className="size-5 grayscale" alt={env.label} />
              ) : (
                <Code2 className="size-5 text-text-dim" />
              )}
              <div>
                <p className="text-[8px] font-black text-text-dim uppercase">{env.label}</p>
                <p className="text-sm font-bold font-mono">{env.val}</p>
              </div>
            </div>
            <CircleCheck className="size-5 text-green-500" />
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bento-card">
        <span className="label-caps">Hardware Stats</span>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {['CPU', '4.2%', 'MEM', '1.2GB', 'THR', '128', 'UP', '14d'].map((item, i) => i % 2 === 0 ? (
            <div key={i}>
              <p className="text-[8px] font-black text-text-dim uppercase leading-none">{item}</p>
              <p className="text-xl font-black mt-1 tracking-tight">{['4.2%', '1.2GB', '128', '14d'][i / 2]}</p>
            </div>
          ) : null)}
        </div>
      </div>

      <div className="bento-card">
        <span className="label-caps">Flags & Features</span>
        <div className="space-y-4 mt-4">
          {['Autonomous Modification', 'Deep Retrieval', 'JIT Engine'].map((flag, i) => (
            <div key={flag} className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent">{flag}</span>
              <div className={cn(
                "h-5 w-9 rounded-full p-0.5 flex items-center transition-colors cursor-pointer",
                i < 2 ? "bg-primary" : "bg-border"
              )}>
                <div className={cn("size-4 bg-white rounded-full transition-transform", i < 2 ? "translate-x-4" : "translate-x-0")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="flex justify-end gap-3 pt-6">
      <button className="px-6 py-3 border border-border rounded-xl text-accent font-black text-[10px] tracking-widest uppercase hover:bg-card">Discard</button>
      <button className="px-6 py-3 bg-highlight text-bg rounded-xl font-black text-[10px] tracking-widest uppercase hover:opacity-90">Commit changes</button>
    </div>
  </motion.div>
);

// --- Main App ---

const BottomNav = ({ activeTab, onTabChange }: any) => {
  const tabs = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'ledger', label: 'Ledger', icon: History },
    { id: 'observers', label: 'Nodes', icon: Eye },
    { id: 'control', label: 'Safety', icon: Shield },
    { id: 'system', label: 'Core', icon: Settings2 },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex w-[calc(100%-3rem)] max-w-lg">
      <div className="flex w-full gap-1 p-1 bg-card/90 border border-border rounded-2xl backdrop-blur-xl shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300 relative",
              activeTab === tab.id ? "bg-bg text-highlight shadow-sm border border-border" : "text-text-dim hover:text-accent"
            )}
          >
            <tab.icon className={cn("size-5", activeTab === tab.id && "text-primary")} />
            <span className="text-[9px] font-bold tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getScreenConfig = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'KAIROS', subtitle: 'Agent Dashboard', element: <Dashboard /> };
      case 'ledger':
        return { title: 'Ledger', subtitle: 'Historical Retrieval', element: <MemoryLedger />, onBack: () => setActiveTab('dashboard') };
      case 'observers':
        return { title: 'Monitoring', subtitle: 'Stateful Observers', element: <Observers />, onBack: () => setActiveTab('dashboard') };
      case 'control':
        return { title: 'Security', subtitle: 'Safety Guardrails', element: <ControlCenter />, onBack: () => setActiveTab('dashboard') };
      case 'system':
        return { title: 'Engine', subtitle: 'System Configuration', element: <SystemConfig />, onBack: () => setActiveTab('dashboard') };
      default:
        return { title: 'KAIROS', element: <Dashboard /> };
    }
  };

  const { title, subtitle, element, onBack } = getScreenConfig();

  return (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-highlight selection:bg-primary/20">
      <Header
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        rightElement={
          activeTab === 'dashboard' ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <div className="size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Online</span>
            </div>
          ) : (
            activeTab === 'system' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Live</span>
              </div>
            )
          )
        }
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
            {element}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
