import MiniSearch from 'minisearch';
import { db } from './db';
import { decryptDataAsync } from './crypto';
import { useStore } from '../store/useStore';

export const miniSearch = new MiniSearch({
  fields: ['content', 'title'],
  storeFields: ['sessionId', 'role', 'content', 'timestamp'],
  idField: 'id'
});

let isIndexed = false;

export async function indexAllMessages(pin: string) {
  if (isIndexed) return;
  
  try {
    const messages = await db.messages.toArray();
    const sessions = await db.sessions.toArray();

    const sessionTitles = new Map(
      await Promise.all(sessions.map(async s => [s.id, await decryptDataAsync(s.title, pin)] as const))
    );

    const documents = await Promise.all(
      messages.map(async m => {
        const decContent = await decryptDataAsync(m.content, pin) || '';
        return {
          id: m.id,
          sessionId: m.sessionId,
          role: m.role,
          content: decContent,
          timestamp: m.timestamp,
          title: sessionTitles.get(m.sessionId) || ''
        };
      })
    );

    miniSearch.addAll(documents);
    isIndexed = true;
  } catch (error) {
    console.error("Lỗi index search:", error);
  }
}

export async function addMessageToIndex(id: string, sessionId: string, role: string, content: string, title?: string) {
  miniSearch.add({
    id,
    sessionId,
    role,
    content,
    timestamp: Date.now(),
    title: title || ''
  });
}

export function searchMessages(query: string) {
  if (!query.trim()) return [];
  return miniSearch.search(query, { prefix: true, fuzzy: 0.2 });
}
