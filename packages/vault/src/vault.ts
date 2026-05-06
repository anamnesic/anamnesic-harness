import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from 'node:fs'
import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  access,
} from 'node:fs/promises'
import path from 'node:path'
import { encrypt, decrypt, type VaultRecord } from './cipher'

const EXT = '.enc'

function resolveVaultDir(): string {
  return path.join(process.cwd(), 'data', 'vault')
}

function getKey(): Buffer {
  const raw = process.env['KAIROS_VAULT_KEY']
  if (!raw) {
    if (process.env['KAIROS_VAULT_ALLOW_PLAINTEXT'] === '1') return Buffer.alloc(0)
    throw new Error(
      'KAIROS_VAULT_KEY is not set. Generate one with: pnpm vault:init\n' +
        'For local dev without encryption, set KAIROS_VAULT_ALLOW_PLAINTEXT=1',
    )
  }
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32)
    throw new Error('KAIROS_VAULT_KEY must be a 64-char hex string (32 bytes)')
  return key
}

function encPath(vaultDir: string, relPath: string): string {
  const resolved = path.resolve(vaultDir, relPath + EXT)
  if (!resolved.startsWith(path.resolve(vaultDir)))
    throw new Error(`Path traversal attempt: ${relPath}`)
  return resolved
}

// ── Sync API ───────────────────────────────────────────────────────────────

export function vaultReadSync(relPath: string): string {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainPath = path.join(process.cwd(), 'data', relPath)
    return readFileSync(plainPath, 'utf-8')
  }
  const raw = readFileSync(encPath(vaultDir, relPath), 'utf-8')
  return decrypt(JSON.parse(raw) as VaultRecord, key)
}

export function vaultWriteSync(relPath: string, content: string): void {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainPath = path.join(process.cwd(), 'data', relPath)
    mkdirSync(path.dirname(plainPath), { recursive: true })
    writeFileSync(plainPath, content, 'utf-8')
    return
  }
  const dest = encPath(vaultDir, relPath)
  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify(encrypt(content, key)))
}

export function vaultReadJsonSync<T>(relPath: string): T {
  return JSON.parse(vaultReadSync(relPath)) as T
}

export function vaultWriteJsonSync(relPath: string, data: unknown): void {
  vaultWriteSync(relPath, JSON.stringify(data, null, 2))
}

export function vaultReaddirSync(relPrefix: string): string[] {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainDir = path.join(process.cwd(), 'data', relPrefix)
    return collectFiles(plainDir).map((f) => path.relative(plainDir, f))
  }
  const dir = path.join(vaultDir, relPrefix)
  if (!existsSync(dir)) return []
  return collectFiles(dir)
    .filter((f) => f.endsWith(EXT))
    .map((f) => path.relative(dir, f).slice(0, -EXT.length))
}

function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else out.push(full)
  }
  return out
}

// ── Async API ──────────────────────────────────────────────────────────────

export async function vaultRead(relPath: string): Promise<string> {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainPath = path.join(process.cwd(), 'data', relPath)
    return readFile(plainPath, 'utf-8')
  }
  const raw = await readFile(encPath(vaultDir, relPath), 'utf-8')
  return decrypt(JSON.parse(raw) as VaultRecord, key)
}

export async function vaultWrite(relPath: string, content: string): Promise<void> {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainPath = path.join(process.cwd(), 'data', relPath)
    await mkdir(path.dirname(plainPath), { recursive: true })
    await writeFile(plainPath, content, 'utf-8')
    return
  }
  const dest = encPath(vaultDir, relPath)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, JSON.stringify(encrypt(content, key)))
}

export async function vaultReadJson<T>(relPath: string): Promise<T> {
  return JSON.parse(await vaultRead(relPath)) as T
}

export async function vaultWriteJson(relPath: string, data: unknown): Promise<void> {
  await vaultWrite(relPath, JSON.stringify(data, null, 2))
}

export async function vaultReaddir(relPrefix: string): Promise<string[]> {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    const plainDir = path.join(process.cwd(), 'data', relPrefix)
    return collectFilesAsync(plainDir).then((files) =>
      files.map((f) => path.relative(plainDir, f)),
    )
  }
  const dir = path.join(vaultDir, relPrefix)
  const accessible = await access(dir).then(() => true).catch(() => false)
  if (!accessible) return []
  return collectFilesAsync(dir).then((files) =>
    files
      .filter((f) => f.endsWith(EXT))
      .map((f) => path.relative(dir, f).slice(0, -EXT.length)),
  )
}

export async function vaultExists(relPath: string): Promise<boolean> {
  const vaultDir = resolveVaultDir()
  const key = getKey()
  if (key.length === 0) {
    return access(path.join(process.cwd(), 'data', relPath)).then(() => true).catch(() => false)
  }
  return access(encPath(vaultDir, relPath)).then(() => true).catch(() => false)
}

// ── Abs-path helpers (for callers that use absolute data/ paths) ───────────

/** Returns the absolute path to the vault directory (data/vault). */
export function vaultDataDir(): string {
  return resolveVaultDir()
}

/**
 * Reads and decrypts a file given its absolute `.enc` path.
 * Use this after a readdir on the vault directory.
 */
export async function vaultReadEnc(absEncPath: string): Promise<string> {
  const key = getKey()
  if (key.length === 0) return readFile(absEncPath.replace(/\.enc$/, ''), 'utf-8')
  const raw = await readFile(absEncPath, 'utf-8')
  return decrypt(JSON.parse(raw) as VaultRecord, key)
}

/**
 * Appends a line to an encrypted JSONL file.
 * Reads the existing content, appends, then re-encrypts the whole file.
 */
export async function vaultAppend(relPath: string, line: string): Promise<void> {
  const existing = await vaultExists(relPath)
    ? await vaultRead(relPath).catch(() => '')
    : ''
  await vaultWrite(relPath, existing + line + '\n')
}

async function collectFilesAsync(dir: string): Promise<string[]> {
  const accessible = await access(dir).then(() => true).catch(() => false)
  if (!accessible) return []
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await collectFilesAsync(full))
    else out.push(full)
  }
  return out
}
