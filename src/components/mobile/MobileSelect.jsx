import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * MobileSelect: renders a bottom-sheet Drawer on mobile, standard Select on desktop.
 * Props mirror a subset of shadcn Select: value, onValueChange, placeholder, options: [{value, label}]
 * All other className props forwarded to the trigger.
 */
export default function MobileSelect({ value, onValueChange, placeholder = 'Select...', options = [], className = '', disabled = false }) {
  const [isMobile] = useState(() => window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDrawerOpen(true)}
        className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <span className={value ? '' : 'text-muted-foreground'}>{selectedLabel || placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-1 overflow-y-auto max-h-[60vh]">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium select-none transition-colors ${o.value === value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                style={{ minHeight: '44px' }}
              >
                {o.label}
                {o.value === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}