'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { cn } from '@/src/lib/utils';

export function WorkspaceSelector() {
  const { workspace, workspaces, setWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || workspaces.length <= 1) {
    return null; // Don't show selector if loading or only one workspace
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
      >
        <Building2 className="size-4 text-primary" />
        <span className="text-sm font-medium text-highlight truncate max-w-[120px]">
          {workspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown className={cn(
          'size-3.5 text-text-dim transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-bold text-text-dim uppercase tracking-wider">
                  Workspaces
                </div>
                
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setWorkspace(ws);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      workspace?.id === ws.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-bg text-accent hover:text-highlight'
                    )}
                  >
                    <Building2 className="size-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{ws.name}</div>
                      {ws.description && (
                        <div className="text-xs text-text-dim truncate">{ws.description}</div>
                      )}
                    </div>
                    {workspace?.id === ws.id && (
                      <Check className="size-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="border-t border-border p-2">
                <button
                  onClick={() => {
                    // TODO: Navigate to workspace creation
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-bg text-accent hover:text-highlight transition-colors"
                >
                  <Plus className="size-4 shrink-0" />
                  <span className="font-medium">Create New Workspace</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
