import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, X, Sparkles, User, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const AGENT_NAME = 'kairos';
const DEFAULT_AVATAR = 'https://media.base44.com/images/public/69cf2d8364666b7e0d95357a/a55e9e2fc_ChatGPT_Image_Jul_29__2026__11_57_14_PM-removebg-preview.webp';

const stripContext = (c) => { if (typeof c !== 'string' || !c.startsWith('[SCHOOL_CONTEXT:')) return c; return c.split('\n').slice(1).join('\n').trimStart(); };

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
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', isFailed ? 'bg-destructive' : isDone ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
      <span className="font-medium text-foreground/80">{label}</span>
      <span>· {stateLabel}</span>
      {!hide && toolCall.arguments_string && <span className="truncate max-w-[160px] opacity-70">{toolCall.arguments_string}</span>}
    </div>
  );
}

function MessageBubble({ message, avatarUrl }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <img src={avatarUrl} alt="Kairos" className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full object-cover" />}
      <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        {message.content && (isUser ? (
          <p className="whitespace-pre-wrap break-words">{stripContext(message.content)}</p>
        ) : (
          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{stripContext(message.content)}</ReactMarkdown>
          </div>
        ))}
        {!isUser && message.tool_calls?.map((tc, i) => <ToolCallPill key={i} toolCall={tc} />)}
      </div>
      {isUser && <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"><User className="w-4 h-4" /></div>}
    </div>
  );
}

export default function StudentProgressAgentChat({ title = 'Kairos', subtitle, avatarUrl = DEFAULT_AVATAR }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [hasReplied, setHasReplied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);
  const initRef = useRef(false);
  const { schoolUser } = useSchoolAuth();
  const contextBlock = schoolUser?.schoolId && schoolUser?.id
    ? `[SCHOOL_CONTEXT: schoolId=${schoolUser.schoolId} | callerId=${schoolUser.id} | role=${schoolUser.role || ''} | schoolName=${schoolUser.schoolName || ''} | callerName=${schoolUser.fullName || ''}]`
    : '';

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
        if (!conv) conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: title, schoolId: schoolUser?.schoolId, callerId: schoolUser?.id, role: schoolUser?.role } });
        setConversationId(conv.id);
        if (Array.isArray(conv.messages) && conv.messages.length) {
          setMessages(conv.messages);
          setHasReplied(conv.messages.some((m) => m.role === 'assistant' && m.content));
        }
      } catch (e) {
        console.error('Agent init failed', e);
        setError('Could not start Kairos. Please try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, [title]);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      if (data?.messages) setMessages(data.messages);
      if (data?.messages?.some((m) => m.role === 'assistant' && m.content)) {
        setSending(false);
        setHasReplied(true);
      }
    });
    return () => unsub && unsub();
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = useCallback(async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setInput('');
    setSending(true);
    setError(null);
    const fullContent = contextBlock ? `${contextBlock}\n\n${text}` : text;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, { role: 'user', content: fullContent });
    } catch (e) {
      console.error('send failed', e);
      setSending(false);
      setError('Failed to send. Please try again.');
    }
  }, [input, conversationId, sending, contextBlock]);

  const showBadge = !open && !hasReplied && !loading;

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              "fixed z-50 right-3 sm:right-6 bottom-[9.5rem] sm:bottom-24 w-[calc(100vw-1.5rem)] rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col transition-all",
              expanded ? "sm:w-[600px] max-w-[600px]" : "sm:w-[380px] max-w-[380px]"
            )}
            style={{ maxHeight: expanded ? '85vh' : '70vh' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3.5 border-b bg-primary/5">
              <img src={avatarUrl} alt="Kairos" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight flex items-center gap-1.5">{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={() => setExpanded((e) => !e)} className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label={expanded ? 'Shrink chat' : 'Expand chat'}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-3.5">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Starting Kairos…
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <p className="font-medium text-foreground mb-1">Hi, I'm Kairos 👋</p>
                  {schoolUser ? (
                    <>Ask me about a student's grades, performance trends, strengths, or areas to improve.</>
                  ) : (
                    <>Please log into your school account first so I can access your school's data.</>
                  )}
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

            {/* Input */}
            <form onSubmit={send} className="p-3 border-t flex gap-2 bg-card">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Kairos…" disabled={loading || sending} />
              <Button type="submit" size="icon" disabled={loading || sending || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Kairos chat' : 'Open Kairos chat'}
        className="fixed z-50 right-3 sm:right-6 bottom-20 sm:bottom-6 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all pl-2 pr-3 sm:pr-4 h-14"
      >
        <span className="relative">
          <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          {showBadge && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-primary" />
          )}
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          {open ? 'Close' : 'Ask Kairos'}
        </span>
      </button>
    </>
  );
}