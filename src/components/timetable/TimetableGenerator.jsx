import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TimetableGenerator({ schoolId, classes, onGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) return toast.error('Please enter your timetable instructions');
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateTimetable', {
        schoolId,
        targetClassIds: classes.map(c => c.id),
        prompt,
      });
      setResult(res.data);
      if (res.data?.slots?.length > 0) {
        toast.success(`Generated ${res.data.slots.length} timetable entries`);
      } else {
        toast.error(res.data?.error || 'No entries were generated');
      }
    } catch (err) {
       const errorMsg = err?.message || 'Generation failed';
       const displayMsg = errorMsg.includes('504') 
         ? 'Request timeout (504): AI generation took too long'
         : errorMsg;
       toast.error(displayMsg);
       setResult({ error: displayMsg });
     } finally {
       setGenerating(false);
     }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 className="w-5 h-5" /> AI Timetable Generator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your timetable requirements. The AI will schedule all classes based on your instructions.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Your Instructions</Label>
        <textarea
          placeholder="e.g. Write a timetable for all classes, 45-minute periods, Mathematics/English/Science between 8:30am-12pm, short break 10:00-10:30, long break 12:00-1pm, school ends 3:15pm Mon-Thu and 2:30pm Fri..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="w-full h-36 px-3 py-2 border border-input rounded-md text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {result?.error && (
         <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
           <AlertTriangle className="w-4 h-4 flex-shrink-0" />
           <div>
             {result.error}
             {result.error?.includes('504') && <p className="text-xs mt-1 text-red-600">The AI generation took too long. Try with a shorter or clearer prompt, and ensure all classes, subjects, and teachers are configured.</p>}
           </div>
         </div>
       )}

      <Button className="w-full h-11" onClick={handleGenerate} disabled={generating}>
        {generating
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating... (this may take up to 60s)</>
          : <><Wand2 className="w-4 h-4 mr-2" /> Generate Timetable</>
        }
      </Button>

      {result && !result.error && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {result.stats?.clashes === 0
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <AlertTriangle className="w-4 h-4 text-amber-500" />}
            {result.slots?.length || 0} entries generated
            {result.stats?.clashes > 0 && ` · ${result.stats.clashes} clash(es) removed`}
          </div>

          {result.warnings?.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}