import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import ParentMessageComposer from '@/components/messaging/ParentMessageComposer';
import MessageThread from '@/components/messaging/MessageThread';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function ParentMessaging() {
  const { schoolUser: user } = useSchoolAuth();
  const [messages, setMessages] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Message.subscribe(() => loadData());
    return unsubscribe;
  }, []);

  async function loadData() {
    if (!user?.schoolId) return;
    try {
      const msgs = await base44.entities.Message.filter({
        schoolId: user.schoolId,
        senderRole: 'parent',
      });
      setMessages(msgs || []);

      const adminsData = await base44.entities.SchoolUser.filter({
        schoolId: user.schoolId,
        role: 'admin',
      });
      setAdmins(adminsData || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const conversations = {};
  messages.forEach(msg => {
    const key = msg.receiverId;
    if (!conversations[key]) {
      conversations[key] = [];
    }
    conversations[key].push(msg);
  });

  return (
    <div className="space-y-6">
      <ParentMessageComposer user={user} admins={admins} onMessageSent={loadData} />

      {Object.keys(conversations).length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No messages yet. Start a conversation with the school.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(conversations).map(([adminId, threadMessages]) => {
          const admin = admins.find(a => a.id === adminId);
          return (
            <Card key={adminId}>
              <CardHeader>
                <CardTitle className="text-base">{admin?.fullName || 'School Admin'}</CardTitle>
                <CardDescription>{threadMessages.length} message(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageThread messages={threadMessages} currentUserRole="parent" />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}