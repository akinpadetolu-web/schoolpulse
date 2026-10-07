import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_OPTIONS = [
  { value: 'early_morning', label: 'Early Morning (5AM–8AM)' },
  { value: 'morning', label: 'Morning (8AM–12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM–4PM)' },
  { value: 'evening', label: 'Evening (4PM–7PM)' },
  { value: 'night', label: 'Night (7PM–10PM)' },
  { value: 'no_preference', label: 'No preference' },
];
const SESSION_OPTIONS = [
  { value: 'short', label: 'Short (25–30 min with breaks)' },
  { value: 'medium', label: 'Medium (45–60 min)' },
  { value: 'long', label: 'Long (1.5–2 hours)' },
  { value: 'mixed', label: 'Mixed (varies by subject)' },
];
const INTENSITY_OPTIONS = [
  { value: 'light', label: 'Light – Spread topics over many days' },
  { value: 'moderate', label: 'Moderate – Balanced approach' },
  { value: 'intensive', label: 'Intensive – Cover more topics per day' },
];

export default function StudyPlanCustomizer({ entries = [], prefs, onChange }) {
  const [open, setOpen] = useState(false);
  const MAX_CHARS = 1000;

  function set(key, val) {
    onChange({ ...prefs, [key]: val });
  }

  function toggleDay(day) {
    const blocked = prefs.blockedDays || [];
    set('blockedDays', blocked.includes(day) ? blocked.filter(d => d !== day) : [...blocked, day]);
  }

  function setSubjectPref(subjectId, field, val) {
    const sp = { ...(prefs.subjectPrefs || {}), [subjectId]: { ...(prefs.subjectPrefs?.[subjectId] || {}), [field]: val } };
    set('subjectPrefs', sp);
  }

  const specialLen = (prefs.specialInstructions || '').length;
  const examSubjects = [...new Map(entries.map(e => [e.subjectId, e])).values()];

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <Settings2 className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium text-sm flex-1">Customize Your Study Plan</span>
        {Object.keys(prefs.subjectPrefs || {}).length > 0 || (prefs.blockedDays || []).length > 0 || prefs.specialInstructions
          ? <Badge variant="secondary" className="text-xs">Customised</Badge> : null}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-5 bg-card">
          {/* Special instructions */}
          <div>
            <label className="text-sm font-medium block mb-1">Special Instructions or Additional Preferences</label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none min-h-[90px] focus:outline-none focus:ring-1 focus:ring-ring bg-background"
              maxLength={MAX_CHARS}
              placeholder={`e.g. I prefer studying in the morning.\nI find Mathematics very difficult.\nI want more time allocated to Science.\nI have football practice on Wednesdays.\nI cannot study on weekends.\nI want short 30 minute sessions with breaks.\nFocus more on topics I scored below 50% in.`}
              value={prefs.specialInstructions || ''}
              onChange={e => set('specialInstructions', e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">{MAX_CHARS - specialLen} characters remaining</p>
          </div>

          {/* Preferred time of day */}
          <div>
            <label className="text-sm font-medium block mb-2">Preferred Study Time of Day</label>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set('preferredTime', opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${prefs.preferredTime === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Session duration */}
          <div>
            <label className="text-sm font-medium block mb-2">Study Session Duration</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set('sessionDuration', opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${prefs.sessionDuration === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days not available */}
          <div>
            <label className="text-sm font-medium block mb-2">Days I Cannot Study</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button key={day} type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${(prefs.blockedDays || []).includes(day) ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-card hover:bg-muted'}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-sm font-medium block mb-2">Study Intensity</label>
            <div className="flex flex-wrap gap-2">
              {INTENSITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set('intensity', opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${prefs.intensity === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject-specific preferences */}
          {examSubjects.length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">Subject-Specific Preferences</label>
              <div className="space-y-2">
                {examSubjects.map(entry => {
                  const sp = prefs.subjectPrefs?.[entry.subjectId] || {};
                  return (
                    <Card key={entry.subjectId} className="border shadow-none">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-medium text-sm">{entry.subjectName}</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'extraFocus', label: '⭐ Extra Focus', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                            { key: 'difficult', label: '😓 I find this difficult', color: 'bg-red-100 text-red-700 border-red-300' },
                            { key: 'confident', label: '✅ I am confident', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                          ].map(tog => (
                            <button key={tog.key} type="button"
                              onClick={() => setSubjectPref(entry.subjectId, tog.key, !sp[tog.key])}
                              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${sp[tog.key] ? tog.color : 'bg-card hover:bg-muted'}`}>
                              {tog.label}
                            </button>
                          ))}
                        </div>
                        <input
                          className="w-full border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder={`Personal note for ${entry.subjectName}… (e.g. I need help with algebra)`}
                          value={sp.note || ''}
                          onChange={e => setSubjectPref(entry.subjectId, 'note', e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional constraints */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">Additional Constraints</label>
            {[
              { key: 'activities', placeholder: 'Activities or commitments that limit my study time (e.g. sports, music lessons, religious activities, family commitments)' },
              { key: 'concerns', placeholder: 'My biggest exam concerns (e.g. I always run out of time in exams, I forget formulas)' },
              { key: 'focusTopics', placeholder: 'Specific topics I want to focus on most (referencing lesson plan topics)' },
              { key: 'medicalConsiderations', placeholder: 'Any medical or personal considerations (optional — e.g. I have ADHD and need shorter study sessions)' },
            ].map(({ key, placeholder }) => (
              <div key={key}>
                <textarea
                  className="w-full border rounded-lg p-2 text-xs resize-none min-h-[50px] focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                  placeholder={placeholder}
                  value={prefs[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}