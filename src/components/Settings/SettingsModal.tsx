import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useStore } from '../../store/useStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const store = useStore();
  
  const [apiKey, setApiKey] = useState(store.apiKey);
  const [proxyUrl, setProxyUrl] = useState(store.proxyUrl);
  const [personality, setPersonality] = useState(store.personality);
  const [currentModel, setCurrentModel] = useState(store.currentModel);
  const [translationEnabled, setTranslationEnabled] = useState(store.translationEnabled);
  const [smartMemoryEnabled, setSmartMemoryEnabled] = useState(store.smartMemoryEnabled);
  const [githubToken, setGithubToken] = useState(store.githubToken);
  const [performanceModel, setPerformanceModel] = useState(store.performanceModel);
  const [reasoningModel, setReasoningModel] = useState(store.reasoningModel);
  
  const [maxContextTokens, setMaxContextTokens] = useState(store.maxContextTokens || 60000);
  const [maxResponseLength, setMaxResponseLength] = useState(store.maxResponseLength || 8192);
  const [temperature, setTemperature] = useState(store.temperature ?? 0.7);
  const [topP, setTopP] = useState(store.topP ?? 0.95);
  const [topK, setTopK] = useState(store.topK ?? 40);

  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(store.apiKey);
      setProxyUrl(store.proxyUrl);
      setPersonality(store.personality);
      setCurrentModel(store.currentModel);
      setTranslationEnabled(store.translationEnabled);
      setSmartMemoryEnabled(store.smartMemoryEnabled);
      setGithubToken(store.githubToken);
      setPerformanceModel(store.performanceModel);
      setReasoningModel(store.reasoningModel);
      setMaxContextTokens(store.maxContextTokens || 60000);
      setMaxResponseLength(store.maxResponseLength || 8192);
      setTemperature(store.temperature ?? 0.7);
      setTopP(store.topP ?? 0.95);
      setTopK(store.topK ?? 40);
    }
  }, [isOpen, store]);

  const handleSave = () => {
    store.setSettings({
      apiKey,
      proxyUrl,
      personality,
      translationEnabled,
      smartMemoryEnabled,
      githubToken,
      performanceModel,
      reasoningModel,
      maxContextTokens,
      maxResponseLength,
      temperature,
      topP,
      topK
    });
    store.setCurrentModel(currentModel);
    
    onClose();
  };

  const fetchModels = async () => {
    if (!proxyUrl || !apiKey) {
      setFetchError('Vui lòng nhập Proxy URL và API Key.');
      return;
    }
    
    setIsFetchingModels(true);
    setFetchError('');
    
    try {
      const response = await fetch(`${proxyUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) throw new Error('Lỗi khi tải danh sách model');
      
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const modelIds = data.data.map((m: any) => m.id);
        store.setModels(modelIds);
        if (!modelIds.includes(currentModel) && modelIds.length > 0) {
          setCurrentModel(modelIds[0]);
        }
        setFetchError('Tải thành công!');
      } else {
        throw new Error('Định dạng dữ liệu không hợp lệ');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Không thể kết nối đến proxy.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt Tawa Chat ⚙️">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Proxy URL (OpenAI API Format)</label>
          <Input 
            value={proxyUrl} 
            onChange={(e) => setProxyUrl(e.target.value)} 
            placeholder="https://api.openai.com/v1"
            className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">API Key</label>
          <Input 
            type="password"
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="sk-..."
            className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
          />
        </div>

        <div className="pt-2">
          <Button variant="outline" onClick={fetchModels} disabled={isFetchingModels} className="w-full border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">
            {isFetchingModels ? 'Đang tải... ⏳' : 'Tải danh sách Model từ Proxy 🔄'}
          </Button>
          {fetchError && (
            <p className={`mt-1 text-sm text-center ${fetchError === 'Tải thành công!' ? 'text-green-500' : 'text-red-500'}`}>
              {fetchError}
            </p>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Model (Mặc định)</label>
          <select 
            className="flex h-10 w-full rounded-md border border-pink-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 dark:border-pink-800 dark:bg-zinc-950 dark:focus-visible:ring-pink-400"
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
          >
            {store.models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Model Nhanh nhẹn (Performance Mode) ⚡</label>
          <select 
            className="flex h-10 w-full rounded-md border border-pink-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 dark:border-pink-800 dark:bg-zinc-950 dark:focus-visible:ring-pink-400"
            value={performanceModel}
            onChange={(e) => setPerformanceModel(e.target.value)}
          >
            {store.models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Model Thông thái (Reasoning Mode) 🧠</label>
          <select 
            className="flex h-10 w-full rounded-md border border-pink-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 dark:border-pink-800 dark:bg-zinc-950 dark:focus-visible:ring-pink-400"
            value={reasoningModel}
            onChange={(e) => setReasoningModel(e.target.value)}
          >
            {store.models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">GitHub Personal Access Token (Cho tính năng Export Gist) 🐙</label>
          <Input 
            type="password"
            value={githubToken} 
            onChange={(e) => setGithubToken(e.target.value)} 
            placeholder="ghp_..."
            className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
          />
        </div>

        <div className="space-y-2 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Tính cách Tawa Bot (System Prompt) 🌸</label>
          <Textarea 
            value={personality} 
            onChange={(e) => setPersonality(e.target.value)} 
            placeholder="Bạn là Tawa Bot, một trợ lý AI đáng yêu..."
            rows={4}
            className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
          />
        </div>

        <div className="space-y-4 pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <h3 className="text-sm font-semibold text-pink-800 dark:text-pink-200">Thông số chuyên sâu 🎛️</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Context Size (tokens)</label>
              <Input 
                type="number"
                value={maxContextTokens} 
                onChange={(e) => setMaxContextTokens(Number(e.target.value))} 
                className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Max Response Length</label>
              <Input 
                type="number"
                value={maxResponseLength} 
                onChange={(e) => setMaxResponseLength(Number(e.target.value))} 
                className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Temperature</label>
              <Input 
                type="number" step="0.1"
                value={temperature} 
                onChange={(e) => setTemperature(Number(e.target.value))} 
                className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Top P</label>
              <Input 
                type="number" step="0.05"
                value={topP} 
                onChange={(e) => setTopP(Number(e.target.value))} 
                className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Top K</label>
              <Input 
                type="number"
                value={topK} 
                onChange={(e) => setTopK(Number(e.target.value))} 
                className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Dịch thuật thời gian thực 🌐</label>
          <input
            type="checkbox"
            checked={translationEnabled}
            onChange={(e) => setTranslationEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-500 dark:border-pink-700 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-pink-400"
          />
        </div>
        <p className="text-xs text-pink-500/70 dark:text-pink-400/70 italic">Nếu bật, Tawa Bot sẽ tự động dịch câu trả lời sang tiếng Việt nếu ngôn ngữ gốc khác nha~</p>

        <div className="flex items-center justify-between pt-4 border-t border-pink-200 dark:border-pink-900/30">
          <label className="text-sm font-medium text-pink-700 dark:text-pink-300">Smart Memory (Bộ nhớ xuyên phiên) 🧠</label>
          <input
            type="checkbox"
            checked={smartMemoryEnabled}
            onChange={(e) => setSmartMemoryEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-500 dark:border-pink-700 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-pink-400"
          />
        </div>
        <p className="text-xs text-pink-500/70 dark:text-pink-400/70 italic">Nếu bật, Tawa Bot sẽ nhớ thông tin từ các đoạn chat cũ và dùng lại trong cuộc trò chuyện mới. Tắt để mỗi chat hoàn toàn độc lập nha~</p>

      </div>
      
      <div className="mt-6 flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} className="border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/30">Hủy</Button>
        <Button onClick={handleSave} className="bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 dark:shadow-none">Lưu cài đặt 💖</Button>
      </div>
    </Modal>
  );
}
