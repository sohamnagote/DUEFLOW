import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRole } from '../types';

interface DueflowChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVisualGenerator?: () => void;
}

export const DueflowChatbot: React.FC<DueflowChatbotProps> = ({
  isOpen,
  onClose,
  onOpenVisualGenerator,
}) => {
  const [role, setRole] = useState<ChatRole>('general');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Hello! I am your DueFlow AI assistant. I can help draft high-converting payment reminder campaigns, handle client negotiation psychology, or quickly brainstorm subject lines.\n\nChoose an AI mode above: **Complex Strategist** (\`gemini-3.1-pro-preview\`), **General Assistant** (\`gemini-3.5-flash\`), or **Fast Ideator** (\`gemini-3.1-flash-lite\`).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
        roleUsed: role,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `Error: ${err.message || 'Unable to connect to Gemini API'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const roleDetails: Record<ChatRole, { title: string; model: string; tag: string }> = {
    complex: {
      title: 'Strategist',
      model: 'gemini-3.1-pro-preview',
      tag: 'Complex Tasks',
    },
    general: {
      title: 'General',
      model: 'gemini-3.5-flash',
      tag: 'General Tasks',
    },
    fast: {
      title: 'Fast',
      model: 'gemini-3.1-flash-lite',
      tag: 'Fast Tasks',
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001126]/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#fbf9f4] h-full flex flex-col shadow-2xl border-l border-[#001126]/10 animate-fade-in font-['Hanken_Grotesk']">
        {/* Header */}
        <div className="p-4 bg-[#f5f3ee] border-b border-[#001126]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3d6562] animate-pulse" />
            <h3 className="font-bold text-[#001126] text-sm">DueFlow AI Assistant</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#44474d] hover:text-[#001126]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Role Selector Tabs (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite) */}
        <div className="p-3 bg-[#ffffff] border-b border-[#001126]/5">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f0eee9] rounded-lg">
            {(['complex', 'general', 'fast'] as const).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1.5 px-2 text-center rounded-md transition-all text-xs ${
                    active
                      ? 'bg-[#15263c] text-[#fbf9f4] font-semibold shadow-xs'
                      : 'text-[#44474d] hover:text-[#001126]'
                  }`}
                >
                  <div className="font-semibold leading-tight">{roleDetails[r].title}</div>
                  <div className="font-['Space_Mono'] text-[8px] opacity-80 truncate">{roleDetails[r].model.replace('gemini-', '')}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#44474d]">
                  <span>{isUser ? 'You' : 'DueFlow AI'}</span>
                  {!isUser && m.modelUsed && (
                    <span className="font-['Space_Mono'] text-[8px] px-1 py-0.2 rounded bg-[#001126]/8">
                      {m.modelUsed}
                    </span>
                  )}
                  <span className="font-['Space_Mono'] text-[9px]">{m.timestamp}</span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[88%] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#15263c] text-[#fbf9f4] rounded-tr-none'
                      : 'bg-[#ffffff] text-[#1b1c19] border border-[#001126]/10 rounded-tl-none shadow-2xs'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 p-2 text-xs text-[#44474d]">
              <div className="w-2 h-2 rounded-full bg-[#15263c] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#15263c] animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#15263c] animate-bounce delay-200" />
              <span className="font-['Space_Mono'] text-[10px]">Consulting {roleDetails[role].model}...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-[#001126]/5 bg-[#ffffff] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setInput('Draft a 3-step gentle reminder drip sequence for overdue clients.')}
            className="px-2.5 py-1 bg-[#f5f3ee] hover:bg-[#eae8e3] rounded text-[#001126] whitespace-nowrap"
          >
            Drip sequence
          </button>
          <button
            onClick={() => setInput('Write 5 subject lines with high open rates for invoice follow-ups.')}
            className="px-2.5 py-1 bg-[#f5f3ee] hover:bg-[#eae8e3] rounded text-[#001126] whitespace-nowrap"
          >
            Subject lines
          </button>
          {onOpenVisualGenerator && (
            <button
              onClick={onOpenVisualGenerator}
              className="px-2.5 py-1 bg-[#bfebe6]/60 hover:bg-[#bfebe6] rounded text-[#00201e] whitespace-nowrap font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">image</span>
              <span>Visual Studio (1K/2K/4K)</span>
            </button>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-[#f5f3ee] border-t border-[#001126]/10 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${roleDetails[role].title}...`}
            className="flex-1 px-3 py-2 bg-[#ffffff] text-xs rounded border border-[#001126]/10 outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-[#15263c] text-[#fbf9f4] text-xs font-semibold rounded hover:bg-[#001126] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
