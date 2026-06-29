import MiniSearch from 'minisearch';
import { Attachment } from '../store/useStore';

const MAX_DIRECT_CHARS = 40000; // Roughly 10k tokens, safe limit to embed directly
const CHUNK_SIZE = 1500;
const OVERLAP = 200;
const MAX_CHUNKS = 15; // Top 15 chunks max gives about 22.5k chars of retrieved text

export async function processHistoryWithRAG(prompt: string, messages: {role: string, content: string}[], maxContextChars: number = 60000): Promise<{role: string, content: string}[]> {
  const MAX_HISTORY_CHARS = maxContextChars;
  
  // Calculate total length
  let totalChars = 0;
  let splitIndex = -1;
  
  // Go from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    totalChars += messages[i].content.length;
    if (totalChars > MAX_HISTORY_CHARS) {
      splitIndex = i;
      break;
    }
  }

  // If memory is within limits, return all
  if (splitIndex === -1) {
    return messages;
  }

  // We have exceeded limits.
  // recentMessages will be kept exactly as they are.
  const recentMessages = messages.slice(splitIndex + 1);
  const olderMessages = messages.slice(0, splitIndex + 1);
  
  const olderText = olderMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
  
  // Process the older text with RAG
  const chunks = await chunkTextAsync(olderText, Math.max(CHUNK_SIZE, 3000), OVERLAP);
  
  const miniSearch = new MiniSearch({
    fields: ['text'],
    storeFields: ['text'],
    idField: 'id'
  });

  const docs = chunks.map((text, i) => ({ id: i, text }));
  
  const BATCH_SIZE = 5000;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    miniSearch.addAll(docs.slice(i, i + BATCH_SIZE));
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const results = miniSearch.search(prompt, { 
    prefix: true, 
    fuzzy: 0.2,
    combineWith: 'OR'
  });

  let retrievedOlderContext = '';
  if (results.length > 0) {
    const topResults = results
      .slice(0, Math.min(MAX_CHUNKS, 25)) // Max 25 chunks of 3k chars ~ 75k chars of retrieved exact text
      .sort((a, b) => (a.id as number) - (b.id as number));
    retrievedOlderContext = topResults.map(r => r.text).join('\n...\n');
  } else {
     retrievedOlderContext = chunks.slice(-10).join('\n...\n'); // Get last parts if no match
  }

  const ragMessage = {
    role: 'system',
    content: `--- TRÍCH XUẤT TỪ BỘ NHỚ LỊCH SỬ CŨ (ĐỂ TRÁNH GIỚI HẠN) ---\n${retrievedOlderContext}\n--- KẾT THÚC TRÍCH XUẤT ---`
  };

  return [ragMessage, ...recentMessages];
}

export async function processContextWithRAG(prompt: string, textAttachments: Attachment[]): Promise<string> {
  let combinedText = '';
  
  for (const att of textAttachments) {
    if (att.type !== 'image') {
      combinedText += `\n--- Header File: ${att.name} ---\n${att.data}\n`;
    }
  }

  // If text is small enough, return directly to preserve maximum coherence
  if (combinedText.length <= MAX_DIRECT_CHARS) {
    return combinedText;
  }

  // Large file detected, perform RAG via MiniSearch
  console.log("Large file detected, performing Client-Side RAG...");
  
  const chunks = await chunkTextAsync(combinedText, CHUNK_SIZE, OVERLAP);
  
  const miniSearch = new MiniSearch({
    fields: ['text'], // fields to index for search
    storeFields: ['text'], // fields to return with search results
    idField: 'id'
  });

  const docs = chunks.map((text, i) => ({
    id: i,
    text
  }));

  // Batch add to MiniSearch to prevent UI freezes
  const BATCH_SIZE = 5000;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    miniSearch.addAll(docs.slice(i, i + BATCH_SIZE));
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Search using the user's prompt. We use a combination of prefix & fuzzy for better coverage
  const results = miniSearch.search(prompt, { 
    prefix: true, 
    fuzzy: 0.2, // allows small typos
    combineWith: 'OR'
  });

  if (results.length === 0) {
    // If no specific match, maybe just return start and end contexts or first few chunks
    return chunks.slice(0, Math.min(MAX_CHUNKS, chunks.length)).join("\n...\n");
  }

  // Sort results by score and take Top K
  const topResults = results
    .slice(0, MAX_CHUNKS)
    .sort((a, b) => (a.id as number) - (b.id as number)); // Sort back by chronological order

  let retrievedContext = topResults.map(r => r.text).join('\n...\n');
  
  return retrievedContext;
}

async function chunkTextAsync(text: string, chunkSize: number, overlap: number): Promise<string[]> {
  const chunks: string[] = [];
  let i = 0;
  let yields = 0;
  
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
    
    // Yield to the main thread every 10,000 chunks to prevent UI freeze
    if (++yields % 10000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return chunks;
}
