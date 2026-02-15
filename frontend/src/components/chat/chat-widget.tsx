'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useChatStream, type ChatMessage } from '@/hooks/use-chat-stream';
import { useClickAway } from '@/hooks/use-click-away';

const TOOL_LABELS: Record<string, string> = {
  check_zip_coverage: 'Checking service area...',
  get_pricing_estimate: 'Calculating estimate...',
  check_availability: 'Checking availability...',
  lookup_booking_status: 'Looking up your bookings...',
  lookup_booking_history: 'Reviewing your history...',
  build_booking_handoff: 'Preparing booking...',
};

const MAX_CHARS = 500;

export function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, sendMessage, clearMessages } = useChatStream();

  // Hide on staff pages
  if (pathname?.startsWith('/staff')) {
    return null;
  }

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBookingHandoff = (handoff: ChatMessage['bookingHandoff']) => {
    if (!handoff?.prefill_data) return;
    const prefillPayload = { data: handoff.prefill_data, timestamp: Date.now() };
    localStorage.setItem('totetaxi-chat-prefill', JSON.stringify(prefillPayload));
    setIsOpen(false);
    window.location.href = '/book';
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <ChatPanel
          ref={panelRef}
          messages={messages}
          isStreaming={isStreaming}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          onClose={() => setIsOpen(false)}
          onBookingHandoff={handleBookingHandoff}
          inputRef={inputRef}
          messagesEndRef={messagesEndRef}
        />
      )}

      {/* Floating Bubble */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg transition-all duration-200 hover:bg-navy-800 hover:scale-105 active:scale-95"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        )}
      </button>
    </>
  );
}

/* ────────────────────────────────────────────────────────────── */

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  onBookingHandoff: (handoff: ChatMessage['bookingHandoff']) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

import { forwardRef } from 'react';

const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
  { messages, isStreaming, input, onInputChange, onSend, onKeyDown, onClose, onBookingHandoff, inputRef, messagesEndRef },
  ref
) {
  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div
      ref={ref}
      className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xl sm:w-96"
      style={{ height: 'min(500px, 70vh)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-200 bg-navy-900 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">ToteTaxi Assistant</h3>
          <p className="text-xs text-navy-300">AI-powered — ask about services, pricing, or availability</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-navy-300 transition-colors hover:bg-navy-800 hover:text-white"
          aria-label="Close chat"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && <EmptyState />}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onBookingHandoff={onBookingHandoff}
          />
        ))}

        {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.content && (
          <TypingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-cream-200 bg-cream-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => onInputChange(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming}
            className="flex-1 rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-white transition-all hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        {input.length > MAX_CHARS * 0.9 && (
          <p className="mt-1 text-right text-xs text-navy-400">
            {input.length}/{MAX_CHARS}
          </p>
        )}
      </div>
    </div>
  );
});

/* ────────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-4">
      <ChatBubbleLeftRightIcon className="h-10 w-10 text-navy-300 mb-3" />
      <h4 className="text-sm font-semibold text-navy-900 mb-1">Hi! How can I help?</h4>
      <ul className="text-xs text-navy-500 space-y-1">
        <li>Service info &amp; pricing</li>
        <li>Coverage area checks</li>
        <li>Date availability</li>
        <li>Booking status (logged in)</li>
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function InlineMarkdown({ text }: { text: string }) {
  // Split on **bold** patterns, preserving delimiters
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="ml-4 list-disc space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i}><InlineMarkdown text={item} /></li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const listMatch = line.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={key++} className="h-2" />);
      } else {
        elements.push(<p key={key++}><InlineMarkdown text={line} /></p>);
      }
    }
  }
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

/* ────────────────────────────────────────────────────────────── */

interface MessageBubbleProps {
  message: ChatMessage;
  onBookingHandoff: (handoff: ChatMessage['bookingHandoff']) => void;
}

function MessageBubble({ message, onBookingHandoff }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-navy-900 text-white'
            : 'bg-cream-100 text-navy-900'
        }`}
      >
        {/* Tool activity indicators */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && !message.content && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <p key={i} className="text-xs italic text-navy-500">
                {TOOL_LABELS[tc.tool] || `Using ${tc.tool}...`}
              </p>
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <MarkdownContent content={message.content} />
        )}

        {/* Booking handoff button */}
        {message.bookingHandoff && (
          <button
            onClick={() => onBookingHandoff(message.bookingHandoff)}
            className="mt-2 w-full rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gold-600"
          >
            Start Booking
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-cream-100 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-navy-400" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-navy-400" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-navy-400" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
