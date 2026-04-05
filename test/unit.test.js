#!/usr/bin/env node
/**
 * ThinkCoffee - Unit Tests
 * Testes unitarios para validar cada servico individualmente.
 * Usa banco SQLite in-memory para isolamento total entre testes.
 *
 * Execucao: node test/unit.test.js
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

// ============================================================
// TEST SUITE: ProjectService Unit Tests
// ============================================================
async function testProjectService(db) {
  console.log('\n--- Unit Test: ProjectService ---');
  const ps = new ProjectService(db);

  const project = await ps.create({ name: 'unit-test-project', description: 'Unit test' });
  assert(project.id !== undefined && project.id !== null, 'ProjectService.create returns id');
  assert(project.name === 'unit-test-project', 'ProjectService.create sets name correctly');
  assert(project.status === 'active', 'ProjectService.create defaults status to active');

  const minimalProject = await ps.create({ name: 'minimal-project' });
  assert(minimalProject.id !== undefined, 'ProjectService.create works without description');

  const fetched = await ps.get(project.id);
  assert(fetched !== null && fetched !== undefined, 'ProjectService.get returns project');
  assert(fetched.id === project.id, 'ProjectService.get returns correct project');
  assert(fetched.name === 'unit-test-project', 'ProjectService.get preserves name');

  const notFound = await ps.get('non-existent-uuid-12345');
  assert(notFound === null || notFound === undefined, 'ProjectService.get returns null for missing ID');

  const byName = await ps.findByName('unit-test-project');
  assert(byName !== null && byName !== undefined, 'ProjectService.findByName finds project');
  assert(byName.id === project.id, 'ProjectService.findByName returns correct project');

  const byNameNotFound = await ps.findByName('does-not-exist');
  assert(byNameNotFound === null || byNameNotFound === undefined, 'ProjectService.findByName returns null for missing name');

  const allProjects = await ps.list();
  assert(Array.isArray(allProjects), 'ProjectService.list returns array');
  assert(allProjects.length >= 2, 'ProjectService.list contains created projects');

  const updated = await ps.update(project.id, { description: 'Updated description' });
  assert(updated.description === 'Updated description', 'ProjectService.update changes description');
  assert(updated.name === 'unit-test-project', 'ProjectService.update preserves name');

  const archived = await ps.update(project.id, { status: 'archived' });
  assert(archived.status === 'archived', 'ProjectService.update changes status');

  let updateError = false;
  try { await ps.update('non-existent-id', { name: 'fail' }); } catch (e) { updateError = true; }
  assert(updateError, 'ProjectService.update throws for non-existent project');

  const deleteResult = await ps.delete(minimalProject.id);
  assert(deleteResult === true, 'ProjectService.delete returns true');

  const afterDelete = await ps.get(minimalProject.id);
  assert(afterDelete === null || afterDelete === undefined, 'ProjectService.delete removes project');

  let deleteError = false;
  try { await ps.delete('non-existent-id'); } catch (e) { deleteError = true; }
  assert(deleteError, 'ProjectService.delete throws for non-existent project');

  return project;
}

// ============================================================
// TEST SUITE: ContextService Unit Tests
// ============================================================
async function testContextService(db, project) {
  console.log('\n--- Unit Test: ContextService ---');
  const cs = new ContextService(db);

  const ctx1 = await cs.create({
    projectId: project.id,
    key: 'tech-stack',
    value: 'Node.js, TypeScript, SQLite',
    category: 'architecture',
    priority: 3,
  });
  assert(ctx1.id !== undefined, 'ContextService.create returns id');
  assert(ctx1.key === 'tech-stack', 'ContextService.create sets key');
  assert(ctx1.value === 'Node.js, TypeScript, SQLite', 'ContextService.create sets value');
  assert(ctx1.category === 'architecture', 'ContextService.create sets category');
  assert(ctx1.priority === 3, 'ContextService.create sets priority');

  const ctx2 = await cs.create({ projectId: project.id, key: 'note', value: 'A simple note' });
  assert(ctx2.category === 'general', 'ContextService.create defaults category to general');
  assert(ctx2.priority === 1, 'ContextService.create defaults priority to 1');

  const ctx3 = await cs.create({
    projectId: project.id, key: 'api-design', value: 'RESTful with JSON',
    category: 'requirements', priority: 2,
    metadata: { version: '2.0', stable: true },
  });
  assert(ctx3.metadata !== null && ctx3.metadata !== undefined, 'ContextService.create accepts metadata');

  let createError = false;
  try { await cs.create({ projectId: 'non-existent-proj', key: 'fail', value: 'should fail' }); } catch (e) { createError = true; }
  assert(createError, 'ContextService.create throws for non-existent project');

  const fetched = await cs.get(ctx1.id);
  assert(fetched !== null && fetched !== undefined, 'ContextService.get returns entry');
  assert(fetched.key === 'tech-stack', 'ContextService.get returns correct entry');

  const allCtx = await cs.listByProject(project.id);
  assert(Array.isArray(allCtx), 'ContextService.listByProject returns array');
  assert(allCtx.length === 3, 'ContextService.listByProject returns all entries');

  const archOnly = await cs.listByProject(project.id, 'architecture');
  assert(archOnly.length === 1, 'ContextService.listByProject filters by category');
  assert(archOnly[0].key === 'tech-stack', 'ContextService.listByProject filter returns correct entry');

  const searchResults = await cs.search(project.id, 'TypeScript');
  assert(searchResults.length >= 1, 'ContextService.search finds matching entries');

  const searchNoMatch = await cs.search(project.id, 'xyznonexistent');
  assert(searchNoMatch.length === 0, 'ContextService.search returns empty for no match');

  const searchByKey = await cs.search(project.id, 'api-design');
  assert(searchByKey.length >= 1, 'ContextService.search works on key field');

  const updatedCtx = await cs.update(ctx1.id, { priority: 4 });
  assert(updatedCtx.priority === 4, 'ContextService.update changes priority');
  assert(updatedCtx.key === 'tech-stack', 'ContextService.update preserves key');

  const updatedValue = await cs.update(ctx2.id, { value: 'Updated note', category: 'standards' });
  assert(updatedValue.value === 'Updated note', 'ContextService.update changes value');
  assert(updatedValue.category === 'standards', 'ContextService.update changes category');

  let updateCtxError = false;
  try { await cs.update('non-existent-id', { value: 'fail' }); } catch (e) { updateCtxError = true; }
  assert(updateCtxError, 'ContextService.update throws for non-existent entry');

  const deleteCtxResult = await cs.delete(ctx3.id);
  assert(deleteCtxResult === true, 'ContextService.delete returns true');
  const afterCtxDelete = await cs.get(ctx3.id);
  assert(afterCtxDelete === null || afterCtxDelete === undefined, 'ContextService.delete removes entry');

  return { ctx1, ctx2 };
}

// ============================================================
// TEST SUITE: DecisionService Unit Tests
// ============================================================
async function testDecisionService(db, project) {
  console.log('\n--- Unit Test: DecisionService ---');
  const ds = new DecisionService(db);

  const dec1 = await ds.create({
    projectId: project.id,
    title: 'Use MCP Protocol',
    description: 'Use Model Context Protocol for AI integration',
  });
  assert(dec1.id !== undefined, 'DecisionService.create returns id');
  assert(dec1.title === 'Use MCP Protocol', 'DecisionService.create sets title');
  assert(dec1.status === 'active', 'DecisionService.create defaults status to active');

  const dec2 = await ds.create({
    projectId: project.id, title: 'Use SQLite',
    description: 'SQLite is lightweight and perfect for local storage',
    rationale: { pros: ['Lightweight', 'No server'], cons: ['Single writer'] },
  });
  assert(dec2.rationale !== null, 'DecisionService.create accepts rationale');

  const dec3 = await ds.create({
    projectId: project.id, title: 'Use TypeORM',
    description: 'TypeORM provides TypeScript-first ORM with decorators',
    alternatives: { prisma: 'Type-safe but heavier', knex: 'Query builder only' },
  });
  assert(dec3.alternatives !== null, 'DecisionService.create accepts alternatives');

  let createDecError = false;
  try { await ds.create({ projectId: 'non-existent-proj', title: 'Fail', description: 'Should fail' }); } catch (e) { createDecError = true; }
  assert(createDecError, 'DecisionService.create throws for non-existent project');

  const fetchedDec = await ds.get(dec1.id);
  assert(fetchedDec !== null && fetchedDec !== undefined, 'DecisionService.get returns decision');
  assert(fetchedDec.title === 'Use MCP Protocol', 'DecisionService.get returns correct decision');

  const allDecs = await ds.listByProject(project.id);
  assert(Array.isArray(allDecs), 'DecisionService.listByProject returns array');
  assert(allDecs.length === 3, 'DecisionService.listByProject returns all decisions');

  const updatedDec = await ds.update(dec1.id, { status: 'deprecated' });
  assert(updatedDec.status === 'deprecated', 'DecisionService.update changes status');
  assert(updatedDec.title === 'Use MCP Protocol', 'DecisionService.update preserves title');

  const renamedDec = await ds.update(dec2.id, { title: 'Use SQLite (Confirmed)' });
  assert(renamedDec.title === 'Use SQLite (Confirmed)', 'DecisionService.update changes title');

  let updateDecError = false;
  try { await ds.update('non-existent-id', { status: 'active' }); } catch (e) { updateDecError = true; }
  assert(updateDecError, 'DecisionService.update throws for non-existent decision');

  const deleteDecResult = await ds.delete(dec3.id);
  assert(deleteDecResult === true, 'DecisionService.delete returns true');
  const afterDecDelete = await ds.get(dec3.id);
  assert(afterDecDelete === null || afterDecDelete === undefined, 'DecisionService.delete removes decision');

  return { dec1, dec2 };
}

// ============================================================
// TEST SUITE: Export Unit Tests
// ============================================================
async function testExport(db, project) {
  console.log('\n--- Unit Test: Export Functions ---');
  const ps = new ProjectService(db);
  const full = await ps.get(project.id);
  if (!full) { assert(false, 'Export: project not found'); return; }

  const jsonStr = exportProject(full, 'json');
  assert(typeof jsonStr === 'string', 'exportProject(json) returns string');
  const parsed = JSON.parse(jsonStr);
  assert(parsed.project !== undefined, 'JSON export contains project field');
  assert(parsed.project.name === 'unit-test-project', 'JSON export correct name');
  assert(Array.isArray(parsed.contexts), 'JSON export has contexts array');
  assert(Array.isArray(parsed.decisions), 'JSON export has decisions array');

  const md = exportProject(full, 'markdown');
  assert(typeof md === 'string', 'exportProject(markdown) returns string');
  assert(md.includes('# unit-test-project'), 'Markdown has heading');
  assert(md.includes('tech-stack'), 'Markdown has context key');

  const plain = exportProject(full, 'plain');
  assert(plain.toUpperCase().includes('UNIT-TEST-PROJECT'), 'Plain has name uppercase');

  const copilot = exportProject(full, 'copilot');
  assert(copilot.includes('tech-stack'), 'Copilot has context');

  const claude = exportProject(full, 'claude');
  assert(claude.includes('tech-stack'), 'Claude has context');

  const cursor = exportProject(full, 'cursor');
  assert(cursor.includes('tech-stack'), 'Cursor has context');

  assert(getExportFilename('copilot', 'test') === '.github/copilot-instructions.md', 'Copilot filename');
  assert(getExportFilename('claude', 'test') === 'CLAUDE.md', 'Claude filename');
  assert(getExportFilename('cursor', 'test') === '.cursorrules', 'Cursor filename');
  assert(getExportFilename('json', 'my-project') === 'my-project-context.json', 'JSON filename');
  assert(getExportFilename('markdown', 'my-project') === 'my-project-context.md', 'Markdown filename');
  assert(getExportFilename('plain', 'my-project') === 'my-project-context.txt', 'Plain filename');
}

// ============================================================
// TEST SUITE: Edge Cases
// ============================================================
async function testEdgeCases(db) {
  console.log('\n--- Unit Test: Edge Cases ---');
  const ps = new ProjectService(db);
  const cs = new ContextService(db);
  const ds = new DecisionService(db);

  const emptyProject = await ps.create({ name: 'empty-project' });
  const emptyCtx = await cs.listByProject(emptyProject.id);
  assert(emptyCtx.length === 0, 'Empty project has no context entries');
  const emptyDecs = await ds.listByProject(emptyProject.id);
  assert(emptyDecs.length === 0, 'Empty project has no decisions');
  const emptySearch = await cs.search(emptyProject.id, 'anything');
  assert(emptySearch.length === 0, 'Search on empty project returns empty');

  const specialProject = await ps.create({ name: 'project-with-special_chars.v2' });
  assert(specialProject.name === 'project-with-special_chars.v2', 'Project name supports special chars');

  const seqProject = await ps.create({ name: 'sequential-updates' });
  await ps.update(seqProject.id, { description: 'First update' });
  await ps.update(seqProject.id, { description: 'Second update' });
  const final = await ps.get(seqProject.id);
  assert(final.description === 'Second update', 'Sequential updates apply correctly');

  await ps.delete(emptyProject.id);
  await ps.delete(specialProject.id);
  await ps.delete(seqProject.id);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('\n========================================');
  console.log('  ThinkCoffee Unit Tests');
  console.log('========================================\n');

  let db;
  try {
    db = await getDatabase({ dbPath: ':memory:' });
    assert(db.isInitialized, 'Database initializes successfully');

    const project = await testProjectService(db);
    await testContextService(db, project);
    await testDecisionService(db, project);
    await testExport(db, project);
    await testEdgeCases(db);
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
