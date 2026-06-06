import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Plus, X, AlertTriangle, Info, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const INVIGILATOR_ROLES = [
  { value: 'primary', label: 'Primary Invigilator' },
  { value: 'assistant', label: 'Assistant Invigilator' },
  { value: 'relief', label: 'Relief Invigilator (covers breaks)' },
  { value: 'external', label: 'External Invigilator' },
];

// Compute how many duties each teacher has across all entries
function computeWorkload(allEntries) {
  const counts = {};
  for (const entry of allEntries) {
    for (const inv of (entry.invigilators || [])) {
      counts[inv.teacherId] = (counts[inv.teacherId] || 0) + 1;
    }
    // legacy single invigilator field
    if (entry.invigilatorId && !(entry.invigilators?.length)) {
      counts[entry.invigilatorId] = (counts[entry.invigilatorId] || 0) + 1;
    }
  }
  return counts;
}

// Check conflicts for a teacher on a specific entry
function detectConflicts(teacherId, entryId, currentEntry, allEntries, teachers, subjects) {
  const warnings = [];
  if (!teacherId) return warnings;
  const teacher = teachers.find(t => t.id === teacherId);
  const tName = teacher?.fullName || 'Teacher';

  // 1. Same time conflict
  for (const other of allEntries) {
    if (other.id === entryId) continue;
    if (other.date !== currentEntry.date) continue;
    if (!currentEntry.startTime || !other.startTime) continue;
    const overlap = currentEntry.startTime < (other.endTime || '23:59') && (currentEntry.endTime || '23:59') > other.startTime;
    const assignedThere = (other.invigilators || []).some(inv => inv.teacherId === teacherId) ||
      (other.invigilatorId === teacherId && !other.invigilators?.length);
    if (overlap && assignedThere) {
      warnings.push({ type: 'error', msg: `⚠️ ${tName} is already assigned to ${other.subjectName} (${(other.classNames || []).join(', ')}) at ${other.startTime} on this date.` });
    }
  }

  // 2. Teaching own subject
  const entrySubjId = currentEntry.subjectId;
  const teachesThisSubject = (teacher?.assignedSubjects || []).includes(entrySubjId) || (teacher?.teachingAssignments || []).some(ta => ta.subjectId === entrySubjId);
  if (teachesThisSubject) {
    const subj = subjects.find(s => s.id === entrySubjId);
    warnings.push({ type: 'info', msg: `ℹ️ ${tName} teaches ${subj?.name || 'this subject'} and is assigned to invigilate it. Please confirm this is intentional.` });
  }

  return warnings;
}

export default function InvigilatorAssignmentPanel({ entry, allEntries, teachers, subjects, onSave, saving }) {
  const [invigilators, setInvigilators] = useState(() => {
    if (entry.invigilators?.length) return entry.invigilators;
    if (entry.invigilatorId) return [{ teacherId: entry.invigilatorId, teacherName: entry.invigilatorName || '', role: 'primary', checkinTime: '', instructions: '', confirmed: false }];
    return [];
  });
  const [suggestingAI, setSuggestingAI] = useState(false);

  const workload = computeWorkload(allEntries);

  function addInvigilator() {
    setInvigilators(prev => [...prev, { teacherId: '', teacherName: '', role: 'assistant', checkinTime: '', instructions: '', confirmed: false }]);
  }

  function removeInvigilator(idx) {
    setInvigilators(prev => prev.filter((_, i) => i !== idx));
  }

  function updateInv(idx, field, val) {
    setInvigilators(prev => prev.map((inv, i) => {
      if (i !== idx) return inv;
      if (field === 'teacherId') {
        const t = teachers.find(t => t.id === val);
        return { ...inv, teacherId: val, teacherName: t?.fullName || '' };
      }
      return { ...inv, [field]: val };
    }));
  }

  // All conflicts across assigned invigilators
  const allWarnings = invigilators.flatMap((inv, idx) =>
    inv.teacherId ? detectConflicts(inv.teacherId, entry.id, entry, allEntries, teachers, subjects) : []
  );

  async function handleSuggestAI() {
    setSuggestingAI(true);
    const alreadyAssigned = invigilators.map(i => i.teacherId).filter(Boolean);
    const available = teachers.filter(t => {
      const load = workload[t.id] || 0;
      const conflict = detectConflicts(t.id, entry.id, entry, allEntries, teachers, subjects).some(w => w.type === 'error');
      return !conflict;
    });

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are helping assign invigilators for a school exam.

Exam: ${entry.subjectName} on ${entry.date} at ${entry.startTime}–${entry.endTime}

Available teachers (not already in a conflict):
${available.map(t => `- ${t.fullName} (current duties: ${workload[t.id] || 0})`).join('\n')}

Already assigned: ${alreadyAssigned.map(id => teachers.find(t => t.id === id)?.fullName || id).join(', ') || 'none'}

Select the 1-2 best teachers prioritising:
1. Fewest duties (fair distribution)
2. Not teaching this subject (${entry.subjectName})
3. Not already assigned

Return array of up to 2 suggestions.`,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                teacherName: { type: 'string' },
                reason: { type: 'string' },
              }
            }
          }
        }
      }
    });

    const suggestions = res?.suggestions || [];
    if (suggestions.length === 0) { toast.info('No additional suggestions found'); setSuggestingAI(false); return; }

    // Find teacher IDs matching names
    for (const sug of suggestions) {
      const match = available.find(t => t.fullName?.toLowerCase().includes(sug.teacherName?.toLowerCase()) || sug.teacherName?.toLowerCase().includes(t.fullName?.toLowerCase()));
      if (match && !invigilators.some(inv => inv.teacherId === match.id)) {
        setInvigilators(prev => [...prev, { teacherId: match.id, teacherName: match.fullName, role: invigilators.length === 0 ? 'primary' : 'assistant', checkinTime: '', instructions: '', confirmed: false, aiReason: sug.reason }]);
        toast.success(`AI suggested: ${match.fullName} — ${sug.reason}`);
      }
    }
    setSuggestingAI(false);
  }

  function handleSave() {
    // Merge into entry format
    const updated = {
      invigilators,
      // Keep legacy field for backward compat
      invigilatorId: invigilators[0]?.teacherId || '',
      invigilatorName: invigilators[0]?.teacherName || '',
    };
    onSave(updated);
  }

  return (
    <div className="space-y-3">
      {/* Conflict warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-1">
          {allWarnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${w.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
              {w.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              {w.msg}
            </div>
          ))}
        </div>
      )}

      {/* Invigilator rows */}
      {invigilators.map((inv, idx) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
            <Select value={inv.role} onValueChange={val => updateInv(idx, 'role', val)}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{INVIGILATOR_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => removeInvigilator(idx)} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Select value={inv.teacherId} onValueChange={val => updateInv(idx, 'teacherId', val)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select teacher…" /></SelectTrigger>
            <SelectContent>
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName} ({workload[t.id] || 0} {(workload[t.id] || 0) === 1 ? 'duty' : 'duties'} assigned)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {inv.aiReason && <p className="text-xs text-primary italic">AI: {inv.aiReason}</p>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Check-in time</label>
              <input type="time" className="w-full border rounded px-2 py-1 text-xs mt-0.5 bg-background" value={inv.checkinTime || ''} onChange={e => updateInv(idx, 'checkinTime', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <div className="mt-1">
                <button type="button" onClick={() => updateInv(idx, 'confirmed', !inv.confirmed)}
                  className={`px-2 py-1 rounded text-xs border ${inv.confirmed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                  {inv.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                </button>
              </div>
            </div>
          </div>
          <textarea
            className="w-full border rounded px-2 py-1 text-xs resize-none min-h-[44px] bg-background"
            placeholder="Special instructions for invigilator (e.g. Bring extra answer booklets, check IDs at entry)"
            value={inv.instructions || ''}
            onChange={e => updateInv(idx, 'instructions', e.target.value)}
          />
        </div>
      ))}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addInvigilator}>
          <Plus className="w-3 h-3" /> Add Invigilator
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSuggestAI} disabled={suggestingAI}>
          {suggestingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          AI Suggest
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
        </Button>
      </div>
    </div>
  );
}