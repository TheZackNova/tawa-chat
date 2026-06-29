import React, { useState } from 'react';
import { MessageSquare, Plus, Settings, Trash2, LogOut, Menu, X, Zap, BookOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { AppGuideModal } from '../Guide/AppGuideModal';

interface SidebarProps {
  onOpenSettings: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ onOpenSettings, isOpen, setIsOpen }: SidebarProps) {
  const { sessions, currentSessionId, folders, selectSession, createSession, deleteSession, logout, clearHistory, createFolder } = useStore();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [moveSessionId, setMoveSessionId] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string>("");

  const [systemEventOpen, setSystemEventOpen] = useState(false);
  const [systemEventMsg, setSystemEventMsg] = useState("");
  const [alertDialogMsg, setAlertDialogMsg] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const toggleFolder = (id: string) => {
      setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolderSubmit = () => {
      if (newFolderName.trim()) {
          createFolder({
              name: newFolderName.trim(),
              color: '#ec4899', // Default pink
              icon: '📁'
          });
          setNewFolderName("");
          setIsFolderModalOpen(false);
      }
  };

  const sessionsByFolder = sessions.reduce((acc, session) => {
      const folderId = session.folderId || 'unassigned';
      if (!acc[folderId]) acc[folderId] = [];
      acc[folderId].push(session);
      return acc;
  }, {} as Record<string, typeof sessions>);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-pink-50 border-r border-pink-200 transition-transform duration-300 ease-in-out dark:bg-zinc-900 dark:border-pink-900/30 md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-pink-200 dark:border-pink-900/30 bg-pink-100/50 dark:bg-pink-950/20">
          <div className="flex items-center gap-2">
            <img src="https://files.catbox.moe/ukzhxk.jpeg" alt="Tawa Chat Logo" className="w-8 h-8 rounded-full object-cover border-2 border-pink-300 dark:border-pink-700" />
            <h1 className="text-lg font-bold text-pink-600 dark:text-pink-400 font-sans tracking-wide">Tawa Chat 🌸</h1>
          </div>
          <button className="md:hidden p-1 rounded-md hover:bg-pink-200 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-400" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <Button 
            onClick={() => {
              createSession();
              if (window.innerWidth < 768) setIsOpen(false);
            }} 
            className="w-full justify-start gap-2 bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 dark:shadow-none"
          >
            <Plus className="h-4 w-4" />
            Đoạn chat mới ✨
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center text-sm text-pink-400/70 dark:text-pink-500/50 py-4 italic">
              Chưa có cuộc trò chuyện nào ~
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render Folders */}
              {folders.map(folder => {
                 const folderSessions = sessionsByFolder[folder.id] || [];
                 return (
                   <div key={folder.id} className="space-y-1">
                      <div 
                         className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-pink-800 dark:text-pink-300 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-md transition-colors"
                         onClick={() => toggleFolder(folder.id)}
                      >
                         <span>{expandedFolders[folder.id] ? '📂' : '📁'}</span>
                         <span>{folder.name}</span>
                         <span className="ml-auto text-xs text-pink-500 opacity-60 bg-pink-100 dark:bg-pink-900 px-1.5 rounded-full">{folderSessions.length}</span>
                      </div>
                      {expandedFolders[folder.id] && folderSessions.map(session => (
                        <div 
                          key={session.id}
                          className={cn(
                            "group relative flex items-center gap-2 rounded-md px-3 py-2 ml-4 text-sm transition-colors cursor-pointer",
                            currentSessionId === session.id 
                              ? "bg-pink-200 text-pink-900 dark:bg-pink-900/40 dark:text-pink-100 font-medium" 
                              : "text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/20 dark:hover:text-pink-200"
                          )}
                          onClick={() => {
                            selectSession(session.id);
                            if (window.innerWidth < 768) setIsOpen(false);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate flex-1">{session.title}</span>
                        </div>
                      ))}
                   </div>
                 );
              })}

              {/* Render Unassigned Sessions */}
              {sessionsByFolder['unassigned'] && (
                 <div className="space-y-1">
                    {folders.length > 0 && <div className="px-2 pt-2 text-xs font-semibold text-pink-400 uppercase tracking-wider">Mặc định</div>}
                    {sessionsByFolder['unassigned'].map(session => (
                      <div 
                        key={session.id}
                        className={cn(
                          "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
                          currentSessionId === session.id 
                            ? "bg-pink-200 text-pink-900 dark:bg-pink-900/40 dark:text-pink-100 font-medium" 
                            : "text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/20 dark:hover:text-pink-200"
                        )}
                        onClick={() => {
                          selectSession(session.id);
                          if (window.innerWidth < 768) setIsOpen(false);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{session.title}</span>
                        <div className="opacity-0 group-hover:opacity-100 absolute right-2 flex gap-1 bg-gradient-to-l from-pink-100 via-pink-100 dark:from-pink-900/20 dark:via-pink-900/20 pl-4 py-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveSessionId(session.id);
                                setMoveFolderId(folders[0]?.id || "");
                              }}
                              className="p-1 hover:text-blue-500 transition-opacity"
                              title="Chuyển folder"
                            >
                              📁
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(session.id);
                              }}
                              className="p-1 hover:text-red-500 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                      </div>
                    ))}
                 </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-pink-200 dark:border-pink-900/30 space-y-2 bg-pink-50/50 dark:bg-zinc-900/80">
          <Button variant="outline" className="w-full justify-start gap-2 border-pink-300 text-pink-600 hover:bg-pink-100 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/30" onClick={() => setIsFolderModalOpen(true)}>
            <span>📁</span>
            Tạo Folder Mới
          </Button>
          {sessions.length > 0 && (
            <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => setClearAllConfirm(true)}>
              <Trash2 className="h-4 w-4" />
              Xóa tất cả
            </Button>
          )}

          <Button variant="ghost" className="w-full justify-start gap-2 text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/30" onClick={() => {
               if (!currentSessionId) {
                  setAlertDialogMsg("Vui lòng vào một cuộc trò chuyện để thử nghiệm System Trigger.");
               } else {
                  setSystemEventOpen(true);
               }
          }}>
             <Zap className="h-4 w-4" />
             Kích hoạt System Event ⚡
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2 text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/30" onClick={() => setIsGuideOpen(true)}>
            <BookOpen className="h-4 w-4" />
            Hướng dẫn sử dụng 📖
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2 text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/30" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
            Cài đặt ⚙️
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-900/30" onClick={logout}>
             <LogOut className="h-4 w-4" />
            Đăng xuất 🚪
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modals */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Xóa cuộc trò chuyện? 🥺">
        <p className="text-sm text-pink-600 dark:text-pink-400 mb-6">
          Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác đâu nhé!
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30" onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
          <Button variant="danger" onClick={() => {
            if (deleteConfirmId) deleteSession(deleteConfirmId);
            setDeleteConfirmId(null);
          }}>Xóa luôn!</Button>
        </div>
      </Modal>

      <Modal isOpen={clearAllConfirm} onClose={() => setClearAllConfirm(false)} title="Xóa toàn bộ lịch sử? 😱">
        <p className="text-sm text-pink-600 dark:text-pink-400 mb-6">
          Bạn có chắc chắn muốn xóa TẤT CẢ cuộc trò chuyện? Mọi thứ sẽ biến mất mãi mãi đó!
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30" onClick={() => setClearAllConfirm(false)}>Hủy</Button>
          <Button variant="danger" onClick={() => {
            clearHistory();
            setClearAllConfirm(false);
          }}>Xóa tất cả!</Button>
        </div>
      </Modal>

      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Tạo Folder mới 📁">
        <div className="mb-6">
          <Input 
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nhập tên thư mục mới..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolderSubmit();
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>Hủy</Button>
          <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={handleCreateFolderSubmit}>Tạo</Button>
        </div>
      </Modal>

      <Modal isOpen={!!moveSessionId} onClose={() => setMoveSessionId(null)} title="Chuyển Folder 📁">
        <div className="mb-6">
          <p className="text-sm text-zinc-600 mb-2">Chọn thư mục đích:</p>
          <select 
            value={moveFolderId} 
            onChange={(e) => setMoveFolderId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-[...] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">-- Mặc định (Không có thư mục) --</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setMoveSessionId(null)}>Hủy</Button>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
             if (moveSessionId) {
                useStore.getState().updateSessionMeta(moveSessionId, { folderId: moveFolderId || undefined });
             }
             setMoveSessionId(null);
          }}>Chuyển</Button>
        </div>
      </Modal>

      <Modal isOpen={systemEventOpen} onClose={() => setSystemEventOpen(false)} title="Kích hoạt System Event ⚡">
        <div className="mb-6">
          <p className="text-sm text-zinc-600 mb-2">Nhập sự kiện cần giả lập (Ví dụ: Server báo lỗi 500, Có email mới từ Sếp):</p>
          <Input 
            value={systemEventMsg}
            onChange={(e) => setSystemEventMsg(e.target.value)}
            placeholder="Nội dung sự kiện..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && systemEventMsg.trim()) {
                 const currentSessionId = useStore.getState().currentSessionId;
                 if (currentSessionId) {
                    const eventObj = {
                        id: crypto.randomUUID(),
                        role: 'user',
                        content: `[SYSTEM_EVENT] ${systemEventMsg.trim()}`,
                        isHidden: true,
                        timestamp: Date.now(),
                        sessionId: currentSessionId
                    };
                    useStore.getState().addMessage(eventObj as any);
                    useStore.getState().triggerSystemGeneration(currentSessionId, `[SYSTEM_EVENT_NOTIFICATION] Một sự kiện hệ thống tự động vừa phát sinh ngầm: "${systemEventMsg.trim()}". Hãy chủ động thông báo cho người dùng một cách ngắn gọn và đề xuất hành động tiếp theo.`);
                 }
                 setSystemEventMsg("");
                 setSystemEventOpen(false);
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSystemEventOpen(false)}>Hủy</Button>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => {
             if (systemEventMsg.trim()) {
                 const currentSessionId = useStore.getState().currentSessionId;
                 if (currentSessionId) {
                    const eventObj = {
                        id: crypto.randomUUID(),
                        role: 'user',
                        content: `[SYSTEM_EVENT] ${systemEventMsg.trim()}`,
                        isHidden: true,
                        timestamp: Date.now(),
                        sessionId: currentSessionId
                    };
                    useStore.getState().addMessage(eventObj as any);
                    useStore.getState().triggerSystemGeneration(currentSessionId, `[SYSTEM_EVENT_NOTIFICATION] Một sự kiện hệ thống tự động vừa phát sinh ngầm: "${systemEventMsg.trim()}". Hãy chủ động thông báo cho người dùng một cách ngắn gọn và đề xuất hành động tiếp theo.`);
                 }
                 setSystemEventMsg("");
                 setSystemEventOpen(false);
             }
          }}>Kích hoạt</Button>
        </div>
      </Modal>

      <Modal isOpen={!!alertDialogMsg} onClose={() => setAlertDialogMsg(null)} title="Thông báo">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
          {alertDialogMsg}
        </p>
        <div className="flex justify-end">
          <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={() => setAlertDialogMsg(null)}>Đã hiểu</Button>
        </div>
      </Modal>

      <AppGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
