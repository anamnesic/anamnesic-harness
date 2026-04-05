import crypto from 'crypto';

export class CryptoUtils {
  /**
   * Generate a secure API key (32 bytes = 64 hex chars)
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash an API key for storage
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Verify an API key against its hash
   */
  static verifyApiKey(apiKey: string, keyHash: string): boolean {
    const hash = this.hashApiKey(apiKey);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(keyHash));
  }
}