import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, Pin } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Attachment, useStore } from '../../store/useStore';
import { COMMANDS } from '../../lib/commands';

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isGenerating: boolean;
}

export function ChatInput({ onSend, onStop, isGenerating }: ChatInputProps) {
  const store = useStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsTouchDevice(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || isGenerating) return;

    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        if (command === '/clear') {
            store.clearHistory();
            setInput('');
            return;
        }

        if (command === '/export') {
            const format = arg.toLowerCase() || 'markdown';
            let content = '';
            
            const session = store.sessions.find((s) => s.id === store.currentSessionId);
            const messages = session ? session.messages : [];

            if (format === 'json') {
                content = JSON.stringify(messages, null, 2);
            } else { // default to markdown
                content = messages.map(m => `**${m.role === 'user' ? 'You' : 'Tawa'}**:\n${m.content}\n`).join('\n---\n\n');
            }

            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_export_${new Date().toISOString().slice(0,10)}.${format === 'json' ? 'json' : 'md'}`;
            a.click();
            URL.revokeObjectURL(url);
            
            setInput('');
            return;
        }

        const cmd = COMMANDS.find(c => c.name === command.slice(1));
        if (cmd) {
          const prompt = cmd.handler(arg);
          if (prompt) {
            onSend(prompt, attachments);
            setInput('');
            return;
          }
        }
    }

    onSend(text, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Trên thiết bị cảm ứng, phím Enter của bàn phím ảo dùng để xuống dòng.
    // Muốn gửi thì phải bấm nút gửi.
    if (isTouchDevice) return;

    // Enter khi đang gõ tiếng Việt (IME/telex) là để chốt từ, không phải để gửi.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = async (file: File): Promise<Attachment | null> => {
    const isImage = file.type.startsWith('image/');
    
    try {
      const data = await new Promise<string>((resolve, reject) => {
        if (isImage) {
          const img = new Image();
          const blobUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext('2d');
            
            if (file.type !== 'image/png') {
              if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
            }
            
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
            resolve(dataUrl);
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error("Lỗi đọc hình ảnh"));
          };
          img.src = blobUrl;
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        }
      });
      
      return {
        name: file.name || 'Pasted Image',
        type: isImage ? 'image' : 'text',
        data
      };
    } catch (err) {
      console.error("Lỗi khi đọc file:", err);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const result = await processFile(e.target.files[i]);
      if (result) newAttachments.push(result);
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Determine if we have files
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const hasImage = Array.from(e.clipboardData.files).some(f => f.type.startsWith('image/'));
      if (hasImage) {
        // We only prevent default if we actually are pasting purely an image 
        // to avoid double text paste, but typically text is empty if pasting image.
        // If there's text, we want to let the text be pasted and then process images.
        if (!e.clipboardData.getData('text')) {
           e.preventDefault();
        }
        
        const newAttachments: Attachment[] = [];
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const file = e.clipboardData.files[i];
          if (file.type.startsWith('image/')) {
            const result = await processFile(file);
            if (result) newAttachments.push(result);
          }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const pinAttachment = (index: number) => {
    store.addPinnedAttachment(attachments[index]);
    removeAttachment(index);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 md:px-6">
      {store.pinnedAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {store.pinnedAttachments.map((att, i) => (
            <div key={`pinned-${i}`} className="relative flex items-center gap-2 rounded-md border border-pink-300 bg-pink-100 p-2 pr-8 text-sm dark:border-pink-800/50 dark:bg-pink-900/30 shadow-sm shadow-pink-200/50 dark:shadow-none">
              <Pin className="h-3 w-3 text-pink-500" />
              {att.type === 'image' ? (
                <img src={att.data} alt={att.name} className="h-8 w-8 object-cover rounded border border-pink-200 dark:border-pink-700" />
              ) : (
                <span className="font-mono text-xs truncate max-w-[150px] text-pink-700 dark:text-pink-300">{att.name}</span>
              )}
              <button 
                onClick={() => store.removePinnedAttachment(i)}
                className="absolute right-1 top-1 rounded-full p-1 hover:bg-pink-200 dark:hover:bg-pink-800/50 text-pink-500 transition-colors"
                title="Bỏ ghim"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative flex items-center gap-2 rounded-md border border-pink-200 bg-white p-2 pr-14 text-sm dark:border-pink-800/30 dark:bg-zinc-900 shadow-sm shadow-pink-100 dark:shadow-none">
              {att.type === 'image' ? (
                <img src={att.data} alt={att.name} className="h-8 w-8 object-cover rounded border border-pink-100 dark:border-pink-800/50" />
              ) : (
                <span className="font-mono text-xs truncate max-w-[150px] text-pink-600 dark:text-pink-400">📎 {att.name}</span>
              )}
              <div className="absolute right-1 top-1 flex gap-1">
                <button 
                  onClick={() => pinAttachment(i)}
                  className="rounded-full p-1 hover:bg-pink-50 text-pink-400 hover:text-pink-600 dark:hover:bg-pink-900/30 transition-colors"
                  title="Ghim làm ngữ cảnh"
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => removeAttachment(i)}
                  className="rounded-full p-1 hover:bg-red-50 text-pink-400 hover:text-red-500 dark:hover:bg-red-900/30 transition-colors"
                  title="Xóa"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form 
        onSubmit={handleSubmit}
        className="relative flex items-end w-full overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm shadow-pink-100 focus-within:border-pink-400 focus-within:ring-1 focus-within:ring-pink-400 dark:border-pink-900/30 dark:bg-zinc-900 dark:shadow-none dark:focus-within:border-pink-500 dark:focus-within:ring-pink-500 transition-all duration-200"
      >
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-2 bottom-2 h-10 w-10 rounded-xl text-pink-400 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-900/30 dark:hover:text-pink-300 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          enterKeyHint={isTouchDevice ? 'enter' : 'send'}
          placeholder="Nhắn tin cho Tawa Chat... 🌸"
          className="min-h-[56px] w-full resize-none border-0 bg-transparent py-4 pl-14 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 text-pink-900 dark:text-pink-100 placeholder:text-pink-300 dark:placeholder:text-pink-700"
          rows={1}
        />
        <div className="absolute bottom-2 right-2">
          {isGenerating ? (
            <Button 
              type="button" 
              size="icon" 
              variant="ghost" 
              onClick={onStop}
              className="h-10 w-10 rounded-xl text-pink-500 hover:bg-pink-100 hover:text-pink-700 dark:hover:bg-pink-900/50"
              title="Dừng tạo"
            >
              <Square className="h-5 w-5 fill-current" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() && attachments.length === 0}
              className="h-10 w-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 disabled:bg-pink-300 shadow-sm shadow-pink-200 dark:shadow-none transition-all duration-200"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
      <div className="mt-2 text-center text-xs text-pink-400/70 dark:text-pink-600/50 italic">
        Tawa Chat có thể mắc lỗi. Hãy kiểm tra lại các thông tin quan trọng nhé~ 💕
      </div>
    </div>
  );
}
