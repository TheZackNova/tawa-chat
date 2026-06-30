import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useStore, Attachment } from '../../store/useStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Menu, Download, Github, Zap, Brain } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { exportToMarkdown, exportToWord, exportToPDF, exportToGithubGist } from '../../lib/export';
import { useVirtualizer } from '@tanstack/react-virtual';
import { processContextWithRAG, processHistoryWithRAG } from '../../lib/rag';
import { fetchWebpages } from '../../lib/webScraper';
import { PromptPipeline } from '../../lib/utils';

interface ChatAreaProps {
  onOpenSidebar: () => void;
}

export function ChatArea({ onOpenSidebar }: ChatAreaProps) {
  const store = useStore();
  const currentSession = store.sessions.find(s => s.id === store.currentSessionId);
  const messages = currentSession?.messages || [];
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
  });

  const scrollToBottom = () => {
    // Only smooth scroll if not generating to avoid jank
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: isGenerating ? 'auto' : 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Phase 3 trigger listener
  useEffect(() => {
    if (store.systemTriggerEvent && store.currentSessionId === store.systemTriggerEvent.sessionId && !isGenerating) {
        const { prompt } = store.systemTriggerEvent;
        store.clearSystemTrigger();
        
        // Setup hidden generation
        const assistantMessageId = uuidv4();
        store.addMessage({ id: assistantMessageId, role: 'assistant', content: '' });
        
        let apiMessages: any[] = [];
        const processedHistory = messages.filter(m => !m.isHidden).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : m.role === 'tool' ? 'tool' : 'user',
            content: m.content
        })).slice(-10); // Keep short for performance

        const pipeline = new PromptPipeline();
        pipeline.addSection('PERSONALITY', store.personality, 1);
        if (store.translationEnabled) {
           pipeline.addSection('TRANSLATION', 'Trả lời bằng tiếng Việt.', 2);
        }
        pipeline.addSection('SYSTEM_EVENT', '[ATTENTION: You are responding to an automated background SYSTEM EVENT, not a direct user message. Notify the user seamlessly.]', 3);
        pipeline.addSection('CURRENT_DATETIME', new Date().toLocaleString('vi-VN'), 4);
        const systemPrompt = pipeline.build();

        apiMessages = [
          { role: 'system', content: systemPrompt },
          ...processedHistory,
          { role: 'user', content: prompt }
        ];

        generateResponse(apiMessages, assistantMessageId);
    }
  }, [store.systemTriggerEvent, store.currentSessionId, isGenerating, messages]);

  // Use a ref pattern to stabilize callbacks for ChatMessage React.memo
  const handlersRef = useRef({
    handleRegenerate: (messageId: string) => {},
    handleGenerateTests: (code: string, language: string) => {}
  });

  const generateResponse = async (initialApiMessages: any[], assistantMessageId: string, isRegenerate = false) => {
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    const modelToUse = store.activeMode === 'performance' ? store.performanceModel : store.reasoningModel;
    let apiMessages = [...initialApiMessages];
    const maxIterations = 5;
    let iteration = 0;
    let assistantContent = '';
    let firstTokenTime = 0;

    try {
      while (iteration < maxIterations) {
        iteration++;
        const currentModelUse = modelToUse || store.currentModel;
        const isReasoning = currentModelUse.includes('gpt-4o') || currentModelUse.includes('o1') || currentModelUse.includes('reasoning') || store.activeMode === 'reasoning';
        if (isReasoning) {
            store.updateMessage(assistantMessageId, assistantContent, { isThinking: true }, true);
        }
        
        const toolsModule = await import('../../lib/tools');
        const availableTools = toolsModule.getAvailableTools();

        const response = await fetch(`${store.proxyUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.apiKey}`
          },
          body: JSON.stringify({
            model: modelToUse || store.currentModel,
            messages: apiMessages,
            stream: true,
            max_tokens: store.maxResponseLength || 8192,
            temperature: store.temperature ?? 0.7,
            top_p: store.topP ?? 0.95,
            top_k: store.topK ?? 40,
            tools: availableTools.map(t => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
              }
            }))
          }),
          signal: abortControllerRef.current?.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Lỗi API: ${response.status} ${errorText}`);
        }

        if (!response.body) throw new Error('Không có dữ liệu trả về');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';
        let startTime = Date.now();
        let firstTokenReceived = false;
        
        const currentToolCalls: Record<number, any> = {};
        let requiresToolExecution = false;
        let currentAssistantMessageContent = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  const delta = data.choices[0]?.delta;
                  
                  if (delta?.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                      const index = toolCall.index;
                      if (!currentToolCalls[index]) {
                        currentToolCalls[index] = { id: '', name: '', arguments: '' };
                      }
                      if (toolCall.id) currentToolCalls[index].id = toolCall.id;
                      if (toolCall.function?.name) currentToolCalls[index].name = toolCall.function.name;
                      if (toolCall.function?.arguments) currentToolCalls[index].arguments += toolCall.function.arguments;
                    }
                  }
                  
                  if (delta?.content) {
                    if (!firstTokenReceived) {
                      firstTokenReceived = true;
                      if (iteration === 1) firstTokenTime = Date.now() - startTime;
                    }
                    
                    currentAssistantMessageContent += delta.content;
                    assistantContent += delta.content;
                    
                    const tokensApproximation = Math.ceil(assistantContent.length / 3.5);
                    let costPer1M = 0;
                    const finalModel = modelToUse || store.currentModel;
                    if (finalModel.includes('gpt-4') || finalModel.includes('o1')) costPer1M = 5;
                    else if (finalModel.includes('gpt-3.5') || finalModel.includes('claude-3-haiku')) costPer1M = 0.5;
                    else costPer1M = 1;
                    const estimatedCost = (tokensApproximation / 1000000) * costPer1M;

                    store.updateMessage(
                       assistantMessageId, 
                       assistantContent, 
                       { 
                         ttft: iteration === 1 ? firstTokenTime : undefined,
                         tokens: tokensApproximation,
                         cost: estimatedCost,
                         isThinking: false 
                       },
                       false // Do not save to DB eagerly during streaming
                    );
                  }
                  
                  if (data.choices[0]?.finish_reason === 'tool_calls') {
                     requiresToolExecution = true;
                  }
                } catch (e) {
                  console.error('Lỗi parse JSON:', e, 'Line:', trimmedLine);
                }
              }
            }
          }
        }

        if (requiresToolExecution) {
            const toolCallObjects = Object.values(currentToolCalls);
            
            const toolCallsMessage = {
                role: 'assistant',
                content: currentAssistantMessageContent || null,
                tool_calls: toolCallObjects.map((tc: any) => ({
                    id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    type: 'function',
                    function: { name: tc.name, arguments: tc.arguments }
                }))
            };
            
            apiMessages.push(toolCallsMessage);
            
            for (const tc of toolCallObjects) {
                const toolName = tc.name;
                let toolArgs = {};
                try {
                    toolArgs = JSON.parse(tc.arguments);
                } catch {
                    console.error("Failed to parse tool args", tc.arguments);
                }
                
                // Show thinking/action in UI
                assistantContent += `\n\n> ⚙️ Đang thực thi: **${toolName}**\n> 📥 Tham số: \`${tc.arguments}\`\n\n`;
                store.updateMessage(assistantMessageId, assistantContent);
                
                const toolDef = availableTools.find((t: any) => t.name === toolName);
                let toolResultStr = '';
                
                if (toolDef) {
                    try {
                        const context = {
                            apiKey: store.apiKey,
                            proxyUrl: store.proxyUrl,
                            model: modelToUse || store.currentModel,
                            sessionId: store.currentSessionId || '',
                            addMessage: store.addMessage
                        };
                        toolResultStr = await toolDef.execute(toolArgs, context);
                    } catch (e: any) {
                        toolResultStr = `Lỗi thực thi tool: ${e.message}`;
                    }
                } else {
                    toolResultStr = `Lỗi: Tool ${toolName} không tồn tại trong hệ thống.`;
                }
                
                apiMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    name: toolName,
                    content: typeof toolResultStr === 'string' ? toolResultStr : JSON.stringify(toolResultStr)
                });
            }
            
            // Loop goes to next iteration and sends the updated apiMessages chain
        } else {
            // Normal message, break the loop
            break;
        }
      }
      
      if (iteration >= maxIterations) {
         assistantContent += `\n\n*Hệ thống đã đạt giới hạn suy luận vòng lặp (${maxIterations} bước) và đã dừng tự động để bảo vệ tài nguyên.*`;
      }
      
      // Update variant explicitly if regenerate
      if (isRegenerate) {
          store.addVariant(assistantMessageId, assistantContent);
      }
      
      // Final save to DB
      store.updateMessage(assistantMessageId, assistantContent, { isThinking: false }, true);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Đã dừng tạo phản hồi');
      } else {
        assistantContent += `\n\n**Đã xảy ra lỗi:** ${error.message}`;
        store.updateMessage(assistantMessageId, assistantContent, { isThinking: false }, true);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      store.updateMessage(assistantMessageId, assistantContent, { isThinking: false }, true);
    }
  };

  const handleSend = async (content: string, attachments: Attachment[]) => {
    if (!store.apiKey || !store.proxyUrl) {
      setErrorMessage("Vui lòng cấu hình API Key và Proxy URL trong phần Cài đặt.");
      setErrorModalOpen(true);
      return;
    }

    if (content.trim().startsWith('/pin ')) {
        const fact = content.trim().replace('/pin ', '');
        if (store.pin) {
            const memoryModule = await import('../../lib/memory');
            await memoryModule.addPinnedKnowledge(fact, store.pin);
            store.addMessage({ role: 'user', content });
            setTimeout(() => {
                store.addMessage({ id: uuidv4(), role: 'assistant', content: `📍 Đã ghim cấu hình/sự thật cứng: "${fact}"` });
            }, 500);
        } else {
             setErrorMessage("Vui lòng đăng nhập để sử dụng tính năng ghim (Smart Memory).");
             setErrorModalOpen(true);
        }
        return;
    }

    // Start generating state early to show loading indicator if RAG takes time
    setIsGenerating(true);

    const finalAttachments = [...attachments];
    let textAttachments = finalAttachments.filter(a => a.type !== 'image');
    const imageAttachments = finalAttachments.filter(a => a.type === 'image');

    // Extract URLs from content and fetch them
    const rawUrls = content.match(/(https?:\/\/[^\s]+)/g) || [];
    const urls = rawUrls.map(u => {
      let cleanUrl = u.replace(/[.,;!?]+$/, '');
      if (cleanUrl.endsWith(')')) {
        // Only keep trailing ')' if there is a matching '(' inside the URL
        const openCount = (cleanUrl.match(/\(/g) || []).length;
        const closeCount = (cleanUrl.match(/\)/g) || []).length;
        if (closeCount > openCount) {
          cleanUrl = cleanUrl.replace(/\)+$/, '');
        }
      }
      return cleanUrl;
    });
    if (urls.length > 0) {
      const webResults = await fetchWebpages(urls);
      webResults.forEach(res => {
        const newAtt = {
          name: `URL_CRAWLED: ${res.url}`,
          type: 'text',
          data: res.content
        };
        textAttachments.push(newAtt);
        finalAttachments.push(newAtt);
      });
    }

    let processedTextContent = content;
    if (textAttachments.length > 0) {
      const extractedContext = await processContextWithRAG(content, textAttachments);
      processedTextContent = `${content}\n\n--- Dữ liệu trích xuất từ tệp đính kèm ---\n${extractedContext}\n--- Kết thúc dữ liệu trích xuất ---`;
    }

    let apiContent: any = processedTextContent;
    if (imageAttachments.length > 0) {
      apiContent = [];
      if (processedTextContent) apiContent.push({ type: 'text', text: processedTextContent });
      
      imageAttachments.forEach(att => {
        apiContent.push({ type: 'image_url', image_url: { url: att.data } });
      });
    }

    // Add user message to UI
    store.addMessage({ role: 'user', content, attachments: finalAttachments });

    // Prepare pinned context format
    let pinnedContextText = '';
    if (store.pinnedAttachments.length > 0) {
      const pinnedTextAttachments = store.pinnedAttachments.filter(a => a.type !== 'image');
      if (pinnedTextAttachments.length > 0) {
         const extractedPinned = await processContextWithRAG(content, pinnedTextAttachments);
         pinnedContextText = `\n\n--- PINNED CONTEXT TRÍCH XUẤT ---\n${extractedPinned}\n--- END PINNED CONTEXT ---\n`;
      }
    }

    const processedHistory = await processHistoryWithRAG(
      apiContent, 
      messages.map(m => ({ role: m.role, content: m.content })),
      (store.maxContextTokens || 60000) * 4 
    );

    // Smart Memory Injection
    let smartMemoryContext = '';
    if (store.pin && store.smartMemoryEnabled) {
        try {
            const memoryModule = await import('../../lib/memory');
            smartMemoryContext = await memoryModule.getRelevantContext(content, store.pin, 5);
            if (smartMemoryContext) {
                smartMemoryContext = `\n\n--- CƠ SỞ DỮ LIỆU BỘ NHỚ (SMART MEMORY) ---\n${smartMemoryContext}\n--- KẾT THÚC BỘ NHỚ ---\nLưu ý: Hãy ưu tiên sử dụng các thông tin trong bộ nhớ này nếu chúng liên quan đến câu hỏi hiện tại.`;
            }
        } catch (e) {
            console.error("Lỗi khi load memory:", e);
        }
    }

    // Prepare messages for API with PromptPipeline
    const pipeline = new PromptPipeline();
    pipeline.addSection('PERSONALITY', store.personality, 1);
    if (store.translationEnabled) {
       pipeline.addSection('TRANSLATION', 'Nếu người dùng nhập ngôn ngữ khác, hãy dịch sang tiếng Việt và trả lời bằng tiếng Việt.', 2);
    }
    pipeline.addSection('PINNED_KNOWLEDGE', pinnedContextText, 3);
    pipeline.addSection('SMART_MEMORY', smartMemoryContext, 4);
    pipeline.addSection('CURRENT_DATETIME', new Date().toLocaleString('vi-VN'), 5);

    const systemPromptContent = pipeline.build();

    const apiMessages = [
      { role: 'system', content: systemPromptContent },
      ...processedHistory,
      { role: 'user', content: apiContent }
    ];

    const assistantMessageId = uuidv4();
    store.addMessage({ id: assistantMessageId, role: 'assistant', content: '' });

    await generateResponse(apiMessages, assistantMessageId);

    // Run extraction in background after response
    if (store.pin && store.smartMemoryEnabled && store.apiKey && store.proxyUrl && currentSession && messages.length > 0) {
        setTimeout(async () => {
            try {
                const memoryModule = await import('../../lib/memory');
                const latestMessages = store.sessions.find(s => s.id === currentSession.id)?.messages || [];
                
                // Unified memory extraction - 1 API Call vs 3
                await memoryModule.unifiedMemoryExtraction(
                    latestMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                    store.apiKey,
                    store.proxyUrl,
                    store.activeMode === 'performance' ? store.performanceModel : store.reasoningModel,
                    store.pin!,
                    currentSession.id,
                    latestMessages.length > 0 && latestMessages.length % 5 === 0
                );
                
                await memoryModule.applyForgettingCurve();
            } catch (e) {
                console.error("Lỗi background memory extraction:", e);
            }
        }, 1000);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Get history up to the user message before this AI message
    const history = messages.slice(0, msgIndex);
    const lastUserMessage = history.slice().reverse().find(m => m.role === 'user');
    const promptForRAG = lastUserMessage?.content || '';
    
    let pinnedContextText = '';
    if (store.pinnedAttachments.length > 0) {
      const pinnedTextAttachments = store.pinnedAttachments.filter(a => a.type !== 'image');
      if (pinnedTextAttachments.length > 0) {
         setIsGenerating(true);
         const extractedPinned = await processContextWithRAG(promptForRAG, pinnedTextAttachments);
         pinnedContextText = `\n\n--- PINNED CONTEXT TRÍCH XUẤT ---\n${extractedPinned}\n--- END PINNED CONTEXT ---\n`;
         // Reset generating state temporarily if needed, though generateResponse will set it true again
         setIsGenerating(false);
      }
    }

    const processedHistory = await processHistoryWithRAG(
      promptForRAG, 
      history.map(m => ({ role: m.role, content: m.content })),
      (store.maxContextTokens || 60000) * 4 
    );

    let smartMemoryContext = '';
    if (store.pin && store.smartMemoryEnabled && promptForRAG) {
        try {
            const memoryModule = await import('../../lib/memory');
            smartMemoryContext = await memoryModule.getRelevantContext(promptForRAG, store.pin, 5);
            if (smartMemoryContext) {
                smartMemoryContext = `\n\n--- CƠ SỞ DỮ LIỆU BỘ NHỚ (SMART MEMORY) ---\n${smartMemoryContext}\n--- KẾT THÚC BỘ NHỚ ---\nLưu ý: Hãy ưu tiên sử dụng các thông tin trong bộ nhớ này nếu chúng liên quan đến câu hỏi hiện tại.`;
            }
        } catch (e) {
            console.error("Lỗi khi load memory:", e);
        }
    }

    const pipeline = new PromptPipeline();
    pipeline.addSection('PERSONALITY', store.personality, 1);
    if (store.translationEnabled) {
       pipeline.addSection('TRANSLATION', 'Nếu người dùng nhập ngôn ngữ khác, hãy dịch sang tiếng Việt và trả lời bằng tiếng Việt.', 2);
    }
    pipeline.addSection('PINNED_KNOWLEDGE', pinnedContextText, 3);
    pipeline.addSection('SMART_MEMORY', smartMemoryContext, 4);
    pipeline.addSection('CURRENT_DATETIME', new Date().toLocaleString('vi-VN'), 5);

    const systemPromptContent = pipeline.build();

    const apiMessages = [
      { role: 'system', content: systemPromptContent },
      ...processedHistory
    ];

    await generateResponse(apiMessages, messageId, true);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleExport = async (type: 'md' | 'pdf' | 'docx' | 'gist') => {
    if (!currentSession) return;
    try {
      if (type === 'md') exportToMarkdown(currentSession);
      if (type === 'pdf') exportToPDF(currentSession);
      if (type === 'docx') exportToWord(currentSession);
      if (type === 'gist') {
        const url = await exportToGithubGist(currentSession, store.githubToken);
        window.open(url, '_blank');
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setErrorModalOpen(true);
    }
    setExportMenuOpen(false);
  };

  const handleGenerateTests = (code: string, language: string) => {
    const prompt = `Viết unit test chi tiết cho đoạn mã ${language} sau:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    handleSend(prompt, []);
  };

  handlersRef.current = {
    handleRegenerate,
    handleGenerateTests
  };

  const stableOnRegenerate = React.useCallback((id: string) => handlersRef.current.handleRegenerate(id), []);
  const stableOnGenerateTests = React.useCallback((code: string, lang: string) => handlersRef.current.handleGenerateTests(code, lang), []);

  return (
    <div className="flex h-full flex-col bg-pink-50/30 dark:bg-zinc-950">
      <header className="flex h-14 items-center justify-between px-4 border-b border-pink-200 dark:border-pink-900/30 md:hidden bg-pink-100/50 dark:bg-pink-950/20">
        <button onClick={onOpenSidebar} className="p-2 -ml-2 rounded-md hover:bg-pink-200 dark:hover:bg-pink-900/50">
          <Menu className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </button>
        <span className="font-medium text-pink-700 dark:text-pink-300">
          {store.activeMode === 'performance' ? store.performanceModel : store.reasoningModel}
        </span>
        <div className="relative">
          <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className="p-2 rounded-md hover:bg-pink-200 dark:hover:bg-pink-900/50">
            <Download className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-pink-200 bg-white shadow-lg dark:border-pink-900/50 dark:bg-zinc-900 z-50 overflow-hidden">
              <button onClick={() => handleExport('md')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất Markdown 📝</button>
              <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất PDF 📄</button>
              <button onClick={() => handleExport('docx')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất Word 📘</button>
              <div className="h-px bg-pink-100 dark:bg-pink-900/30 my-1" />
              <button onClick={() => handleExport('gist')} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">
                <Github className="h-4 w-4" /> Export to Gist 🐙
              </button>
            </div>
          )}
        </div>
      </header>
      
      <div className="hidden md:flex h-14 items-center justify-between px-6 border-b border-pink-200 dark:border-pink-900/30 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex bg-pink-100/50 dark:bg-pink-900/20 p-1 rounded-lg border border-pink-200 dark:border-pink-800/30">
            <button
              onClick={() => store.setActiveMode('performance')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                store.activeMode === 'performance' 
                  ? 'bg-white dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 shadow-sm shadow-pink-200/50 dark:shadow-none' 
                  : 'text-pink-400 hover:text-pink-600 dark:text-pink-500/70 dark:hover:text-pink-400'
              }`}
            >
              <Zap className="h-4 w-4" />
              Nhanh nhẹn ⚡
            </button>
            <button
              onClick={() => store.setActiveMode('reasoning')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                store.activeMode === 'reasoning' 
                  ? 'bg-white dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 shadow-sm shadow-pink-200/50 dark:shadow-none' 
                  : 'text-pink-400 hover:text-pink-600 dark:text-pink-500/70 dark:hover:text-pink-400'
              }`}
            >
              <Brain className="h-4 w-4" />
              Thông thái 🧠
            </button>
          </div>
        </div>
        <span className="text-sm font-medium text-pink-400 dark:text-pink-500/70">
          Model hiện tại: <span className="text-pink-600 dark:text-pink-300">{store.activeMode === 'performance' ? store.performanceModel : store.reasoningModel}</span>
        </span>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setExportMenuOpen(!exportMenuOpen)} className="gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
            <Download className="h-4 w-4" /> Xuất
          </Button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-pink-200 bg-white shadow-lg dark:border-pink-900/50 dark:bg-zinc-900 z-50 overflow-hidden">
              <button onClick={() => handleExport('md')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất Markdown 📝</button>
              <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất PDF 📄</button>
              <button onClick={() => handleExport('docx')} className="block w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">Xuất Word 📘</button>
              <div className="h-px bg-pink-100 dark:bg-pink-900/30 my-1" />
              <button onClick={() => handleExport('gist')} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors">
                <Github className="h-4 w-4" /> Export to Gist 🐙
              </button>
            </div>
          )}
        </div>
      </div>

<div ref={parentRef} className="flex-1 overflow-y-auto w-full">
  {messages.length === 0 ? (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center pt-24">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-pink-200 dark:bg-pink-900/50 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <img src="https://files.catbox.moe/ukzhxk.jpeg" alt="Tawa Chat Logo" className="relative h-40 w-40 md:h-64 md:w-64 object-cover rounded-full border-4 border-pink-300 dark:border-pink-700 shadow-xl transform-gpu" style={{ backfaceVisibility: 'hidden' }} />
      </div>
      <h2 className="mb-2 text-3xl font-bold text-pink-600 dark:text-pink-400 font-sans tracking-tight">Tawa Chat Xin Chào! 🌸</h2>
      <p className="max-w-md text-pink-500/80 dark:text-pink-300/70 text-lg italic mb-8">
        "Harem Is Life, Ecchi Is Love" 💕
      </p>

      <p className="max-w-md text-pink-400 dark:text-pink-500/60 mt-4 text-sm">
        Hãy đặt câu hỏi, tải lên hình ảnh, hoặc sử dụng các lệnh mở rộng bằng <code className="bg-pink-100 dark:bg-pink-900/50 px-1 rounded">/</code> nhé!
      </p>
    </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const msg = messages[virtualRow.index];
              return (
                <div
                  key={msg.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ChatMessage 
                    message={msg} 
                    onRegenerate={msg.role === 'assistant' ? stableOnRegenerate : undefined} 
                    onGenerateTests={stableOnGenerateTests}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ChatInput 
        onSend={handleSend} 
        onStop={handleStop} 
        isGenerating={isGenerating} 
      />

      <Modal isOpen={errorModalOpen} onClose={() => setErrorModalOpen(false)} title="Thông báo lỗi 🥺">
        <p className="text-sm text-pink-600 dark:text-pink-400 mb-6">
          {errorMessage}
        </p>
        <div className="flex justify-end">
          <Button onClick={() => setErrorModalOpen(false)} className="bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 dark:shadow-none">Đóng lại</Button>
        </div>
      </Modal>
    </div>
  );
}
