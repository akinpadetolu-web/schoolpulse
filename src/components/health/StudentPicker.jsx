import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentPicker({ students, classes, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const classMap = {};
  (classes || []).forEach(c => { classMap[c.id] = c.className || c.name; });

  const selectedStudent = (students || []).find(s => s.id === value);

  return (
    <div>
      <Label>Student *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {selectedStudent
              ? `${selectedStudent.fullName}${classMap[selectedStudent.classId] ? ` — ${classMap[selectedStudent.classId]}` : ''}`
              : 'Select student...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search student by name or class..." />
            <CommandList>
              <CommandEmpty>No student found.</CommandEmpty>
              <CommandGroup>
                {(students || []).map(s => (
                  <CommandItem
                    key={s.id}
                    value={`${s.fullName} ${classMap[s.classId] || ''}`}
                    onSelect={() => {
                      onChange(s.id, s.fullName);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')} />
                    {s.fullName}{classMap[s.classId] ? ` — ${classMap[s.classId]}` : ''}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}