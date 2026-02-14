import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { tool: string }[];
  toolResults?: { tool: string; result: unknown }[];
  bookingHandoff?: {
    action: string;
    prefill_data: Record<string, unknown>;
  };
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  threadId: string;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';

export function useChatStream(): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId] = useState(() => crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (message: string) => {
    if (isStreaming) return;

    setError(null);
    setIsStreaming(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);

    // Create assistant message placeholder
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      toolResults: [],
    };
    setMessages(prev => [...prev, assistantMsg]);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Mobile session fallback
    const hasCookies = document.cookie.includes('totetaxi_sessionid');
    if (!hasCookies) {
      const sessionId = localStorage.getItem('totetaxi-session-id');
      if (sessionId) {
        headers['X-Session-Id'] = sessionId;
      }
    }

    // CSRF token
    const csrfToken = localStorage.getItem('totetaxi-csrf-token');
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    // Abort controller for cleanup
    abortControllerRef.current = new AbortController();

    try {
      // Build conversation history from completed messages (use ref for current state)
      const history = messagesRef.current
        .filter(m => m.content) // Only messages with content
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_URL}/api/assistant/chat/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message, thread_id: threadId, history }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(assistantId, eventType, data);
            } catch {
              // Skip malformed JSON
            }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — not an error
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      // Update assistant message with error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content || 'I encountered an issue. Please try again or call us at (631) 595-5100.' }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, threadId]);

  const handleSSEEvent = useCallback((assistantId: string, eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case 'token':
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content + (data.content as string) }
              : m
          )
        );
        break;

      case 'tool_call':
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, toolCalls: [...(m.toolCalls || []), { tool: data.tool as string }] }
              : m
          )
        );
        break;

      case 'tool_result': {
        const result = data.result as Record<string, unknown>;
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== assistantId) return m;
            const updated = {
              ...m,
              toolResults: [...(m.toolResults || []), { tool: data.tool as string, result }],
            };
            // Detect booking handoff
            if (result && typeof result === 'object' && 'action' in result && result.action === 'open_booking_wizard') {
              updated.bookingHandoff = result as ChatMessage['bookingHandoff'];
            }
            return updated;
          })
        );
        break;
      }

      case 'error':
        setError(data.message as string);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content || (data.message as string) }
              : m
          )
        );
        break;

      case 'done':
        // Stream complete
        break;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, threadId, sendMessage, clearMessages };
}
