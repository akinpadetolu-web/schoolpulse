import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentMessageComposer({ user, admins, onMessageSent }) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    if (admins.length === 0) {
      toast.error('No school admins available');
      return;
    }

    setLoading(true);
    try {
      // Send to all school admins
      const messages = admins.map(admin => ({
        schoolId: user.schoolId,
        senderId: user.id,
        senderName: user.fullName,
        senderRole: 'parent',
        receiverId: admin.id,
        receiverRole: 'admin',
        subject: subject.trim(),
        content: content.trim(),
        isRead: false,
      }));

      for (const msg of messages) {
        await base44.entities.Message.create(msg);
      }

      toast.success('Message sent to school admin');
      setSubject('');
      setContent('');
      onMessageSent?.();
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Message to School</CardTitle>
        <CardDescription>Send updates or questions to the school administration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
        />
        <textarea
          placeholder="Your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          className="w-full h-24 p-3 border border-input rounded-md bg-background text-foreground"
        />
        <Button onClick={handleSend} disabled={loading} className="w-full gap-2">
          <Send className="w-4 h-4" />
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </CardContent>
    </Card>
  );
}