import fs from 'fs';
import path from 'path';

// ─── Code Connection Map ─────────────────────────────────────
//
// Builds a dependency graph of the workspace by scanning:
// - import/export statements (ESM)
// - require() calls (CJS)
// - dynamic import() calls
//
// Returns a human-readable map that an AI agent can use to
// identify orphan files, unused exports, and dead code.

interface FileNode {
  /** Relative path from workspace root */
  filePath: string;
  /** Files this file imports FROM */
  imports: string[];
  /** Named exports declared in this file */
  exports: string[];
  /** Number of lines */
  lines: number;
}

interface CodeMapResult {
  /** Total files scanned */
  totalFiles: number;
  /** Files with zero inbound connections (nobody imports them) */
  orphans: string[];
  /** The full graph as a readable string */
  mapText: string;
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.vue', '.svelte',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next',
  '.nuxt', 'coverage', '.Kairos', '.vscode',
]);

const ENTRYPOINT_PATTERNS = [
  /^index\.[jt]sx?$/,
  /^main\.[jt]sx?$/,
  /^app\.[jt]sx?$/,
  /^server\.[jt]sx?$/,
  /vite\.config/,
  /webpack\.config/,
  /tailwind\.config/,
  /postcss\.config/,
  /tsconfig/,
  /package\.json$/,
  /\.config\.[jt]s$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.d\.ts$/,
];

/** Walk directory recursively, collecting code files */
function collectFiles(dir: string, rootDir: string, files: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        collectFiles(path.join(dir, entry.name), rootDir, files);
      }
    } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.relative(rootDir, path.join(dir, entry.name)).replace(/\\/g, '/'));
    }
  }
}

/** Extract import sources from file content */
function extractImports(content: string): string[] {
  const sources: string[] = [];

  // ESM: import ... from 'source'  /  import 'source'
  const esmRe = /(?:import\s+(?:[\s\S]*?\s+from\s+)?['"])(\.{1,2}\/[^'"]+)(?:['"])/g;
  let m: RegExpExecArray | null;
  while ((m = esmRe.exec(content)) !== null) {
    sources.push(m[1]);
  }

  // CJS: require('source')
  const cjsRe = /require\s*\(\s*['"](\.\S{1,2}\/[^'"]+)['"]\s*\)/g;
  while ((m = cjsRe.exec(content)) !== null) {
    sources.push(m[1]);
  }

  // Dynamic: import('source')
  const dynRe = /import\s*\(\s*['"](\.\S{1,2}\/[^'"]+)['"]\s*\)/g;
  while ((m = dynRe.exec(content)) !== null) {
    sources.push(m[1]);
  }

  return sources;
}

/** Extract export names from file content */
function extractExports(content: string): string[] {
  const names: string[] = [];

  // export function/class/const/let/var/type/interface NAME
  const namedRe = /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?\s+|class\s+|const\s+|let\s+|var\s+|type\s+|interface\s+|enum\s+)(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(content)) !== null) {
    names.push(m[1]);
  }

  // export { a, b, c }
  const braceRe = /export\s*\{([^}]+)\}/g;
  while ((m = braceRe.exec(content)) !== null) {
    const inner = m[1];
    for (const part of inner.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name && name !== 'default') names.push(name);
    }
  }

  // export default ...
  if (/export\s+default\b/.test(content)) {
    names.push('default');
  }

  // export * from '...' (re-export)
  if (/export\s+\*\s+from/.test(content)) {
    names.push('*re-export*');
  }

  return [...new Set(names)];
}

/** Resolve an import path to a file path relative to workspace root */
function resolveImport(fromFile: string, importSource: string, allFiles: Set<string>): string | null {
  const dir = path.dirname(fromFile);
  const raw = path.posix.join(dir, importSource);

  // Try exact, then with extensions, then /index
  const candidates = [
    raw,
    ...Array.from(CODE_EXTENSIONS).map(ext => raw + ext),
    ...Array.from(CODE_EXTENSIONS).map(ext => raw + '/index' + ext),
  ];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, '/');
    if (allFiles.has(normalized)) return normalized;
  }
  return null;
}

/** Check if a file is an entrypoint (should not be flagged as orphan) */
function isEntrypoint(filePath: string): boolean {
  const base = path.basename(filePath);
  return ENTRYPOINT_PATTERNS.some(re => re.test(base));
}

/**
 * Build a code connection map for the workspace.
 * Returns a structured result the dead-code agent can consume.
 */
export function buildCodeMap(workspace: string): CodeMapResult {
  const files: string[] = [];
  collectFiles(workspace, workspace, files);
  const fileSet = new Set(files);

  const nodes = new Map<string, FileNode>();
  // Track which files are imported by someone (have inbound connections)
  const importedBy = new Map<string, Set<string>>();

  // Initialize all nodes
  for (const f of files) {
    importedBy.set(f, new Set());
  }

  // Parse each file
  for (const filePath of files) {
    const fullPath = path.join(workspace, filePath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const lineCount = content.split('\n').length;
    const rawImports = extractImports(content);
    const exports = extractExports(content);

    const resolvedImports: string[] = [];
    for (const src of rawImports) {
      const resolved = resolveImport(filePath, src, fileSet);
      if (resolved) {
        resolvedImports.push(resolved);
        // Track inbound connection
        const set = importedBy.get(resolved) || new Set();
        set.add(filePath);
        importedBy.set(resolved, set);
      }
    }

    nodes.set(filePath, {
      filePath,
      imports: resolvedImports,
      exports,
      lines: lineCount,
    });
  }

  // Identify orphans: files with zero inbound connections that aren't entrypoints
  const orphans: string[] = [];
  for (const [filePath, inbound] of importedBy) {
    if (inbound.size === 0 && !isEntrypoint(filePath)) {
      orphans.push(filePath);
    }
  }
  orphans.sort();

  // Build readable map
  const lines: string[] = [];
  lines.push(`# CODE CONNECTION MAP`);
  lines.push(`Total files: ${files.length}`);
  lines.push(`Orphan files (zero inbound imports): ${orphans.length}`);
  lines.push('');

  // Section 1: Orphans
  if (orphans.length > 0) {
    lines.push('## ORPHAN FILES (candidates for deletion)');
    for (const o of orphans) {
      const node = nodes.get(o);
      const exportCount = node?.exports.length || 0;
      const lineCount = node?.lines || 0;
      lines.push(`  - ${o} (${lineCount} lines, ${exportCount} exports, 0 importers)`);
    }
    lines.push('');
  }

  // Section 2: Dependency graph
  lines.push('## DEPENDENCY GRAPH');
  const sorted = [...nodes.values()].sort((a, b) => a.filePath.localeCompare(b.filePath));
  for (const node of sorted) {
    const inbound = importedBy.get(node.filePath);
    const inCount = inbound?.size || 0;
    const tag = inCount === 0 && !isEntrypoint(node.filePath) ? ' [ORPHAN]' : '';
    lines.push(`${node.filePath} (${node.lines}L)${tag}`);
    if (node.imports.length > 0) {
      lines.push(`  imports: ${node.imports.join(', ')}`);
    }
    if (node.exports.length > 0) {
      lines.push(`  exports: ${node.exports.join(', ')}`);
    }
    if (inCount > 0) {
      lines.push(`  imported by: ${[...inbound!].join(', ')}`);
    }
  }

  return {
    totalFiles: files.length,
    orphans,
    mapText: lines.join('\n'),
  };
}
