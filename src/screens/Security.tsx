'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Play, Plus, X, Eye, AlertTriangle } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type ScanType = 'code' | 'system' | 'api' | 'dependency' | 'infrastructure';

interface Vulnerability {
    id: string;
    type: string;
    severity: Severity;
    title: string;
    description: string;
    location?: { file: string; line: number; column: number };
    evidence?: string;
    remediationSteps: string[];
    references: string[];
    cvss?: number;
}

interface Recommendation {
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    steps: string[];
    timeEstimateHours: number;
}

interface SecurityScan {
    id: string;
    workspaceId: string;
    targetId: string;
    targetName: string;
    type: ScanType;
    severity: Severity;
    vulnerabilityCount: number;
    vulnerabilities: Vulnerability[];
    recommendations: Recommendation[];
    scanMethod: string | null;
    durationMs: number | null;
    scannerVersion: string | null;
    metadata: Record<string, any> | null;
    analyzedAt: string;
}

const SEVERITY_BADGE: Record<Severity, string> = {
    critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    low: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};

const SCAN_TYPES: ScanType[] = ['code', 'system', 'api', 'dependency', 'infrastructure'];

function relativeTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        if (diff < 60_000) return 'just now';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
    } catch { return '—'; }
}

function SeverityBadge({ severity }: { severity: Severity }) {
    return (
        <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
            SEVERITY_BADGE[severity]
        )}>
            {severity}
        </span>
    );
}

function DetailModal({ scanId, onClose }: { scanId: string; onClose: () => void }) {
    const { data, loading } = useApi<{ data: SecurityScan } | SecurityScan>(`/api/v1/security/scans/${scanId}`);
    const scan: SecurityScan | null = (data as any)?.data ?? (data as any) ?? null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.15 }}
                className="bento-card w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="label-caps text-text-dim">Scan Detail</p>
                        <h3 className="font-bold text-base truncate">{scan?.targetName ?? 'Loading…'}</h3>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-text-dim hover:text-accent transition-colors">
                        <X className="size-4" />
                    </button>
                </div>

                {loading || !scan ? (
                    <SkeletonCard />
                ) : (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-dim">
                            <SeverityBadge severity={scan.severity} />
                            <span className="rounded-md bg-white/5 border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                {scan.type}
                            </span>
                            <span><span className="text-accent font-semibold">{scan.vulnerabilityCount}</span> findings</span>
                            <span className="ml-auto label-caps">{relativeTime(scan.analyzedAt)}</span>
                        </div>

                        <div>
                            <h4 className="label-caps text-text-dim mb-2">Vulnerabilities</h4>
                            {scan.vulnerabilities.length === 0 ? (
                                <p className="text-sm text-text-dim">No vulnerabilities found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {scan.vulnerabilities.map(v => (
                                        <div key={v.id} className="bento-card p-3! space-y-2">
                                            <div className="flex items-center gap-2">
                                                <SeverityBadge severity={v.severity} />
                                                <span className="font-bold text-sm text-accent">{v.title}</span>
                                            </div>
                                            <p className="text-xs text-text-dim leading-relaxed">{v.description}</p>
                                            {v.location && (
                                                <p className="text-[11px] font-mono text-text-dim">
                                                    {v.location.file}:{v.location.line}
                                                </p>
                                            )}
                                            {v.evidence && (
                                                <pre className="text-[11px] font-mono bg-white/5 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                                    {v.evidence}
                                                </pre>
                                            )}
                                            {v.remediationSteps?.length > 0 && (
                                                <ul className="list-disc list-inside text-xs text-text-dim space-y-0.5">
                                                    {v.remediationSteps.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="label-caps text-text-dim mb-2">Recommendations</h4>
                            {scan.recommendations.length === 0 ? (
                                <p className="text-sm text-text-dim">No recommendations.</p>
                            ) : (
                                <div className="space-y-3">
                                    {scan.recommendations.map((r, i) => (
                                        <div key={i} className="bento-card p-3! space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-accent">
                                                    {r.priority}
                                                </span>
                                                <span className="font-bold text-sm text-accent">{r.title}</span>
                                            </div>
                                            <p className="text-xs text-text-dim leading-relaxed">{r.description}</p>
                                            {r.steps?.length > 0 && (
                                                <ul className="list-disc list-inside text-xs text-text-dim space-y-0.5">
                                                    {r.steps.map((s, j) => <li key={j}>{s}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

export function Security() {
    const { workspace } = useWorkspace();
    const { data, loading, refetch } = useApi('/api/v1/security/scans');
    const { data: projectsData } = useApi('/api/v1/projects');
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [type, setType] = useState<ScanType>('code');
    const [targetPath, setTargetPath] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [deepScan, setDeepScan] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);

    const projects = useMemo(() => {
        const raw = (projectsData as any)?.data ?? projectsData ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [projectsData]);

    const list: SecurityScan[] = useMemo(() => {
        const raw = (data as any)?.data ?? data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [data]);

    const stats = useMemo(() => {
        let critical = 0, high = 0;
        for (const s of list) {
            for (const v of s.vulnerabilities ?? []) {
                if (v.severity === 'critical') critical++;
                else if (v.severity === 'high') high++;
            }
        }
        return { total: list.length, critical, high };
    }, [list]);

    function closeModal() {
        setShowModal(false);
        setTargetName('');
        setType('code');
        setTargetPath('');
        setSelectedProjectId('');
        setDeepScan(false);
    }

    async function handleSubmit() {
        if (!targetName.trim()) { toast('Target name is required', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/security/scans', {
                method: 'POST',
                body: JSON.stringify({
                    targetName: targetName.trim(),
                    type,
                    targetPath: targetPath.trim() || undefined,
                    workspaceId: workspace?.id,
                    targetId: selectedProjectId || undefined,
                    deepScan: type === 'code' ? deepScan : undefined,
                }),
            });
            toast('Scan created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Failed to create scan', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="size-5" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Security Analysis</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Play className="size-3.5" />
                    New Scan
                </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Scans', value: stats.total },
                    { label: 'Critical', value: stats.critical },
                    { label: 'High', value: stats.high },
                ].map(stat => (
                    <div key={stat.label} className="bento-card text-center">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="label-caps text-text-dim mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <ShieldCheck className="size-10 text-border" />
                    <p className="text-text-dim text-sm">No scans yet — run your first scan</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {list.map(scan => (
                        <div key={scan.id} className="bento-card flex items-center gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-accent truncate">{scan.targetName}</span>
                                    <SeverityBadge severity={scan.severity} />
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-text-dim">
                                    <span className="rounded-md bg-white/5 border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                        {scan.type}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle className="size-3" />
                                        <span className="text-accent font-semibold">{scan.vulnerabilityCount}</span> findings
                                    </span>
                                    <span className="ml-auto label-caps">{relativeTime(scan.analyzedAt)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpenId(scan.id)}
                                className="rounded-lg p-2 text-text-dim hover:text-accent hover:bg-white/5 transition-colors shrink-0"
                                aria-label="View details"
                            >
                                <Eye className="size-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        key="security-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-lg space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">New Security Scan</h3>
                                <button onClick={closeModal} className="rounded-lg p-1 text-text-dim hover:text-accent transition-colors">
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps block mb-1">Target Name</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={targetName}
                                        onChange={e => setTargetName(e.target.value)}
                                        placeholder="e.g. main-api"
                                    />
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Type</label>
                                    <select
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={type}
                                        onChange={e => setType(e.target.value as ScanType)}
                                    >
                                        {SCAN_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Target Project (optional)</label>
                                    <select
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                    >
                                        <option value="">No specific project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Target Path (optional)</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={targetPath}
                                        onChange={e => setTargetPath(e.target.value)}
                                        placeholder="src/"
                                    />
                                </div>
                                {type === 'code' && (
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            onClick={() => setDeepScan(!deepScan)}
                                            className={cn(
                                                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                                deepScan ? 'bg-primary' : 'bg-border'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                                    deepScan ? 'translate-x-4' : 'translate-x-0'
                                                )}
                                            />
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-accent">Deep Scan (AI-powered)</span>
                                            <span className="text-[10px] text-text-dim uppercase tracking-widest font-bold">Comprehensive 5-phase analysis</span>
                                        </div>
                                    </div>
                                )}
                                                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={closeModal}
                                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-dim hover:text-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/40 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="size-3.5" />
                                    {submitting ? 'Running…' : 'Run Scan'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {openId && <DetailModal scanId={openId} onClose={() => setOpenId(null)} />}
            </AnimatePresence>
        </motion.div>
    );
}
