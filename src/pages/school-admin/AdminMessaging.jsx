import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MessageThread from '@/components/messaging/MessageThread';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMessaging() {
  const { schoolUser: user } = useSchoolAuth();
  const [messages, setMessages] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [school, setSchool] = useState(null);

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
    return <div className="text-center py-8">Loading messages...</div>;
  }

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
                  <p className="font-medium text-sm truncate">{data.parentName}</p>
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
            <CardTitle>{grouped[selectedParent]?.parentName}</CardTitle>
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