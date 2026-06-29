import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';

export function AuthModal() {
  const { isLoggedIn, login, signup } = useStore();
  const [pin, setPin] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');

  // If already logged in, don't show
  if (isLoggedIn) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 6) {
      setError('Mã PIN/Passphrase phải có ít nhất 6 ký tự nha~');
      return;
    }

    if (isLoginMode) {
      const success = await login(pin);
      if (!success) {
        setError('Mã PIN/Passphrase sai rồi, hoặc chưa có dữ liệu đâu! 🥺');
      }
    } else {
      await signup(pin);
    }
  };

  return (
    <Modal 
      isOpen={!isLoggedIn} 
      onClose={() => {}} // Cannot close without logging in
      title={
        <div className="flex flex-col items-center gap-2">
          <img src="https://files.catbox.moe/ukzhxk.jpeg" alt="Tawa Chat Logo" className="w-16 h-16 rounded-full object-cover border-2 border-pink-300 shadow-md" />
          <span className="text-pink-600 dark:text-pink-400 font-bold text-xl">
            {isLoginMode ? "Đăng nhập Tawa Chat 🌸" : "Tạo mã PIN mới ✨"}
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-pink-600/80 dark:text-pink-400/80 text-center italic">
          {isLoginMode 
            ? "Nhập mã PIN để vào thế giới của chúng mình nhé~" 
            : "Tạo một mã PIN bí mật nào. Nhớ kỹ nha, mất là không tìm lại được đâu! 💕"}
        </p>
        
        <div>
          <Input 
            type="password" 
            placeholder="Nhập mã PIN..." 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={20}
            autoFocus
            className="border-pink-200 focus-visible:ring-pink-500 dark:border-pink-800 dark:focus-visible:ring-pink-400"
          />
          {error && <p className="mt-1 text-sm text-red-500 text-center">{error}</p>}
        </div>

        <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 dark:shadow-none">
          {isLoginMode ? "Vào thôi! 🚀" : "Tạo mã PIN 💖"}
        </Button>

        <div className="text-center mt-4">
          <button 
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setPin('');
            }}
            className="text-sm text-pink-500 hover:text-pink-600 hover:underline transition-colors"
          >
            {isLoginMode ? "Chưa có mã PIN? Tạo mới nè" : "Đã có mã PIN? Đăng nhập thôi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
