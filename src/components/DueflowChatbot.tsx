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
    <div className="fixed inset-0 z-50 bg-[#001126]/40 dark:bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#fbf9f4] dark:bg-[#0c131d] h-full flex flex-col shadow-2xl border-l border-[#001126]/10 dark:border-white/10 animate-fade-in font-['Hanken_Grotesk']">
        {/* Header */}
        <div className="p-4 bg-[#f5f3ee] dark:bg-[#141f2e] border-b border-[#001126]/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3d6562] dark:bg-[#68b5ad] animate-pulse" />
            <h3 className="font-bold text-[#001126] dark:text-[#f3f6fa] text-sm">DueFlow AI Assistant</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#44474d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Role Selector Tabs (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite) */}
        <div className="p-3 bg-[#ffffff] dark:bg-[#141f2e] border-b border-[#001126]/5 dark:border-white/10">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f0eee9] dark:bg-[#0c131d] rounded-lg">
            {(['complex', 'general', 'fast'] as const).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1.5 px-2 text-center rounded-md transition-all text-xs cursor-pointer ${
                    active
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#fbf9f4] dark:text-[#0c131d] font-semibold shadow-xs'
                      : 'text-[#44474d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa]'
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
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#44474d] dark:text-[#94a3b8]">
                  <span>{isUser ? 'You' : 'DueFlow AI'}</span>
                  {!isUser && m.modelUsed && (
                    <span className="font-['Space_Mono'] text-[8px] px-1 py-0.2 rounded bg-[#001126]/8 dark:bg-white/10">
                      {m.modelUsed}
                    </span>
                  )}
                  <span className="font-['Space_Mono'] text-[9px]">{m.timestamp}</span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[88%] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#fbf9f4] dark:text-[#0c131d] rounded-tr-none font-medium'
                      : 'bg-[#ffffff] dark:bg-[#141f2e] text-[#1b1c19] dark:text-[#f3f6fa] border border-[#001126]/10 dark:border-white/10 rounded-tl-none shadow-2xs'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 p-2 text-xs text-[#44474d] dark:text-[#94a3b8]">
              <div className="w-2 h-2 rounded-full bg-[#15263c] dark:bg-[#38bdf8] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#15263c] dark:bg-[#38bdf8] animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#15263c] dark:bg-[#38bdf8] animate-bounce delay-200" />
              <span className="font-['Space_Mono'] text-[10px]">Consulting {roleDetails[role].model}...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-[#001126]/5 dark:border-white/10 bg-[#ffffff] dark:bg-[#141f2e] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setInput('Draft a 3-step gentle reminder drip sequence for overdue clients.')}
            className="px-2.5 py-1 bg-[#f5f3ee] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203046] rounded text-[#001126] dark:text-[#f3f6fa] whitespace-nowrap cursor-pointer"
          >
            Drip sequence
          </button>
          <button
            onClick={() => setInput('Write 5 subject lines with high open rates for invoice follow-ups.')}
            className="px-2.5 py-1 bg-[#f5f3ee] dark:bg-[#192638] hover:bg-[#eae8e3] dark:hover:bg-[#203046] rounded text-[#001126] dark:text-[#f3f6fa] whitespace-nowrap cursor-pointer"
          >
            Subject lines
          </button>
          {onOpenVisualGenerator && (
            <button
              onClick={onOpenVisualGenerator}
              className="px-2.5 py-1 bg-[#bfebe6]/60 dark:bg-[#3d6562]/40 hover:bg-[#bfebe6] rounded text-[#00201e] dark:text-[#9ec9c4] whitespace-nowrap font-medium flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">image</span>
              <span>Visual Studio (1K/2K/4K)</span>
            </button>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-[#f5f3ee] dark:bg-[#101926] border-t border-[#001126]/10 dark:border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${roleDetails[role].title}...`}
            className="flex-1 px-3 py-2 bg-[#ffffff] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/10 dark:border-white/15 outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-action-primary px-3 py-2 text-xs font-semibold rounded disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
