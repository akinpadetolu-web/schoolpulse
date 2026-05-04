import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminMessaging() {
  const { schoolUser: user } = useSchoolAuth();
  const [messages, setMessages] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [school, setSchool] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.Message.subscribe(() => loadMessages());
    return unsubscribe;
  }, []);

  async function loadMessages() {
    if (!user?.schoolId) return;
    try {
      const [allMessages, schools] = await Promise.all([
        base44.entities.Message.filter({ schoolId: user.schoolId }),
        base44.entities.School.filter({ id: user.schoolId }),
      ]);

      // Filter to only parent conversations
      const relevantMessages = (allMessages || []).filter(msg =>
        (msg.senderRole === 'parent') ||
        (msg.senderRole === 'admin' && msg.receiverRole === 'parent')
      );

      setMessages(relevantMessages);
      setSchool((schools || [])[0] || null);

      // Mark parent messages as read
      for (const msg of relevantMessages) {
        if (msg.senderRole === 'parent' && !msg.isRead) {
          await base44.entities.Message.update(msg.id, { isRead: true });
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  // Group by parent (sender of original message)
  const grouped = {};
  messages.forEach(msg => {
    const parentId = msg.senderRole === 'parent' ? msg.senderId : msg.receiverId;
    const parentName = msg.senderRole === 'parent' ? msg.senderName : msg.receiverName || 'Parent';
    if (!grouped[parentId]) {
      grouped[parentId] = { parentName, messages: [] };
    }
    grouped[parentId].messages.push(msg);
  });

  // Sort each thread by date
  Object.values(grouped).forEach(conv =>
    conv.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
  );

  const thread = selectedParent ? grouped[selectedParent]?.messages || [] : [];

  // Filter conversations by search term
  const filteredGrouped = Object.entries(grouped).reduce((acc, [parentId, data]) => {
    if (data.parentName.toLowerCase().includes(searchTerm.toLowerCase())) {
      acc[parentId] = data;
    }
    return acc;
  }, {});

  // Get the last message from a thread
  const getLastMessage = (messages) => {
    if (messages.length === 0) return '';
    const lastMsg = messages[messages.length - 1];
    return lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
  };

  // Get unread count
  const getUnreadCount = (parentId) => {
    const conv = grouped[parentId];
    return conv.messages.filter(m => !m.isRead && m.senderRole === 'parent').length;
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setSending(true);
    try {
      const schoolName = school?.schoolName || user.schoolName || 'School';

      await base44.entities.Message.create({
        schoolId: user.schoolId,
        senderId: user.id,
        senderName: schoolName,
        senderRole: 'admin',
        receiverId: selectedParent,
        receiverRole: 'parent',
        subject: `Re: ${thread[0]?.subject || 'Message'}`,
        content: replyContent.trim(),
        isRead: false,
      });

      toast.success('Reply sent');
      setReplyContent('');
      await loadMessages();
    } catch (error) {
      toast.error('Failed to send reply');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex gap-0 bg-background rounded-lg overflow-hidden border border-border shadow-lg">
      {/* Sidebar - Conversation List */}
      <div className="w-full md:w-96 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(filteredGrouped).length === 0 ? (
            <div className="flex items-center justify-center h-full text-center p-4">
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No conversations found' : 'No messages yet'}
              </p>
            </div>
          ) : (
            Object.entries(filteredGrouped).map(([parentId, data]) => {
              const unreadCount = getUnreadCount(parentId);
              const lastMsg = data.messages[data.messages.length - 1];
              return (
                <button
                  key={parentId}
                  onClick={() => setSelectedParent(parentId)}
                  className={`w-full text-left p-3 border-b border-border transition-colors ${
                    selectedParent === parentId
                      ? 'bg-primary/10'
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{data.parentName}</p>
                    {lastMsg && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(lastMsg.created_date), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {getLastMessage(data.messages)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden md:flex flex-1 flex-col bg-background">
        {selectedParent ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border shrink-0 bg-card">
              <h3 className="font-semibold">{grouped[selectedParent]?.parentName}</h3>
              <p className="text-xs text-muted-foreground">
                {thread.length} message{thread.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {thread.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm ${
                      msg.senderRole === 'admin'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-secondary text-secondary-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.senderRole === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border shrink-0 bg-card space-y-2">
              <textarea
                placeholder="Type a message..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={sending}
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground text-sm resize-none"
                rows="3"
              />
              <Button
                onClick={handleReply}
                disabled={sending || !replyContent.trim()}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}