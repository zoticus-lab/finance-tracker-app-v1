import React from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function ChatFAB({ isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center ${
        isOpen
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-blue-500 hover:bg-blue-600'
      } text-white`}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      title={isOpen ? 'Tutup asisten' : 'Buka asisten keuangan'}
    >
      {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
    </button>
  );
}
