// Lightweight local draft storage for in-progress data-entry forms.
// Keeps unsaved teacher input on the device so a refresh, navigation or a
// brief loss of connection does not wipe the work. Nothing is uploaded.

const PREFIX = 'sep_draft_';

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: new Date().toISOString() }));
  } catch { /* storage unavailable — drafts are best-effort */ }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch { /* ignore */ }
}