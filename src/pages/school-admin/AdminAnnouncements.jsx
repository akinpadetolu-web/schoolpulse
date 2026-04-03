import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminAnnouncements() {
  const user = getCurrentUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", targetRole: "all" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.Announcement.filter({ schoolId: user?.schoolId });
      setItems(data || []);
    } catch { setItems([]); }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Announcement.create({
        schoolId: user.schoolId,
        schoolName: user.schoolName,
        title: form.title,
        message: form.message,
        targetRole: form.targetRole,
        authorId: user.id,
        authorName: user.fullName,
        isPublished: true,
      });
      setForm({ title: "", message: "", targetRole: "all" });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Announcement</Button>
      </div>
      {items.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No announcements yet.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="outline">{a.targetRole === "all" ? "Everyone" : a.targetRole}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">By {a.authorName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Message *</Label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={4} /></div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={form.targetRole} onValueChange={v => setForm({ ...form, targetRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="teacher">Teachers Only</SelectItem>
                  <SelectItem value="student">Students Only</SelectItem>
                  <SelectItem value="parent">Parents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Publish</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}