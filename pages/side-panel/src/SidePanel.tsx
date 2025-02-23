import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { useState, useEffect } from 'react';
import { getChatResponse, addChatUpdateListener, removeChatUpdateListener } from './services/chatService';
import type { Message } from './types';

const SidePanel = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading] = useState(false); // Deprecated
  const [error, setError] = useState<string | null>(null);

  // Add chat update listener
  useEffect(() => {
    const handleChatUpdate = (update: Message) => {
      setMessages(prev => [...prev, update]);
    };

    addChatUpdateListener(handleChatUpdate);
    return () => removeChatUpdateListener(handleChatUpdate);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    setError(null);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // Get AI response
      const response = await getChatResponse(inputMessage);

      if (response.error) {
        setError(response.error);
        return;
      }

      // AI response will be added via the chat update listener
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setError(error instanceof Error ? error.message : 'Failed to get response. Please try again.');
    }
  };

  const handleClearChat = async () => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: 'Chat history cleared. How can I help you with this webpage?',
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  };

  return (
    <div className={`App flex flex-col h-screen bg-slate-50`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h1 className={`text-lg font-semibold text-gray-900`}>Browse Mate</h1>
        <button onClick={handleClearChat} className={`px-2 py-1 text-sm rounded text-gray-600 hover:bg-gray-100`}>
          Clear Chat
        </button>
      </div>

      <div className={`flex-1 overflow-auto p-4 text-gray-900`}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg ${message.role === 'user' ? `bg-blue-100 ml-8` : `bg-gray-100 mr-8`}`}>
            <div className="font-semibold mb-1">{message.role === 'user' ? 'You' : 'Assistant'}</div>
            <div>{message.content}</div>
            {message.timestamp && (
              <div className={`text-xs mt-2 text-gray-500`}>{new Date(message.timestamp).toLocaleTimeString()}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className={`p-3 rounded-lg bg-gray-100 mr-8`}>
            <div className="animate-pulse">Thinking</div>
          </div>
        )}
        {error && <div className={`p-3 rounded-lg bg-red-100 text-red-700 mr-8 mb-4`}>{error}</div>}
      </div>

      <div className={`p-4 border-t border-gray-200`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder="Ask about this webpage..."
            disabled={isLoading}
            className={`flex-1 p-2 rounded-lg bg-white border-gray-300 text-gray-900 border disabled:opacity-50`}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50`}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
