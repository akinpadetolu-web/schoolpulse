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
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Message.subscribe(() => loadData());
    return unsubscribe;
  }, []);

  async function loadData() {
    if (!user?.schoolId) return;
    try {
      const [allMsgs, adminsData, schools] = await Promise.all([
        base44.entities.Message.filter({ schoolId: user.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'admin' }),
        base44.entities.School.filter({ id: user.schoolId }),
      ]);

      // Only messages involving this parent
      const myMsgs = (allMsgs || []).filter(msg =>
        (msg.senderId === user.id && msg.senderRole === 'parent') ||
        (msg.receiverId === user.id && msg.receiverRole === 'parent')
      );

      setMessages(myMsgs);
      setAdmins(adminsData || []);
      setSchool((schools || [])[0] || null);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Group messages by conversation (each admin = one thread)
  const conversations = {};
  messages.forEach(msg => {
    const otherPartyId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
    if (!conversations[otherPartyId]) {
      conversations[otherPartyId] = [];
    }
    conversations[otherPartyId].push(msg);
  });

  // Sort each thread by date
  Object.values(conversations).forEach(thread =>
    thread.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
  );

  const schoolName = school?.schoolName || 'School Admin';

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
        Object.entries(conversations).map(([otherPartyId, threadMessages]) => {
          return (
            <Card key={otherPartyId}>
              <CardHeader>
                <CardTitle className="text-base">{schoolName}</CardTitle>
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