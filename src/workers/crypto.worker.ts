const ITERATIONS = 100000;
const HASH = 'SHA-256';

const keyCache = new Map<string, CryptoKey>();

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltHex = bufferToHex(salt.buffer);
  const cacheKey = `${pin}:${saltHex}`;

  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const enc = new TextEncoder();
  const keyMaterial = await self.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derivedKey = await self.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, action, data, pin } = e.data;

  try {
    if (action === 'encrypt') {
      const salt = self.crypto.getRandomValues(new Uint8Array(16));
      const iv = self.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(pin, salt);

      const enc = new TextEncoder();
      const encryptedBuf = await self.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(data)
      );

      const resultPayload = new Uint8Array(
        salt.length + iv.length + encryptedBuf.byteLength
      );
      resultPayload.set(salt, 0);
      resultPayload.set(iv, salt.length);
      resultPayload.set(new Uint8Array(encryptedBuf), salt.length + iv.length);

      self.postMessage({ id, success: true, result: bufferToHex(resultPayload.buffer) });
    } else if (action === 'decrypt') {
      const rawBuffer = hexToBuffer(data);
      const salt = rawBuffer.slice(0, 16);
      const iv = rawBuffer.slice(16, 28);
      const ciphertextBuf = rawBuffer.slice(28);

      const key = await deriveKey(pin, new Uint8Array(salt));
      const decryptedBuf = await self.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        ciphertextBuf
      );

      const dec = new TextDecoder();
      self.postMessage({ id, success: true, result: dec.decode(decryptedBuf) });
    }
  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
