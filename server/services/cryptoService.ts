import crypto from 'crypto';

// Master encryption key derived from environment secret or fallback key
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || process.env.CRON_SECRET || 'dueflow-master-secret-key-2026-production';
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(ENCRYPTION_SECRET, 'dueflow-salt-salt', 32);

/**
 * Encrypts sensitive string (e.g. OAuth tokens) at rest using AES-256-GCM.
 * Output format: iv_hex:auth_tag_hex:cipher_hex
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive token from cipher string format.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Legacy unencrypted or plain string fallback
      return encryptedData;
    }
    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CryptoService] Decryption failed:', err);
    return '';
  }
}
