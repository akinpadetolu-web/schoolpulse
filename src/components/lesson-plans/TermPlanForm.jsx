import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarRange, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { buildWeeks, mergeWeeks, filledWeeks } from '@/lib/termPlanUtils';
import TermPlanWeekEditor from './TermPlanWeekEditor';
import ClassMultiSelect from './ClassMultiSelect';

const EMPTY = { sessionId: '', termId: '', classIds: [], subjectId: '', weeks: [] };

export default function TermPlanForm({ open, onOpenChange, plan, user, sessions, terms, classes, subjects, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [uploadingWeek, setUploadingWeek] = useState(null);

  useEffect(() => {
    if (!open) return;
    setExpandedWeek(null);
    if (plan) {
      setForm({
        sessionId: plan.sessionId || '',
        termId: plan.termId || '',
        classIds: plan.classId ? [plan.classId] : [],
        subjectId: plan.subjectId || '',
        weeks: plan.weeks || [],
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, plan?.id]);

  const sessionTerms = terms.filter(t => !form.sessionId || t.sessionId === form.sessionId);

  const subjectsForClass = form.classIds.length
    ? subjects.filter(s =>
        form.classIds.some(classId =>
          (s.applicableClasses || []).includes(classId) ||
          (user?.teachingAssignments || []).some(ta => ta.subjectId === s.id && ta.classId === classId)
        )
      )
    : subjects;

  function selectClasses(classIds) {
    setForm(f => ({ ...f, classIds, subjectId: '' }));
  }

  function selectSession(sessionId) {
    setForm(f => ({ ...f, sessionId, termId: '', weeks: [] }));
  }

  function selectTerm(termId) {
    const term = terms.find(t => t.id === termId);
    const generated = buildWeeks(term);
    setForm(f => ({
      ...f,
      termId,
      weeks: mergeWeeks(f.weeks, generated),
    }));
  }

  function setWeek(index, patch) {
    setForm(f => ({ ...f, weeks: f.weeks.map((w, i) => (i === index ? { ...w, ...patch } : w)) }));
  }

  async function handlePdf(index, file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please select a PDF file'); return; }
    setUploadingWeek(index);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setWeek(index, { pdfFileUri: file_uri, pdfFileName: file.name });
      toast.success('PDF attached to this week');
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setUploadingWeek(null);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.sessionId || !form.termId || form.classIds.length === 0 || !form.subjectId) {
      return toast.error('Select a session, term, at least one class and a subject');
    }
    if (filledWeeks(form.weeks) === 0) {
      return toast.error('Add a topic to at least one week');
    }

    const term = terms.find(t => t.id === form.termId);
    const session = sessions.find(s => s.id === form.sessionId);
    const subj = subjects.find(s => s.id === form.subjectId);

    setSaving(true);
    try {
      const payload = {
        schoolId: user.schoolId,
        schoolName: user.schoolName || '',
        sessionId: form.sessionId,
        sessionName: session?.name || session?.academicYear || '',
        academicYear: term?.academicYear || session?.academicYear || '',
        termId: form.termId,
        termName: term?.name || '',
        subjectId: form.subjectId,
        subjectName: subj?.name || '',
        teacherId: user.id,
        teacherName: user.fullName,
        termStartDate: term?.startDate || '',
        termEndDate: term?.endDate || '',
        weeks: form.weeks,
      };

      if (plan) {
        await base44.entities.TermLessonPlan.update(plan.id, {
          ...payload,
          classId: plan.classId,
          className: plan.className || '',
          status: 'pending',
          approvedBy: '',
          approvedByName: '',
          approvalDate: '',
          approvalNotes: '',
        });
        toast.success('Term plan updated and resubmitted for approval');
      } else {
        const records = form.classIds.map(classId => ({
          ...payload,
          classId,
          className: classes.find(c => c.id === classId)?.className || '',
          status: 'pending',
        }));
        await base44.entities.TermLessonPlan.bulkCreate(records);
        toast.success(
          records.length === 1
            ? 'Term plan submitted for approval'
            : `${records.length} term plans submitted for approval`
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error('Failed to save term plan: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  const selectedTerm = terms.find(t => t.id === form.termId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Term Lesson Plan' : 'New Term Lesson Plan'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Academic Session *</Label>
              <Select value={form.sessionId} onValueChange={selectSession}>
                <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name || s.academicYear}</SelectItem>)}
                  {sessions.length === 0 && <SelectItem value="_" disabled>No sessions set up</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={form.termId} onValueChange={selectTerm} disabled={!form.sessionId}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  {sessionTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  {sessionTerms.length === 0 && <SelectItem value="_" disabled>No terms in this session</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{plan ? 'Class' : 'Classes *'}</Label>
              {plan ? (
                <div className="h-9 px-3 flex items-center rounded-xl border border-input bg-secondary/40 text-sm">
                  {plan.className}
                </div>
              ) : (
                <ClassMultiSelect options={classes} value={form.classIds} onChange={selectClasses} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsForClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  {subjectsForClass.length === 0 && <SelectItem value="_" disabled>No subjects for this class</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTerm && (
            <div className="flex items-center gap-2 p-3 bg-secondary/40 rounded-lg text-sm">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              <span>
                {selectedTerm.name} runs {selectedTerm.startDate} to {selectedTerm.endDate} — {form.weeks.length} teaching week{form.weeks.length === 1 ? '' : 's'} generated.
              </span>
            </div>
          )}

          {form.weeks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Weekly topics</Label>
                <span className="text-xs text-muted-foreground">{filledWeeks(form.weeks)} of {form.weeks.length} weeks planned</span>
              </div>
              <div className="space-y-2">
                {form.weeks.map((week, index) => (
                  <TermPlanWeekEditor
                    key={week.weekNumber}
                    week={week}
                    expanded={expandedWeek === index}
                    onToggle={() => setExpandedWeek(expandedWeek === index ? null : index)}
                    onChange={patch => setWeek(index, patch)}
                    onUploadPdf={file => handlePdf(index, file)}
                    uploading={uploadingWeek === index}
                  />
                ))}
              </div>
            </div>
          )}

          {!selectedTerm && (
            <p className="text-sm text-muted-foreground">
              Choose a session and term to generate the weekly schedule up to the end of the term.
            </p>
          )}

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            Each selected class gets its own copy of this plan, submitted together. Once an admin approves it, students and parents see it by subject.
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {plan ? 'Update & Resubmit' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}