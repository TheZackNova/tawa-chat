import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { SettingsModal } from './components/Settings/SettingsModal';
import { AuthModal } from './components/Auth/AuthModal';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { CommandPalette } from './components/CommandPalette';
import { useStore } from './store/useStore';
import { cn } from './lib/utils';
import { db } from './lib/db';
import { executeAgentTask } from './lib/agents';
import { liveQuery } from 'dexie';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { forcePruneHistory, isCanvasOpen } = useStore();

  useEffect(() => {
    // Tự động dọn dẹp các chat cũ khi ứng dụng khởi chạy
    forcePruneHistory();

    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-settings', handleOpenSettings);

    // Event-driven background tasks solver with Dexie liveQuery
    const processingIds = new Set<string>();

    const subscription = liveQuery(() =>
      db.backgroundTasks.where('status').equals('pending').toArray()
    ).subscribe(async (pendingTasks) => {
       if (pendingTasks.length === 0) return;
       const task = pendingTasks[0];
       
       if (processingIds.has(task.id)) return;
       processingIds.add(task.id);

       try {
          const storeContent = useStore.getState();
          if (!storeContent.apiKey || !storeContent.proxyUrl) {
             processingIds.delete(task.id);
             return;
          }

          // Mark as running inside DB
          await db.backgroundTasks.update(task.id, { status: 'running' });

          const context = {
             apiKey: storeContent.apiKey,
             proxyUrl: storeContent.proxyUrl,
             model: storeContent.activeMode === 'performance' ? storeContent.performanceModel : storeContent.reasoningModel,
          };

          try {
              const result = await executeAgentTask(task.agentRole as any, task.taskDescription, context);
              await db.backgroundTasks.update(task.id, { status: 'completed', result });
              
              // Notify user in chat
              if (storeContent.currentSessionId === task.sessionId) {
                   storeContent.triggerSystemGeneration(task.sessionId, `[BACKGROUND TASK COMPLETED]\nTask: ${task.taskDescription}\nResult: ${result}\nLàm ơn hãy thông báo cho user là "Tác vụ chạy nền đã hoàn thành!" kèm tóm tắt kết quả.`);
              } else {
                   const messageId = crypto.randomUUID();
                   useStore.setState(state => {
                       const sessions = [...state.sessions];
                       const sIndex = sessions.findIndex(s => s.id === task.sessionId);
                       if (sIndex !== -1) {
                           sessions[sIndex].messages = [...sessions[sIndex].messages, {
                              id: messageId,
                              role: 'assistant',
                              content: `🔔 **Tác vụ nền hoàn tất:**\n${result}`,
                              timestamp: Date.now()
                           }];
                       }
                       return { sessions };
                   });
              }
          } catch (err: any) {
              await db.backgroundTasks.update(task.id, { status: 'failed', result: err.message });
          }
       } catch (err) {
          console.error("Lỗi Worker:", err);
       } finally {
          processingIds.delete(task.id);
       }
    });

    return () => {
       window.removeEventListener('open-settings', handleOpenSettings);
       subscription.unsubscribe();
    };
  }, [forcePruneHistory]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AuthModal />
      <CommandPalette />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        onOpenSettings={() => setIsSettingsOpen(true)} 
      />
      
      <main className="flex-1 relative flex overflow-hidden">
        <div className={cn("flex-1 transition-all duration-300 h-full", isCanvasOpen ? "hidden lg:block lg:w-1/2" : "w-full")}>
          <ChatArea onOpenSidebar={() => setIsSidebarOpen(true)} />
        </div>
        
        {isCanvasOpen && (
          <div className="w-full lg:w-1/2 h-full z-20 absolute lg:static top-0 right-0 bg-white dark:bg-zinc-950">
            <CanvasArea />
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
