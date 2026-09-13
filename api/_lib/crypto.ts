import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';
const SALT_LENGTH = 32;

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns `salt:hash` (both hex-encoded).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a stored `salt:hash` string.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(hashHex, 'hex');
  const candidateHash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  if (storedHash.length !== candidateHash.length) return false;
  return timingSafeEqual(storedHash, candidateHash);
}

/**
 * Generate a cryptographically secure 48-byte hex session token.
 */
export function generateSessionToken(): string {
  return randomBytes(48).toString('hex');
}

/**
 * Generate a secure ID with a given prefix, e.g. `usr_a1b2c3d4...`.
 */
export function generateSecureId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}
