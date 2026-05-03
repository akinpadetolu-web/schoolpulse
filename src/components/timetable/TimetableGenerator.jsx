import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wand2, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TimetableGenerator({ schoolId, classes, subjects, teachers, onGenerated }) {
  const [selectedClassIds, setSelectedClassIds] = useState([]);
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

  async function handleGenerate() {
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateTimetable', {
        schoolId,
        targetClassIds: selectedClassIds.length === 0 ? classes.map(c => c.id) : selectedClassIds,
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
      setResult({ error: err?.message || 'Generation failed' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title and description */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 className="w-5 h-5" /> Intelligent AI Timetable Generator
        </h2>
        <p className="text-sm text-muted-foreground">Understands complex instructions, respects teacher assignments, detects clashes automatically. Uses your school's actual subjects and class data.</p>
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Example prompts you can use:</h3>
        <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
          <li>"Create a timetable for JS2 with double periods for Maths on Monday and Wednesday"</li>
          <li>"Spread Biology and Chemistry 2 periods each per week, no classes after 2pm on Fridays"</li>
          <li>"Schedule S3H Economics with double period on Tuesdays and Thursdays"</li>
          <li>"Prioritize Science and Math in morning slots"</li>
        </ul>
      </div>

      {/* Prompt input */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Additional Instructions (optional)</Label>
        <textarea
          placeholder="e.g. No PE on Mondays, double periods for Maths, spread Science across the week..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="w-full h-24 px-3 py-2 border border-input rounded-md text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Class Selection */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Target classes (leave blank to generate for all classes)</h3>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selectedClassIds.length === classes.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes found for this school.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {classes.map(cls => (
                <label key={cls.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedClassIds.includes(cls.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <Checkbox
                    checked={selectedClassIds.includes(cls.id)}
                    onCheckedChange={() => toggleClass(cls.id)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{cls.className}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result message */}
      {result?.error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {result.error}
        </div>
      )}

      {/* Generate Button */}
      <Button
        className="w-full h-11"
        onClick={handleGenerate}
        disabled={generating || classes.length === 0}
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
        ) : (
          <><Wand2 className="w-4 h-4 mr-2" /> Generate Timetable</>
        )}
      </Button>

      {/* Result */}
      {result && !result.error && (
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