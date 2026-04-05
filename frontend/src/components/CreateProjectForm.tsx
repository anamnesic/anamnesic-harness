import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const CREATE_PROJECT = gql`
  mutation CreateProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
      description
      status
      createdAt
    }
  }
`;

interface CreateProjectFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CreateProjectForm({ onCancel, onSuccess }: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createProject, { loading, error }] = useMutation(CREATE_PROJECT, {
    refetchQueries: ['GetProjects'],
    onCompleted: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject({
      variables: {
        name: name.trim(),
        description: description.trim() || null,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-slate-700 rounded">
      <input
        type="text"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 mb-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 mb-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={2}
      />
      {error && <p className="text-red-400 text-xs mb-2">{error.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded text-sm transition font-medium"
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded text-sm transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}