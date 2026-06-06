import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link, Image, Plus, Monitor, Smartphone, Tag, Save } from 'lucide-react';
import { toast } from 'sonner';

const PERSONALIZATION_TAGS = ['{{first_name}}','{{last_name}}','{{full_name}}','{{student_name}}','{{class_name}}','{{school_name}}','{{date}}'];

const BLOCK_TYPES = [
  { type: 'header', label: 'Header', icon: '⬛', defaultContent: { text: 'Email Header', bgColor: '#1e40af', textColor: '#ffffff', align: 'center', fontSize: 24 } },
  { type: 'text', label: 'Text Block', icon: '📝', defaultContent: { text: '<p>Your text here. You can use {{first_name}} and other personalization tags.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 20 } },
  { type: 'two_col', label: '2 Columns', icon: '⬜⬜', defaultContent: { left: '<p>Left column</p>', right: '<p>Right column</p>', bgColor: '#ffffff' } },
  { type: 'image', label: 'Image', icon: '🖼', defaultContent: { src: '', alt: 'Image', width: '100%', align: 'center' } },
  { type: 'button', label: 'Button', icon: '🔘', defaultContent: { text: 'Click Here', url: '#', bgColor: '#1e40af', textColor: '#ffffff', align: 'center' } },
  { type: 'divider', label: 'Divider', icon: '—', defaultContent: { color: '#e5e7eb', thickness: 1 } },
  { type: 'spacer', label: 'Spacer', icon: '↕', defaultContent: { height: 20 } },
  { type: 'footer', label: 'Footer', icon: '📋', defaultContent: { text: '© {{school_name}} · <a href="#">Unsubscribe</a>', bgColor: '#f9fafb', textColor: '#6b7280', align: 'center' } },
];

function BlockRenderer({ block, onUpdate, onDelete }) {
  const c = block.content;
  if (block.type === 'header') return (
    <div style={{ backgroundColor: c.bgColor, color: c.textColor, textAlign: c.align, padding: '24px', fontSize: c.fontSize }} className="relative group">
      <span>{c.text}</span>
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'text') return (
    <div style={{ backgroundColor: c.bgColor, color: c.textColor, padding: `${c.padding}px` }} className="relative group">
      <div dangerouslySetInnerHTML={{ __html: c.text }} />
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'two_col') return (
    <div style={{ backgroundColor: c.bgColor }} className="grid grid-cols-2 gap-4 p-4 relative group">
      <div dangerouslySetInnerHTML={{ __html: c.left }} />
      <div dangerouslySetInnerHTML={{ __html: c.right }} />
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'image') return (
    <div className="p-4 relative group text-center">
      {c.src ? <img src={c.src} alt={c.alt} style={{ width: c.width, maxWidth: '100%', margin: '0 auto' }} /> : <div className="bg-muted h-24 rounded flex items-center justify-center text-muted-foreground text-sm">Image placeholder</div>}
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'button') return (
    <div style={{ textAlign: c.align }} className="p-4 relative group">
      <a href={c.url} style={{ backgroundColor: c.bgColor, color: c.textColor, padding: '12px 24px', borderRadius: 6, display: 'inline-block', textDecoration: 'none', fontWeight: 600 }}>{c.text}</a>
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'divider') return (
    <div className="px-4 py-2 relative group">
      <hr style={{ borderColor: c.color, borderWidth: c.thickness }} />
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'spacer') return (
    <div style={{ height: c.height }} className="relative group">
      <BlockActions onDelete={onDelete} />
    </div>
  );
  if (block.type === 'footer') return (
    <div style={{ backgroundColor: c.bgColor, color: c.textColor, textAlign: c.align, padding: '16px 24px', fontSize: 12 }} className="relative group">
      <div dangerouslySetInnerHTML={{ __html: c.text }} />
      <BlockActions onDelete={onDelete} />
    </div>
  );
  return null;
}

function BlockActions({ onDelete }) {
  return (
    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
      <button onClick={onDelete} className="bg-red-500 text-white rounded px-1.5 py-0.5 text-xs hover:bg-red-600">✕</button>
    </div>
  );
}

export default function EmailEditorModal({ template, onSave, onCancel, mode = 'template' }) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [description, setDescription] = useState(template?.description || '');
  const [blocks, setBlocks] = useState(template?.blocks?.length ? template.blocks : [
    { id: 1, type: 'header', content: { text: name || 'Email Title', bgColor: '#1e40af', textColor: '#ffffff', align: 'center', fontSize: 24 } },
    { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>Your message here.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 20 } },
    { id: 3, type: 'footer', content: { text: '© {{school_name}} · <a href="#">Unsubscribe</a>', bgColor: '#f9fafb', textColor: '#6b7280', align: 'center' } },
  ]);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [saving, setSaving] = useState(false);

  function addBlock(blockType) {
    const def = BLOCK_TYPES.find(b => b.type === blockType);
    if (!def) return;
    setBlocks(prev => [...prev, { id: Date.now(), type: blockType, content: { ...def.defaultContent } }]);
  }

  function deleteBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }

  function generateHTML() {
    return blocks.map(b => {
      const c = b.content;
      if (b.type === 'header') return `<div style="background-color:${c.bgColor};color:${c.textColor};text-align:${c.align};padding:24px;font-size:${c.fontSize}px;font-weight:bold">${c.text}</div>`;
      if (b.type === 'text') return `<div style="background-color:${c.bgColor};color:${c.textColor};padding:${c.padding}px">${c.text}</div>`;
      if (b.type === 'two_col') return `<table style="width:100%;background-color:${c.bgColor}"><tr><td style="width:50%;padding:16px;vertical-align:top">${c.left}</td><td style="width:50%;padding:16px;vertical-align:top">${c.right}</td></tr></table>`;
      if (b.type === 'image') return c.src ? `<div style="text-align:center;padding:16px"><img src="${c.src}" alt="${c.alt}" style="width:${c.width};max-width:100%" /></div>` : '';
      if (b.type === 'button') return `<div style="text-align:${c.align};padding:16px"><a href="${c.url}" style="background-color:${c.bgColor};color:${c.textColor};padding:12px 24px;border-radius:6px;display:inline-block;text-decoration:none;font-weight:600">${c.text}</a></div>`;
      if (b.type === 'divider') return `<hr style="border-color:${c.color};border-width:${c.thickness}px;margin:0 16px" />`;
      if (b.type === 'spacer') return `<div style="height:${c.height}px"></div>`;
      if (b.type === 'footer') return `<div style="background-color:${c.bgColor};color:${c.textColor};text-align:${c.align};padding:16px 24px;font-size:12px">${c.text}</div>`;
      return '';
    }).join('\n');
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    const html = generateHTML();
    await onSave({ name, category, description, emailBody: html, blocks, schoolId: template?.schoolId });
    setSaving(false);
  }

  const CATEGORY_OPTIONS = [
    { value: 'welcome', label: 'Welcome' }, { value: 'report_card', label: 'Report Card' },
    { value: 'fee_reminder', label: 'Fee Reminder' }, { value: 'exam_timetable', label: 'Exam Timetable' },
    { value: 'event_invitation', label: 'Event' }, { value: 'emergency', label: 'Emergency' },
    { value: 'newsletter', label: 'Newsletter' }, { value: 'parent_teacher_meeting', label: 'Parent-Teacher' }, { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Button>
        <h2 className="text-xl font-bold">{template?.id ? 'Edit Template' : 'New Template'}</h2>
        <Button size="sm" className="ml-auto gap-1.5" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> Save Template
        </Button>
      </div>

      {/* Template meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/40 rounded-xl">
        <div>
          <p className="text-xs font-medium mb-1 text-muted-foreground">Template Name *</p>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Newsletter" className="h-8 text-sm" />
        </div>
        <div>
          <p className="text-xs font-medium mb-1 text-muted-foreground">Category</p>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs font-medium mb-1 text-muted-foreground">Description</p>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" className="h-8 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Block palette */}
        <div className="lg:col-span-1">
          <div className="bg-muted/40 rounded-xl p-3 sticky top-4">
            <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Add Blocks</p>
            <div className="space-y-1.5">
              {BLOCK_TYPES.map(b => (
                <button key={b.type} onClick={() => addBlock(b.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border hover:border-primary hover:text-primary text-left text-sm transition-colors">
                  <span className="text-base">{b.icon}</span>
                  <span className="text-xs font-medium">{b.label}</span>
                  <Plus className="w-3 h-3 ml-auto opacity-40" />
                </button>
              ))}
            </div>
            <Separator className="my-3" />
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Personalization</p>
            <div className="flex flex-wrap gap-1">
              {PERSONALIZATION_TAGS.map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => { navigator.clipboard.writeText(tag); toast.success(`Copied ${tag}`); }}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Preview</p>
            <div className="flex gap-1">
              <Button variant={previewMode === 'desktop' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('desktop')}>
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </Button>
              <Button variant={previewMode === 'mobile' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('mobile')}>
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </Button>
            </div>
          </div>
          <div className={`mx-auto bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
            {blocks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Add blocks from the left panel to build your email
              </div>
            ) : (
              blocks.map(block => (
                <BlockRenderer key={block.id} block={block} onDelete={() => deleteBlock(block.id)} onUpdate={() => {}} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}