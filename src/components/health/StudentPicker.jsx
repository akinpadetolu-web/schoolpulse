import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StudentPicker({ students, classes, value, onChange, disabled }) {
  const classMap = {};
  (classes || []).forEach(c => { classMap[c.id] = c.className || c.name; });

  return (
    <div>
      <Label>Student *</Label>
      <Select
        value={value || ''}
        onValueChange={studentId => {
          const student = (students || []).find(s => s.id === studentId);
          onChange(studentId, student?.fullName || '');
        }}
        disabled={disabled}
      >
        <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
        <SelectContent>
          {(students || []).map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.fullName}{classMap[s.classId] ? ` — ${classMap[s.classId]}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}