'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  Square, 
  ChevronRight, 
  ChevronDown,
  Search,
  Filter,
  Plus,
  Bot,
  Calendar,
  Timer,
  ListTodo
} from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { cn } from '@/src/lib/utils';

interface Task {
  id: string;
  workspaceId: string;
  agentId: string;
  type: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  parentTaskId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  reasoning?: Record<string, any>;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'bg-zinc-500/15 text-zinc-400', label: 'Pending' },
  running: { icon: Play, color: 'bg-blue-500/15 text-blue-400', label: 'Running' },
  completed: { icon: CheckCircle, color: 'bg-green-500/15 text-green-400', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'bg-red-500/15 text-red-400', label: 'Failed' },
  paused: { icon: Pause, color: 'bg-orange-500/15 text-orange-400', label: 'Paused' },
  cancelled: { icon: Square, color: 'bg-gray-500/15 text-gray-400', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <div className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest', config.color)}>
      <Icon className="size-3" />
      {config.label}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface TaskRowProps {
  task: Task;
  agent?: Agent;
  onTaskAction: (taskId: string, action: string) => void;
  onSelect: (task: Task) => void;
}

function TaskRow({ task, agent, onTaskAction, onSelect }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      await onTaskAction(task.id, action);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => onSelect(task)}
              className="font-bold text-accent hover:text-primary transition-colors text-left"
            >
              {task.description}
            </button>
            <StatusBadge status={task.status} />
          </div>
          
          <div className="flex items-center gap-4 text-xs text-text-dim">
            {agent && (
              <div className="flex items-center gap-1">
                <Bot className="size-3" />
                {agent.name}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              {relativeTime(task.createdAt)}
            </div>
            {task.durationMs && (
              <div className="flex items-center gap-1">
                <Timer className="size-3" />
                {formatDuration(task.durationMs)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.status === 'pending' && (
            <button
              onClick={() => handleAction('start')}
              disabled={loading}
              className="rounded-lg p-1.5 text-text-dim hover:text-green-400 transition-colors disabled:opacity-40"
              title="Start task"
            >
              <Play className="size-3.5" />
            </button>
          )}
          {task.status === 'running' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={loading}
              className="rounded-lg p-1.5 text-text-dim hover:text-orange-400 transition-colors disabled:opacity-40"
              title="Pause task"
            >
              <Pause className="size-3.5" />
            </button>
          )}
          {task.status === 'paused' && (
            <button
              onClick={() => handleAction('resume')}
              disabled={loading}
              className="rounded-lg p-1.5 text-text-dim hover:text-blue-400 transition-colors disabled:opacity-40"
              title="Resume task"
            >
              <Play className="size-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 pt-3 space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-1">Type</h4>
            <p className="text-sm font-mono">{task.type}</p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-1">Input</h4>
            <pre className="text-xs font-mono bg-bg/60 p-2 rounded-lg overflow-auto max-h-32">
              {JSON.stringify(task.input, null, 2)}
            </pre>
          </div>

          {task.output && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-1">Output</h4>
              <pre className="text-xs font-mono bg-bg/60 p-2 rounded-lg overflow-auto max-h-32">
                {JSON.stringify(task.output, null, 2)}
              </pre>
            </div>
          )}

          {task.error && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-dim mb-1">Error</h4>
              <pre className="text-xs font-mono bg-red-500/10 text-red-400 p-2 rounded-lg overflow-auto">
                {task.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Tasks() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    agentId: '',
    search: '',
  });

  useEffect(() => {
    if (workspace) {
      fetchTasks();
      fetchAgents();
    }
  }, [workspace, filters]);

  async function fetchTasks() {
    try {
      setLoading(true);
      if (!workspace) return;
      
      const params = new URLSearchParams();
      params.set('workspaceId', workspace.id);
      if (filters.status) params.set('status', filters.status);
      if (filters.agentId) params.set('agentId', filters.agentId);
      
      const res = await apiFetch<{ data: Task[] }>(`/api/v1/tasks?${params.toString()}`);
      let filteredTasks = res.data || [];

      // Apply client-side search if needed
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter((task: Task) =>
          task.description.toLowerCase().includes(searchLower) ||
          task.type.toLowerCase().includes(searchLower)
        );
      }

      setTasks(filteredTasks);
    } catch (error: any) {
      toast(error?.message || 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    try {
      const res = await apiFetch<{ data: Agent[] }>('/api/v1/agents');
      setAgents(res.data || []);
    } catch (error: any) {
      console.error('Failed to load agents:', error);
    }
  }

  async function handleTaskAction(taskId: string, action: string) {
    try {
      let endpoint = `/api/v1/tasks/${taskId}`;
      
      switch (action) {
        case 'start':
          endpoint += '/start';
          break;
        case 'pause':
          endpoint += '/pause';
          break;
        case 'resume':
          endpoint += '/resume';
          break;
        case 'cancel':
          endpoint += '/cancel';
          break;
        default:
          return;
      }

      await apiFetch(endpoint, { method: 'POST' });
      toast(`Task ${action}ed`, 'success');
      fetchTasks();
    } catch (error: any) {
      toast(error?.message || `Failed to ${action} task`, 'error');
    }
  }

  const getAgentById = (agentId: string) => agents.find(a => a.id === agentId);

  if (selectedTask) {
    return (
      <motion.div
        key="task-detail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
      >
        <button
          onClick={() => setSelectedTask(null)}
          className="flex items-center gap-2 text-sm text-text-dim hover:text-accent transition-colors mb-6"
        >
          <ChevronRight className="size-4 rotate-180" />
          Back to Tasks
        </button>
        
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{selectedTask.description}</h2>
              <StatusBadge status={selectedTask.status} />
            </div>
            <div className="flex items-center gap-2">
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => handleTaskAction(selectedTask.id, 'start')}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500/20 text-green-400 px-3 py-1.5 text-xs font-bold hover:bg-green-500/30 transition-colors"
                >
                  <Play className="size-3" />
                  Start
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-dim">Agent:</span>
              <span className="ml-2 font-mono">{getAgentById(selectedTask.agentId)?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-text-dim">Type:</span>
              <span className="ml-2 font-mono">{selectedTask.type}</span>
            </div>
            <div>
              <span className="text-text-dim">Created:</span>
              <span className="ml-2">{new Date(selectedTask.createdAt).toLocaleString()}</span>
            </div>
            {selectedTask.durationMs && (
              <div>
                <span className="text-text-dim">Duration:</span>
                <span className="ml-2">{formatDuration(selectedTask.durationMs)}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm">Input</h3>
            <pre className="text-sm font-mono bg-bg/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(selectedTask.input, null, 2)}
            </pre>
          </div>

          {selectedTask.output && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm">Output</h3>
              <pre className="text-sm font-mono bg-bg/60 p-3 rounded-lg overflow-auto">
                {JSON.stringify(selectedTask.output, null, 2)}
              </pre>
            </div>
          )}

          {selectedTask.error && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-red-400">Error</h3>
              <pre className="text-sm font-mono bg-red-500/10 text-red-400 p-3 rounded-lg overflow-auto">
                {selectedTask.error}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full">
      <div className="mb-6 space-y-4">
        <h2 className="text-2xl font-bold">Tasks</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            className="px-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bento-card space-y-2">
              <div className="h-4 bg-border/30 rounded w-3/4" />
              <div className="h-3 bg-border/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border">
            <ListTodo className="size-8 text-text-dim" />
          </div>
          <div className="text-center">
            <p className="text-highlight font-bold">No tasks found</p>
            <p className="text-text-dim text-sm mt-1 max-w-[200px] mx-auto">Create an orchestration plan to generate tasks.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              agent={getAgentById(task.agentId)}
              onTaskAction={handleTaskAction}
              onSelect={setSelectedTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
