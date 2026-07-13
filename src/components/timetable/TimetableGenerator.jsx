import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getGenerationState, subscribeToGeneration, startGeneration, clearGeneration } from '@/lib/timetableGenerationStore';

export default function TimetableGenerator({ schoolId, classes, onGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState([]);

  // Sync with module-level store — survives navigation away and back
  const genState = useSyncExternalStore(subscribeToGeneration, getGenerationState, getGenerationState);
  const generating = genState.status === 'generating';
  const result = genState.status === 'success' ? genState.result : (genState.status === 'error' ? { error: genState.error } : null);

  // Restore prompt if a generation is in-flight (e.g. user navigated away and came back)
  useEffect(() => {
    if (genState.status === 'generating' && genState.prompt && !prompt) {
      setPrompt(genState.prompt);
      if (genState.classIds?.length) setSelectedClassIds(genState.classIds);
    }
  }, [genState.status]);

  // Default: select all classes on first load
  useEffect(() => {
    if (classes.length > 0 && selectedClassIds.length === 0 && genState.status === 'idle') {
      setSelectedClassIds(classes.map(c => c.id));
    }
  }, [classes]);

  function toggleClass(classId) {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  }

  async function handleGenerate() {
    if (!prompt.trim()) return toast.error('Please enter your timetable instructions');
    if (selectedClassIds.length === 0) return toast.error('Please select at least one class');
    // startGeneration lives at module level — the promise survives component unmount
    await startGeneration(schoolId, selectedClassIds, prompt);
  }

  function handleClearResult() {
    clearGeneration();
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Select Classes</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedClassIds(classes.map(c => c.id))}
              className="text-xs text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={() => setSelectedClassIds([])}
              className="text-xs text-muted-foreground hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => toggleClass(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedClassIds.includes(c.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-input hover:bg-accent'
              }`}
            >
              {c.className}
            </button>
          ))}
        </div>
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

      {generating && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Generating timetable in the background — you can navigate to other pages and come back anytime.</span>
        </div>
      )}

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
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating... (this may take up to 70s)</>
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
            <button onClick={handleClearResult} className="ml-auto text-xs text-muted-foreground hover:underline">Dismiss</button>
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