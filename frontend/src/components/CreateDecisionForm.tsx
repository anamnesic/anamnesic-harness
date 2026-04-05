import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const CREATE_DECISION = gql`
  mutation CreateDecision(
    $projectId: ID!
    $title: String!
    $description: String!
  ) {
    createDecision(
      projectId: $projectId
      title: $title
      description: $description
    ) {
      id
      title
      description
      status
    }
  }
`;

interface CreateDecisionFormProps {
  projectId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CreateDecisionForm({ projectId, onCancel, onSuccess }: CreateDecisionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createDecision, { loading, error }] = useMutation(CREATE_DECISION, {
    refetchQueries: ['GetProjectDetail'],
    onCompleted: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createDecision({
      variables: {
        projectId,
        title: title.trim(),
        description: description.trim(),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Decision Title</label>
          <input
            type="text"
            placeholder="e.g., Use PostgreSQL instead of MySQL"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rationale & Details</label>
          <textarea
            placeholder="Explain the reasoning behind this decision, alternatives considered, and implications..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={5}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error.message}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading || !title.trim() || !description.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium transition"
          >
            {loading ? 'Creating...' : 'Record Decision'}
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