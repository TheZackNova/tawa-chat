let worker: Worker | null = null;
let messageIdCounter = 0;
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/crypto.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      const deferred = pendingRequests.get(id);
      if (deferred) {
        if (success) deferred.resolve(result);
        else deferred.reject(new Error(error));
        pendingRequests.delete(id);
      }
    };
  }
  return worker;
}

export async function encryptDataAsync(data: string, pin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter;
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ id, action: 'encrypt', data, pin });
  });
}

export async function decryptDataAsync(ciphertextHex: string, pin: string): Promise<string | null> {
  return new Promise((resolve) => {
    const id = ++messageIdCounter;
    pendingRequests.set(id, { resolve, reject: () => resolve(null) });
    getWorker().postMessage({ id, action: 'decrypt', data: ciphertextHex, pin });
  });
}

// Legacy polyfills to avoid immediately breaking synchronous store code before full migration
import CryptoJS from 'crypto-js';
const LEGACY_SALT = 'gemini-clone-salt-2026';

export function encryptData(data: string, pin: string): string {
  return CryptoJS.AES.encrypt(data, pin + LEGACY_SALT).toString();
}

export function decryptData(ciphertext: string, pin: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, pin + LEGACY_SALT);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (e) {
    return null;
  }
}
