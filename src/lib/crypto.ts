// AES-GCM Client-Side Encryption for Zero-Knowledge Architecture
// The server never sees the decryption key - it's only in the URL fragment

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64 (auth tag is appended in some implementations)
}

/**
 * Generate a random 6-digit code for retrieval
 */
export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Derive an encryption key from the 6-digit code and a random salt
 * This creates a unique key per clipboard entry
 */
export async function deriveKey(
  code: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const codeData = encoder.encode(code);

  // Import the code as a base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    codeData,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive an AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-GCM
 * Returns the encrypted data and the salt used for key derivation
 */
export async function encryptData(
  plaintext: string,
  code: string
): Promise<{ encrypted: EncryptedData; salt: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key
  const key = await deriveKey(code, salt);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Convert to base64 for storage/transmission
  return {
    encrypted: {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      tag: "", // GCM auth tag is included in ciphertext
    },
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encrypted: EncryptedData,
  code: string,
  saltBase64: string
): Promise<string> {
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

  // Derive the same key
  const key = await deriveKey(code, new Uint8Array(salt));

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext)
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a magic link with the decryption key in the URL fragment
 * The fragment is never sent to the server (browser-only)
 */
export function generateMagicLink(
  baseUrl: string,
  code: string,
  salt: string
): string {
  // The fragment (#) is never sent to the server - perfect for zero-knowledge
  const fragment = btoa(JSON.stringify({ code, salt }));
  return `${baseUrl}/retrieve/${code}#${fragment}`;
}

/**
 * Parse the magic link fragment to extract decryption parameters
 */
export function parseMagicLinkFragment(
  fragment: string
): { code: string; salt: string } | null {
  try {
    const decoded = atob(fragment);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
