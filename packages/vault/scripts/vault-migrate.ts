#!/usr/bin/env bun
/**
 * vault-migrate: encrypts all plaintext sensitive data files into data/vault/
 * Run this once after setting KAIROS_VAULT_KEY.
 *
 * Usage:
 *   KAIROS_VAULT_KEY=<hex> bun run packages/vault/scripts/vault-migrate.ts
 *
 * What it migrates:
 *   data/emails.json            → data/vault/emails.json.enc
 *   data/email-sync-meta.json   → data/vault/email-sync-meta.json.enc
 *   data/skills/**              → data/vault/skills/**
 *   data/proactive/**           → data/vault/proactive/**
 *   data/self-optimization/**   → data/vault/self-optimization/**
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { encrypt } from '../src/cipher.js'

const rawKey = process.env['KAIROS_VAULT_KEY']
if (!rawKey) {
  console.error('❌  KAIROS_VAULT_KEY is not set. Run: pnpm vault:init')
  process.exit(1)
}
const key = Buffer.from(rawKey, 'hex')
if (key.length !== 32) {
  console.error('❌  KAIROS_VAULT_KEY must be a 64-char hex string (32 bytes)')
  process.exit(1)
}

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'data')
const VAULT_DIR = path.join(DATA_DIR, 'vault')

const TARGETS = [
  'emails.json',
  'email-sync-meta.json',
  'skills',
  'proactive',
  'self-optimization',
]

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

function encryptFile(src: string, destRel: string) {
  const content = readFileSync(src, 'utf-8')
  const record = encrypt(content, key)
  const dest = path.join(VAULT_DIR, destRel + '.enc')
  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify(record))
  console.log(`  ✅  ${destRel}`)
}

let total = 0

for (const target of TARGETS) {
  const srcPath = path.join(DATA_DIR, target)
  if (!existsSync(srcPath)) continue

  if (statSync(srcPath).isDirectory()) {
    const files = collectFiles(srcPath)
    for (const file of files) {
      const rel = path.relative(DATA_DIR, file)
      encryptFile(file, rel)
      total++
    }
  } else {
    encryptFile(srcPath, target)
    total++
  }
}

console.log(`\n🔒  ${total} file(s) encrypted to data/vault/`)
console.log('\nNext steps:')
console.log('  1. Verify encrypted files look correct in data/vault/')
console.log('  2. Add plaintext paths to .gitignore (already done if you ran this from the repo)')
console.log('  3. Remove plaintext files from git tracking:')
console.log('       git rm --cached data/emails.json data/email-sync-meta.json')
console.log('       git rm --cached -r data/skills/ data/proactive/ data/self-optimization/')
console.log('  4. ⚠️  Git history still contains plaintext. Use git filter-repo to purge:')
console.log('       pip install git-filter-repo')
console.log('       git filter-repo --path data/emails.json --invert-paths')
console.log('       git filter-repo --path data/skills --invert-paths')
console.log('  5. Commit: git add data/vault/ && git commit -m "chore: encrypt sensitive data"')
