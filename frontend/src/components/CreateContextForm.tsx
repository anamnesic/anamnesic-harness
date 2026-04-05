import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const CREATE_CONTEXT_ENTRY = gql`
  mutation CreateContextEntry(
    $projectId: ID!
    $key: String!
    $value: String!
    $category: String
    $priority: Int
  ) {
    createContextEntry(
      projectId: $projectId
      key: $key
      value: $value
      category: $category
      priority: $priority
    ) {
      id
      key
      value
      category
      priority
    }
  }
`;

interface CreateContextFormProps {
  projectId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const categories = ['general', 'architecture', 'requirements', 'dependencies', 'standards'];

export default function CreateContextForm({ projectId, onCancel, onSuccess }: CreateContextFormProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('1');
  const [createEntry, { loading, error }] = useMutation(CREATE_CONTEXT_ENTRY, {
    refetchQueries: ['GetProjectDetail'],
    onCompleted: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;

    createEntry({
      variables: {
        projectId,
        key: key.trim(),
        value: value.trim(),
        category,
        priority: parseInt(priority, 10),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Key</label>
          <input
            type="text"
            placeholder="e.g., Tech Stack, Database Choice"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Value</label>
          <textarea
            placeholder="Describe this context entry..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Low (1)</option>
              <option value="2">Medium (2)</option>
              <option value="3">High (3)</option>
              <option value="4">Critical (4)</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error.message}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading || !key.trim() || !value.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium transition"
          >
            {loading ? 'Creating...' : 'Create Entry'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}