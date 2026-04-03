import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/auditLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function CreateClassDialog({ open, onOpenChange, school, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    className: "", baseLevel: "", subsetName: "", educationLevel: "", academicTrack: ""
  });

  function reset() {
    setForm({ className: "", baseLevel: "", subsetName: "", educationLevel: "", academicTrack: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.SchoolClass.create({
        schoolId: school.id,
        schoolName: school.schoolName,
        className: form.className,
        baseLevel: form.baseLevel,
        subsetName: form.subsetName,
        educationLevel: form.educationLevel,
        academicTrack: form.academicTrack,
        isArchived: false,
      });
      await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: "class_created", entityType: "SchoolClass", performedBy: "superAdmin", performedByName: "Super Admin", details: `Class "${form.className}" created` });
      reset();
      onOpenChange(false);
      if (onCreated) onCreated();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-primary/5 p-3 rounded-lg text-sm"><strong>School:</strong> {school?.schoolName}</div>
          <div className="space-y-2"><Label>Class Name *</Label><Input value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} required placeholder="e.g. JS1A, SS2 Science B" /></div>
          <div className="space-y-2"><Label>Base Level</Label><Input value={form.baseLevel} onChange={e => setForm({ ...form, baseLevel: e.target.value })} placeholder="e.g. JS1, SS2" /></div>
          <div className="space-y-2"><Label>Subset Name</Label><Input value={form.subsetName} onChange={e => setForm({ ...form, subsetName: e.target.value })} placeholder="e.g. A, B, Science" /></div>
          <div className="space-y-2">
            <Label>Education Level</Label>
            <Select value={form.educationLevel} onValueChange={v => setForm({ ...form, educationLevel: v })}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="junior">Junior Secondary</SelectItem>
                <SelectItem value="senior">Senior Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Academic Track</Label><Input value={form.academicTrack} onChange={e => setForm({ ...form, academicTrack: e.target.value })} placeholder="e.g. Science, Arts, Commercial" /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Class
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}