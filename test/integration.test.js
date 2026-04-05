#!/usr/bin/env node
/**
 * ThinkCoffee - Integration Tests
 * Testes de integracao end-to-end: Database -> Services -> CRUD -> Search -> Export -> Cascade Delete
 *
 * Execucao: node test/integration.test.js
 */

const {
  getDatabase,
  ProjectService,
  ContextService,
  DecisionService,
  exportProject,
  getExportFilename,
} = require('../packages/core/dist');

let passed = 0;
let failed = 0;
let total = 0;
const failures = [];

function assert(condition, label) {
  total++;
  if (condition) {
    console.log('  [PASS] ' + label);
    passed++;
  } else {
    console.error('  [FAIL] ' + label);
    failed++;
    failures.push(label);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  ThinkCoffee Integration Tests');
  console.log('========================================\n');

  let db;
  try {
    // PHASE 1: Database
    console.log('Phase 1: Database Initialization');
    db = await getDatabase({ dbPath: ':memory:' });
    assert(db.isInitialized, 'Database initializes with in-memory SQLite');
    assert(db.options.type === 'sqlite', 'Database type is sqlite');

    const ps = new ProjectService(db);
    const cs = new ContextService(db);
    const ds = new DecisionService(db);

    // PHASE 2: Project Lifecycle
    console.log('\nPhase 2: Project Lifecycle');
    const project = await ps.create({ name: 'integration-test-project', description: 'Full integration test' });
    assert(project.id && project.name === 'integration-test-project', 'Create project');

    const fetched = await ps.get(project.id);
    assert(fetched && fetched.name === 'integration-test-project', 'Get project by ID');

    const byName = await ps.findByName('integration-test-project');
    assert(byName && byName.id === project.id, 'Find project by name');

    const allProjects = await ps.list();
    assert(allProjects.length >= 1, 'List projects');

    const updatedProject = await ps.update(project.id, { description: 'Updated integration test' });
    assert(updatedProject.description === 'Updated integration test', 'Update project description');

    // PHASE 3: Context CRUD + Search
    console.log('\nPhase 3: Context Entries CRUD + Search');
    const ctx1 = await cs.create({
      projectId: project.id, key: 'tech-stack',
      value: 'Node.js, TypeScript, SQLite', category: 'architecture', priority: 3,
    });
    assert(ctx1.id && ctx1.key === 'tech-stack', 'Create context: tech-stack');

    const ctx2 = await cs.create({
      projectId: project.id, key: 'data-storage',
      value: 'SQLite with TypeORM', category: 'dependencies', priority: 2,
    });
    assert(ctx2.id && ctx2.key === 'data-storage', 'Create context: data-storage');

    const ctx3 = await cs.create({
      projectId: project.id, key: 'coding-standards',
      value: 'ESLint + Prettier, strict TypeScript', category: 'standards', priority: 2,
    });
    assert(ctx3.id, 'Create context: coding-standards');

    const ctxList = await cs.listByProject(project.id);
    assert(ctxList.length === 3, 'List context entries returns 3');

    const archEntries = await cs.listByProject(project.id, 'architecture');
    assert(archEntries.length === 1 && archEntries[0].key === 'tech-stack', 'Filter by architecture');

    const depEntries = await cs.listByProject(project.id, 'dependencies');
    assert(depEntries.length === 1 && depEntries[0].key === 'data-storage', 'Filter by dependencies');

    const searchTS = await cs.search(project.id, 'TypeScript');
    assert(searchTS.length >= 1, 'Search TypeScript returns results');

    const searchSQLite = await cs.search(project.id, 'SQLite');
    assert(searchSQLite.length >= 1, 'Search SQLite returns results');

    const searchNone = await cs.search(project.id, 'xyznonexistent');
    assert(searchNone.length === 0, 'Search returns empty for no match');

    const updatedCtx = await cs.update(ctx1.id, { priority: 4 });
    assert(updatedCtx.priority === 4, 'Update context priority');

    // PHASE 4: Decisions CRUD
    console.log('\nPhase 4: Decisions CRUD');
    const dec1 = await ds.create({
      projectId: project.id, title: 'Use MCP Protocol',
      description: 'Use Model Context Protocol for AI integration',
    });
    assert(dec1.id && dec1.title === 'Use MCP Protocol', 'Create decision: MCP');

    const dec2 = await ds.create({
      projectId: project.id, title: 'Use SQLite for Storage',
      description: 'SQLite is lightweight and embedded, perfect for local-first',
      rationale: { pros: ['No server', 'Fast'], cons: ['Single writer'] },
      alternatives: { postgres: 'Overkill', mongodb: 'Not relational' },
    });
    assert(dec2.id && dec2.rationale !== null, 'Create decision with rationale');

    const decs = await ds.listByProject(project.id);
    assert(decs.length === 2, 'List decisions returns 2');

    const updatedDec = await ds.update(dec1.id, { status: 'deprecated' });
    assert(updatedDec.status === 'deprecated', 'Update decision status');

    // PHASE 5: Export
    console.log('\nPhase 5: Export All Formats');
    const full = await ps.get(project.id);

    const md = exportProject(full, 'markdown');
    assert(md.includes('# integration-test-project'), 'Export markdown heading');
    assert(md.includes('tech-stack'), 'Export markdown context');

    const jsonStr = exportProject(full, 'json');
    const parsed = JSON.parse(jsonStr);
    assert(parsed.project && parsed.project.name === 'integration-test-project', 'Export JSON structure');
    assert(parsed.contexts.length >= 3, 'Export JSON contexts');
    assert(parsed.decisions.length >= 2, 'Export JSON decisions');

    const plain = exportProject(full, 'plain');
    assert(plain.toUpperCase().includes('INTEGRATION-TEST-PROJECT'), 'Export plain text');

    const copilot = exportProject(full, 'copilot');
    assert(copilot.includes('tech-stack'), 'Export copilot');

    const claude = exportProject(full, 'claude');
    assert(claude.includes('tech-stack'), 'Export claude');

    const cursor = exportProject(full, 'cursor');
    assert(cursor.includes('tech-stack'), 'Export cursor');

    assert(getExportFilename('copilot', 'test') === '.github/copilot-instructions.md', 'Copilot filename');
    assert(getExportFilename('claude', 'test') === 'CLAUDE.md', 'Claude filename');
    assert(getExportFilename('cursor', 'test') === '.cursorrules', 'Cursor filename');
    assert(getExportFilename('json', 'my-app') === 'my-app-context.json', 'JSON filename');
    assert(getExportFilename('markdown', 'my-app') === 'my-app-context.md', 'Markdown filename');

    // PHASE 6: Cross-Service Isolation
    console.log('\nPhase 6: Cross-Service Isolation');
    const project2 = await ps.create({ name: 'isolation-test' });
    await cs.create({ projectId: project2.id, key: 'other-stack', value: 'Python, Django', category: 'architecture' });

    const p1Entries = await cs.listByProject(project.id);
    const p2Entries = await cs.listByProject(project2.id);
    assert(p1Entries.length === 3, 'Project 1 has 3 entries');
    assert(p2Entries.length === 1, 'Project 2 has 1 entry');

    const p1Search = await cs.search(project.id, 'Python');
    assert(p1Search.length === 0, 'Project 1 search isolated');
    const p2Search = await cs.search(project2.id, 'Python');
    assert(p2Search.length === 1, 'Project 2 search finds own data');

    // PHASE 7: Cascade Delete
    console.log('\nPhase 7: Cascade Delete');
    await ps.delete(project.id);
    const afterDelete = await ps.list();
    assert(!afterDelete.find(function(p) { return p.id === project.id; }), 'Project deleted');

    const orphanCtx = await cs.listByProject(project.id);
    assert(orphanCtx.length === 0, 'Context entries cascade deleted');

    const orphanDecs = await ds.listByProject(project.id);
    assert(orphanDecs.length === 0, 'Decisions cascade deleted');

    const p2After = await ps.get(project2.id);
    assert(p2After !== null && p2After !== undefined, 'Project 2 unaffected');

    await ps.delete(project2.id);

    // PHASE 8: Error Handling
    console.log('\nPhase 8: Error Handling');
    let errDel = false;
    try { await ps.delete('fake-uuid'); } catch (e) { errDel = true; }
    assert(errDel, 'Delete non-existent project throws');

    let errCtx = false;
    try { await cs.create({ projectId: 'fake-uuid', key: 'k', value: 'v' }); } catch (e) { errCtx = true; }
    assert(errCtx, 'Create context on non-existent project throws');

    let errDec = false;
    try { await ds.create({ projectId: 'fake-uuid', title: 'T', description: 'D' }); } catch (e) { errDec = true; }
    assert(errDec, 'Create decision on non-existent project throws');

  } catch (err) {
    console.error('\n[FATAL ERROR]', err.message);
    console.error(err.stack);
    failed++;
  } finally {
    if (db && db.isInitialized) { await db.destroy(); }
  }

  console.log('\n========================================');
  console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed, ' + total + ' total');
  console.log('========================================\n');

  if (failures.length > 0) {
    console.log('  Failed tests:');
    failures.forEach(function(f) { console.log('    - ' + f); });
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
