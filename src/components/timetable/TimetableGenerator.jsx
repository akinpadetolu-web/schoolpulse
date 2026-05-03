import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TimetableGenerator({ schoolId, classes, subjects, teachers, onGenerated }) {
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [startTime, setStartTime] = useState('08:30');
  const [periodDuration, setPeriodDuration] = useState(45);
  const [periodsPerDay, setPeriodsPerDay] = useState(7);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const toggleClass = (id) => {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedClassIds(prev =>
      prev.length === classes.length ? [] : classes.map(c => c.id)
    );
  };

  const getSubjectCount = (classId) =>
    subjects.filter(s => !s.applicableClasses?.length || s.applicableClasses.includes(classId)).length;

  const getTeacherCount = () => teachers.length;

  async function handleGenerate() {
    if (selectedClassIds.length === 0) return toast.error('Select at least one class');
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateTimetable', {
        schoolId,
        targetClassIds: selectedClassIds,
        startTime,
        periodDuration: Number(periodDuration),
        periodsPerDay: Number(periodsPerDay),
        prompt,
      });
      setResult(res.data);
      if (res.data?.slots?.length > 0) {
        toast.success(`Generated ${res.data.slots.length} timetable entries`);
      } else {
        toast.error('No entries were generated');
      }
    } catch (err) {
      toast.error(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{classes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Classes</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{subjects.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Subjects</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${teachers.length === 0 ? 'text-amber-500' : 'text-blue-600'}`}>{teachers.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Teachers</div>
          </CardContent>
        </Card>
      </div>

      {teachers.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          No teachers found. Entries will be generated without teacher assignments.
        </div>
      )}

      {/* Schedule Settings */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-sm">Schedule Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Period Duration (min)</Label>
              <Input type="number" min={20} max={90} value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Periods Per Day</Label>
              <Input type="number" min={3} max={10} value={periodsPerDay} onChange={e => setPeriodsPerDay(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Selection */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Select Classes</h3>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selectedClassIds.length === classes.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes found for this school.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classes.map(cls => (
                <label key={cls.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedClassIds.includes(cls.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <Checkbox
                    checked={selectedClassIds.includes(cls.id)}
                    onCheckedChange={() => toggleClass(cls.id)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{cls.className}</div>
                    <div className="text-xs text-muted-foreground">{getSubjectCount(cls.id)} subjects</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional instructions */}
      <div className="space-y-1.5">
        <Label className="text-xs">Additional Instructions (optional)</Label>
        <Input
          placeholder="e.g. No PE on Mondays, double periods for Maths..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>

      {/* Generate Button */}
      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={generating || selectedClassIds.length === 0}
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
        ) : (
          <><Wand2 className="w-4 h-4 mr-2" /> Generate Timetable</>
        )}
      </Button>

      {/* Result */}
      {result && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {result.stats?.clashes === 0
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {result.slots?.length || 0} entries generated
              {result.stats?.clashes > 0 && ` · ${result.stats.clashes} clash(es)`}
            </div>

            {result.warnings?.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{w}
                  </div>
                ))}
              </div>
            )}

            {result.slots?.length > 0 && (
              <Button variant="outline" size="sm" className="w-full" onClick={onGenerated}>
                View Timetable <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}