import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar, Clock, MapPin, User, Pencil, Trash2, ChevronDown, ChevronUp,
  Search, Download, Eye, Users, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import InvigilatorAssignmentPanel from '@/components/timetable/InvigilatorAssignmentPanel';

export default function ExamScheduleTab({
  entries, classes, subjects, teachers,
  onDeleteEntry, onUpdateEntry,
  savingInv, onSaveInvigilators
}) {
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedInv, setExpandedInv] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);

  const filteredEntries = (entries || [])
    .filter(e => {
      if (filterClass !== 'all' && !(e.classIds || []).includes(filterClass)) return false;
      if (filterSubject !== 'all' && e.subjectId !== filterSubject) return false;
      if (search && !e.subjectName?.toLowerCase().includes(search.toLowerCase()) && !e.venue?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  function openEdit(entry) {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      venue: entry.venue || '',
      examType: entry.examType || 'written',
      maxMarks: entry.maxMarks || 100,
      notes: entry.notes || '',
      invigilatorId: entry.invigilatorId || '',
    });
  }

  async function saveEdit() {
    setSavingEdit(true);
    const teacher = teachers.find(t => t.id === editForm.invigilatorId);
    const dayOfWeek = editForm.date ? new Date(editForm.date).toLocaleDateString('en-US', { weekday: 'long' }) : editingEntry.dayOfWeek;
    await onUpdateEntry(editingEntry.id, {
      ...editForm,
      dayOfWeek,
      invigilatorName: teacher?.fullName || editingEntry.invigilatorName || '',
    });
    setEditingEntry(null);
    setSavingEdit(false);
    toast.success('Exam entry updated');
  }

  const changeLog = entries.flatMap(e => (e.changeLog || [])).sort((a, b) => new Date(b.at) - new Date(a.at));

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="font-semibold text-lg text-foreground mb-2">No exam timetable generated yet</p>
        <p className="text-sm">Go to <strong>AI Exam Planner</strong> tab to generate your exam timetable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subject or venue…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 ml-auto">
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/60 border-b">
            <tr>
              {['Date & Day', 'Subject', 'Class(es)', 'Time', 'Venue', 'Invigilator', 'Type', 'Marks', 'Notes', 'Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEntries.map((entry, i) => {
              const hasInv = entry.invigilators?.length > 0 || !!entry.invigilatorId;
              const isExpanded = expandedInv === entry.id;
              return (
                <React.Fragment key={entry.id || i}>
                  <tr className={`hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-primary text-xs">{entry.dayOfWeek?.slice(0, 3)}</div>
                      <div className="font-semibold text-sm">{entry.date ? format(new Date(entry.date), 'MMM d, yyyy') : '—'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{entry.subjectName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {(entry.classNames || []).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs font-mono">
                      {entry.startTime && entry.endTime ? `${entry.startTime}–${entry.endTime}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {entry.venue ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{entry.venue}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {hasInv ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 shrink-0" />
                          {entry.invigilatorName || (entry.invigilators?.[0]?.teacherName) || 'Assigned'}
                        </span>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">No Invigilator</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-xs capitalize">{entry.examType || 'written'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {entry.maxMarks || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate" title={entry.notes}>
                      {entry.notes || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors rounded"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedInv(isExpanded ? null : entry.id)}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors rounded"
                          title="Invigilators"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="px-4 pb-4 pt-2 bg-muted/20 border-t">
                        <InvigilatorAssignmentPanel
                          entry={entry}
                          allEntries={entries}
                          teachers={teachers}
                          subjects={subjects}
                          saving={savingInv}
                          onSave={(invData) => onSaveInvigilators(entry.id, invData)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Change log */}
      {changeLog.length > 0 && (
        <div className="border rounded-xl">
          <button
            onClick={() => setShowChangeLog(v => !v)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/30 transition-colors rounded-xl"
          >
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" />Change History ({changeLog.length})</span>
            {showChangeLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showChangeLog && (
            <div className="px-4 pb-4 space-y-2 border-t pt-3">
              {changeLog.map((log, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <Clock className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong>{log.at ? format(new Date(log.at), 'MMM d, yyyy h:mm a') : ''}</strong>
                    {' — '}{log.by || 'Admin'} changed <strong>{log.field}</strong>
                    {' from "'}
                    {log.from || '—'}
                    {'" to "'}
                    {log.to || '—'}
                    {'"'}
                    {log.subject && <span> ({log.subject})</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exam: {editingEntry?.subjectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Exam Type</Label>
                <Select value={editForm.examType} onValueChange={v => setEditForm(p => ({ ...p, examType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['written', 'oral', 'practical', 'multiple_choice'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={editForm.startTime} onChange={e => setEditForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={editForm.endTime} onChange={e => setEditForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Venue</Label>
                <Input value={editForm.venue} onChange={e => setEditForm(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Hall A" className="mt-1" />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input type="number" value={editForm.maxMarks} onChange={e => setEditForm(p => ({ ...p, maxMarks: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Primary Invigilator</Label>
              <Select value={editForm.invigilatorId} onValueChange={v => setEditForm(p => ({ ...p, invigilatorId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select teacher (optional)" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes / Special Instructions</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} disabled={savingEdit} className="flex-1">Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}