import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export interface VaultRecord {
  v: 1
  alg: 'aes-256-gcm'
  kid: string
  iv: string
  tag: string
  data: string
}

export function encrypt(plaintext: string, key: Buffer, kid = 'default'): VaultRecord {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    v: 1,
    alg: 'aes-256-gcm',
    kid,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: encrypted.toString('base64'),
  }
}

export function decrypt(record: VaultRecord, key: Buffer): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.iv, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(record.tag, 'hex'))
  return decipher.update(record.data, 'base64', 'utf8') + decipher.final('utf8')
}
