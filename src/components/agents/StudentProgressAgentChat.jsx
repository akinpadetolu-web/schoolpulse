import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, ChevronDown, ChevronUp, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const AGENT_NAME = 'kairos';
const DEFAULT_AVATAR = 'https://media.base44.com/images/public/69cf2d8364666b7e0d95357a/a55e9e2fc_ChatGPT_Image_Jul_29__2026__11_57_14_PM-removebg-preview.webp';

function ToolCallPill({ toolCall }) {
  const status = toolCall.status || 'pending';
  const isFailed = status === 'failed' || status === 'error';
  const isDone = status === 'completed' || status === 'success';
  const label = toolCall.display_projection?.label || toolCall.name || 'tool';
  const stateLabel = isFailed
    ? (toolCall.display_projection?.error_label || 'failed')
    : isDone
      ? (toolCall.display_projection?.label || 'done')
      : (toolCall.display_projection?.active_label || status);
  const hide = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full',
          isFailed ? 'bg-destructive' : isDone ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse',
        )}
      />
      <span className="font-medium text-foreground/80">{label}</span>
      <span>· {stateLabel}</span>
      {!hide && toolCall.arguments_string && (
        <span className="truncate max-w-[180px] opacity-70">{toolCall.arguments_string}</span>
      )}
    </div>
  );
}

function MessageBubble({ message, avatarUrl }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <img src={avatarUrl} alt="Kairos" className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full object-cover" />
      )}
      <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        {message.content && (isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ))}
        {!isUser && message.tool_calls?.map((tc, i) => <ToolCallPill key={i} toolCall={tc} />)}
      </div>
      {isUser && (
        <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export default function StudentProgressAgentChat({ title = 'Kairos', subtitle, avatarUrl = DEFAULT_AVATAR }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const initRef = useRef(false);

  // Initialize / resume a conversation for this agent
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        let conv = null;
        try {
          const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
          conv = (convs || [])[0];
        } catch {}
        if (!conv) {
          conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: title } });
        }
        setConversationId(conv.id);
        if (Array.isArray(conv.messages) && conv.messages.length) setMessages(conv.messages);
      } catch (e) {
        console.error('Agent init failed', e);
        setError('Could not start the evaluator. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [title]);

  // Subscribe to streaming updates
  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      if (data?.messages) setMessages(data.messages);
      // turn off sending once an assistant message appears
      if (data?.messages?.some((m) => m.role === 'assistant' && m.content)) setSending(false);
    });
    return () => unsub && unsub();
  }, [conversationId]);

  // Autoscroll on new content
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = useCallback(
    async (e) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || !conversationId || sending) return;
      setInput('');
      setSending(true);
      setError(null);
      // optimistic user bubble
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      try {
        const conv = await base44.agents.getConversation(conversationId);
        await base44.agents.addMessage(conv, { role: 'user', content: text });
      } catch (e) {
        console.error('send failed', e);
        setSending(false);
        setError('Failed to send. Please try again.');
      }
    },
    [input, conversationId, sending],
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <img src={avatarUrl} alt="Kairos" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <CardTitle className="text-base flex items-center gap-2">{title}</CardTitle>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div ref={scrollRef} className="h-72 overflow-y-auto space-y-3 pr-1 mb-3">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Starting evaluator…
              </div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Ask me about a student's grades, performance trends, strengths, or areas to improve.
              </div>
            ) : (
              messages.map((m, i) => <MessageBubble key={i} message={m} avatarUrl={avatarUrl} />)
            )}
            {sending && (
              <div className="flex gap-2.5 justify-start">
                <img src={avatarUrl} alt="Kairos" className="w-7 h-7 rounded-full object-cover" />
                <div className="bg-muted rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing…
                </div>
              </div>
            )}
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
          </div>
          <form onSubmit={send} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a student's progress…"
              disabled={loading || sending}
            />
            <Button type="submit" size="icon" disabled={loading || sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}