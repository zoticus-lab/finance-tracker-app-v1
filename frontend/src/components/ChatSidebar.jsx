import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader, AlertCircle } from 'lucide-react';
import { chatAPI } from '../services/api';

export default function ChatSidebar({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Halo! Saya adalah asisten keuangan Anda. Tanyakan apapun tentang pengeluaran, tabungan, atau rencana keuangan Anda. 💰',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceConnected, setServiceConnected] = useState(true);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError('');

    try {
      const response = await chatAPI.sendMessage(inputValue);

      if (!response.success) {
        setError(response.message || 'Terjadi kesalahan');
        setServiceConnected(false);
        return;
      }

      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: response.data.message,
        context: response.data.context_summary,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setServiceConnected(true);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err?.message || 'Gagal menghubungi asisten AI');
      setServiceConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: 'Chat telah direset. Tanyakan apapun lagi! 😊',
        timestamp: new Date(),
      },
    ]);
    setError('');
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-bl-lg">
          <div>
            <h3 className="font-semibold text-lg">Asisten Keuangan</h3>
            <p className="text-xs text-blue-100">Powered by Gemini</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-full transition"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gemini Status Warning */}
        {!serviceConnected && (
          <div className="mx-4 mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-start gap-2 text-sm text-orange-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Gemini belum terhubung</p>
              <p className="text-xs mt-1">Periksa GEMINI_API_KEY pada backend dan koneksi internet.</p>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div
          ref={messageListRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100vh-280px)]"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg break-words ${
                  msg.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.context && (
                  <p className="text-xs mt-2 opacity-70 border-t border-current pt-2">
                    📊 {msg.context}
                  </p>
                )}
                <span className="text-xs opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
                <Loader size={18} className="animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg rounded-bl-none text-sm">
                <p className="font-semibold">❌ Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tanya tentang keuangan..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>

          {/* Clear Chat Button */}
          <button
            onClick={handleClearChat}
            className="w-full mt-2 text-xs text-gray-600 hover:text-gray-800 py-1 px-2 rounded hover:bg-gray-200 transition"
          >
            Hapus Riwayat Chat
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
