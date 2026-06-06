import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, RotateCcw, Eye, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { applyBrandColors, clearBrandColors, loadAndApplySchoolBrandColors, COLOR_DEFAULTS } from '@/lib/brandColors';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const COLOR_GROUPS = [
  {
    label: 'Brand Colors',
    fields: [
      { key: 'primaryColor', label: 'Primary Color', desc: 'Main brand color — buttons, active items, links' },
      { key: 'secondaryColor', label: 'Secondary Color', desc: 'Accent / supporting color' },
    ],
  },
  {
    label: 'Sidebar Navigation',
    fields: [
      { key: 'sidebarBgColor', label: 'Sidebar Background', desc: 'Background of the sidebar panel' },
      { key: 'sidebarTextColor', label: 'Sidebar Text / Icons', desc: 'Color of menu item labels and icons' },
      { key: 'sidebarActiveColor', label: 'Active Item Highlight', desc: 'Background of the selected menu item' },
    ],
  },
  {
    label: 'Top Navigation Bar',
    fields: [
      { key: 'topbarBgColor', label: 'Top Bar Background', desc: 'Background of the header/top bar' },
      { key: 'topbarTextColor', label: 'Top Bar Text / Icons', desc: 'Text and icon color in the top bar' },
    ],
  },
  {
    label: 'Page & Cards',
    fields: [
      { key: 'bodyBgColor', label: 'Page Background', desc: 'Main content area background' },
      { key: 'cardBgColor', label: 'Card / Panel Background', desc: 'Background of cards and widgets' },
      { key: 'borderColor', label: 'Border / Divider', desc: 'Color of card borders, table lines and dividers' },
    ],
  },
  {
    label: 'Buttons',
    fields: [
      { key: 'primaryBtnColor', label: 'Primary Button Background', desc: '' },
      { key: 'primaryBtnTextColor', label: 'Primary Button Text', desc: '' },
      { key: 'secondaryBtnColor', label: 'Secondary Button Background', desc: '' },
      { key: 'secondaryBtnTextColor', label: 'Secondary Button Text', desc: '' },
    ],
  },
  {
    label: 'Typography',
    fields: [
      { key: 'headingTextColor', label: 'Heading Text (H1–H3)', desc: '' },
      { key: 'bodyTextColor', label: 'Body / Paragraph Text', desc: '' },
      { key: 'linkColor', label: 'Link Color', desc: '' },
    ],
  },
  {
    label: 'Tables',
    fields: [
      { key: 'tableHeaderBgColor', label: 'Table Header Background', desc: '' },
      { key: 'tableHeaderTextColor', label: 'Table Header Text', desc: '' },
    ],
  },
  {
    label: 'Status & Badges',
    fields: [
      { key: 'badgeColor', label: 'Default Badge Color', desc: '' },
      { key: 'successColor', label: 'Success / Pass Color', desc: 'Positive stats, passing grades' },
      { key: 'warningColor', label: 'Warning Color', desc: 'Alerts, low attendance, caution states' },
      { key: 'dangerColor', label: 'Danger / Error Color', desc: 'Failed grades, absent, errors' },
    ],
  },
];

function buildInitialColors(school) {
  const colors = {};
  Object.keys(COLOR_DEFAULTS).forEach(k => {
    colors[k] = school?.[k] || COLOR_DEFAULTS[k];
  });
  return colors;
}

export default function BrandColorsSettings({ school, onSaved }) {
  const { reloadBrandColors } = useSchoolAuth();
  const savedColors = useRef(buildInitialColors(school));
  const [colors, setColors] = useState(() => buildInitialColors(school));
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function setColor(key, val) {
    const next = { ...colors, [key]: val };
    setColors(next);
    // Live preview: apply immediately as you pick a color
    applyBrandColors(next);
    setPreviewing(true);
  }

  function resetOne(key) {
    const next = { ...colors, [key]: COLOR_DEFAULTS[key] };
    setColors(next);
    applyBrandColors(next);
  }

  function resetAll() {
    setColors({ ...COLOR_DEFAULTS });
    applyBrandColors({ ...COLOR_DEFAULTS });
    setPreviewing(false);
    toast.info('Colors reset to defaults — click Save to persist.');
  }

  function handleCancelPreview() {
    // Revert to last saved colors
    setColors({ ...savedColors.current });
    applyBrandColors(savedColors.current);
    setPreviewing(false);
    toast.info('Preview reverted to saved colors.');
  }

  function handlePreview() {
    applyBrandColors(colors);
    setPreviewing(true);
    toast.success('Live preview active. Click Save to persist.');
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.School.update(school.id, colors);
    savedColors.current = { ...colors };
    // Re-fetch and apply from DB to confirm the save worked
    await reloadBrandColors(school.id);
    setPreviewing(false);
    toast.success('Brand colors saved and applied!');
    setSaving(false);
    onSaved?.();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4" /> Brand Colors
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={resetAll}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset All
            </Button>
            {previewing && (
              <Button type="button" variant="outline" size="sm" onClick={handleCancelPreview}>
                Cancel Preview
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Colors
            </Button>
          </div>
        </div>
        {previewing && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 mt-2">
            Live preview active — colors shown as you pick them. Click "Save Colors" to persist, or "Cancel Preview" to revert.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {COLOR_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.fields.map(({ key, label, desc }) => (
                <ColorRow
                  key={key}
                  label={label}
                  desc={desc}
                  value={colors[key]}
                  defaultValue={COLOR_DEFAULTS[key]}
                  onChange={val => setColor(key, val)}
                  onReset={() => resetOne(key)}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ColorRow({ label, desc, value, defaultValue, onChange, onReset }) {
  const isModified = value !== defaultValue;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="relative shrink-0">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border cursor-pointer p-0.5"
          title={value}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{label}</p>
        {desc && <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{desc}</p>}
        <p className="text-xs font-mono text-muted-foreground mt-0.5">{value}</p>
      </div>
      {isModified && (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}