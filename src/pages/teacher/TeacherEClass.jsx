import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Video, Plus, Trash2, Edit2, Play, Clock, Users } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';

export default function TeacherEClass() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    meetLink: '',
    startDateTime: '',
    endDateTime: '',
    description: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [c, s] = await Promise.all([
          base44.entities.VirtualClass.filter({ schoolId: user?.schoolId, teacherId: user?.id }),
          base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
        ]);
        setClasses(c || []);
        setSubjects(s || []);
      } catch {
        setClasses([]);
        setSubjects([]);
      }
      setLoading(false);
    }
    load();

    const unsubscribe = base44.entities.VirtualClass.subscribe(() => load());
    return () => unsubscribe();
  }, [user?.schoolId, user?.id]);

  const handleOpenDialog = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setForm({
        title: cls.title,
        subjectId: cls.subjectId,
        meetLink: cls.meetLink,
        startDateTime: cls.startDateTime.split('T')[0] + 'T' + cls.startDateTime.split('T')[1].substring(0, 5),
        endDateTime: cls.endDateTime?.split('T')[0] + 'T' + cls.endDateTime?.split('T')[1].substring(0, 5) || '',
        description: cls.description || '',
      });
    } else {
      setEditingClass(null);
      setForm({
        title: '',
        subjectId: '',
        meetLink: '',
        startDateTime: '',
        endDateTime: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.subjectId || !form.meetLink || !form.startDateTime) {
      alert('Please fill in all required fields');
      return;
    }

    const subject = subjects.find(s => s.id === form.subjectId);
    const data = {
      schoolId: user?.schoolId,
      schoolName: user?.schoolName,
      classId: user?.classId,
      className: user?.className,
      subjectId: form.subjectId,
      subjectName: subject?.name,
      teacherId: user?.id,
      teacherName: user?.fullName,
      title: form.title,
      meetLink: form.meetLink,
      startDateTime: new Date(form.startDateTime).toISOString(),
      endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : null,
      description: form.description,
    };

    try {
      if (editingClass) {
        await base44.entities.VirtualClass.update(editingClass.id, data);
      } else {
        await base44.entities.VirtualClass.create(data);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.VirtualClass.delete(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const upcoming = classes.filter(c => isFuture(new Date(c.startDateTime)));
  const past = classes.filter(c => isPast(new Date(c.startDateTime)));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Class Sessions</h1>
          <p className="text-muted-foreground">Manage your virtual class sessions</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" /> New E-Class
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming {upcoming.length > 0 && <Badge className="ml-2">{upcoming.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="past">Past {past.length > 0 && <Badge className="ml-2">{past.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No upcoming e-classes.</CardContent></Card>
          ) : (
            upcoming.map(cls => (
              <Card key={cls.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cls.title}</h3>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{cls.subjectName}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                      </div>
                      {cls.description && <p className="text-sm mb-3">{cls.description}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => window.open(cls.meetLink, '_blank')} className="gap-1">
                          <Video className="w-4 h-4" /> Open Meet
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(cls)} className="gap-1">
                          <Edit2 className="w-4 h-4" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(cls)} className="gap-1">
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No past e-classes.</CardContent></Card>
          ) : (
            past.map(cls => (
              <Card key={cls.id} className="border-0 shadow-sm opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cls.title}</h3>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{cls.subjectName}</p>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit E-Class' : 'Create E-Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Class Title *</label>
              <Input
                placeholder="e.g., Mathematics - Algebra Introduction"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subject *</label>
              <select
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Google Meet Link *</label>
              <Input
                placeholder="https://meet.google.com/..."
                value={form.meetLink}
                onChange={(e) => setForm({ ...form, meetLink: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date & Time *</label>
              <Input
                type="datetime-local"
                value={form.startDateTime}
                onChange={(e) => setForm({ ...form, startDateTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date & Time</label>
              <Input
                type="datetime-local"
                value={form.endDateTime}
                onChange={(e) => setForm({ ...form, endDateTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                rows="3"
                placeholder="Topics to be covered..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save E-Class</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete E-Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}