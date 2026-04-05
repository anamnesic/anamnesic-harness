import React from 'react';

interface ContextEntry {
  id: string;
  key: string;
  value: string;
  category: string;
  priority: number;
  createdAt: string;
}

interface ContextEntryListProps {
  entries: ContextEntry[];
}

const categoryColors = {
  architecture: 'bg-purple-900',
  requirements: 'bg-blue-900',
  dependencies: 'bg-green-900',
  standards: 'bg-orange-900',
  general: 'bg-slate-700',
};

export default function ContextEntryList({ entries }: ContextEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
        <p className="text-slate-400">No context entries yet. Add one to get started.</p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-3">
      {sorted.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-lg border border-slate-700 p-4 ${
            categoryColors[entry.category as keyof typeof categoryColors] || categoryColors.general
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-white">{entry.key}</h3>
              <span className="inline-block mt-1 px-2 py-1 bg-black bg-opacity-30 rounded text-xs">
                {entry.category}
              </span>
            </div>
            <span className="text-xs text-slate-300 opacity-75">
              {new Date(entry.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-slate-100 mt-2 whitespace-pre-wrap">{entry.value}</p>
          <div className="mt-2 text-xs text-slate-300">Priority: {entry.priority}</div>
        </div>
      ))}
    </div>
  );
}