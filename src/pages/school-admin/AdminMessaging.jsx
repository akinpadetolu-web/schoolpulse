import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MessageThread from '@/components/messaging/MessageThread';
import { Input } from '@/components/ui/input';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMessaging() {
  const { schoolUser: user } = useSchoolAuth();
  const [messages, setMessages] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.Message.subscribe(() => loadMessages());
    return unsubscribe;
  }, []);

  async function loadMessages() {
    if (!user?.schoolId) return;
    try {
      const msgs = await base44.entities.Message.filter({
        schoolId: user.schoolId,
        receiverId: user.id,
      });
      setMessages(msgs || []);

      // Mark as read
      for (const msg of msgs || []) {
        if (!msg.isRead) {
          await base44.entities.Message.update(msg.id, { isRead: true });
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  const grouped = {};
  messages.forEach(msg => {
    const key = msg.senderId;
    if (!grouped[key]) {
      grouped[key] = { sender: msg.senderName, messages: [] };
    }
    grouped[key].messages.push(msg);
  });

  const thread = selectedParent ? grouped[selectedParent]?.messages || [] : [];

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setSending(true);
    try {
      await base44.entities.Message.create({
        schoolId: user.schoolId,
        senderId: user.id,
        senderName: user.fullName,
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
    return <div className="text-center py-8">Loading messages...</div>;
  }

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Message List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Messages
          </CardTitle>
          <CardDescription>{Object.keys(grouped).length} conversation(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No messages</p>
            ) : (
              Object.entries(grouped).map(([parentId, data]) => (
                <button
                  key={parentId}
                  onClick={() => setSelectedParent(parentId)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedParent === parentId
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-secondary/50'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{data.sender}</p>
                  <p className="text-xs text-muted-foreground truncate">{data.messages.length} message(s)</p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thread View */}
      {selectedParent ? (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{grouped[selectedParent]?.sender}</CardTitle>
            <CardDescription>{thread.length} message(s) in conversation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              <MessageThread messages={thread} currentUserRole="admin" />
            </div>

            <div className="border-t pt-4 space-y-3">
              <textarea
                placeholder="Type your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={sending}
                className="w-full h-20 p-3 border border-input rounded-md bg-background text-foreground"
              />
              <Button onClick={handleReply} disabled={sending} className="w-full gap-2">
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="md:col-span-2">
          <CardContent className="pt-12 pb-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Select a conversation to view messages</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}