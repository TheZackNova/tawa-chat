import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { X, ExternalLink, Code2, Play, History, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import Editor from '@monaco-editor/react';

export function CanvasArea() {
  const { isCanvasOpen, canvasCode, closeCanvas, openCanvas } = useStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [localCode, setLocalCode] = useState(canvasCode || '');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (canvasCode && canvasCode !== localCode) {
      setLocalCode(canvasCode);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), canvasCode]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [canvasCode]);

  if (!isCanvasOpen) return null;

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setLocalCode(value);
    }
  };

  const saveToHistory = () => {
    if (localCode !== history[historyIndex]) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), localCode]);
      setHistoryIndex(prev => prev + 1);
      openCanvas(localCode); // push back to store 
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevCode = history[historyIndex - 1];
      setLocalCode(prevCode);
      setHistoryIndex(historyIndex - 1);
      openCanvas(prevCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 w-full lg:border-l border-pink-200 dark:border-pink-900/30 overflow-hidden shadow-2xl z-50">
      <div className="flex items-center justify-between px-4 py-2 bg-pink-50 dark:bg-zinc-900 border-b border-pink-200 dark:border-pink-900/30">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-2">
            🎨 Tawa Canvas
          </h2>
          <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'preview' 
                  ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Play className="h-3 w-3" /> Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'code' 
                  ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Code2 className="h-3 w-3" /> Code
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'code' && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-500 hover:text-pink-600 dark:hover:text-pink-400 disabled:opacity-50"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo (Lịch sử)"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-500 hover:text-pink-600 dark:hover:text-pink-400"
                onClick={saveToHistory}
                title="Lưu và Cập nhật"
              >
                <Save className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-500 hover:text-pink-600 dark:hover:text-pink-400"
            onClick={() => {
              const blob = new Blob([localCode || ''], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
            title="Mở trong tab mới"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-500 hover:bg-pink-200 dark:hover:bg-zinc-800"
            onClick={closeCanvas}
            title="Đóng Canvas"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 w-full h-full bg-zinc-100 dark:bg-zinc-900 relative">
        {activeTab === 'preview' ? (
          <div className="absolute inset-0 p-2">
            <iframe
              srcDoc={localCode || ''}
              className="w-full h-full bg-white rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner"
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
              title="Tawa Canvas Preview"
            />
          </div>
        ) : (
          <div className="absolute inset-0">
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={localCode}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 16 }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
