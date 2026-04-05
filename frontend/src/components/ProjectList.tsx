import React from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  contextEntries: Array<{ id: string }>;
  decisions: Array<{ id: string }>;
}

interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  onSelectProject: (id: string) => void;
}

export default function ProjectList({ projects, selectedId, onSelectProject }: ProjectListProps) {
  if (projects.length === 0) {
    return <p className="text-slate-400 text-sm py-4">No projects yet</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project.id)}
          className={`w-full text-left p-3 rounded transition ${
            selectedId === project.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
          }`}
        >
          <div className="font-medium">{project.name}</div>
          <div className="text-xs mt-1 opacity-75">
            {project.contextEntries.length} context entries
            {' • '}
            {project.decisions.length} decisions
          </div>
        </button>
      ))}
    </div>
  );
}