'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, Search, Plus, Filter } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { DecisionsPanel } from './DecisionsPanel';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export function Decisions() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (workspace) {
      fetchProjects();
    }
  }, [workspace]);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Project[] }>(`/api/v1/workspaces/${workspace?.id}/projects`);
      setProjects(res.items || []);
      if (res.items && res.items.length > 0) {
        setSelectedProject(res.items[0].id);
      }
    } catch (error: any) {
      toast(error?.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary/60 animate-spin mx-auto" />
          <p className="text-sm text-text-dim">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Lightbulb className="size-12 text-primary/40 mx-auto" />
          <div>
            <h3 className="font-bold text-text mb-2">No Projects Found</h3>
            <p className="text-sm text-text-dim">
              Create a project first to start recording decisions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bento-card mx-4 mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <h3 className="font-bold text-accent">Project Decisions</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-dim" />
              <input
                type="text"
                placeholder="Search context..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-bg/60 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 w-32"
              />
            </div>
            
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-bg/60 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProject && (
          <div className="border-t border-border/60 pt-4">
            <DecisionsPanel projectId={selectedProject} />
          </div>
        )}
      </div>
    </div>
  );
}
