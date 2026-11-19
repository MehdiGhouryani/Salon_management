import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { config } from '../../config.ts';

const VERSION = 'v1';
const AAD = Buffer.from('nobatara:platform-integrations:v1', 'utf8');

/**
 * Derive a purpose-specific AES key from the already-required server session
 * secret. This avoids adding another deployment secret. Keep SESSION_SECRET
 * stable: rotating it requires credentials to be entered again in the admin UI.
 */
function encryptionKey(): Buffer {
  return createHmac('sha256', config.auth.sessionSecret)
    .update('nobatara:platform-integrations:encryption-key:v1', 'utf8')
    .digest();
}

export function encryptIntegrationConfig(value: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptIntegrationConfig(payload: string): Record<string, unknown> {
  const [version, ivText, tagText, encryptedText, extra] = String(payload || '').split('.');
  if (version !== VERSION || !ivText || !tagText || !encryptedText || extra !== undefined) {
    throw new Error('Unsupported or malformed platform integration secret payload.');
  }

  try {
    const iv = Buffer.from(ivText, 'base64url');
    const tag = Buffer.from(tagText, 'base64url');
    const encrypted = Buffer.from(encryptedText, 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
      throw new Error('Invalid encrypted integration payload length.');
    }

    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed: unknown = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Decrypted integration configuration is not an object.');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('Unable to decrypt platform integration settings. Re-enter the affected credentials.');
  }
}
