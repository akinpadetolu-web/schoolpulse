import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

export default function AdminSubjects() {
  const user = getCurrentUser();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.Subject.filter({ schoolId: user?.schoolId });
      setSubjects(data || []);
    } catch { setSubjects([]); }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Subject.create({
        schoolId: user.schoolId,
        schoolName: user.schoolName,
        name: form.name,
        code: form.code,
        isArchived: false,
      });
      setForm({ name: "", code: "" });
      setShowCreate(false);
      loadData();
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
      </div>
      {subjects.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No subjects yet.</p>
      ) : (
        <div className="grid gap-2">
          {subjects.map(s => (
            <Card key={s.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.code || "No code"}</p>
                </div>
                <Badge variant={s.isArchived ? "secondary" : "default"}>{s.isArchived ? "Archived" : "Active"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Subject Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Mathematics" /></div>
            <div className="space-y-2"><Label>Subject Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH101" /></div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Subject
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}