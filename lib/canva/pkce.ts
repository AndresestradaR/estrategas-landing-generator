import crypto from 'crypto'

/**
 * Generate a cryptographically random code verifier for PKCE
 * Must be between 43-128 characters, using unreserved URI characters
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes and encode as base64url
  const buffer = crypto.randomBytes(32)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate the code challenge from the code verifier using SHA-256
 * This is the S256 method required by Canva
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Canva OAuth configuration
export const CANVA_CONFIG = {
  authorizationEndpoint: 'https://www.canva.com/api/oauth/authorize',
  tokenEndpoint: 'https://api.canva.com/rest/v1/oauth/token',
  assetUploadEndpoint: 'https://api.canva.com/rest/v1/asset-uploads',
  designEndpoint: 'https://api.canva.com/rest/v1/designs',
  scopes: [
    'asset:write',
    'design:content:write',
    'design:meta:read',
  ].join(' '),
}
