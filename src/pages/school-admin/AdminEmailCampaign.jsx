import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle } from 'lucide-react';

export default function AdminEmailCampaign() {
  const { schoolUser: user } = useSchoolAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recipientType, setRecipientType] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadRecipients();
    }
  }, [recipientType, isOpen]);

  const loadRecipients = async () => {
    try {
      const schoolId = user.schoolId;
      let users = [];

      if (recipientType === 'all') {
        users = await base44.entities.SchoolUser.filter({ schoolId });
      } else if (recipientType === 'parents') {
        users = await base44.entities.SchoolUser.filter({ schoolId, role: 'parent' });
      } else if (recipientType === 'teachers') {
        users = await base44.entities.SchoolUser.filter({ schoolId, role: 'teacher' });
      } else if (recipientType === 'students') {
        users = await base44.entities.SchoolUser.filter({ schoolId, role: 'student' });
      }

      setRecipients(users.filter(u => u.email));
    } catch (error) {
      toast.error('Failed to load recipients');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setIsLoading(true);
    setSentCount(0);
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient.email,
          subject,
          body: `<h2>${subject}</h2>${body.replace(/\n/g, '<br/>')}<hr/><p style="font-size: 12px; color: #666;">Sent from ${user.schoolName}</p>`,
          from_name: user.schoolName,
        });
        sent++;
        setSentCount(sent);
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failed++;
      }
    }

    setIsLoading(false);
    toast.success(`Emails sent: ${sent}, Failed: ${failed}`);
    
    if (failed === 0) {
      setSubject('');
      setBody('');
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Email Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsOpen(true)}>Compose Email</Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email Campaign</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recipients</label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="parents">Parents Only</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {recipients.length} recipients selected
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                placeholder="Email body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isLoading}
                rows={8}
              />
            </div>

            {sentCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
                <CheckCircle className="w-4 h-4" />
                Sent {sentCount} of {recipients.length}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isLoading || recipients.length === 0}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send to {recipients.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}