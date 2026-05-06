#!/usr/bin/env bun
/**
 * vault-init: generates a KAIROS_VAULT_KEY and guides the user to store it safely.
 */
import { randomBytes } from 'node:crypto'

const key = randomBytes(32).toString('hex')

console.log('\n🔐 Kairos Vault — Key Generation\n')
console.log('Generated a new 256-bit encryption key:\n')
console.log(`  KAIROS_VAULT_KEY=${key}\n`)
console.log('Add this to your environment (DO NOT commit this to git):\n')
console.log('  1. .env.local (gitignored):')
console.log(`     echo 'KAIROS_VAULT_KEY=${key}' >> .env.local\n`)
console.log('  2. Or your secrets manager / CI environment variables.\n')
console.log('⚠️  Store this key safely. Without it, encrypted data cannot be recovered.\n')
