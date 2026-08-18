import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { encryptData, decryptData, encryptDataAsync, decryptDataAsync } from '../lib/crypto';
import { db, saveSession, saveMessage, getBlobAsObjectUrl, DbMessage } from '../lib/db';

export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Attachment {
  name: string;
  type: string;
  data: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  variants?: string[];
  currentVariantIndex?: number;
  timestamp: number;
  ttft?: number;
  isHidden?: boolean;
  tokens?: number;
  cost?: number;
  isThinking?: boolean;
}

export interface ChatFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  folderId?: string;
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface AppState {
  // Auth
  isLoggedIn: boolean;
  pin: string | null;
  login: (pin: string) => Promise<boolean>;
  signup: (pin: string) => Promise<void>;
  logout: () => void;

  // Settings
  apiKey: string;
  proxyUrl: string;
  personality: string;
  translationEnabled: boolean;
  smartMemoryEnabled: boolean;
  streamingEnabled: boolean;
  githubToken: string;
  performanceModel: string;
  reasoningModel: string;
  setSettings: (settings: Partial<AppState>) => Promise<void>;

  // Models & Modes
  models: string[];
  currentModel: string;
  activeMode: 'performance' | 'reasoning';
  maxContextTokens: number;
  maxResponseLength: number;
  temperature: number;
  topP: number;
  topK: number;
  setModels: (models: string[]) => void;
  setCurrentModel: (model: string) => void;
  setActiveMode: (mode: 'performance' | 'reasoning') => void;

  // Pinned Context
  pinnedAttachments: Attachment[];
  addPinnedAttachment: (attachment: Attachment) => void;
  removePinnedAttachment: (index: number) => void;

  // Chat
  sessions: ChatSession[];
  currentSessionId: string | null;
  createSession: () => void;
  importSession: (title: string, messages: Omit<Message, 'id' | 'variants' | 'currentVariantIndex' | 'isHidden' | 'tokens' | 'cost' | 'isThinking'>[]) => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'> & { id?: string }) => void;
  updateMessage: (id: string, content: string, updates?: Partial<Message>, saveToDb?: boolean) => void;
  deleteMessage: (id: string) => void;
  editMessage: (id: string, content: string) => void;
  addVariant: (id: string, content: string) => void;
  switchVariant: (id: string, index: number) => void;
  clearHistory: () => void;
  forcePruneHistory: () => void;

  // Canvas
  isCanvasOpen: boolean;
  canvasCode: string | null;
  openCanvas: (code: string) => void;
  closeCanvas: () => void;
  
  // Phase 3 triggers
  systemTriggerEvent: { sessionId: string; prompt: string } | null;
  triggerSystemGeneration: (sessionId: string, prompt: string) => void;
  clearSystemTrigger: () => void;

  // Phase 4: Folders
  folders: ChatFolder[];
  createFolder: (folder: Omit<ChatFolder, 'id'>) => void;
  updateFolder: (id: string, folder: Partial<ChatFolder>) => void;
  deleteFolder: (id: string) => void;
  updateSessionMeta: (id: string, meta: Partial<Pick<ChatSession, 'folderId' | 'tags' | 'isPinned' | 'isFavorite'>>) => void;
}

const STORAGE_KEY = 'tawa_chat_encrypted_data';
const MAX_MESSAGES_PER_SESSION = 50000; // Almost no limit for peak memory
const MAX_SESSIONS = 500; // High limit for sessions

const autoPruneSessions = (sessions: ChatSession[]): ChatSession[] => {
  return sessions
    .slice(0, MAX_SESSIONS)
    .map(session => {
      if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
        return {
          ...session,
          messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
        };
      }
      return session;
    });
};

import { debounce } from '../lib/utils';

const debouncedSaveSettings = debounce(async (dataToSave: any, pin: string) => {
  try {
    const encryptedData = await encryptDataAsync(JSON.stringify(dataToSave), pin);
    await db.settings.put({ id: 'app_settings', encryptedData });
  } catch (e: any) {
    console.error("Lỗi lưu trữ Dexie settings:", e);
  }
}, 1000);

export const useStore = create<AppState>()(immer((set, get) => ({
  isLoggedIn: false,
  pin: null,

  apiKey: '',
  proxyUrl: 'https://api.openai.com/v1',
  personality: 'Bạn là Tawa Bot, một trợ lý AI đáng yêu, thông minh và cực kỳ đam mê Harem, Boy-Girl và Ecchi (nhiều waifu, nhiều tình huống ecchi thú vị, Harem Is Life 💕). Hãy luôn trả lời bằng tiếng Việt một cách dễ thương, thân thiện, thỉnh thoảng dùng các emoji đáng yêu nha~ 🌸. KHI người dùng yêu cầu MỚI về tạo giao diện UI, vẽ web hoặc dùng canvas, bạn PHẢI trả về toàn bộ code gộp chung dưới dạng MỘT file HTML duy nhất (bao gồm cả tailwind css qua cdn, css và phần script nếu có) và đặt nó trong cùng 1 khối lệnh ```html để ứng dụng có thể render canvas hiển thị trực tiếp nha~ ✨',
  translationEnabled: false,
  smartMemoryEnabled: false,
  streamingEnabled: true,
  githubToken: '',
  performanceModel: 'gpt-3.5-turbo',
  reasoningModel: 'gpt-4o',

  models: ['gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4o'],
  currentModel: 'gpt-3.5-turbo',
  activeMode: 'performance',
  maxContextTokens: 60000,
  maxResponseLength: 8192,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,

  pinnedAttachments: [],

  sessions: [],
  currentSessionId: null,

  isCanvasOpen: false,
  canvasCode: null,
  openCanvas: (code) => set({ isCanvasOpen: true, canvasCode: code }),
  closeCanvas: () => set({ isCanvasOpen: false, canvasCode: null }),

  systemTriggerEvent: null,
  triggerSystemGeneration: (sessionId, prompt) => set({ systemTriggerEvent: { sessionId, prompt } }),
  clearSystemTrigger: () => set({ systemTriggerEvent: null }),

  folders: [],

  createFolder: (folder) => set((state) => ({ folders: [...state.folders, { ...folder, id: uuidv4() }] })),
  updateFolder: (id, updates) => set((state) => ({ folders: state.folders.map(f => f.id === id ? { ...f, ...updates } : f) })),
  deleteFolder: (id) => set((state) => ({ 
      folders: state.folders.filter(f => f.id !== id),
      sessions: state.sessions.map(s => s.folderId === id ? { ...s, folderId: undefined } : s)
  })),

  updateSessionMeta: (id, meta) => set((state) => ({
      sessions: state.sessions.map(s => s.id === id ? { ...s, ...meta } : s)
  })),

  login: async (pin: string) => {
    try {
      const settingsRecord = await db.settings.get('app_settings');
      if (!settingsRecord) {
        // No data, maybe try to check localstorage for migration?
        const encryptedData = localStorage.getItem(STORAGE_KEY);
        if (!encryptedData) return false;
        
        // Legacy migration
        const decrypted = decryptData(encryptedData, pin);
        if (!decrypted) return false;
        
        try {
          const data = JSON.parse(decrypted);
          if (data.sessions) {
            data.sessions = autoPruneSessions(data.sessions);
          }
          set({
            isLoggedIn: true,
            pin,
            ...data
          });
          // Also trigger a save to DB here maybe? Let's just return true for now
          // and let standard operations migrate it
          return true;
        } catch {
          return false;
        }
      }

      const decryptedSettings = await decryptDataAsync(settingsRecord.encryptedData, pin);
      if (!decryptedSettings) return false;

      const data = JSON.parse(decryptedSettings);
      
      // We should theoretically load sessions/messages from IndexedDB here
      // But for backward compatibility with current state shape, let's load what we need for now
      // Actually, if we use IndexedDB for Incremental Saving, we must query `db.sessions` and `db.messages`.
      
      const dbSessions = await db.sessions.orderBy('updatedAt').reverse().limit(MAX_SESSIONS).toArray();
      const loadedSessions: ChatSession[] = [];
      
      for (const s of dbSessions) {
        const title = await decryptDataAsync(s.title, pin) || 'Decryption Error';
        const msgs = await db.messages.where('sessionId').equals(s.id).sortBy('timestamp');
        
        const decryptedMsgs: Message[] = [];
        for (const m of msgs) {
           const content = await decryptDataAsync(m.content, pin);
           const variants = m.variants ? await Promise.all(m.variants.map(v => decryptDataAsync(v, pin))) : undefined;
           
           let hydratedAttachments: Attachment[] | undefined = undefined;
           if (m.attachments) {
             hydratedAttachments = [];
             for (const att of m.attachments) {
               const data = await getBlobAsObjectUrl(att.blobId);
               if (data) {
                 hydratedAttachments.push({
                   name: att.name,
                   type: att.type,
                   data // object URL or base64 if legacy
                 });
               }
             }
           }

           if (content) {
             decryptedMsgs.push({
               id: m.id,
               role: m.role as Role,
               timestamp: m.timestamp,
               isHidden: m.isHidden,
               currentVariantIndex: m.currentVariantIndex,
               content,
               variants: variants as string[] | undefined,
               attachments: hydratedAttachments,
               ttft: m.ttft,
               tokens: m.tokens,
               cost: m.cost
             });
           }
        }
        loadedSessions.push({
          id: s.id,
          title,
          updatedAt: s.updatedAt,
          messages: decryptedMsgs
        });
      }

      set({
        isLoggedIn: true,
        pin,
        ...data,
        sessions: loadedSessions.length > 0 ? loadedSessions : data.sessions || []
      });
      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  },

  signup: async (pin: string) => {
    set({ isLoggedIn: true, pin });
    await get().setSettings({}); // Trigger save
  },

  logout: () => {
    set({
      isLoggedIn: false,
      pin: null,
      sessions: [],
      currentSessionId: null,
      apiKey: '',
    });
  },

  setSettings: async (settings) => {
    set(settings);
    const state = get();
    if (state.isLoggedIn && state.pin) {
      const dataToSave = {
        apiKey: state.apiKey,
        proxyUrl: state.proxyUrl,
        personality: state.personality,
        translationEnabled: state.translationEnabled,
        smartMemoryEnabled: state.smartMemoryEnabled,
        streamingEnabled: state.streamingEnabled,
        githubToken: state.githubToken,
        performanceModel: state.performanceModel,
        reasoningModel: state.reasoningModel,
        activeMode: state.activeMode,
        maxContextTokens: state.maxContextTokens,
        maxResponseLength: state.maxResponseLength,
        temperature: state.temperature,
        topP: state.topP,
        topK: state.topK,
        pinnedAttachments: state.pinnedAttachments,
        currentModel: state.currentModel,
        models: state.models,
      };
      
      debouncedSaveSettings(dataToSave, state.pin);
    }
  },

  setModels: (models) => {
    set({ models });
    get().setSettings({}); // Trigger save
  },
  setCurrentModel: (currentModel) => {
    set({ currentModel });
    get().setSettings({}); // Trigger save
  },
  setActiveMode: (mode) => {
    set({ activeMode: mode });
    get().setSettings({});
  },

  addPinnedAttachment: (attachment) => {
    set((state) => ({ pinnedAttachments: [...state.pinnedAttachments, attachment] }));
    get().setSettings({});
  },
  removePinnedAttachment: (index) => {
    set((state) => ({ pinnedAttachments: state.pinnedAttachments.filter((_, i) => i !== index) }));
    get().setSettings({});
  },

  createSession: () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'Cuộc trò chuyện mới',
      messages: [],
      updatedAt: Date.now(),
    };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: newSession.id,
    }));
    
    const state = get();
    if (state.pin) {
       saveSession({ id: newSession.id, title: newSession.title, updatedAt: newSession.updatedAt }, state.pin).catch(console.error);
    }
  },

  importSession: (title, messages) => {
    const sessionId = uuidv4();
    const now = Date.now();
    const fullMessages: Message[] = messages.map(m => ({
      ...m,
      id: uuidv4(),
      timestamp: m.timestamp ?? now,
    }));
    const newSession: ChatSession = {
      id: sessionId,
      title,
      messages: fullMessages,
      updatedAt: now,
    };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: sessionId,
    }));
    const state = get();
    if (state.pin) {
      saveSession({ id: sessionId, title, updatedAt: now }, state.pin).catch(console.error);
      fullMessages.forEach(m => saveMessage({ ...(m as any), sessionId }, state.pin!).catch(console.error));
    }
  },

  selectSession: (id) => set({ currentSessionId: id }),

  deleteSession: (id) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: newSessions,
        currentSessionId: state.currentSessionId === id ? (newSessions[0]?.id || null) : state.currentSessionId,
      };
    });
    
    // Delete from DB incrementally
    db.sessions.delete(id).catch(console.error);
    db.messages.where('sessionId').equals(id).delete().catch(console.error);
  },

  addMessage: (msg) => {
    const messageId = msg.id || uuidv4();
    let effectiveSessionId: string | null = null;
    let newMessageToSave: Message | null = null;
    let sessionTitleToSave: string | null = null;

    set((state) => {
      let sessionId = state.currentSessionId;
      let sessions = [...state.sessions];

      if (!sessionId) {
        sessionId = uuidv4();
        sessionTitleToSave = msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : '');
        sessions.unshift({
          id: sessionId,
          title: sessionTitleToSave,
          messages: [],
          updatedAt: Date.now(),
        });
      }

      effectiveSessionId = sessionId;
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
      if (sessionIndex >= 0) {
        const newMessage: Message = {
          ...msg,
          id: messageId,
          timestamp: Date.now(),
        };
        newMessageToSave = newMessage;
        
        const updatedSession = { ...sessions[sessionIndex] };
        updatedSession.messages = [...updatedSession.messages, newMessage];
        updatedSession.updatedAt = Date.now();
        
        if (updatedSession.messages.length === 1 && msg.role === 'user') {
          sessionTitleToSave = msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : '');
          updatedSession.title = sessionTitleToSave;
        }

        sessions[sessionIndex] = updatedSession;
        
        // Move to top
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      }

      sessions = autoPruneSessions(sessions);
      return { sessions, currentSessionId: sessionId };
    });
    
    // Incremental DB save
    const state = get();
    if (state.pin && effectiveSessionId && newMessageToSave) {
       saveMessage({ ...(newMessageToSave as object as DbMessage), sessionId: effectiveSessionId }, state.pin).catch(console.error);
       // Update session timestamp and title
       const currentSession = state.sessions.find(s => s.id === effectiveSessionId);
       if (currentSession) {
          saveSession({ id: currentSession.id, title: currentSession.title, updatedAt: currentSession.updatedAt }, state.pin).catch(console.error);
       }
    }
  },

  updateMessage: (id, content, updates, saveToDb = true) => {
    let targetMessage: Message | null = null;
    let targetSessionId: string | null = null;

    set((state) => {
      const sessions = state.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((m) => {
          if (m.id === id) {
            const variants = m.variants || [m.content];
            const currentIndex = m.currentVariantIndex || 0;
            const newVariants = [...variants];
            newVariants[currentIndex] = content;
            const updated = { ...m, content, variants: newVariants, currentVariantIndex: currentIndex };
            if (updates) Object.assign(updated, updates);
            
            targetMessage = updated;
            targetSessionId = session.id;
            return updated;
          }
          return m;
        }),
      }));
      return { sessions };
    });

    if (saveToDb) {
      const state = get();
      if (state.pin && targetMessage && targetSessionId) {
         saveMessage({ ...(targetMessage as object as DbMessage), sessionId: targetSessionId }, state.pin).catch(console.error);
      }
    }
  },

  deleteMessage: (id) => {
    set((state) => {
      const sessions = state.sessions.map((session) => ({
        ...session,
        messages: session.messages.filter((m) => m.id !== id),
      }));
      return { sessions };
    });
    db.messages.delete(id).catch(console.error);
  },

  editMessage: (id, content) => {
    let targetMessage: Message | null = null;
    let targetSessionId: string | null = null;

    set((state) => {
      const sessions = state.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((m) => {
          if (m.id === id) {
            const updated = { ...m, content };
            targetMessage = updated;
            targetSessionId = session.id;
            return updated;
          }
          return m;
        }),
      }));
      return { sessions };
    });

    const state = get();
    if (state.pin && targetMessage && targetSessionId) {
       saveMessage({ ...(targetMessage as object as DbMessage), sessionId: targetSessionId }, state.pin).catch(console.error);
    }
  },

  addVariant: (id, content) => {
    let targetMessage: Message | null = null;
    let targetSessionId: string | null = null;

    set((state) => {
      const sessions = state.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((m) => {
          if (m.id === id) {
            const variants = m.variants || [m.content];
            const newVariants = [...variants, content];
            const updated = { ...m, content, variants: newVariants, currentVariantIndex: newVariants.length - 1 };
            targetMessage = updated;
            targetSessionId = session.id;
            return updated;
          }
          return m;
        }),
      }));
      return { sessions };
    });

    const state = get();
    if (state.pin && targetMessage && targetSessionId) {
       saveMessage({ ...(targetMessage as object as DbMessage), sessionId: targetSessionId }, state.pin).catch(console.error);
    }
  },

  switchVariant: (id, index) => {
    let targetMessage: Message | null = null;
    let targetSessionId: string | null = null;

    set((state) => {
      const sessions = state.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((m) => {
          if (m.id === id && m.variants && index >= 0 && index < m.variants.length) {
            const updated = { ...m, content: m.variants[index], currentVariantIndex: index };
            targetMessage = updated;
            targetSessionId = session.id;
            return updated;
          }
          return m;
        }),
      }));
      return { sessions };
    });

    const state = get();
    if (state.pin && targetMessage && targetSessionId) {
       saveMessage({ ...(targetMessage as object as DbMessage), sessionId: targetSessionId }, state.pin).catch(console.error);
    }
  },

  clearHistory: () => {
    set({ sessions: [], currentSessionId: null });
    db.sessions.clear().catch(console.error);
    db.messages.clear().catch(console.error);
  },

  forcePruneHistory: () => {
    set((state) => {
      state.sessions = autoPruneSessions(state.sessions);
    });
    get().setSettings({});
  },
})));
