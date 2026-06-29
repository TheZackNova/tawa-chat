import Dexie, { Table } from 'dexie';
import { encryptDataAsync, decryptDataAsync } from './crypto';
import { v4 as uuidv4 } from 'uuid';

// Types for DB
export interface SerializedAttachment {
  name: string;
  type: string;
  blobId: string; // Reference to a blob in the blobs table
}

export interface DbMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string; // Encrypted if pin is set
  attachments?: SerializedAttachment[]; // Arrays of blob references
  variants?: string[]; // Encrypted
  currentVariantIndex?: number;
  timestamp: number;
  ttft?: number;
  isHidden?: boolean;
  tokens?: number;
  cost?: number;
}

export interface DbSession {
  id: string;
  title: string; // Encrypted
  updatedAt: number;
  folderId?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface DbBlob {
  id: string;
  data: Blob; // The actual file blob
}

export interface DbSettings {
  id: string; // always 'app_settings'
  encryptedData: string; // Encrypted settings JSON
}

// Memory System Interfaces
export interface DbMemory {
  id: string;
  type: 'fact' | 'preference' | 'decision' | 'skill' | 'context';
  content: string; // Encrypted
  embedding?: number[]; 
  source: {
    sessionId?: string;
    messageId?: string;
    timestamp: number;
  };
  importance: number; // 0-10
  accessCount: number;
  lastAccessedAt: number;
  expiresAt?: number;
  tags?: string[];
  createdAt: number;
}

export interface DbUserProfile {
  id: string; // Always 'user_profile'
  name?: string; // Encrypted
  preferences: Record<string, string>; // Encrypted as a JSON string
  expertise: string[]; // Encrypted string array
  recentTopics: string[]; // Encrypted string array
  timezone?: string;
}

export interface DbChatFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface DbSessionSummary {
  sessionId: string;
  summary: string; // Encrypted
  keyDecisions: string[]; // Encrypted
  todos: string[]; // Encrypted
  generatedAt: number;
}

export interface DbPinnedKnowledge {
  id: string;
  content: string; // Encrypted
  createdAt: number;
}

// Phase 3: Graph & Background
export interface DbGraphTriple {
  id: string;
  hash?: string;
  subject: string; // Encrypted
  predicate: string; // Encrypted
  object: string; // Encrypted
  createdAt: number;
}

export interface DbBackgroundTask {
  id: string;
  sessionId: string;
  agentRole: string; // 'researcher', 'coder'
  taskDescription: string; // Encrypted
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string; // Encrypted
  createdAt: number;
}

export class TawaChatDB extends Dexie {
  sessions!: Table<DbSession, string>;
  messages!: Table<DbMessage, string>;
  blobs!: Table<DbBlob, string>;
  settings!: Table<DbSettings, string>;
  
  // Phase 1: Smart Memory Tables
  memories!: Table<DbMemory, string>;
  userProfile!: Table<DbUserProfile, string>;
  sessionSummaries!: Table<DbSessionSummary, string>;
  pinnedKnowledge!: Table<DbPinnedKnowledge, string>;

  // Phase 3: 
  graphTriples!: Table<DbGraphTriple, string>;
  backgroundTasks!: Table<DbBackgroundTask, string>;

  // Phase 4:
  chatFolders!: Table<DbChatFolder, string>;

  constructor() {
    super('TawaChatDB');
    this.version(5).stores({
      sessions: 'id, updatedAt, folderId, isPinned, isFavorite',
      messages: 'id, sessionId, timestamp',
      blobs: 'id',
      settings: 'id',
      memories: 'id, type, importance, lastAccessedAt, createdAt',
      userProfile: 'id',
      sessionSummaries: 'sessionId, generatedAt',
      pinnedKnowledge: 'id, createdAt',
      graphTriples: 'id, hash, subject, predicate, object, createdAt',
      backgroundTasks: 'id, sessionId, status, createdAt',
      chatFolders: 'id, createdAt'
    });
  }
}

export const db = new TawaChatDB();

// Helper functions for crypto + DB operations

export async function saveSession(session: DbSession, pin: string) {
  const encSession = {
    ...session,
    title: await encryptDataAsync(session.title, pin)
  };
  await db.sessions.put(encSession);
}

// Convert dataURL to Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function saveMessage(message: any, pin: string) {
  let serializedAttachments: SerializedAttachment[] | undefined = undefined;

  if (message.attachments && message.attachments.length > 0) {
    serializedAttachments = [];
    for (const att of message.attachments) {
      if (att.data && att.data.startsWith('data:')) {
         const blobId = uuidv4();
         const blob = await dataUrlToBlob(att.data);
         await db.blobs.put({ id: blobId, data: blob });
         serializedAttachments.push({
            name: att.name,
            type: att.type,
            blobId
         });
      } else if (att.blobId) {
         // Already serialized
         serializedAttachments.push(att);
      }
    }
  }

  const encMessage: DbMessage = {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: await encryptDataAsync(message.content, pin),
    variants: message.variants ? await Promise.all(message.variants.map((v: string) => encryptDataAsync(v, pin))) : undefined,
    currentVariantIndex: message.currentVariantIndex,
    timestamp: message.timestamp,
    attachments: serializedAttachments,
    ttft: message.ttft,
    isHidden: message.isHidden,
    tokens: message.tokens,
    cost: message.cost
  };
  await db.messages.put(encMessage);
}

export async function getBlobAsObjectUrl(blobId: string): Promise<string | null> {
  const record = await db.blobs.get(blobId);
  if (!record) return null;
  return URL.createObjectURL(record.data);
}
