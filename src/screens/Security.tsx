'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Play, Plus, X, Eye, AlertTriangle, Bug, Trash2, Globe, Lock, Zap, Shield, Cloud, Server, Key, Sword, Target, Activity, CheckCircle, FileText, Scale, Radar, Ghost, Link2, ArrowRight } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type ScanType = 'code' | 'system' | 'api' | 'dependency' | 'infrastructure' | 'comprehensive';

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

interface APIAnalysisData {
    targetUrl: string;
    endpoints: any[];
    auth: {
        type: string;
        strength: string;
        details: string[];
    };
    rateLimit: {
        enabled: boolean;
        strategy: string;
        details?: string[];
    };
    securityHeaders: {
        present: string[];
        missing: string[];
    };
    tlsConfig: {
        enabled: boolean;
        version?: string;
        issues: string[];
    };
    summary: {
        totalEndpoints: number;
        secureEndpoints: number;
        vulnerableEndpoints: number;
        authScore: number;
        rateLimitScore: number;
        overallScore: number;
    };
    analyzedAt: string;
}

interface InfrastructureAnalysisData {
    provider: string;
    region: string;
    securityGroups: any[];
    iamPolicies: any[];
    resources: any[];
    summary: {
        totalSecurityGroups: number;
        vulnerableSecurityGroups: number;
        totalPolicies: number;
        vulnerablePolicies: number;
        totalResources: number;
        resourcesWithIssues: number;
        overallScore: number;
    };
    recommendations: string[];
    analyzedAt: string;
}

interface ComplianceData {
    owasp: {
        score: number;
        checks: any[];
        summary: {
            compliant: number;
            nonCompliant: number;
            partial: number;
            total: number;
        };
    };
    cis: {
        score: number;
        checks: any[];
        summary: {
            compliant: number;
            nonCompliant: number;
            partial: number;
            total: number;
        };
    };
    nist: {
        score: number;
        checks: any[];
        summary: {
            compliant: number;
            nonCompliant: number;
            partial: number;
            total: number;
        };
    };
    overallScore: number;
    recommendations: string[];
    assessedAt: string;
}

interface ZeroDayData {
    patternsAnalyzed: number;
    anomaliesDetected: number;
    vulnerabilities: any[];
    riskScore: number;
    highRiskPatterns: string[];
    recommendations: string[];
    analyzedAt: string;
    analysisDuration: number;
}

interface AttackChainData {
    chains: any[];
    summary: {
        totalChains: number;
        criticalChains: number;
        highRiskChains: number;
        mediumRiskChains: number;
        lowRiskChains: number;
        longestChain: number;
        averageChainLength: number;
    };
    commonPatterns: string[];
    recommendations: string[];
    analyzedAt: string;
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
    high: 'bg-stone-50/10 text-stone-200 border border-stone-100/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    low: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};

const SCAN_TYPES: ScanType[] = ['code', 'system', 'api', 'dependency', 'infrastructure', 'comprehensive'];

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
    const { toast } = useToast();
    const [simulatingId, setSimulatingId] = useState<string | null>(null);

    async function handleSimulateAttack(v: Vulnerability) {
        setSimulatingId(v.id);
        try {
            const res: any = await apiFetch('/api/v1/security/simulations', {
                method: 'POST',
                body: JSON.stringify({
                    vulnerabilityId: v.id,
                    attackType: v.type,
                    targetUrl: scan?.targetName,
                    pattern: 'sequential',
                }),
            });
            const sim = res?.data ?? res;
            const blocked = sim?.metrics?.payloadsBlocked ?? 0;
            const tried = sim?.metrics?.payloadsAttempted ?? 0;
            toast(`Simulation complete — ${blocked}/${tried} payloads blocked`, 'success');
        } catch (e: any) {
            toast(e?.message ?? 'Simulation failed', 'error');
        } finally {
            setSimulatingId(null);
        }
    }

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
                                <p className="text-sm text-text-dim">Nenhuma vulnerabilidade encontrada.</p>
                            ) : (
                                <div className="space-y-3">
                                    {scan.vulnerabilities.map(v => (
                                        <div key={v.id} className="bento-card p-3! space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <SeverityBadge severity={v.severity} />
                                                    <span className="font-bold text-sm text-accent">{v.title}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleSimulateAttack(v)}
                                                    disabled={simulatingId === v.id}
                                                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50"
                                                >
                                                    <Bug className="size-2.5" />
                                                    {simulatingId === v.id ? 'Simulating…' : 'Simulate Attack'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-text-dim leading-relaxed">{v.description}</p>
                                            {v.location && (
                                                <p className="text-[11px] font-mono text-text-dim">
                                                    {v.location.file}:{v.location.line}
                                                </p>
                                            )}
                                            {v.evidence && (
                                                <pre className="text-[11px] font-mono bg-white/5 rounded p-2 whitespace-pre-wrap break-words">
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
                                <p className="text-sm text-text-dim">Sem recomendações.</p>
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
    const { data: apiAnalysis, loading: apiAnalysisLoading, refetch: refetchApiAnalysis } = useApi<APIAnalysisData | null>('/api/v1/security/api-analysis?targetUrl=http://localhost:3000');
    const { data: infraAnalysis, loading: infraAnalysisLoading, refetch: refetchInfraAnalysis } = useApi<InfrastructureAnalysisData | null>('/api/v1/security/infrastructure-analysis');
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [type, setType] = useState<ScanType>('code');
    const [targetPath, setTargetPath] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [deepScan, setDeepScan] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [apiUrl, setApiUrl] = useState('http://localhost:3000');
    const [analyzingApi, setAnalyzingApi] = useState(false);
    const [analyzingInfra, setAnalyzingInfra] = useState(false);
    const [attackType, setAttackType] = useState('sql-injection');
    const [simulatingAttack, setSimulatingAttack] = useState(false);
    const { data: simulations, loading: simulationsLoading, refetch: refetchSimulations } = useApi('/api/v1/security/simulations');
    const { data: compliance, loading: complianceLoading, refetch: refetchCompliance } = useApi<ComplianceData | null>('/api/v1/security/compliance');
    const { data: zeroDay, loading: zeroDayLoading, refetch: refetchZeroDay } = useApi<ZeroDayData | null>('/api/v1/security/zero-day');
    const { data: attackChains, loading: attackChainsLoading, refetch: refetchAttackChains } = useApi<AttackChainData | null>('/api/v1/security/attack-chains');
    const [assessingCompliance, setAssessingCompliance] = useState(false);
    const [discoveringZeroDay, setDiscoveringZeroDay] = useState(false);
    const [analyzingChains, setAnalyzingChains] = useState(false);

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
            toast(e.message ?? 'Falha ao criar varredura', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(scanId: string) {
        if (!confirm('Excluir esta varredura?')) return;
        setDeletingId(scanId);
        try {
            await apiFetch(`/api/v1/security/scans/${scanId}`, { method: 'DELETE' });
            toast('Scan removed', 'success');
            refetch();
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao excluir', 'error');
        } finally {
            setDeletingId(null);
        }
    }

    async function handleAnalyzeAPI() {
        if (!apiUrl.trim()) {
            toast('URL da API é obrigatória', 'error');
            return;
        }
        setAnalyzingApi(true);
        try {
            await apiFetch(`/api/v1/security/api-analysis?targetUrl=${encodeURIComponent(apiUrl)}`);
            toast('Análise de API concluída', 'success');
            refetchApiAnalysis();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao analisar API', 'error');
        } finally {
            setAnalyzingApi(false);
        }
    }

    async function handleAnalyzeInfrastructure() {
        setAnalyzingInfra(true);
        try {
            await apiFetch('/api/v1/security/infrastructure-analysis');
            toast('Análise de infraestrutura concluída', 'success');
            refetchInfraAnalysis();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao analisar infraestrutura', 'error');
        } finally {
            setAnalyzingInfra(false);
        }
    }

    async function handleSimulateAttack() {
        if (!selectedProjectId) {
            toast('Selecione um projeto para simular ataque', 'error');
            return;
        }
        setSimulatingAttack(true);
        try {
            await apiFetch('/api/v1/security/simulations', {
                method: 'POST',
                body: JSON.stringify({
                    vulnerabilityId: 'demo-vuln-' + Date.now(),
                    attackType,
                    targetUrl: apiUrl,
                    pattern: 'sequential',
                }),
            });
            toast('Simulação de ataque iniciada', 'success');
            refetchSimulations();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao simular ataque', 'error');
        } finally {
            setSimulatingAttack(false);
        }
    }

    async function handleAssessCompliance() {
        setAssessingCompliance(true);
        try {
            await apiFetch('/api/v1/security/compliance');
            toast('Avaliação de compliance concluída', 'success');
            refetchCompliance();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao avaliar compliance', 'error');
        } finally {
            setAssessingCompliance(false);
        }
    }

    async function handleDiscoverZeroDay() {
        setDiscoveringZeroDay(true);
        try {
            await apiFetch('/api/v1/security/zero-day');
            toast('Descoberta de zero-day concluída', 'success');
            refetchZeroDay();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao descobrir zero-day', 'error');
        } finally {
            setDiscoveringZeroDay(false);
        }
    }

    async function handleAnalyzeAttackChains() {
        setAnalyzingChains(true);
        try {
            // Use vulnerabilities from the latest scan
            const vulnerabilities = list.flatMap((scan: any) => scan.vulnerabilities || []);
            await apiFetch('/api/v1/security/attack-chains', {
                method: 'POST',
                body: JSON.stringify({ vulnerabilities }),
            });
            toast('Análise de cadeia de ataques concluída', 'success');
            refetchAttackChains();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao analisar cadeia de ataques', 'error');
        } finally {
            setAnalyzingChains(false);
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
                    <h2 className="text-2xl font-bold tracking-tight">Security Análise</h2>
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
                    { label: 'Crítica', value: stats.critical },
                    { label: 'Alta', value: stats.high },
                ].map(stat => (
                    <div key={stat.label} className="bento-card text-center">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="label-caps text-text-dim mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* API Analysis Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center gap-2">
                    <Globe className="size-5 text-primary" />
                    <span className="label-caps">Análise de API</span>
                </div>
                <div className="flex gap-3">
                    <input
                        type="url"
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com"
                        className="flex-1 px-4 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all"
                    />
                    <button
                        onClick={handleAnalyzeAPI}
                        disabled={analyzingApi}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/40 rounded-xl text-xs font-bold text-primary hover:bg-primary/25 transition-all disabled:opacity-50"
                    >
                        <Shield className="size-3.5" />
                        {analyzingApi ? 'Analisando...' : 'Analisar'}
                    </button>
                </div>

                {apiAnalysisLoading ? (
                    <SkeletonCard />
                ) : apiAnalysis ? (
                    <div className="space-y-4">
                        {/* Summary Scores */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Pontuação Geral', value: apiAnalysis.summary.overallScore, color: apiAnalysis.summary.overallScore >= 70 ? 'text-green-400' : apiAnalysis.summary.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400' },
                                { label: 'Autenticação', value: apiAnalysis.summary.authScore, color: apiAnalysis.summary.authScore >= 70 ? 'text-green-400' : apiAnalysis.summary.authScore >= 40 ? 'text-yellow-400' : 'text-red-400' },
                                { label: 'Rate Limit', value: apiAnalysis.summary.rateLimitScore, color: apiAnalysis.summary.rateLimitScore >= 70 ? 'text-green-400' : apiAnalysis.summary.rateLimitScore >= 40 ? 'text-yellow-400' : 'text-red-400' },
                                { label: 'Endpoints', value: `${apiAnalysis.summary.secureEndpoints}/${apiAnalysis.summary.totalEndpoints}`, color: 'text-accent' },
                            ].map(stat => (
                                <div key={stat.label} className="text-center p-3 rounded-xl bg-bg border border-border">
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[8px] font-black text-text-dim uppercase mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Auth Status */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
                            <div className="flex items-center gap-3">
                                <Lock className={cn("size-4", apiAnalysis.auth.strength === 'strong' ? "text-green-500" : apiAnalysis.auth.strength === 'weak' ? "text-yellow-500" : "text-red-500")} />
                                <div>
                                    <p className="text-xs font-bold text-accent">Autenticação</p>
                                    <p className="text-[10px] text-text-dim">{apiAnalysis.auth.type} - {apiAnalysis.auth.strength}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                                {apiAnalysis.auth.details.slice(0, 2).map((detail, i) => (
                                    <span key={i} className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                                        {detail}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Rate Limit Status */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
                            <div className="flex items-center gap-3">
                                <Zap className={cn("size-4", apiAnalysis.rateLimit.enabled ? "text-green-500" : "text-red-500")} />
                                <div>
                                    <p className="text-xs font-bold text-accent">Rate Limiting</p>
                                    <p className="text-[10px] text-text-dim">{apiAnalysis.rateLimit.enabled ? apiAnalysis.rateLimit.strategy : 'Desabilitado'}</p>
                                </div>
                            </div>
                            {apiAnalysis.rateLimit.details && apiAnalysis.rateLimit.details.length > 0 && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                                    Ativo
                                </span>
                            )}
                        </div>

                        {/* Security Headers */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Headers de Segurança</p>
                            <div className="flex flex-wrap gap-2">
                                {apiAnalysis.securityHeaders.present.map((header, i) => (
                                    <span key={i} className="text-[9px] font-black uppercase px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                        ✓ {header}
                                    </span>
                                ))}
                                {apiAnalysis.securityHeaders.missing.slice(0, 3).map((header, i) => (
                                    <span key={i} className="text-[9px] font-black uppercase px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                        ✗ {header}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* TLS Config */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
                            <div className="flex items-center gap-3">
                                <Shield className={cn("size-4", apiAnalysis.tlsConfig.enabled ? "text-green-500" : "text-red-500")} />
                                <div>
                                    <p className="text-xs font-bold text-accent">TLS/SSL</p>
                                    <p className="text-[10px] text-text-dim">{apiAnalysis.tlsConfig.enabled ? apiAnalysis.tlsConfig.version : 'Não habilitado'}</p>
                                </div>
                            </div>
                            {apiAnalysis.tlsConfig.issues.length > 0 && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                                    {apiAnalysis.tlsConfig.issues.length} problemas
                                </span>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Infrastructure Analysis Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cloud className="size-5 text-primary" />
                        <span className="label-caps">Análise de Infraestrutura</span>
                    </div>
                    <button
                        onClick={handleAnalyzeInfrastructure}
                        disabled={analyzingInfra}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 border border-primary/40 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/25 transition-all disabled:opacity-50"
                    >
                        <Shield className="size-3" />
                        {analyzingInfra ? 'Analisando...' : 'Analisar'}
                    </button>
                </div>

                {infraAnalysisLoading ? (
                    <SkeletonCard />
                ) : infraAnalysis ? (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Pontuação', value: infraAnalysis.summary.overallScore, color: infraAnalysis.summary.overallScore >= 70 ? 'text-green-400' : infraAnalysis.summary.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400' },
                                { label: 'Security Groups', value: `${infraAnalysis.summary.vulnerableSecurityGroups}/${infraAnalysis.summary.totalSecurityGroups}`, color: 'text-accent' },
                                { label: 'Políticas IAM', value: `${infraAnalysis.summary.vulnerablePolicies}/${infraAnalysis.summary.totalPolicies}`, color: 'text-accent' },
                                { label: 'Recursos', value: `${infraAnalysis.summary.resourcesWithIssues}/${infraAnalysis.summary.totalResources}`, color: 'text-accent' },
                            ].map(stat => (
                                <div key={stat.label} className="text-center p-3 rounded-xl bg-bg border border-border">
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[8px] font-black text-text-dim uppercase mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Provider Info */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
                            <div className="flex items-center gap-3">
                                <Server className="size-4 text-primary" />
                                <div>
                                    <p className="text-xs font-bold text-accent">Provider</p>
                                    <p className="text-[10px] text-text-dim">{infraAnalysis.provider.toUpperCase()} - {infraAnalysis.region}</p>
                                </div>
                            </div>
                        </div>

                        {/* Security Groups */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Security Groups</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {infraAnalysis.securityGroups.slice(0, 5).map((sg: any) => (
                                    <div key={sg.id} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("size-2 rounded-full", sg.status === 'secure' ? "bg-green-500" : "bg-red-500")} />
                                            <span className="text-xs font-bold text-accent">{sg.name}</span>
                                        </div>
                                        {sg.vulnerabilities.length > 0 && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                                                {sg.vulnerabilities.length} vulns
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* IAM Policies */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Políticas IAM</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {infraAnalysis.iamPolicies.slice(0, 5).map((policy: any) => (
                                    <div key={policy.id} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                        <div className="flex items-center gap-2">
                                            <Key className={cn("size-3", policy.status === 'secure' ? "text-green-500" : "text-red-500")} />
                                            <span className="text-xs font-bold text-accent">{policy.name}</span>
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", policy.type === 'role' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400")}>
                                            {policy.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Resources */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Recursos Cloud</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {infraAnalysis.resources.slice(0, 5).map((resource: any) => (
                                    <div key={resource.id} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                        <div className="flex items-center gap-2">
                                            <Cloud className="size-3 text-text-dim" />
                                            <span className="text-xs font-bold text-accent">{resource.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-card text-text-dim">
                                                {resource.type}
                                            </span>
                                            {resource.securityIssues.length > 0 && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                                                    {resource.securityIssues.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        {infraAnalysis.recommendations.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Recomendações</p>
                                <div className="space-y-2">
                                    {infraAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                            <AlertTriangle className="size-3 text-yellow-500 mt-0.5 shrink-0" />
                                            <p className="text-xs text-text-dim">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Attack Simulation Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center gap-2">
                    <Sword className="size-5 text-primary" />
                    <span className="label-caps">Simulação de Ataques</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                        value={attackType}
                        onChange={e => setAttackType(e.target.value)}
                        className="px-4 py-2 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all"
                    >
                        <option value="sql-injection">SQL Injection</option>
                        <option value="xss">XSS (Cross-Site Scripting)</option>
                        <option value="csrf">CSRF (Cross-Site Request Forgery)</option>
                        <option value="auth-bypass">Authentication Bypass</option>
                        <option value="dos">DoS (Denial of Service)</option>
                        <option value="rce">RCE (Remote Code Execution)</option>
                        <option value="privilege-escalation">Privilege Escalation</option>
                        <option value="data-exfiltration">Data Exfiltration</option>
                    </select>
                    <button
                        onClick={handleSimulateAttack}
                        disabled={simulatingAttack}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/40 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                    >
                        <Target className="size-3.5" />
                        {simulatingAttack ? 'Simulando...' : 'Simular Ataque'}
                    </button>
                </div>

                {simulationsLoading ? (
                    <SkeletonCard />
                ) : simulations && Array.isArray(simulations) && simulations.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {simulations.slice(0, 5).map((sim: any) => (
                            <div key={sim.simulationId} className="p-3 rounded-xl bg-bg border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Activity className={cn("size-3", sim.status === 'succeeded' ? "text-green-500" : sim.status === 'blocked' ? "text-yellow-500" : sim.status === 'failed' ? "text-red-500" : "text-blue-500")} />
                                        <span className="text-xs font-bold text-accent">{sim.attackType}</span>
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", sim.status === 'succeeded' ? "bg-red-500/10 text-red-400" : sim.status === 'blocked' ? "bg-yellow-500/10 text-yellow-400" : sim.status === 'failed' ? "bg-gray-500/10 text-gray-400" : "bg-blue-500/10 text-blue-400")}>
                                        {sim.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[10px] text-text-dim">
                                    <div>
                                        <span className="font-bold">Payloads:</span> {sim.metrics?.payloadsAttempted || 0}
                                    </div>
                                    <div>
                                        <span className="font-bold">Bloqueados:</span> {sim.metrics?.payloadsBlocked || 0}
                                    </div>
                                    <div>
                                        <span className="font-bold">Sucesso:</span> {sim.metrics?.payloadsSuccessful || 0}
                                    </div>
                                </div>
                                {sim.results?.confidenceScore > 0 && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-[10px] mb-1">
                                            <span className="text-text-dim">Confiança</span>
                                            <span className="font-bold">{Math.round(sim.results.confidenceScore)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full transition-all", sim.results.confidenceScore > 70 ? "bg-red-500" : sim.results.confidenceScore > 40 ? "bg-yellow-500" : "bg-green-500")}
                                                style={{ width: `${sim.results.confidenceScore}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-text-dim">Nenhuma simulação realizada ainda</p>
                )}
            </div>

            {/* Compliance Assessment Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale className="size-5 text-primary" />
                        <span className="label-caps">Avaliação de Compliance</span>
                    </div>
                    <button
                        onClick={handleAssessCompliance}
                        disabled={assessingCompliance}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 border border-primary/40 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/25 transition-all disabled:opacity-50"
                    >
                        <FileText className="size-3" />
                        {assessingCompliance ? 'Avaliando...' : 'Avaliar'}
                    </button>
                </div>

                {complianceLoading ? (
                    <SkeletonCard />
                ) : compliance ? (
                    <div className="space-y-4">
                        {/* Overall Score */}
                        <div className="text-center p-4 rounded-xl bg-bg border border-border">
                            <p className="text-[8px] font-black text-text-dim uppercase mb-1">Pontuação Geral</p>
                            <p className={cn("text-4xl font-black", compliance.overallScore >= 70 ? "text-green-400" : compliance.overallScore >= 40 ? "text-yellow-400" : "text-red-400")}>
                                {compliance.overallScore}%
                            </p>
                        </div>

                        {/* Standard Scores */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { name: 'OWASP', score: compliance.owasp.score, summary: compliance.owasp.summary },
                                { name: 'CIS', score: compliance.cis.score, summary: compliance.cis.summary },
                                { name: 'NIST', score: compliance.nist.score, summary: compliance.nist.summary },
                            ].map(std => (
                                <div key={std.name} className="text-center p-3 rounded-xl bg-bg border border-border">
                                    <p className="text-xs font-bold text-accent mb-1">{std.name}</p>
                                    <p className={cn("text-2xl font-black", std.score >= 70 ? "text-green-400" : std.score >= 40 ? "text-yellow-400" : "text-red-400")}>
                                        {std.score}%
                                    </p>
                                    <div className="flex justify-center gap-2 mt-2 text-[9px] text-text-dim">
                                        <span className="text-green-400">✓ {std.summary.compliant}</span>
                                        <span className="text-yellow-400">~ {std.summary.partial}</span>
                                        <span className="text-red-400">✗ {std.summary.nonCompliant}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* OWASP Checks */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">OWASP Top 10</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {compliance.owasp.checks.slice(0, 5).map((check: any) => (
                                    <div key={check.id} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className={cn("size-3", check.status === 'compliant' ? "text-green-500" : check.status === 'partial' ? "text-yellow-500" : "text-red-500")} />
                                            <span className="text-xs font-bold text-accent truncate max-w-[150px]">{check.category}</span>
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", check.status === 'compliant' ? "bg-green-500/10 text-green-400" : check.status === 'partial' ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400")}>
                                            {check.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        {compliance.recommendations.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Recomendações</p>
                                <div className="space-y-2">
                                    {compliance.recommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                            <AlertTriangle className="size-3 text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-text-dim">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Zero-Day Discovery Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Radar className="size-5 text-primary" />
                        <span className="label-caps">Descoberta de Zero-Day</span>
                    </div>
                    <button
                        onClick={handleDiscoverZeroDay}
                        disabled={discoveringZeroDay}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 border border-purple-500/40 rounded-xl text-[10px] font-bold text-purple-400 hover:bg-purple-500/25 transition-all disabled:opacity-50"
                    >
                        <Ghost className="size-3" />
                        {discoveringZeroDay ? 'Analisando...' : 'Descobrir'}
                    </button>
                </div>

                {zeroDayLoading ? (
                    <SkeletonCard />
                ) : zeroDay ? (
                    <div className="space-y-4">
                        {/* Risk Score */}
                        <div className="text-center p-4 rounded-xl bg-bg border border-border">
                            <p className="text-[8px] font-black text-text-dim uppercase mb-1">Pontuação de Risco</p>
                            <p className={cn("text-4xl font-black", zeroDay.riskScore >= 70 ? "text-red-400" : zeroDay.riskScore >= 40 ? "text-yellow-400" : "text-green-400")}>
                                {zeroDay.riskScore}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Padrões', value: zeroDay.patternsAnalyzed, color: 'text-accent' },
                                { label: 'Anomalias', value: zeroDay.anomaliesDetected, color: zeroDay.anomaliesDetected > 0 ? 'text-red-400' : 'text-green-400' },
                                { label: 'Vulnerabilidades', value: zeroDay.vulnerabilities.length, color: zeroDay.vulnerabilities.length > 0 ? 'text-red-400' : 'text-green-400' },
                            ].map(stat => (
                                <div key={stat.label} className="text-center p-3 rounded-xl bg-bg border border-border">
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[8px] font-black text-text-dim uppercase mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* High Risk Patterns */}
                        {zeroDay.highRiskPatterns.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Padrões de Alto Risco</p>
                                <div className="flex flex-wrap gap-2">
                                    {zeroDay.highRiskPatterns.map((pattern, i) => (
                                        <span key={i} className="text-[9px] font-black uppercase px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                            {pattern}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Zero-Day Vulnerabilities */}
                        {zeroDay.vulnerabilities.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Vulnerabilidades Detectadas</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {zeroDay.vulnerabilities.slice(0, 5).map((vuln: any) => (
                                        <div key={vuln.id} className="p-3 rounded-xl bg-bg border border-border">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-accent">{vuln.title}</span>
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", vuln.severity === 'critical' ? "bg-red-500/10 text-red-400" : vuln.severity === 'high' ? "bg-orange-500/10 text-orange-400" : "bg-yellow-500/10 text-yellow-400")}>
                                                    {vuln.severity}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-text-dim mb-2">{vuln.description}</p>
                                            <div className="flex items-center gap-2 text-[9px] text-text-dim">
                                                <span>Confiança: {vuln.confidence}%</span>
                                                <span>•</span>
                                                <span>{vuln.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {zeroDay.recommendations.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Recomendações</p>
                                <div className="space-y-2">
                                    {zeroDay.recommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                            <AlertTriangle className="size-3 text-purple-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-text-dim">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Attack Chain Analysis Section */}
            <div className="bento-card space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link2 className="size-5 text-primary" />
                        <span className="label-caps">Análise de Cadeia de Ataques</span>
                    </div>
                    <button
                        onClick={handleAnalyzeAttackChains}
                        disabled={analyzingChains}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/15 border border-orange-500/40 rounded-xl text-[10px] font-bold text-orange-400 hover:bg-orange-500/25 transition-all disabled:opacity-50"
                    >
                        <ArrowRight className="size-3" />
                        {analyzingChains ? 'Analisando...' : 'Analisar'}
                    </button>
                </div>

                {attackChainsLoading ? (
                    <SkeletonCard />
                ) : attackChains ? (
                    <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Cadeias', value: attackChains.summary.totalChains, color: 'text-accent' },
                                { label: 'Críticas', value: attackChains.summary.criticalChains, color: 'text-red-400' },
                                { label: 'Alto Risco', value: attackChains.summary.highRiskChains, color: 'text-orange-400' },
                                { label: 'Máxima', value: attackChains.summary.longestChain, color: 'text-accent' },
                            ].map(stat => (
                                <div key={stat.label} className="text-center p-3 rounded-xl bg-bg border border-border">
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[8px] font-black text-text-dim uppercase mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Attack Chains */}
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Cadeias de Ataques Detectadas</p>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {attackChains.chains.slice(0, 4).map((chain: any) => (
                                    <div key={chain.id} className="p-3 rounded-xl bg-bg border border-border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-accent">{chain.name}</span>
                                            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", chain.overallRisk === 'critical' ? "bg-red-500/10 text-red-400" : chain.overallRisk === 'high' ? "bg-orange-500/10 text-orange-400" : "bg-yellow-500/10 text-yellow-400")}>
                                                {chain.overallRisk}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-text-dim mb-2">{chain.description}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[9px] text-text-dim">Passos: {chain.totalSteps}</span>
                                            <span className="text-[9px] text-text-dim">•</span>
                                            <span className="text-[9px] text-text-dim">Confiança: {Math.round(chain.confidence * 100)}%</span>
                                        </div>
                                        {/* Chain visualization */}
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                                            {chain.nodes.map((node: any, i: number) => (
                                                <div key={node.id} className="flex items-center">
                                                    <div className={cn("size-6 rounded-full flex items-center justify-center text-[8px] font-bold", node.severity === 'critical' ? "bg-red-500/20 text-red-400" : node.severity === 'high' ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400")}>
                                                        {i + 1}
                                                    </div>
                                                    {i < chain.nodes.length - 1 && <ArrowRight className="size-3 text-text-dim" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Common Patterns */}
                        {attackChains.commonPatterns.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Padrões Comuns</p>
                                <div className="space-y-2">
                                    {attackChains.commonPatterns.slice(0, 3).map((pattern, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                            <AlertTriangle className="size-3 text-orange-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-text-dim">{pattern}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {attackChains.recommendations.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Recomendações</p>
                                <div className="space-y-2">
                                    {attackChains.recommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                            <AlertTriangle className="size-3 text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-text-dim">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <ShieldCheck className="size-10 text-border" />
                    <p className="text-text-dim text-sm">Ainda não há varreduras — execute a primeira</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {list.map(scan => (
                        <div key={scan.id} className="bento-card flex flex-row items-center gap-3 overflow-hidden">
                            <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-accent truncate min-w-0 flex-1" title={scan.targetName}>{scan.targetName}</span>
                                    <span className="shrink-0">
                                        <SeverityBadge severity={scan.severity} />
                                    </span>
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
                            <button
                                onClick={() => handleDelete(scan.id)}
                                disabled={deletingId === scan.id}
                                className="rounded-lg p-2 text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50"
                                aria-label="Delete scan"
                            >
                                <Trash2 className="size-4" />
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
                                        placeholder="ex.: main-api"
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
                                            <option key={t} value={t}>{t === 'comprehensive' ? 'Comprehensive (All Scans)' : t}</option>
                                        ))}
                                    </select>
                                    {type === 'comprehensive' && (
                                        <p className="text-[10px] text-text-dim mt-1">Runs code, system, dependency, and infrastructure scans together</p>
                                    )}
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Target Project (optional)</label>
                                    <select
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                    >
                                        <option value="">Nenhum projeto específico</option>
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
                                    {submitting ? 'Executando…' : 'Run Scan'}
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
