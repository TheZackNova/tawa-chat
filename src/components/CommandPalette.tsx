import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useStore } from '../store/useStore';
import { searchMessages, indexAllMessages } from '../lib/search';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, MessageSquare, Settings, LayoutDashboard, Command as CmdIcon, SearchIcon } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const store = useStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && store.isLoggedIn && store.pin) {
      indexAllMessages(store.pin);
    }
  }, [open, store.isLoggedIn, store.pin]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const results = searchMessages(searchQuery);
      setSearchResults(results.slice(0, 10)); // Top 10
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command label="Command Palette" className="h-full w-full outline-none" shouldFilter={false}>
          <div className="flex items-center border-b border-pink-100 dark:border-zinc-800 px-4 py-3">
            <SearchIcon className="h-5 w-5 text-zinc-400 mr-2" />
            <Command.Input 
              autoFocus
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Tìm kiếm tin nhắn, lệnh (ví dụ: 'Yuri', 'Cài đặt')..."
              className="flex-1 bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <div className="flex items-center gap-1">
              <kbd className="bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-500">ESC</kbd>
            </div>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-smooth">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              Không tìm thấy kết quả nào 🥺
            </Command.Empty>

            {!searchQuery && (
              <Command.Group heading="Hành động thường dùng">
                <Command.Item 
                  onSelect={() => {
                    store.createSession();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-md cursor-pointer data-[selected=true]:bg-pink-50 data-[selected=true]:text-pink-600 dark:data-[selected=true]:bg-pink-900/30"
                >
                  <MessageSquare className="h-4 w-4" />
                  Tạo cuộc trò chuyện mới
                </Command.Item>
                <Command.Item 
                  onSelect={() => {
                    // This relies on a potential custom event or exposing setting modal state
                    window.dispatchEvent(new CustomEvent('open-settings'));
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-md cursor-pointer data-[selected=true]:bg-pink-50 data-[selected=true]:text-pink-600 dark:data-[selected=true]:bg-pink-900/30"
                >
                  <Settings className="h-4 w-4" />
                  Mở Cài đặt hệ thống
                </Command.Item>
              </Command.Group>
            )}

            {searchResults.length > 0 && (
              <Command.Group heading="Kết quả tìm kiếm thư viện trò chuyện">
                {searchResults.map((res) => (
                  <Command.Item
                    key={res.id}
                    onSelect={() => {
                      store.selectSession(res.sessionId);
                      setOpen(false);
                    }}
                    className="flex flex-col gap-1 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-md cursor-pointer data-[selected=true]:bg-pink-50 dark:data-[selected=true]:bg-pink-900/30"
                  >
                    <div className="flex items-center gap-2">
                       <MessageSquare className="h-3 w-3 text-pink-500" />
                       <span className="font-semibold">{res.title || 'Không có tiêu đề'}</span>
                       <span className="text-[10px] text-zinc-400">{format(res.timestamp, 'dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1 truncate w-full max-w-[500px]">
                      {res.role === 'user' ? 'Bạn' : 'Tawa'}: {res.content}
                    </p>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
