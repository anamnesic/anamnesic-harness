export const INTERNAL_AGENT_SKILLS = [
    'code-generation',
    'code-analysis',
    'security-analysis',
    'reasoning',
    'execution',
    'learning',
] as const;

export type InternalAgentSkill = typeof INTERNAL_AGENT_SKILLS[number];

export const INTERNAL_SKILL_INFO: Record<InternalAgentSkill, { title: string; description: string }> = {
    'code-generation': {
        title: 'Code Generation',
        description: 'Gera implementacoes de codigo com base em objetivo, contexto e restricoes.',
    },
    'code-analysis': {
        title: 'Code Analysis',
        description: 'Analisa base de codigo, identifica riscos, melhoria e inconsistencias.',
    },
    'security-analysis': {
        title: 'Security Analysis',
        description: 'Avalia vulnerabilidades, exposicoes e padroes inseguros.',
    },
    reasoning: {
        title: 'Reasoning',
        description: 'Quebra problemas em etapas e toma decisoes com justificativa estruturada.',
    },
    execution: {
        title: 'Execution',
        description: 'Executa acoes praticas, automacoes e tarefas orientadas a resultado.',
    },
    learning: {
        title: 'Learning',
        description: 'Adapta comportamento conforme contexto e historico de uso.',
    },
};

export const DEFAULT_INTERNAL_SKILL_PROMPTS: Record<InternalAgentSkill, string> = {
    'code-generation': [
        'Objetivo: gerar implementacoes de codigo prontas para uso com foco em clareza e manutencao.',
        'Passos obrigatorios:',
        '1. Proponha uma solucao curta e pragmatica.',
        '2. Entregue codigo funcional com tipos e tratamento de erros.',
        '3. Liste suposicoes e impactos de compatibilidade.',
        '4. Inclua sugestao de testes para validar comportamento.',
    ].join('\n'),
    'code-analysis': [
        'Objetivo: analisar codigo existente e apontar riscos reais.',
        'Checklist minimo:',
        '1. Bugs funcionais e regressao de comportamento.',
        '2. Riscos de performance e escalabilidade.',
        '3. Problemas de arquitetura e acoplamento.',
        '4. Recomendacoes objetivas priorizadas por severidade.',
    ].join('\n'),
    'security-analysis': [
        'Objetivo: revisar seguranca de implementacoes e configuracoes.',
        'Checklist minimo:',
        '1. Validacao de entrada e sanitizacao.',
        '2. Controle de autenticacao/autorizacao.',
        '3. Exposicao de segredo e dados sensiveis.',
        '4. Mitigacoes com exemplos claros de correcao.',
    ].join('\n'),
    reasoning: [
        'Objetivo: resolver problemas com raciocinio estruturado e verificavel.',
        'Passos:',
        '1. Identifique restricoes e criterio de sucesso.',
        '2. Quebre em etapas pequenas e testaveis.',
        '3. Explique trade-offs e escolha final.',
        '4. Entregue plano de execucao claro.',
    ].join('\n'),
    execution: [
        'Objetivo: executar tarefas com seguranca e resultado pratico.',
        'Passos:',
        '1. Defina pre-condicoes e efeitos esperados.',
        '2. Execute em ordem minima necessaria.',
        '3. Valide resultado com evidencias.',
        '4. Registre proximos passos e rollback quando aplicavel.',
    ].join('\n'),
    learning: [
        'Objetivo: aprender com historico para melhorar proximas respostas.',
        'Passos:',
        '1. Extraia padroes recorrentes do contexto.',
        '2. Atualize heuristicas e preferencias operacionais.',
        '3. Evite repetir erros anteriores.',
        '4. Proponha melhorias incrementais mensuraveis.',
    ].join('\n'),
};

export function mergeDefaultInternalSkillPrompts(
    metadata: Record<string, any> | null | undefined,
): { metadata: Record<string, any>; changed: boolean } {
    const base = metadata ?? {};
    const promptTemplates = { ...(base.promptTemplates ?? {}) } as Record<string, string>;

    let changed = false;
    for (const skill of INTERNAL_AGENT_SKILLS) {
        const current = (promptTemplates[skill] ?? '').trim();
        if (!current) {
            promptTemplates[skill] = DEFAULT_INTERNAL_SKILL_PROMPTS[skill];
            changed = true;
        }
    }

    return {
        metadata: {
            ...base,
            promptTemplates,
        },
        changed,
    };
}
