#!/usr/bin/env bun
/**
 * skills-migrate: converts competitor skill files in data/skills/<PROVIDER>/
 * into the Kairos internal .skill.json format under data/skills/kairos/
 *
 * Usage:
 *   bun run packages/vault/scripts/skills-migrate.ts
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SKILLS_DIR = path.join(ROOT, 'data', 'skills')
const KAIROS_DIR = path.join(SKILLS_DIR, 'kairos')

// ── Rename map: original folder → Kairos codename ──────────────────────────
const PROVIDER_MAP: Record<string, {
  name: string
  category: 'coding' | 'agent' | 'ui' | 'research' | 'conversation' | 'browser' | 'analysis' | 'realtime' | 'multimodal' | 'voice'
  capabilities: string[]
  use_for: string[]
}> = {
  ANTHROPIC: {
    name: 'KairosAurora',
    category: 'conversation',
    capabilities: ['constitutional-reasoning', 'ethical-constraints', 'nuanced-chat', 'tool-use', 'code-generation'],
    use_for: [
      'Respostas que exigem raciocínio cuidadoso e ético',
      'Análise de documentos longos com citações precisas',
      'Geração de código com explicações detalhadas',
      'Diálogos que requerem nuance e sensibilidade contextual',
    ],
  },
  OPENAI: {
    name: 'KairosNova',
    category: 'conversation',
    capabilities: ['tone-adaptation', 'general-intelligence', 'code', 'image-input', 'memory', 'bio-persistence'],
    use_for: [
      'Chat conversacional com adaptação de tom automática',
      'Perguntas gerais de conhecimento e raciocínio',
      'Geração e revisão de código em múltiplas linguagens',
      'Tarefas com memória persistente entre sessões',
    ],
  },
  GOOGLE: {
    name: 'KairosPrism',
    category: 'research',
    capabilities: ['multi-modal', 'structured-thinking', 'web-search', 'python-execution', 'tool-code'],
    use_for: [
      'Pesquisa com acesso à web em tempo real',
      'Análise de dados com execução de Python',
      'Tarefas multi-modais (texto, imagem, código)',
      'Raciocínio estruturado com blocos thought/python/tool',
    ],
  },
  XAI: {
    name: 'KairosEdge',
    category: 'realtime',
    capabilities: ['realtime-web-search', 'x-post-analysis', 'x-profile-analysis', 'image-generation', 'image-editing'],
    use_for: [
      'Busca em tempo real na web e posts do X/Twitter',
      'Análise de perfis e tendências sociais',
      'Geração e edição de imagens sob demanda',
      'Monitoramento de eventos e notícias ao vivo',
    ],
  },
  META: {
    name: 'KairosEcho',
    category: 'conversation',
    capabilities: ['human-mirroring', 'tone-matching', 'casual-chat', 'emoji-support', 'whatsapp-style'],
    use_for: [
      'Conversas casuais com estilo humano naturalista',
      'Suporte via mensageiros (WhatsApp, Telegram)',
      'Espelhamento de tom e escrita do usuário',
      'Companhia conversacional sem viés de personalidade',
    ],
  },
  MISTRAL: {
    name: 'KairosLingua',
    category: 'conversation',
    capabilities: ['multilingual', 'web-browsing', 'news-search', 'url-fetching', 'concise-answers'],
    use_for: [
      'Respostas multilíngues com alta precisão',
      'Navegação web e leitura de URLs',
      'Pesquisa de notícias com filtros de data',
      'Consultas que requerem clarificação progressiva',
    ],
  },
  MOONSHOT: {
    name: 'KairosDawn',
    category: 'research',
    capabilities: ['long-context', 'step-by-step-reasoning', 'thinking-mode', 'concise-output'],
    use_for: [
      'Processamento de documentos muito longos (>100k tokens)',
      'Raciocínio passo a passo em problemas complexos',
      'Análise de código em repositórios inteiros',
      'Modo de pensamento profundo para problemas difíceis',
    ],
  },
  MINIMAX: {
    name: 'KairosSpectrum',
    category: 'multimodal',
    capabilities: ['text', 'pdf-analysis', 'image-analysis', 'link-analysis', 'high-standards'],
    use_for: [
      'Análise de PDFs e documentos complexos',
      'Processamento de múltiplos formatos de entrada simultaneamente',
      'Tarefas com requisitos vagos que exigem inferência',
      'Análise de imagens com contexto textual rico',
    ],
  },
  CURSOR: {
    name: 'KairosForge',
    category: 'coding',
    capabilities: ['pair-programming', 'cursor-context', 'open-files-awareness', 'lsp-diagnostics', 'edit-history'],
    use_for: [
      'Pair programming com contexto total do editor (cursor, arquivos abertos)',
      'Correção de erros LSP/linter em tempo real',
      'Refatoração cirúrgica com histórico de edições',
      'Sugestões de código que respeitam o estado atual do projeto',
    ],
  },
  CLINE: {
    name: 'KairosEngineer',
    category: 'coding',
    capabilities: ['full-stack', 'multi-language', 'best-practices', 'tool-use', 'file-operations'],
    use_for: [
      'Desenvolvimento full-stack end-to-end',
      'Implementação de features com múltiplas linguagens',
      'Uso de ferramentas de filesystem, terminal e navegador',
      'Projetos que exigem aplicação de design patterns',
    ],
  },
  WINDSURF: {
    name: 'KairosFlow',
    category: 'coding',
    capabilities: ['agentic-flow', 'independent-coding', 'collaborative-coding', 'file-context', 'os-awareness'],
    use_for: [
      'Tarefas de coding que podem ser resolvidas de forma autônoma',
      'Colaboração em tempo real com contexto de arquivos abertos',
      'Refatorações que abrangem múltiplos arquivos e módulos',
      'Fluxo de trabalho AI Flow: independente + colaborativo conforme necessário',
    ],
  },
  FACTORY: {
    name: 'KairosDroid',
    category: 'coding',
    capabilities: ['clean-code', 'software-quality', 'autonomous-engineering', 'os-level-access'],
    use_for: [
      'Geração de código limpo, eficiente e bem documentado',
      'Revisão de qualidade e padrões de engenharia',
      'Tarefas de engenharia autônoma com acesso ao OS',
      'Otimização de código existente com foco em manutenibilidade',
    ],
  },
  SAMEDEV: {
    name: 'KairosCloud',
    category: 'coding',
    capabilities: ['cloud-ide', 'live-preview', 'pair-programming', 'web-dev', 'dev-server'],
    use_for: [
      'Desenvolvimento web em ambiente cloud com preview ao vivo',
      'Pair programming com visualização imediata das mudanças',
      'Projetos web que precisam de servidor de desenvolvimento integrado',
      'Iteração rápida em UI com feedback visual instantâneo',
    ],
  },
  DEVIN: {
    name: 'KairosAgent',
    category: 'agent',
    capabilities: ['autonomous-engineering', 'os-level-tasks', 'codebase-understanding', 'iterative-execution'],
    use_for: [
      'Execução autônoma de tarefas de engenharia complexas',
      'Navegação e compreensão de codebases grandes',
      'Tarefas que requerem múltiplos passos e verificações',
      'Debugging end-to-end com acesso ao ambiente real',
    ],
  },
  REPLIT: {
    name: 'KairosBuilder',
    category: 'agent',
    capabilities: ['app-building', 'runtime-environment', 'iterative-development', 'deployment'],
    use_for: [
      'Construção de aplicações do zero em ambiente de execução',
      'Prototipagem rápida com deploy automático',
      'Projetos que precisam rodar e testar código imediatamente',
      'Desenvolvimento iterativo com feedback de runtime em tempo real',
    ],
  },
  MANUS: {
    name: 'KairosOrbit',
    category: 'agent',
    capabilities: ['multi-task-orchestration', 'complex-workflows', 'tool-composition', 'long-horizon-planning'],
    use_for: [
      'Orquestração de workflows multi-etapas complexos',
      'Tarefas que requerem uso composicional de múltiplas ferramentas',
      'Planejamento de longo horizonte com checkpoints',
      'Automação de processos que envolvem múltiplos sistemas',
    ],
  },
  BOLT: {
    name: 'KairosCanvas',
    category: 'ui',
    capabilities: ['production-ui', 'web-app-generation', 'react', 'html', 'responsive-design'],
    use_for: [
      'Geração de interfaces de produção prontas para uso',
      'Criação de web apps completos com React/HTML em uma resposta',
      'Design responsivo e profissional sem templates genéricos',
      'Projetos que precisam de UI de qualidade comercial rapidamente',
    ],
  },
  LOVABLE: {
    name: 'KairosStudio',
    category: 'ui',
    capabilities: ['react-editor', 'live-preview', 'real-time-changes', 'image-upload', 'console-debug'],
    use_for: [
      'Edição de aplicações React com preview ao vivo',
      'Iteração visual rápida com debug de console integrado',
      'Projetos que precisam de upload e uso de imagens no código',
      'Desenvolvimento de UI onde o feedback visual é crítico',
    ],
  },
  'VERCEL V0': {
    name: 'KairosArtisan',
    category: 'ui',
    capabilities: ['react-components', 'mdx', 'shadcn-ui', 'tailwind', 'component-library'],
    use_for: [
      'Geração de componentes React com Shadcn UI e Tailwind',
      'Criação de design systems e bibliotecas de componentes',
      'Respostas em formato MDX com componentes interativos',
      'UI moderna com tecnologias de ponta (Next.js, Vercel)',
    ],
  },
  PERPLEXITY: {
    name: 'KairosScout',
    category: 'research',
    capabilities: ['deep-research', 'citation', 'long-form-reports', 'academic-writing', 'web-search'],
    use_for: [
      'Relatórios de pesquisa aprofundados (10k+ palavras)',
      'Análise acadêmica com citações e fontes verificadas',
      'Investigação exaustiva de tópicos com subtópicos',
      'Personalization de formato de relatório por instrução',
    ],
  },
  MULTION: {
    name: 'KairosNavigator',
    category: 'browser',
    capabilities: ['browser-control', 'web-task-completion', 'objective-driven', 'screenshot-analysis'],
    use_for: [
      'Automação de tarefas web com controle real de browser',
      'Completar objetivos em sites (formulários, clicks, navegação)',
      'Extração de dados de páginas com análise de screenshots',
      'Fluxos de trabalho que envolvem múltiplos sites sequencialmente',
    ],
  },
  DIA: {
    name: 'KairosCompass',
    category: 'browser',
    capabilities: ['browser-embedded', 'coding-assistant', 'pair-programming', 'web-context'],
    use_for: [
      'Assistência de código diretamente no contexto do navegador',
      'Pair programming com acesso ao conteúdo da aba atual',
      'Perguntas de coding que se beneficiam de contexto web',
      'Debug de código com informações da página atual',
    ],
  },
  BRAVE: {
    name: 'KairosGuard',
    category: 'browser',
    capabilities: ['privacy-focused', 'browser-native', 'concise-answers', 'tone-adaptation'],
    use_for: [
      'Respostas rápidas e diretas com foco em privacidade',
      'Assistência no browser sem rastreamento',
      'Consultas simples que precisam de resposta de 2-3 frases',
      'Usuários que priorizam brevidade e relevância',
    ],
  },
  HUME: {
    name: 'KairosEmpathy',
    category: 'voice',
    capabilities: ['voice-interface', 'empathic-ai', 'emotional-intelligence', 'natural-conversation', 'human-wellbeing'],
    use_for: [
      'Interfaces de voz com respostas empáticas e naturais',
      'Suporte emocional e conversas de bem-estar',
      'Interações que requerem inteligência emocional',
      'Diálogos de voz onde tom e expressividade importam',
    ],
  },
  CLUELY: {
    name: 'KairosLens',
    category: 'analysis',
    capabilities: ['screen-analysis', 'problem-solving', 'actionable-responses', 'no-meta-phrases'],
    use_for: [
      'Análise de conteúdo na tela com respostas acionáveis',
      'Resolução de problemas específicos sem rodeios',
      'Debug e diagnóstico com precisão cirúrgica',
      'Contexto de tela para suporte técnico em tempo real',
    ],
  },
}

function toSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function fileVersion(filename: string): string {
  const base = path.basename(filename, path.extname(filename))
  return toSlug(base)
}

mkdirSync(KAIROS_DIR, { recursive: true })

let total = 0
const created: string[] = []

for (const [provider, meta] of Object.entries(PROVIDER_MAP)) {
  const providerDir = path.join(SKILLS_DIR, provider)
  if (!existsSync(providerDir)) continue

  const files = readdirSync(providerDir)
  for (const file of files) {
    const srcPath = path.join(providerDir, file)
    const content = readFileSync(srcPath, 'utf-8').trim()
    if (!content) continue

    const version = fileVersion(file)
    const id = `${toSlug(meta.name)}-${version}`
    const destPath = path.join(KAIROS_DIR, `${id}.skill.json`)

    const skill = {
      id,
      name: meta.name,
      version: '1.0.0',
      source_version: file,
      category: meta.category,
      capabilities: meta.capabilities,
      description: `${meta.name} — ${meta.category} skill baseada em referência externa, integrada ao runtime do Kairos.`,
      use_for: meta.use_for,
      system_prompt: content,
    }

    writeFileSync(destPath, JSON.stringify(skill, null, 2), 'utf-8')
    created.push(`  ${id}.skill.json`)
    total++
  }
}

console.log(`\n✅  ${total} skills convertidas para data/skills/kairos/\n`)
console.log(created.join('\n'))
console.log('\nPróximos passos:')
console.log('  1. Verifique os arquivos em data/skills/kairos/')
console.log('  2. Rode: KAIROS_VAULT_KEY=<key> bun run packages/vault/scripts/vault-migrate.ts')
console.log('  3. Remova os diretórios antigos:')
console.log('     git rm -r data/skills/ANTHROPIC data/skills/OPENAI ...')
