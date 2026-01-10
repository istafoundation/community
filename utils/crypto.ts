/**
 * End-to-End Encryption utilities using TweetNaCl
 * 
 * Uses X25519 for key exchange and XSalsa20-Poly1305 for symmetric encryption.
 * Private keys are stored in SecureStore (device-only, no cloud backup).
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import {
  decodeBase64,
  encodeBase64,
  decodeUTF8,
  encodeUTF8,
} from 'tweetnacl-util';

// Setup PRNG for TweetNaCl using expo-crypto
// This is required for React Native environments
nacl.setPRNG((x: Uint8Array, n: number) => {
  // Generate random bytes synchronously using expo-crypto
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

// SecureStore keys
const PRIVATE_KEY_STORE_KEY = 'e2e_private_key';
const PUBLIC_KEY_STORE_KEY = 'e2e_public_key';

export interface KeyPair {
  publicKey: string; // Base64 encoded
  secretKey: string; // Base64 encoded
}

/**
 * Generate a new X25519 key pair
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Get existing key pair from SecureStore, or generate and store a new one
 */
export async function getOrCreateKeyPair(): Promise<KeyPair> {
  try {
    const existingPrivateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORE_KEY);
    const existingPublicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORE_KEY);

    if (existingPrivateKey && existingPublicKey) {
      return {
        publicKey: existingPublicKey,
        secretKey: existingPrivateKey,
      };
    }

    // Generate new key pair
    const keyPair = generateKeyPair();

    // Store in SecureStore
    await SecureStore.setItemAsync(PRIVATE_KEY_STORE_KEY, keyPair.secretKey);
    await SecureStore.setItemAsync(PUBLIC_KEY_STORE_KEY, keyPair.publicKey);

    console.log('[E2E] Generated and stored new key pair');
    return keyPair;
  } catch (error) {
    console.error('[E2E] Error getting/creating key pair:', error);
    throw error;
  }
}

/**
 * Get the current user's public key (for sharing with others)
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUBLIC_KEY_STORE_KEY);
  } catch (error) {
    console.error('[E2E] Error getting public key:', error);
    return null;
  }
}

/**
 * Encrypt a message for a recipient using their public key
 * Uses NaCl box (X25519 + XSalsa20-Poly1305)
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderSecretKey: string
): { ciphertext: string; nonce: string } {
  try {
    const messageBytes = decodeUTF8(plaintext);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const recipientPubKeyBytes = decodeBase64(recipientPublicKey);
    const senderSecKeyBytes = decodeBase64(senderSecretKey);

    const encrypted = nacl.box(
      messageBytes,
      nonce,
      recipientPubKeyBytes,
      senderSecKeyBytes
    );

    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
    };
  } catch (error) {
    console.error('[E2E] Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message from a sender using their public key
 */
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string | null {
  try {
    const ciphertextBytes = decodeBase64(ciphertext);
    const nonceBytes = decodeBase64(nonce);
    const senderPubKeyBytes = decodeBase64(senderPublicKey);
    const recipientSecKeyBytes = decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(
      ciphertextBytes,
      nonceBytes,
      senderPubKeyBytes,
      recipientSecKeyBytes
    );

    if (!decrypted) {
      console.error('[E2E] Decryption failed - authentication error');
      return null;
    }

    return encodeUTF8(decrypted);
  } catch (error) {
    console.error('[E2E] Decryption error:', error);
    return null;
  }
}

/**
 * Encrypt push notification content
 * Returns encrypted title and body that can only be read by the recipient
 */
export function encryptPushNotification(
  title: string,
  body: string,
  recipientPublicKey: string,
  senderSecretKey: string
): { encryptedTitle: string; encryptedBody: string; nonce: string } {
  // Combine title and body with separator
  const combined = JSON.stringify({ title, body });
  const { ciphertext, nonce } = encryptMessage(
    combined,
    recipientPublicKey,
    senderSecretKey
  );

  return {
    encryptedTitle: ciphertext,
    encryptedBody: '', // All content in encryptedTitle
    nonce,
  };
}

/**
 * Decrypt push notification content
 */
export function decryptPushNotification(
  encryptedContent: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): { title: string; body: string } | null {
  const decrypted = decryptMessage(
    encryptedContent,
    nonce,
    senderPublicKey,
    recipientSecretKey
  );

  if (!decrypted) return null;

  try {
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Check if E2E encryption is available (keys exist)
 */
export async function isE2EAvailable(): Promise<boolean> {
  const publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORE_KEY);
  const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORE_KEY);
  return !!(publicKey && privateKey);
}

/**
 * Clear all encryption keys (for logout/account deletion)
 * WARNING: This will make all encrypted messages unreadable!
 */
export async function clearEncryptionKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(PRIVATE_KEY_STORE_KEY);
  await SecureStore.deleteItemAsync(PUBLIC_KEY_STORE_KEY);
  console.log('[E2E] Encryption keys cleared');
}
