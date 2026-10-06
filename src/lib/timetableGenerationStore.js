import { toast } from 'sonner';
import { generateWeeklyTimetable } from '@/lib/timetableAIGenerator';

let generationState = {
  status: 'idle', // 'idle' | 'generating' | 'success' | 'error'
  result: null,
  error: null,
  schoolId: null,
  classIds: [],
  prompt: '',
  startedAt: null,
};

const listeners = new Set();

export function getGenerationState() {
  return generationState;
}

export function subscribeToGeneration(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach(cb => cb(generationState));
}

export async function startGeneration(schoolId, targetClassIds, prompt, breaks) {
  generationState = {
    status: 'generating',
    result: null,
    error: null,
    schoolId,
    classIds: targetClassIds,
    prompt,
    breaks,
    startedAt: Date.now(),
  };
  notify();

  try {
    const data = await generateWeeklyTimetable({ schoolId, targetClassIds, prompt, breaks });

    if (data?.error) {
      generationState = { ...generationState, status: 'error', result: data, error: data.error };
      toast.error(data.error);
    } else if (data?.slots?.length > 0) {
      generationState = { ...generationState, status: 'success', result: data, error: null };
      toast.success(`Generated ${data.slots.length} timetable entries`);
    } else {
      const errMsg = 'No entries were generated';
      generationState = { ...generationState, status: 'error', result: data, error: errMsg };
      toast.error(errMsg);
    }
  } catch (err) {
    const errorMsg = err?.message || 'Generation failed';
    generationState = { ...generationState, status: 'error', error: errorMsg };
    toast.error(errorMsg);
  }
  notify();
}

export function clearGeneration() {
  generationState = {
    status: 'idle',
    result: null,
    error: null,
    schoolId: null,
    classIds: [],
    prompt: '',
    startedAt: null,
  };
  notify();
}