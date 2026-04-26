'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Building2, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { Projects } from './Projects';
import { FolderBrowser } from '@/src/components/FolderBrowser';
import { useWorkspace } from '@/src/context/WorkspaceContext';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface Member {
    id: string;
    userId: string;
    email: string | null;
    fullName: string | null;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    joinedAt: string;
}

const ROLES: Member['role'][] = ['owner', 'admin', 'editor', 'viewer'];

function slugify(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function StatusBadge({ status }: { status?: string }) {
    const s = status ?? 'active';
    const colors: Record<string, string> = {
        active: 'bg-green-500/15 text-green-400',
        inactive: 'bg-zinc-500/15 text-zinc-400',
        archived: 'bg-orange-500/15 text-orange-400',
        deleted: 'bg-red-500/15 text-red-400',
    };
    return (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[s] ?? colors.active)}>
            {s}
        </span>
    );
}

function RoleBadge({ role }: { role: Member['role'] }) {
    const colors: Record<Member['role'], string> = {
        owner: 'bg-primary/20 text-primary',
        admin: 'bg-blue-500/15 text-blue-400',
        editor: 'bg-violet-500/15 text-violet-400',
        viewer: 'bg-zinc-500/15 text-zinc-400',
    };
    return (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[role])}>
            {role}
        </span>
    );
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    timestamp: string;
}

export function Workspaces() {
    const { data, loading, refetch } = useApi<ApiResponse<Workspace[]>>('/api/v1/workspaces');
    const { toast } = useToast();
    const { workspace, refreshWorkspaces, setWorkspace } = useWorkspace();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Workspace | null>(null);
    const [detail, setDetail] = useState<Workspace | null>(null);
    const [showFolderBrowser, setShowFolderBrowser] = useState(false);
    const [repositoryRefreshToken, setRepositoryRefreshToken] = useState(0);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function resetForm() {
        setName('');
        setSlug('');
        setDescription('');
    }

    function openCreate() {
        resetForm();
        setShowCreate(true);
    }

    function openEdit(ws: Workspace) {
        setName(ws.name);
        setSlug(ws.slug);
        setDescription(ws.description ?? '');
        setEditing(ws);
    }

    function closeAll() {
        setShowCreate(false);
        setEditing(null);
        resetForm();
    }

    async function handleCreate() {
        if (!name.trim() || !slug.trim()) { toast('Name and slug are required', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/workspaces', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined }),
            });
            toast('Workspace created', 'success');
            refetch();
            closeAll();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao criar workspace', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleEdit() {
        if (!editing) return;
        if (!name.trim() || !slug.trim()) { toast('Name and slug are required', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/v1/workspaces/${editing.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() }),
            });
            toast('Workspace updated', 'success');
            refetch();
            closeAll();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atualizar workspace', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(ws: Workspace) {
        if (!window.confirm(`Delete workspace ${ws.name}?`)) return;
        try {
            await apiFetch(`/api/v1/workspaces/${ws.id}`, { method: 'DELETE' });
            toast('Workspace deleted', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao excluir workspace', 'error');
        }
    }

    function bumpRepositoryRefresh() {
        setRepositoryRefreshToken((value) => value + 1);
    }

    function buildFolderName(folderPath: string) {
        return folderPath.split(/[\\/]/).filter(Boolean).pop() || 'workspace';
    }

    async function ensureTargetWorkspace(baseName: string): Promise<Workspace> {
        if (workspace?.id) {
            return workspace;
        }

        const createdWorkspace = await apiFetch<ApiResponse<Workspace>>('/api/v1/workspaces', {
            method: 'POST',
            body: JSON.stringify({
                name: baseName,
                slug: slugify(baseName),
                description: 'Workspace criado automaticamente para receber um repositório importado',
            }),
        });

        const nextWorkspace = createdWorkspace.data;
        if (!nextWorkspace) {
            throw new Error('Falha ao criar um workspace para o repositório');
        }

        setWorkspace(nextWorkspace);
        await Promise.all([refetch(), refreshWorkspaces()]);
        return nextWorkspace;
    }

    async function handleWorkspaceFolderSelected(folderPath: string) {
        const folderName = buildFolderName(folderPath);
        setShowFolderBrowser(false);
        setSubmitting(true);
        try {
            const targetWorkspace = await ensureTargetWorkspace(folderName);

            await apiFetch('/api/v1/projects', {
                method: 'POST',
                headers: { 'X-Workspace-Id': targetWorkspace.id },
                body: JSON.stringify({ name: folderName, localPath: folderPath }),
            });
            toast(`A pasta selecionada virou o repositório "${folderName}"`, 'success');
            bumpRepositoryRefresh();
            return;
        } catch (e: any) {
            if (e?.code === 'NO_GIT_REPO') {
                const gitSubfolders: string[] = e?.details?.gitSubfolders ?? [];

                if (gitSubfolders.length === 0) {
                    toast('Esta pasta não tem repositório Git e não pode ser selecionada.', 'error');
                    return;
                }

                if (gitSubfolders.length === 1) {
                    const singleRepoName = gitSubfolders[0];
                    const separator = folderPath.includes('\\') ? '\\' : '/';
                    const singleRepoPath = `${folderPath.replace(/[\\/]$/, '')}${separator}${singleRepoName}`;
                    const targetWorkspace = await ensureTargetWorkspace(folderName);

                    await apiFetch('/api/v1/projects', {
                        method: 'POST',
                        headers: { 'X-Workspace-Id': targetWorkspace.id },
                        body: JSON.stringify({ name: singleRepoName, localPath: singleRepoPath }),
                    });

                    toast(`A pasta continha 1 Git e foi importada como repositório: "${singleRepoName}"`, 'success');
                    bumpRepositoryRefresh();
                    return;
                }

                const slug = slugify(folderName);
                const createdWorkspace = await apiFetch<ApiResponse<Workspace>>('/api/v1/workspaces', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: folderName,
                        slug,
                        description: 'Workspace criado a partir de uma pasta com múltiplos repositórios Git',
                    }),
                });

                const workspace = createdWorkspace.data;
                if (workspace) {
                    setWorkspace(workspace);
                }

                await Promise.all([refetch(), refreshWorkspaces()]);
                toast(`Workspace "${folderName}" criado a partir da pasta selecionada`, 'success');
                bumpRepositoryRefresh();
                return;
            }

            toast(e.message ?? 'Falha ao selecionar pasta', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    const rawData = data?.data;
    const workspacesList = Array.isArray(rawData) ? rawData : (rawData?.items || []);
    const workspaces = workspacesList.filter(ws => ws.status !== 'deleted');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-5xl mx-auto w-full"
        >
            <div className="mb-10 space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Espaços e Repositórios</h2>
                <p className="text-sm text-text-dim">Uma visão única para gerenciar workspaces e os repositórios vinculados ao workspace ativo.</p>
            </div>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">Espaços</h3>
                        <p className="text-xs text-text-dim mt-1">Selecione, crie e administre seus workspaces.</p>
                    </div>
                    <button
                        onClick={() => setShowFolderBrowser(true)}
                        className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                    >
                        <Building2 className="size-3.5" />
                        Selecionar pasta
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-3 bento-card">
                        <Building2 className="size-10 text-border" />
                        <p className="text-text-dim text-sm">Ainda não há workspaces</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {workspaces.map(ws => (
                            <div
                                key={ws.id}
                                onClick={() => setDetail(ws)}
                                className="bento-card space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-bold text-accent">{ws.name}</span>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={ws.status} />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEdit(ws); }}
                                            title="Edit workspace"
                                            className="rounded-lg p-1.5 text-text-dim hover:text-accent hover:bg-bg/60 transition-colors"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(ws); }}
                                            title="Delete workspace"
                                            className="rounded-lg p-1.5 text-text-dim hover:text-red-400 hover:bg-bg/60 transition-colors"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <code className="text-xs text-text-dim font-mono">{ws.slug}</code>
                                {ws.description && (
                                    <p className="text-sm text-text-dim leading-relaxed">{ws.description}</p>
                                )}
                                {ws.createdAt && (
                                    <p className="label-caps">{new Date(ws.createdAt).toLocaleDateString()}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-12 space-y-6">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">Repositórios</h3>
                    <p className="text-xs text-text-dim mt-1">Os repositórios do workspace atualmente selecionado aparecem logo abaixo.</p>
                </div>
                <Projects embedded refreshToken={repositoryRefreshToken} />
            </section>

            <AnimatePresence>
                {(showCreate || editing) && (
                    <FormModal
                        key="form-modal"
                        title={editing ? 'Edit Workspace' : 'New Workspace'}
                        name={name}
                        slug={slug}
                        description={description}
                        onName={(v) => { setName(v); if (!editing) setSlug(slugify(v)); }}
                        onSlug={(v) => setSlug(slugify(v))}
                        onDescription={setDescription}
                        onClose={closeAll}
                        onSubmit={editing ? handleEdit : handleCreate}
                        submitting={submitting}
                        submitLabel={editing ? 'Save' : 'Create'}
                    />
                )}
                {detail && (
                    <DetailModal
                        key="detail-modal"
                        workspace={detail}
                        onClose={() => setDetail(null)}
                    />
                )}
                {showFolderBrowser && (
                    <FolderBrowser
                        onClose={() => setShowFolderBrowser(false)}
                        onSelect={handleWorkspaceFolderSelected}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function FormModal({
    title, name, slug, description,
    onName, onSlug, onDescription, onClose, onSubmit, submitting, submitLabel,
}: {
    title: string;
    name: string;
    slug: string;
    description: string;
    onName: (v: string) => void;
    onSlug: (v: string) => void;
    onDescription: (v: string) => void;
    onClose: () => void;
    onSubmit: () => void;
    submitting: boolean;
    submitLabel: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bento-card w-full max-w-md space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors">
                        <X className="size-4" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="label-caps block mb-1">Name</label>
                        <input
                            className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                            placeholder="Meu workspace"
                            value={name}
                            onChange={e => onName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-caps block mb-1">Slug</label>
                        <input
                            className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-mono text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                            placeholder="my-workspace"
                            value={slug}
                            onChange={e => onSlug(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-caps block mb-1">Description</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary resize-none"
                            placeholder="Descrição opcional"
                            value={description}
                            onChange={e => onDescription(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-text-dim hover:text-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-highlight py-3 text-sm font-bold text-bg hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Saving' : submitLabel}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function DetailModal({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newUserId, setNewUserId] = useState('');
    const [newRole, setNewRole] = useState<Member['role']>('viewer');
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        setLoadingMembers(true);
        try {
            const res = await apiFetch<ApiResponse<Member[]>>(`/api/v1/workspaces/${workspace.id}/members`);
            setMembers(res.data ?? []);
        } catch (e: any) {
            toast(e.message ?? 'Falha ao carregar membros', 'error');
        } finally {
            setLoadingMembers(false);
        }
    }, [workspace.id, toast]);

    useEffect(() => { load(); }, [load]);

    async function handleRoleChange(member: Member, role: Member['role']) {
        try {
            await apiFetch(`/api/v1/workspaces/${workspace.id}/members/${member.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role }),
            });
            toast('Role updated', 'success');
            load();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atualizar função', 'error');
        }
    }

    async function handleRemove(member: Member) {
        if (!window.confirm(`Remove ${member.fullName ?? member.userId} from workspace?`)) return;
        try {
            await apiFetch(`/api/v1/workspaces/${workspace.id}/members/${member.id}`, { method: 'DELETE' });
            toast('Member removed', 'success');
            load();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao remover membro', 'error');
        }
    }

    async function handleAdd() {
        if (!newUserId.trim()) { toast('userId is required', 'error'); return; }
        setAdding(true);
        try {
            await apiFetch(`/api/v1/workspaces/${workspace.id}/members`, {
                method: 'POST',
                body: JSON.stringify({ userId: newUserId.trim(), role: newRole }),
            });
            toast('Member added', 'success');
            setNewUserId('');
            setNewRole('viewer');
            setShowAdd(false);
            load();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao adicionar membro', 'error');
        } finally {
            setAdding(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bento-card w-full max-w-lg space-y-5 my-auto"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-accent">{workspace.name}</h3>
                        <code className="text-xs text-text-dim font-mono">{workspace.slug}</code>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                        <div className="label-caps">Status</div>
                        <StatusBadge status={workspace.status} />
                    </div>
                    <div className="space-y-1">
                        <div className="label-caps">Criado</div>
                        <div className="text-accent">{workspace.createdAt ? new Date(workspace.createdAt).toLocaleString() : '-'}</div>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <div className="label-caps">Updated</div>
                        <div className="text-accent">{workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleString() : '-'}</div>
                    </div>
                </div>

                {workspace.description && (
                    <p className="text-sm text-text-dim leading-relaxed border-t border-border pt-3">{workspace.description}</p>
                )}

                <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 text-text-dim" />
                            <h4 className="text-sm font-bold">Members</h4>
                        </div>
                        <button
                            onClick={() => setShowAdd(s => !s)}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-accent hover:border-primary/60 transition-colors"
                        >
                            <UserPlus className="size-3" />
                            Adicionar membro
                        </button>
                    </div>

                    {showAdd && (
                        <div className="rounded-xl border border-border bg-bg/40 p-3 space-y-2">
                            <input
                                className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-xs font-mono text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                placeholder="Cole o UUID do usuário"
                                value={newUserId}
                                onChange={e => setNewUserId(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value as Member['role'])}
                                    className="flex-1 rounded-lg bg-bg border border-border px-3 py-2 text-xs font-medium text-accent focus:outline-none focus:border-primary"
                                >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button
                                    onClick={handleAdd}
                                    disabled={adding}
                                    className="rounded-lg bg-highlight px-4 py-2 text-xs font-bold text-bg hover:bg-accent transition-colors disabled:opacity-50"
                                >
                                    {adding ? 'Adding' : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    {loadingMembers ? (
                        <p className="text-xs text-text-dim">Carregando membros</p>
                    ) : members.length === 0 ? (
                        <p className="text-xs text-text-dim">Ainda não há membros</p>
                    ) : (
                        <ul className="space-y-2">
                            {members.map(m => {
                                const initial = (m.fullName ?? m.email ?? m.userId).charAt(0).toUpperCase();
                                return (
                                    <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-2.5">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                                            {initial}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-accent truncate">{m.fullName ?? m.userId}</div>
                                            <div className="text-[11px] text-text-dim truncate">{m.email ?? ''}</div>
                                        </div>
                                        <RoleBadge role={m.role} />
                                        <select
                                            value={m.role}
                                            onChange={e => handleRoleChange(m, e.target.value as Member['role'])}
                                            className="rounded-lg bg-bg border border-border px-2 py-1 text-[11px] font-medium text-accent focus:outline-none focus:border-primary"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <button
                                            onClick={() => handleRemove(m)}
                                            title="Remove member"
                                            className="rounded-lg p-1.5 text-text-dim hover:text-red-400 transition-colors"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
