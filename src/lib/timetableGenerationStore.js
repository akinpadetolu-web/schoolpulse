import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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

export async function startGeneration(schoolId, targetClassIds, prompt) {
  generationState = {
    status: 'generating',
    result: null,
    error: null,
    schoolId,
    classIds: targetClassIds,
    prompt,
    startedAt: Date.now(),
  };
  notify();

  try {
    const res = await base44.functions.invoke('generateTimetable', {
      schoolId,
      targetClassIds,
      prompt,
    });

    const hasSlots = res.data?.slots?.length > 0;
    if (hasSlots) {
      generationState = {
        ...generationState,
        status: 'success',
        result: res.data,
        error: null,
      };
      toast.success(`Generated ${res.data.slots.length} timetable entries`);
    } else {
      const errMsg = res.data?.error || 'No entries were generated';
      generationState = {
        ...generationState,
        status: 'error',
        result: res.data,
        error: errMsg,
      };
      toast.error(errMsg);
    }
  } catch (err) {
    const errorMsg = err?.message || 'Generation failed';
    const displayMsg = errorMsg.includes('504')
      ? 'Request timeout (504): AI generation took too long'
      : errorMsg;
    generationState = {
      ...generationState,
      status: 'error',
      error: displayMsg,
    };
    toast.error(displayMsg);
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