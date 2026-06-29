import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { User, Bot, Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Message, useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onGenerateTests?: (code: string, language: string) => void;
}

export const ChatMessage = React.memo(({ message, onRegenerate, onGenerateTests }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const deleteMessage = useStore(state => state.deleteMessage);
  const editMessage = useStore(state => state.editMessage);
  const switchVariant = useStore(state => state.switchVariant);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const variants = message.variants || [message.content];
  const currentIndex = message.currentVariantIndex || 0;
  const currentContent = variants[currentIndex];

  return (
    <div className={cn(
      "group flex w-full px-4 py-6 md:px-6 transition-colors",
      isUser ? "bg-white dark:bg-zinc-950" : "bg-pink-50/50 dark:bg-zinc-900/80 border-y border-pink-100 dark:border-pink-900/20"
    )}>
      <div className="mx-auto flex w-full max-w-3xl gap-4 md:gap-6 relative">
        <div className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm overflow-hidden",
          isUser 
            ? "border-pink-200 bg-pink-100 text-pink-600 dark:border-pink-800 dark:bg-pink-900/50 dark:text-pink-300" 
            : "border-pink-300 bg-pink-200 text-pink-700 dark:border-pink-700 dark:bg-pink-800 dark:text-pink-200"
        )}>
          {isUser ? <User className="h-5 w-5" /> : <img src="https://files.catbox.moe/ukzhxk.jpeg" alt="Tawa Bot" className="h-full w-full object-cover" />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-pink-700 dark:text-pink-300">
                {isUser ? 'Bạn 🌸' : 'Tawa Bot ✨'}
              </span>
              <span className="text-xs text-pink-400 dark:text-pink-500/70">
                {format(message.timestamp, 'HH:mm', { locale: vi })}
              </span>
            </div>
            
            {/* Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {isUser && !isEditing && (
                <>
                  <button onClick={() => setIsEditing(true)} className="p-1 text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-colors rounded hover:bg-pink-100 dark:hover:bg-pink-900/50" title="Sửa">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteMessage(message.id)} className="p-1 text-pink-400 hover:text-red-500 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/30" title="Xóa">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              {!isUser && onRegenerate && (
                <button onClick={() => onRegenerate(message.id)} className="p-1 text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-colors rounded hover:bg-pink-100 dark:hover:bg-pink-900/50" title="Tạo lại">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <Textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">Hủy</Button>
                <Button size="sm" onClick={handleSaveEdit} className="bg-pink-500 hover:bg-pink-600 text-white">Lưu</Button>
              </div>
            </div>
          ) : (
            <>
              {message.isThinking && !isUser && (
                 <div className="flex items-center gap-2 text-sm italic text-pink-600/80 dark:text-pink-400/80 mb-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                   <span>Tawa đang suy nghĩ...</span>
                 </div>
              )}

              {!currentContent && !isUser && !message.isThinking ? (
                <div className="flex items-center gap-1.5 h-6 text-pink-500">
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 mt-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50/50 p-2 text-sm dark:border-pink-800/50 dark:bg-pink-950/30">
                          {att.type === 'image' ? (
                            <img src={att.data} alt={att.name} className="h-16 w-16 object-cover rounded border border-pink-200 dark:border-pink-800" />
                          ) : (
                            <span className="font-mono text-xs truncate max-w-[200px] text-pink-600 dark:text-pink-400">📎 {att.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {currentContent && (
                    <div className="prose prose-pink dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:p-0 prose-a:text-pink-500 hover:prose-a:text-pink-600 dark:prose-a:text-pink-400">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            
                            if (!inline && match) {
                              const language = match[1];
                              return (
                                <CodeBlock 
                                  language={language}
                                  codeString={codeString}
                                  onGenerateTests={onGenerateTests}
                                  {...props}
                                />
                              );
                            }
                            return <code className="bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 font-mono text-sm" {...props}>{children}</code>;
                          }
                        }}
                      >
                        {currentContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Variants and TTFT */}
          <div className="flex items-center justify-between mt-2">
            <div>
              {variants.length > 1 && !isEditing && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <button 
                    onClick={() => switchVariant(message.id, currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span>{currentIndex + 1} / {variants.length}</span>
                  <button 
                    onClick={() => switchVariant(message.id, currentIndex + 1)}
                    disabled={currentIndex === variants.length - 1}
                    className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {message.tokens !== undefined && (
                <div className="text-[10px] text-pink-400/70 font-mono" title="Số Token xấp xỉ">
                  {message.tokens.toLocaleString()} tokens
                </div>
              )}
              {message.cost !== undefined && message.cost > 0 && (
                <div className="text-[10px] text-pink-400/70 font-mono" title="Ước tính chi phí API">
                  ~${message.cost.toFixed(5)}
                </div>
              )}
              {message.ttft !== undefined && !isUser && (
                <div className="text-[10px] text-pink-400/70 font-mono" title="Time to first token">
                  TTFT: {(message.ttft / 1000).toFixed(2)}s
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
