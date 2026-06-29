import { db, DbMemory, DbUserProfile, DbSessionSummary, DbPinnedKnowledge } from './db';
import { encryptDataAsync, decryptDataAsync } from './crypto';
import { v4 as uuidv4 } from 'uuid';

export const saveMemory = async (memory: Omit<DbMemory, 'content'> & { content: string }, pin: string) => {
  const encMemory: DbMemory = {
    ...memory,
    content: await encryptDataAsync(memory.content, pin),
  };
  await db.memories.put(encMemory);
};

export const getMemories = async (pin: string): Promise<(DbMemory & { decryptedContent: string })[]> => {
  const memories = await db.memories.toArray();
  const decryptedMemories = await Promise.all(
    memories.map(async (m) => {
      const decryptedContent = await decryptDataAsync(m.content, pin) || '';
      return { ...m, decryptedContent };
    })
  );
  return decryptedMemories;
};

export const applyForgettingCurve = async () => {
    // importance -= 0.1 * daysSinceLastAccess
    const memories = await db.memories.toArray();
    const now = Date.now();
    const promises = memories.map(async (memory) => {
      const daysSinceLastAccess = (now - memory.lastAccessedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceLastAccess > 1) {
          const decayedImportance = Math.max(0, memory.importance - (0.1 * Math.floor(daysSinceLastAccess)));
          if (decayedImportance !== memory.importance) {
              await db.memories.update(memory.id, { importance: decayedImportance });
          }
      }
    });
    await Promise.all(promises);
}

export const getRelevantContext = async (query: string, pin: string, topK: number = 5): Promise<string> => {
  const memories = await getMemories(pin);
  // Basic heuristic: sort by importance * access frequency or just return highest importance.
  // In a real semantic search, we'd use embeddings. For now, we sort by importance and keyword match.
  const lowerQuery = query.toLowerCase();
  
  const scoredMemories = memories.map(m => {
      let score = m.importance;
      if (m.decryptedContent.toLowerCase().split(' ').some(word => lowerQuery.includes(word))) {
          score += 5; // Keyword boost
      }
      return { ...m, score };
  });

  scoredMemories.sort((a, b) => b.score - a.score);
  const selectedMemories = scoredMemories.slice(0, topK);
  
  // Update last accessed
  const now = Date.now();
  await Promise.all(selectedMemories.map(m => {
      return db.memories.update(m.id, { 
          accessCount: m.accessCount + 1,
          lastAccessedAt: now
      });
  }));

  const pinned = await getPinnedKnowledge(pin);
  const userProfile = await getUserProfile(pin);

  let graphContext = '';
  try {
      const graphModule = await import('./graph');
      graphContext = await graphModule.queryGraph(query, pin);
  } catch (e) {
      console.error("Error querying graph", e);
  }
  
  let contextParts = [];
  if (userProfile && (userProfile.name || Object.keys(userProfile.preferences).length > 0 || userProfile.expertise.length > 0)) {
       let profileText = `[USER PROFILE]\n`;
       if (userProfile.name) profileText += `- Tên: ${userProfile.name}\n`;
       if (Object.keys(userProfile.preferences).length > 0) profileText += `- Sở thích/Thói quen: ${JSON.stringify(userProfile.preferences)}\n`;
       if (userProfile.expertise.length > 0) profileText += `- Chuyên môn: ${userProfile.expertise.join(', ')}\n`;
       contextParts.push(profileText);
  }

  if (pinned.length > 0) {
      contextParts.push(`[PINNED KNOWLEDGE - CRITICAL FACTS]\n${pinned.map(p => `- ${p.decryptedContent}`).join('\n')}`);
  }
  
  if (selectedMemories.length > 0) {
      contextParts.push(`[RELEVANT MEMORIES]\n${selectedMemories.map(m => `- ${m.decryptedContent}`).join('\n')}`);
  }

  if (graphContext) {
      contextParts.push(`[KNOWLEDGE GRAPH]\n(Chủ thể) - [Quan hệ] -> (Đối tượng)\n${graphContext}`);
  }
  
  return contextParts.join('\n\n');
};

// USER PROFILE
export const getUserProfile = async (pin: string) => {
  const profile = await db.userProfile.get('user_profile');
  if (!profile) return null;
  const name = profile.name ? await decryptDataAsync(profile.name, pin) || undefined : undefined;
  const preferencesStr = await decryptDataAsync(profile.preferences as any, pin) || '{}';
  const preferences = JSON.parse(preferencesStr);
  
  const expertise = await Promise.all(profile.expertise.map(e => decryptDataAsync(e, pin) || ''));
  const recentTopics = await Promise.all(profile.recentTopics.map(e => decryptDataAsync(e, pin) || ''));
  
  return {
      ...profile,
      name,
      preferences,
      expertise,
      recentTopics
  };
}

export const saveUserProfile = async (profile: Partial<{name: string, preferences: Record<string, string>, expertise: string[], recentTopics: string[], timezone: string}>, pin: string) => {
  const currentProfile = await getUserProfile(pin) || {
      id: 'user_profile',
      name: '',
      preferences: {},
      expertise: [],
      recentTopics: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  const updatedProfile = { ...currentProfile, ...profile };
  
  const encProfile: DbUserProfile = {
      id: 'user_profile',
      name: updatedProfile.name ? await encryptDataAsync(updatedProfile.name, pin) : undefined,
      preferences: await encryptDataAsync(JSON.stringify(updatedProfile.preferences), pin) as any,
      expertise: await Promise.all(updatedProfile.expertise.map(e => encryptDataAsync(e, pin))),
      recentTopics: await Promise.all(updatedProfile.recentTopics.map(e => encryptDataAsync(e, pin))),
      timezone: updatedProfile.timezone
  };
  
  await db.userProfile.put(encProfile);
}

// PINNED KNOWLEDGE
export const addPinnedKnowledge = async (content: string, pin: string) => {
  const encKnowledge: DbPinnedKnowledge = {
      id: uuidv4(),
      content: await encryptDataAsync(content, pin),
      createdAt: Date.now()
  };
  await db.pinnedKnowledge.put(encKnowledge);
}

export const removePinnedKnowledge = async (id: string) => {
  await db.pinnedKnowledge.delete(id);
}

export const getPinnedKnowledge = async (pin: string) => {
  const knowledge = await db.pinnedKnowledge.orderBy('createdAt').toArray();
  return await Promise.all(knowledge.map(async k => ({
      ...k,
      decryptedContent: await decryptDataAsync(k.content, pin) || ''
  })));
}

// SESSION SUMMARIES
export const saveSessionSummary = async (summary: Omit<DbSessionSummary, 'summary' | 'keyDecisions' | 'todos'> & { summary: string, keyDecisions: string[], todos: string[] }, pin: string) => {
   const encSummary: DbSessionSummary = {
       ...summary,
       summary: await encryptDataAsync(summary.summary, pin),
       keyDecisions: await Promise.all(summary.keyDecisions.map(d => encryptDataAsync(d, pin))),
       todos: await Promise.all(summary.todos.map(t => encryptDataAsync(t, pin)))
   };
   await db.sessionSummaries.put(encSummary);
}

export const getSessionSummary = async (sessionId: string, pin: string) => {
    const s = await db.sessionSummaries.get(sessionId);
    if (!s) return null;
    return {
        ...s,
        summary: await decryptDataAsync(s.summary, pin) || '',
        keyDecisions: await Promise.all(s.keyDecisions.map(d => decryptDataAsync(d, pin) || '')),
        todos: await Promise.all(s.todos.map(t => decryptDataAsync(t, pin) || ''))
    };
}

// MEMORY EXTRACTION
export const unifiedMemoryExtraction = async (
    transcript: { role: string, content: string }[], 
    apiKey: string, 
    proxyUrl: string, 
    model: string,
    pin: string,
    sessionId: string,
    shouldSummarize: boolean
) => {
    if (transcript.length < 2) return;

    const transcriptText = transcript.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const currentProfile = await getUserProfile(pin);

    // Prepare profile info without any internal encryption wrappers
    const profileJson = currentProfile ? {
        name: currentProfile.name || "",
        preferences: currentProfile.preferences || {},
        expertise: currentProfile.expertise || [],
        recentTopics: currentProfile.recentTopics || []
    } : {
        name: "",
        preferences: {},
        expertise: [],
        recentTopics: []
    };

    const unifiedPrompt = `Bạn là một hệ thống phân tích và quản lý bộ nhớ thông minh cho một trợ lý ảo cực kỳ tối ưu.
Nhiệm vụ của bạn là phân tích đoạn chat dưới đây và trích xuất TOÀN BỘ các loại thông tin hữu ích cùng một lúc vào cấu trúc JSON được chỉ định.

Hồ sơ người dùng hiện tại (JSON):
${JSON.stringify(profileJson, null, 2)}

Hãy phân tích kỹ và xuất ra cấu trúc JSON chi tiết chứa các trường sau:

1. "memories": Mảng chứa các bộ nhớ rời rạc quan trọng phát sinh từ hội thoại:
   Mỗi bộ nhớ chứa:
   - "type": "fact" | "preference" | "decision" | "context"
   - "content": Nội dung ngắn gọn, súc tích bằng tiếng Việt (Ví dụ: "Người dùng thích lập trình Rust", "Người dùng sống tại Hà Nội")
   - "importance": Mức độ quan trọng chấm từ 1-10 dựa trên giá trị lâu dài

2. "triples": Mảng chứa các quan hệ đối tượng dạng Subject-Predicate-Object (Chủ thể - Mối quan hệ - Đối tượng) để nạp vào Knowledge Graph (tiếng Việt).
   Ví dụ:
   - "Tú học Công nghệ thông tin" => [{"subject": "Tú", "predicate": "học", "object": "Công nghệ thông tin"}]
   - "Tôi thích ăn bánh mì" => [{"subject": "người dùng", "predicate": "thích ăn", "object": "bánh mì"}]

3. "profile_updates": Đối tượng chứa các thay đổi/cập nhật cho hồ sơ người dùng (chỉ cập nhật nếu thấy có thông tin mới rõ ràng trong đoạn chat):
   - "name": Tên của người dùng nếu phát hiện mới (giữ nguyên hoặc trả về rỗng nếu không đổi)
   - "preferences": Đối tượng chứa các sở thích/thói quen dạng key-value, ví dụ: {"ngôn ngữ": "Vietnamese", "framework": "Next.js"}
   - "expertise": Mảng các kỹ năng hoặc chuyên môn mới tìm thấy của người dùng (giữ nguyên và chỉ thêm mới)
   - "recentTopics": Mảng tối đa 10 chủ đề mà người dùng thảo luận gần đây (đẩy chủ đề mới nhất vào đầu mảng)

4. "session_summary": ${shouldSummarize ? `Bắt buộc tạo tóm tắt mới cho phiên trò chuyện này (vì session đã đạt mốc sự kiện quan trọng).` : `Chỉ tạo tóm tắt mới nếu đoạn chat chứa các thông tin thảo luận quan trọng và đã chốt lại vấn đề, nếu không hãy trả về null.`}
   Cấu trúc đối tượng:
   - "summary": Tóm tắt ngắn gọn nội dung chat (1-2 câu tiếng Việt)
   - "keyDecisions": Mảng chứa các quyết định lớn đã thống nhất trong phiên trò chuyện
   - "todos": Mảng các việc cần làm phát sinh cho cả trợ lý và người dùng

Yêu cầu định dạng phản hồi: Trả về một đối tượng JSON thuần nhất khớp chính xác với schema mô tả ở trên. Không thêm bất kỳ văn bản giải thích hay lời mở đầu nào ngoài JSON.

Đoạn hội thoại cần phân tích:
${transcriptText}`;

    try {
        const response = await fetch(`${proxyUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'system', content: unifiedPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            if (content) {
                const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanContent);
                
                // 1. Lưu memories
                if (parsed.memories && Array.isArray(parsed.memories)) {
                    for (const mem of parsed.memories) {
                        if (mem.type && mem.content && mem.importance) {
                            await saveMemory({
                                id: uuidv4(),
                                type: mem.type,
                                content: mem.content,
                                importance: mem.importance,
                                accessCount: 0,
                                lastAccessedAt: Date.now(),
                                source: {
                                    sessionId,
                                    timestamp: Date.now()
                                },
                                createdAt: Date.now()
                            }, pin);
                        }
                    }
                }

                // 2. Lưu triples vào Knowledge Graph
                if (parsed.triples && Array.isArray(parsed.triples) && parsed.triples.length > 0) {
                    const graphModule = await import('./graph');
                    for (const triple of parsed.triples) {
                        if (triple.subject && triple.predicate && triple.object) {
                            await graphModule.addGraphTriple(triple.subject, triple.predicate, triple.object, pin);
                        }
                    }
                }

                // 3. Cập nhật hồ sơ người dùng (User Profile)
                if (parsed.profile_updates) {
                    const pUpdate = parsed.profile_updates;
                    const oldProfile = currentProfile || {
                        name: '',
                        preferences: {},
                        expertise: [],
                        recentTopics: []
                    };
                    const updatedName = pUpdate.name || oldProfile.name;
                    const combinedPrefs = { ...(oldProfile.preferences || {}), ...(pUpdate.preferences || {}) };
                    
                    const combinedExpertise = Array.from(new Set([
                        ...(oldProfile.expertise || []),
                        ...(pUpdate.expertise || [])
                    ])).filter(Boolean);
                    
                    const combinedTopics = Array.from(new Set([
                        ...(pUpdate.recentTopics || []),
                        ...(oldProfile.recentTopics || [])
                    ])).filter(Boolean).slice(0, 10);

                    await saveUserProfile({
                        name: updatedName,
                        preferences: combinedPrefs,
                        expertise: combinedExpertise,
                        recentTopics: combinedTopics
                    }, pin);
                }

                // 4. Lưu session summary
                if (parsed.session_summary && parsed.session_summary.summary) {
                    const sSum = parsed.session_summary;
                    await saveSessionSummary({
                        sessionId,
                        summary: sSum.summary || '',
                        keyDecisions: sSum.keyDecisions || [],
                        todos: sSum.todos || [],
                        generatedAt: Date.now()
                    }, pin);
                }
            }
        }
    } catch(e) {
        console.error("Lỗi trong quá trình xử lý bộ nhớ kết hợp (unified memory extraction):", e);
    }
};

export const updateUserProfileFromTranscript = async (
    transcript: { role: string, content: string }[], 
    apiKey: string, 
    proxyUrl: string, 
    model: string,
    pin: string
) => {
    // Deprecated in favor of unifiedMemoryExtraction, but kept for compatibility
};

export const generateSessionSummaryFromTranscript = async (
    transcript: { role: string, content: string }[], 
    apiKey: string, 
    proxyUrl: string, 
    model: string,
    pin: string,
    sessionId: string
) => {
    // Deprecated in favor of unifiedMemoryExtraction, but kept for compatibility
};

export const extractMemoriesFromTranscript = async (
    transcript: { role: string, content: string }[], 
    apiKey: string, 
    proxyUrl: string, 
    model: string,
    pin: string,
    sessionId: string
) => {
    // Deprecated in favor of unifiedMemoryExtraction, but kept for compatibility
};
