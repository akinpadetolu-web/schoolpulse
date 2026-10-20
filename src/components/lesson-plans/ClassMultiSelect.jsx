import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClassMultiSelect({ options, value, onChange, placeholder = 'Select classes' }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);

  const label = value.length === 0
    ? placeholder
    : value.length === 1
      ? (options.find(o => o.id === value[0])?.className || '1 class')
      : `${value.length} classes selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-9 px-3 justify-between font-normal"
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground/70')}>{label}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1 max-h-64 overflow-y-auto">
        {options.length === 0 && <p className="text-sm text-muted-foreground p-2">No classes available</p>}
        {options.map(o => (
          <label
            key={o.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100"
          >
            <Checkbox checked={value.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
            <span className="truncate">{o.className}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}