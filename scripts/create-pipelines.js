/**
 * Script para criar e iniciar 3 pipelines diferentes via MCP
 * Descobre features e cria pipelines de otimização
 */

const path = require('path');
const fs = require('fs');

// Carregar os módulos compilados do core
const corePath = path.join(__dirname, '../packages/core/dist');
const { ProjectService, PipelineService, getDatabase } = require(corePath);

const WORKSPACE = path.dirname(path.dirname(__dirname));
const PROJECT_NAME = 'ThinkCoffee Development';

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         CRIAÇÃO DE PIPELINES - ENXAME DE IAs THINKCOFFEE          ║
╚════════════════════════════════════════════════════════════════════╝
`);

    try {
        const db = await getDatabase();
        const projectService = new ProjectService(db);
        const pipelineService = new PipelineService();

        // ─── 1. Criar ou encontrar projeto ─────────────────────────
        console.log(`\n📋 [1/5] Localizando projeto "${PROJECT_NAME}"...`);
        let project = await projectService.findByWorkspace(WORKSPACE);

        if (!project) {
            console.log(`\n✨ Projeto não encontrado. Criando novo projeto...`);
            project = await projectService.create({
                name: PROJECT_NAME,
                description: 'Development and optimization of ThinkCoffee core features',
            });
            await projectService.linkWorkspace(project.id, WORKSPACE);
            console.log(`✅ Projeto criado: ${project.name} (${project.id})`);
        } else {
            console.log(`✅ Projeto encontrado: ${project.name} (${project.id})`);
        }

        // ─── 2. Criar Pipeline 1: Quality Presets ─────────────────
        console.log(`\n🚀 [2/5] Criando Pipeline 1: "Otimizar Quality Presets e Seleção de Modelos"...`);
        const p1 = pipelineService.create(
            project.id,
            'Analisar e otimizar os 6 quality presets (free→ultra), validar fallbacks de modelos, propor estratégia de seleção automática e redução de custos',
            WORKSPACE
        );
        console.log(`✅ Pipeline 1 criado: ${p1.id}`);
        console.log(`   Objetivo: ${p1.objective}`);
        console.log(`   Status: ${p1.status}`);

        // ─── 3. Criar Pipeline 2: Guardrails ──────────────────────
        console.log(`\n🚀 [3/5] Criando Pipeline 2: "Expandir Sistema de Guardrails e Segurança"...`);
        const p2 = pipelineService.create(
            project.id,
            'Revisar e expandir guardrails atuais (snapshot, rollback, dry-run, risk assessment), propor novos mecanismos de proteção, criar matriz de testes de segurança',
            WORKSPACE
        );
        console.log(`✅ Pipeline 2 criado: ${p2.id}`);
        console.log(`   Objetivo: ${p2.objective}`);
        console.log(`   Status: ${p2.status}`);

        // ─── 4. Criar Pipeline 3: Orquestração Multi-Agent ────────
        console.log(`\n🚀 [4/5] Criando Pipeline 3: "Orquestração Multi-Agent Avançada"...`);
        const p3 = pipelineService.create(
            project.id,
            'Otimizar orquestração de agentes (parallelização, checkpoints, context reranking), criar pipeline templates reutilizáveis, expandir pool de agentes',
            WORKSPACE
        );
        console.log(`✅ Pipeline 3 criado: ${p3.id}`);
        console.log(`   Objetivo: ${p3.objective}`);
        console.log(`   Status: ${p3.status}`);

        // ─── 5. Listar e resumir ──────────────────────────────────
        console.log(`\n✅ [5/5] Resumo dos Pipelines Criados`);
        const allPipelines = pipelineService.list(project.id);

        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                        PIPELINES ATIVOS                            ║
╚════════════════════════════════════════════════════════════════════╝

📊 PROJETO:
   ${project.name} (${project.id})
   Workspace: ${WORKSPACE}

🔄 PIPELINES CRIADOS: ${allPipelines.length}

`);

        allPipelines.forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.objective}`);
            console.log(`   ID: ${p.id}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Criado: ${new Date(p.createdAt).toLocaleString('pt-BR')}`);
            console.log(``);
        });

        // ─── Exibir próximas ações ────────────────────────────────
        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      PRÓXIMAS AÇÕES                                ║
╚════════════════════════════════════════════════════════════════════╝

👉 Para iniciar os pipelines via VS Code:
   1. Abrir ThinkCoffee na extensão VS Code
   2. Selecionar o projeto "${PROJECT_NAME}"
   3. Clicar em "Agents" → "Executar Pipeline Atual"

👉 Para iniciar via CLI:
   think pipeline list ${project.id}
   think pipeline run <pipeline-id>

👉 Agentes envolvidos em cada pipeline:
   Pipeline 1: Architect → Backend → Code-Review → Organizer
   Pipeline 2: Architect → DevOps → QA → Code-Review
   Pipeline 3: Product Manager → (Architect + Backend paralelo) → Frontend → Code-Review

✨ O enxame de IAs começará a processar as fases automaticamente!
`);

    } catch (error) {
        console.error('❌ Erro ao criar pipelines:');
        console.error(error.message);
        process.exit(1);
    }
}

main().catch(console.error);
