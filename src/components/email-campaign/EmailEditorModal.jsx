import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Monitor, Smartphone, Save, Undo2, Redo2, RotateCcw, ChevronUp, ChevronDown, Copy, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const PERSONALIZATION_TAGS = ['{{first_name}}','{{last_name}}','{{full_name}}','{{student_name}}','{{class_name}}','{{school_name}}','{{date}}'];

const CATEGORY_OPTIONS = [
  { value: 'welcome', label: 'Welcome' }, { value: 'report_card', label: 'Report Card' },
  { value: 'fee_reminder', label: 'Fee Reminder' }, { value: 'exam_timetable', label: 'Exam Timetable' },
  { value: 'event_invitation', label: 'Event' }, { value: 'emergency', label: 'Emergency' },
  { value: 'newsletter', label: 'Newsletter' }, { value: 'parent_teacher_meeting', label: 'Parent-Teacher' },
  { value: 'achievement', label: 'Achievement' }, { value: 'new_student', label: 'New Student' }, { value: 'custom', label: 'Custom' },
];

const BLOCK_PALETTE = [
  { type: 'header',   label: 'Header/Hero',    icon: '🟦', defaultContent: { text: 'Email Header', bgColor: '#1e40af', textColor: '#ffffff', align: 'center', fontSize: 28, subtext: '', subtextColor: '#c7d2fe', paddingV: 40 } },
  { type: 'text',     label: 'Text Block',     icon: '📝', defaultContent: { text: '<p>Dear {{first_name}},</p><p>Your message here.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 20 } },
  { type: 'two_col',  label: '2 Columns',      icon: '⬜⬜', defaultContent: { left: '<p>Left content</p>', right: '<p>Right content</p>', bgColor: '#ffffff', leftBg: '#f9fafb', rightBg: '#f9fafb' } },
  { type: 'cards',    label: 'Info Cards',     icon: '🃏', defaultContent: { cards: [{ icon: '📅', title: 'Date', text: 'Click to edit', bgColor: '#eff6ff', textColor: '#1e40af' }, { icon: '📚', title: 'Topic', text: 'Click to edit', bgColor: '#f0fdf4', textColor: '#166534' }, { icon: '🎯', title: 'Goal', text: 'Click to edit', bgColor: '#fef9c3', textColor: '#854d0e' }], bgColor: '#ffffff' } },
  { type: 'table',    label: 'Data Table',     icon: '📊', defaultContent: { headers: ['Date','Subject','Time','Venue'], rows: [['Monday, Jun 10','Mathematics','09:00 AM','Hall A'],['Tuesday, Jun 11','English','11:00 AM','Hall B']], headerBg: '#1e40af', headerText: '#ffffff', rowBg: '#ffffff', altRowBg: '#f8fafc', borderColor: '#e2e8f0' } },
  { type: 'image',    label: 'Image',          icon: '🖼', defaultContent: { src: '', alt: 'Image', width: '100%', align: 'center', bgColor: '#ffffff' } },
  { type: 'button',   label: 'Button',         icon: '🔘', defaultContent: { text: 'Click Here', url: '#', bgColor: '#1e40af', textColor: '#ffffff', align: 'center', borderRadius: 6, fontSize: 15, paddingH: 28, paddingV: 12 } },
  { type: 'divider',  label: 'Divider',        icon: '—',  defaultContent: { color: '#e5e7eb', thickness: 1, style: 'solid', marginH: 16 } },
  { type: 'spacer',   label: 'Spacer',         icon: '↕',  defaultContent: { height: 20 } },
  { type: 'quote',    label: 'Quote/Highlight',icon: '💬', defaultContent: { text: 'Inspirational quote or highlight text goes here.', author: '', bgColor: '#eff6ff', borderColor: '#3b82f6', textColor: '#1e40af', fontSize: 16 } },
  { type: 'footer',   label: 'Footer',         icon: '📋', defaultContent: { text: '© {{school_name}} | All rights reserved', address: '', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f9fafb', textColor: '#6b7280', align: 'center' } },
];

// ─── Block Renderer ──────────────────────────────────────────────
function BlockRenderer({ block, selected, onSelect, onDelete, onMoveUp, onMoveDown, onDuplicate }) {
  const c = block.content;
  const isSelected = selected;

  const wrapper = (children) => (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`relative group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'}`}
    >
      {children}
      {/* Hover/selected toolbar */}
      <div className={`absolute top-0 right-0 z-10 flex gap-0.5 bg-blue-600 rounded-bl-lg px-1 py-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="text-white hover:text-blue-200 p-0.5" title="Move up"><ChevronUp className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="text-white hover:text-blue-200 p-0.5" title="Move down"><ChevronDown className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="text-white hover:text-blue-200 p-0.5" title="Duplicate"><Copy className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-200 hover:text-red-100 p-0.5" title="Delete"><Trash2 className="w-3 h-3" /></button>
        <span className="text-blue-200 p-0.5"><Pencil className="w-3 h-3" /></span>
      </div>
    </div>
  );

  if (block.type === 'header') return wrapper(
    <div style={{ backgroundColor: c.bgColor, color: c.textColor, textAlign: c.align, padding: `${c.paddingV||32}px 24px`, fontSize: c.fontSize || 28, fontWeight: 'bold', lineHeight: 1.2 }}>
      <div>{c.text}</div>
      {c.subtext && <div style={{ fontSize: Math.round((c.fontSize||28)*0.55), color: c.subtextColor||'#c7d2fe', marginTop: 8, fontWeight: 400 }}>{c.subtext}</div>}
    </div>
  );

  if (block.type === 'text') return wrapper(
    <div style={{ backgroundColor: c.bgColor, color: c.textColor, padding: `${c.padding||20}px` }}>
      <div dangerouslySetInnerHTML={{ __html: c.text }} />
    </div>
  );

  if (block.type === 'two_col') return wrapper(
    <div style={{ backgroundColor: c.bgColor }} className="grid grid-cols-2">
      <div style={{ backgroundColor: c.leftBg||'transparent', padding: 16 }} dangerouslySetInnerHTML={{ __html: c.left }} />
      <div style={{ backgroundColor: c.rightBg||'transparent', padding: 16 }} dangerouslySetInnerHTML={{ __html: c.right }} />
    </div>
  );

  if (block.type === 'cards') return wrapper(
    <div style={{ backgroundColor: c.bgColor, padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.cards?.length || 3}, 1fr)`, gap: 12 }}>
        {(c.cards||[]).map((card, i) => (
          <div key={i} style={{ backgroundColor: card.bgColor||'#eff6ff', borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontWeight: 700, color: card.textColor||'#1e40af', fontSize: 14, marginBottom: 4 }}>{card.title}</div>
            <div style={{ color: card.textColor||'#1e40af', fontSize: 12, opacity: 0.8 }}>{card.text}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (block.type === 'table') return wrapper(
    <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {(c.headers||[]).map((h, i) => (
              <th key={i} style={{ backgroundColor: c.headerBg||'#1e40af', color: c.headerText||'#ffffff', padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(c.rows||[]).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ backgroundColor: ri % 2 === 0 ? (c.rowBg||'#ffffff') : (c.altRowBg||'#f8fafc'), padding: '9px 12px', borderBottom: `1px solid ${c.borderColor||'#e2e8f0'}` }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (block.type === 'image') return wrapper(
    <div style={{ backgroundColor: c.bgColor||'#ffffff', padding: 16, textAlign: c.align||'center' }}>
      {c.src
        ? <img src={c.src} alt={c.alt||'Image'} style={{ width: c.width||'100%', maxWidth: '100%', display: 'inline-block' }} />
        : <div style={{ background: '#f1f5f9', borderRadius: 8, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, border: '2px dashed #e2e8f0' }}>🖼 Click to add image URL</div>
      }
    </div>
  );

  if (block.type === 'button') return wrapper(
    <div style={{ textAlign: c.align||'center', padding: `${c.paddingV||12}px 16px` }}>
      <span style={{ backgroundColor: c.bgColor, color: c.textColor, padding: `${c.paddingV||12}px ${c.paddingH||28}px`, borderRadius: c.borderRadius||6, display: 'inline-block', textDecoration: 'none', fontWeight: 700, fontSize: c.fontSize||15, cursor: 'default' }}>{c.text}</span>
    </div>
  );

  if (block.type === 'divider') return wrapper(
    <div style={{ padding: `8px ${c.marginH||16}px` }}>
      <hr style={{ borderTop: `${c.thickness||1}px ${c.style||'solid'} ${c.color||'#e5e7eb'}`, border: 'none', borderTopStyle: c.style||'solid', borderTopWidth: c.thickness||1, borderTopColor: c.color||'#e5e7eb' }} />
    </div>
  );

  if (block.type === 'spacer') return wrapper(
    <div style={{ height: c.height||20, backgroundColor: 'transparent' }} />
  );

  if (block.type === 'quote') return wrapper(
    <div style={{ backgroundColor: c.bgColor||'#eff6ff', borderLeft: `4px solid ${c.borderColor||'#3b82f6'}`, padding: '20px 24px', margin: '0' }}>
      <p style={{ color: c.textColor||'#1e40af', fontSize: c.fontSize||16, fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>{c.text}</p>
      {c.author && <p style={{ color: c.textColor||'#1e40af', opacity: 0.7, fontSize: 13, marginTop: 8, fontWeight: 600 }}>— {c.author}</p>}
    </div>
  );

  if (block.type === 'footer') return wrapper(
    <div style={{ backgroundColor: c.bgColor||'#f9fafb', color: c.textColor||'#6b7280', textAlign: c.align||'center', padding: '20px 24px', fontSize: 12 }}>
      <p style={{ margin: '0 0 4px' }}>{c.text}</p>
      {c.address && <p style={{ margin: '0 0 4px', opacity: 0.7 }}>{c.address}</p>}
      <p style={{ margin: 0 }}><a href={c.unsubUrl||'#'} style={{ color: c.textColor||'#6b7280' }}>{c.unsubText||'Unsubscribe'}</a></p>
    </div>
  );

  return null;
}

// ─── Block Property Panel ────────────────────────────────────────
function BlockPropertyPanel({ block, onChange }) {
  if (!block) return (
    <div className="text-center py-8 text-muted-foreground text-xs">
      <Pencil className="w-5 h-5 mx-auto mb-2 opacity-30" />
      Click any block in the canvas to edit its properties
    </div>
  );
  const c = block.content;
  const upd = (key, val) => onChange({ ...c, [key]: val });

  const ColorField = ({ label, field }) => (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <input type="color" value={c[field]||'#000000'} onChange={e => upd(field, e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-border p-0.5" />
        <Input value={c[field]||''} onChange={e => upd(field, e.target.value)} className="h-7 text-xs font-mono" />
      </div>
    </div>
  );

  const TextField = ({ label, field, multiline }) => (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      {multiline
        ? <textarea value={c[field]||''} onChange={e => upd(field, e.target.value)} rows={3} className="w-full text-xs rounded-md border border-input bg-transparent px-2 py-1.5 resize-none" />
        : <Input value={c[field]||''} onChange={e => upd(field, e.target.value)} className="h-7 text-xs" />
      }
    </div>
  );

  const NumberField = ({ label, field, min, max }) => (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <Input type="number" value={c[field]||0} onChange={e => upd(field, Number(e.target.value))} min={min} max={max} className="h-7 text-xs" />
    </div>
  );

  const AlignField = ({ field }) => (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">Alignment</p>
      <div className="flex gap-1">
        {['left','center','right'].map(a => (
          <button key={a} onClick={() => upd(field, a)} className={`flex-1 py-1 rounded text-xs border transition-colors ${c[field]===a ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>{a.charAt(0).toUpperCase()+a.slice(1)}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {BLOCK_PALETTE.find(b => b.type === block.type)?.label || 'Block'} Properties
      </p>

      {block.type === 'header' && <>
        <TextField label="Main Text" field="text" />
        <TextField label="Sub Text" field="subtext" />
        <ColorField label="Background Color" field="bgColor" />
        <ColorField label="Text Color" field="textColor" />
        <ColorField label="Subtext Color" field="subtextColor" />
        <NumberField label="Font Size (px)" field="fontSize" min={16} max={64} />
        <NumberField label="Vertical Padding (px)" field="paddingV" min={8} max={80} />
        <AlignField field="align" />
      </>}

      {block.type === 'text' && <>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Content (HTML)</p>
          <textarea value={c.text||''} onChange={e => upd('text', e.target.value)} rows={6} className="w-full text-xs rounded-md border border-input bg-transparent px-2 py-1.5 font-mono resize-none" />
        </div>
        <ColorField label="Background Color" field="bgColor" />
        <ColorField label="Text Color" field="textColor" />
        <NumberField label="Padding (px)" field="padding" min={4} max={60} />
      </>}

      {block.type === 'two_col' && <>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Left Column (HTML)</p>
          <textarea value={c.left||''} onChange={e => upd('left', e.target.value)} rows={4} className="w-full text-xs rounded-md border border-input bg-transparent px-2 py-1.5 font-mono resize-none" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Right Column (HTML)</p>
          <textarea value={c.right||''} onChange={e => upd('right', e.target.value)} rows={4} className="w-full text-xs rounded-md border border-input bg-transparent px-2 py-1.5 font-mono resize-none" />
        </div>
        <ColorField label="Outer Background" field="bgColor" />
        <ColorField label="Left Cell Background" field="leftBg" />
        <ColorField label="Right Cell Background" field="rightBg" />
      </>}

      {block.type === 'cards' && <>
        <ColorField label="Section Background" field="bgColor" />
        {(c.cards||[]).map((card, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">Card {i+1}</p>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Icon (emoji)</p>
              <Input value={card.icon||''} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], icon:e.target.value}; upd('cards', cards); }} className="h-7 text-xs" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Title</p>
              <Input value={card.title||''} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], title:e.target.value}; upd('cards', cards); }} className="h-7 text-xs" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Text</p>
              <Input value={card.text||''} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], text:e.target.value}; upd('cards', cards); }} className="h-7 text-xs" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Card Background</p>
              <div className="flex gap-1.5 items-center">
                <input type="color" value={card.bgColor||'#eff6ff'} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], bgColor:e.target.value}; upd('cards', cards); }} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
                <Input value={card.bgColor||''} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], bgColor:e.target.value}; upd('cards', cards); }} className="h-7 text-xs font-mono" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Text Color</p>
              <div className="flex gap-1.5 items-center">
                <input type="color" value={card.textColor||'#1e40af'} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], textColor:e.target.value}; upd('cards', cards); }} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
                <Input value={card.textColor||''} onChange={e => { const cards=[...c.cards]; cards[i]={...cards[i], textColor:e.target.value}; upd('cards', cards); }} className="h-7 text-xs font-mono" />
              </div>
            </div>
            <button onClick={() => { const cards=c.cards.filter((_,idx) => idx!==i); upd('cards', cards); }} className="text-xs text-red-500 hover:text-red-700">Remove card</button>
          </div>
        ))}
        <button onClick={() => upd('cards', [...(c.cards||[]), { icon:'⭐', title:'New Card', text:'Description here', bgColor:'#f8fafc', textColor:'#1e40af' }])} className="w-full text-xs border border-dashed rounded-lg py-2 hover:bg-muted transition-colors">+ Add Card</button>
      </>}

      {block.type === 'table' && <>
        <ColorField label="Header Background" field="headerBg" />
        <ColorField label="Header Text Color" field="headerText" />
        <ColorField label="Row Background" field="rowBg" />
        <ColorField label="Alt Row Background" field="altRowBg" />
        <ColorField label="Border Color" field="borderColor" />
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Headers (comma-separated)</p>
          <Input value={(c.headers||[]).join(',')} onChange={e => upd('headers', e.target.value.split(','))} className="h-7 text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Rows</p>
          {(c.rows||[]).map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1 items-center">
              <textarea value={row.join('|')} onChange={e => { const rows=[...c.rows]; rows[ri]=e.target.value.split('|'); upd('rows', rows); }} rows={1} className="flex-1 text-xs rounded border border-input bg-transparent px-2 py-1 font-mono resize-none" placeholder="Cell1|Cell2|Cell3" />
              <button onClick={() => upd('rows', c.rows.filter((_,i) => i!==ri))} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
            </div>
          ))}
          <button onClick={() => upd('rows', [...(c.rows||[]), Array(c.headers?.length||3).fill('')])} className="text-xs text-primary hover:underline mt-1">+ Add Row</button>
        </div>
      </>}

      {block.type === 'image' && <>
        <TextField label="Image URL" field="src" />
        <TextField label="Alt Text" field="alt" />
        <TextField label="Width (e.g. 100% or 300px)" field="width" />
        <ColorField label="Section Background" field="bgColor" />
        <AlignField field="align" />
      </>}

      {block.type === 'button' && <>
        <TextField label="Button Text" field="text" />
        <TextField label="Link URL" field="url" />
        <ColorField label="Button Color" field="bgColor" />
        <ColorField label="Text Color" field="textColor" />
        <NumberField label="Border Radius (px)" field="borderRadius" min={0} max={50} />
        <NumberField label="Font Size (px)" field="fontSize" min={11} max={24} />
        <NumberField label="Horizontal Padding (px)" field="paddingH" min={8} max={60} />
        <NumberField label="Vertical Padding (px)" field="paddingV" min={6} max={30} />
        <AlignField field="align" />
      </>}

      {block.type === 'divider' && <>
        <ColorField label="Line Color" field="color" />
        <NumberField label="Thickness (px)" field="thickness" min={1} max={10} />
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Line Style</p>
          <Select value={c.style||'solid'} onValueChange={v => upd('style', v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NumberField label="Side Margin (px)" field="marginH" min={0} max={80} />
      </>}

      {block.type === 'spacer' && <>
        <NumberField label="Height (px)" field="height" min={4} max={120} />
      </>}

      {block.type === 'quote' && <>
        <TextField label="Quote Text" field="text" multiline />
        <TextField label="Author (optional)" field="author" />
        <ColorField label="Background Color" field="bgColor" />
        <ColorField label="Border / Accent Color" field="borderColor" />
        <ColorField label="Text Color" field="textColor" />
        <NumberField label="Font Size (px)" field="fontSize" min={12} max={28} />
      </>}

      {block.type === 'footer' && <>
        <TextField label="Footer Text" field="text" />
        <TextField label="Address (optional)" field="address" />
        <TextField label="Unsubscribe Text" field="unsubText" />
        <TextField label="Unsubscribe URL" field="unsubUrl" />
        <ColorField label="Background Color" field="bgColor" />
        <ColorField label="Text Color" field="textColor" />
        <AlignField field="align" />
      </>}
    </div>
  );
}

// ─── HTML generator ──────────────────────────────────────────────
function generateHTML(blocks) {
  return blocks.map(b => {
    const c = b.content;
    if (b.type === 'header') return `<div style="background-color:${c.bgColor};color:${c.textColor};text-align:${c.align||'center'};padding:${c.paddingV||32}px 24px;font-size:${c.fontSize||28}px;font-weight:bold;line-height:1.2">${c.text}${c.subtext?`<div style="font-size:${Math.round((c.fontSize||28)*0.55)}px;color:${c.subtextColor||'#c7d2fe'};margin-top:8px;font-weight:400">${c.subtext}</div>`:''}</div>`;
    if (b.type === 'text') return `<div style="background-color:${c.bgColor};color:${c.textColor};padding:${c.padding||20}px">${c.text}</div>`;
    if (b.type === 'two_col') return `<table style="width:100%;background-color:${c.bgColor||'#fff'}"><tr><td style="width:50%;padding:16px;vertical-align:top;background-color:${c.leftBg||'transparent'}">${c.left}</td><td style="width:50%;padding:16px;vertical-align:top;background-color:${c.rightBg||'transparent'}">${c.right}</td></tr></table>`;
    if (b.type === 'cards') return `<div style="background-color:${c.bgColor||'#fff'};padding:16px"><table style="width:100%"><tr>${(c.cards||[]).map(card=>`<td style="width:${Math.round(100/(c.cards?.length||3))}%;padding:6px;vertical-align:top"><div style="background-color:${card.bgColor||'#eff6ff'};border-radius:10px;padding:16px 12px;text-align:center"><div style="font-size:28px;margin-bottom:8px">${card.icon}</div><div style="font-weight:700;color:${card.textColor||'#1e40af'};font-size:14px;margin-bottom:4px">${card.title}</div><div style="color:${card.textColor||'#1e40af'};font-size:12px;opacity:0.8">${card.text}</div></div></td>`).join('')}</tr></table></div>`;
    if (b.type === 'table') return `<div style="padding:16px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>${(c.headers||[]).map(h=>`<th style="background-color:${c.headerBg||'#1e40af'};color:${c.headerText||'#fff'};padding:10px 12px;text-align:left;font-weight:600">${h}</th>`).join('')}</tr></thead><tbody>${(c.rows||[]).map((row,ri)=>`<tr>${row.map(cell=>`<td style="background-color:${ri%2===0?(c.rowBg||'#fff'):(c.altRowBg||'#f8fafc')};padding:9px 12px;border-bottom:1px solid ${c.borderColor||'#e2e8f0'}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.type === 'image') return c.src?`<div style="background-color:${c.bgColor||'#fff'};padding:16px;text-align:${c.align||'center'}"><img src="${c.src}" alt="${c.alt||''}" style="width:${c.width||'100%'};max-width:100%;display:inline-block" /></div>`:'';
    if (b.type === 'button') return `<div style="text-align:${c.align||'center'};padding:${c.paddingV||12}px 16px"><a href="${c.url||'#'}" style="background-color:${c.bgColor};color:${c.textColor};padding:${c.paddingV||12}px ${c.paddingH||28}px;border-radius:${c.borderRadius||6}px;display:inline-block;text-decoration:none;font-weight:700;font-size:${c.fontSize||15}px">${c.text}</a></div>`;
    if (b.type === 'divider') return `<div style="padding:8px ${c.marginH||16}px"><hr style="border:none;border-top:${c.thickness||1}px ${c.style||'solid'} ${c.color||'#e5e7eb'}" /></div>`;
    if (b.type === 'spacer') return `<div style="height:${c.height||20}px"></div>`;
    if (b.type === 'quote') return `<div style="background-color:${c.bgColor||'#eff6ff'};border-left:4px solid ${c.borderColor||'#3b82f6'};padding:20px 24px"><p style="color:${c.textColor||'#1e40af'};font-size:${c.fontSize||16}px;font-style:italic;line-height:1.6;margin:0">${c.text}</p>${c.author?`<p style="color:${c.textColor||'#1e40af'};opacity:0.7;font-size:13px;margin:8px 0 0;font-weight:600">— ${c.author}</p>`:''}</div>`;
    if (b.type === 'footer') return `<div style="background-color:${c.bgColor||'#f9fafb'};color:${c.textColor||'#6b7280'};text-align:${c.align||'center'};padding:20px 24px;font-size:12px"><p style="margin:0 0 4px">${c.text}</p>${c.address?`<p style="margin:0 0 4px;opacity:0.7">${c.address}</p>`:''}<p style="margin:0"><a href="${c.unsubUrl||'#'}" style="color:${c.textColor||'#6b7280'}">${c.unsubText||'Unsubscribe'}</a></p></div>`;
    return '';
  }).join('\n');
}

// ─── Main Editor ─────────────────────────────────────────────────
export default function EmailEditorModal({ template, onSave, onCancel, mode = 'template', originalBlocks }) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [description, setDescription] = useState(template?.description || '');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [saving, setSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  const initBlocks = template?.blocks?.length
    ? template.blocks
    : [
        { id: 1, type: 'header', content: { text: 'Email Header', bgColor: '#1e40af', textColor: '#ffffff', align: 'center', fontSize: 28, subtext: '', paddingV: 40 } },
        { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>Your message here.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 20 } },
        { id: 3, type: 'footer', content: { text: '© {{school_name}} | All rights reserved', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f9fafb', textColor: '#6b7280', align: 'center' } },
      ];

  const [history, setHistory] = useState([initBlocks]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const autoSaveRef = useRef(null);

  const blocks = history[historyIdx];

  function pushHistory(newBlocks) {
    const next = history.slice(0, historyIdx + 1).concat([newBlocks]);
    setHistory(next);
    setHistoryIdx(next.length - 1);
  }

  const undo = () => historyIdx > 0 && setHistoryIdx(i => i - 1);
  const redo = () => historyIdx < history.length - 1 && setHistoryIdx(i => i + 1);

  // Auto-save
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { /* auto-save hook point */ }, 120000);
    return () => clearTimeout(autoSaveRef.current);
  }, [historyIdx]);

  // Keyboard undo/redo
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [historyIdx, history]);

  function addBlock(blockType) {
    const def = BLOCK_PALETTE.find(b => b.type === blockType);
    if (!def) return;
    const newBlock = { id: Date.now(), type: blockType, content: JSON.parse(JSON.stringify(def.defaultContent)) };
    pushHistory([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  }

  function deleteBlock(id) {
    pushHistory(blocks.filter(b => b.id !== id));
    setSelectedBlockId(null);
  }

  function duplicateBlock(id) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newBlock = { ...blocks[idx], id: Date.now(), content: JSON.parse(JSON.stringify(blocks[idx].content)) };
    const newBlocks = [...blocks.slice(0, idx+1), newBlock, ...blocks.slice(idx+1)];
    pushHistory(newBlocks);
    setSelectedBlockId(newBlock.id);
  }

  function moveBlock(id, dir) {
    const idx = blocks.findIndex(b => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[idx+dir]] = [newBlocks[idx+dir], newBlocks[idx]];
    pushHistory(newBlocks);
  }

  function updateBlockContent(id, newContent) {
    pushHistory(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
  }

  function resetToOriginal() {
    if (!window.confirm('Reset to original template? All your changes will be lost.')) return;
    const original = originalBlocks || initBlocks;
    pushHistory(original);
    setSelectedBlockId(null);
    toast.success('Template reset to original');
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    await onSave({ name, category, description, emailBody: generateHTML(blocks), blocks, schoolId: template?.schoolId });
    setSaving(false);
  }

  async function handleSaveNew() {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    await onSave({ name: `${name} (Copy)`, category, description, emailBody: generateHTML(blocks), blocks, schoolId: template?.schoolId, forceNew: true });
    setSaving(false);
  }

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Button>
        <h2 className="text-lg font-bold">{template?.id ? 'Edit Template' : 'New Template'}</h2>

        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={historyIdx === 0} title="Undo (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={historyIdx === history.length-1} title="Redo (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></Button>
          {originalBlocks && <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500" onClick={resetToOriginal} title="Reset to original"><RotateCcw className="w-3.5 h-3.5" /></Button>}
        </div>

        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSaveNew} disabled={saving}>Save as New</Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5" /> {template?.id ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Name *</p>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Category</p>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Description</p>
          <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      {/* 3-panel editor */}
      <div className="grid grid-cols-[180px_1fr_220px] gap-3 min-h-0 flex-1">
        {/* Left: Block palette */}
        <div className="bg-muted/30 rounded-xl p-2 overflow-y-auto">
          <p className="text-[10px] font-semibold mb-2 text-muted-foreground uppercase tracking-wide px-1">Blocks</p>
          <div className="space-y-1">
            {BLOCK_PALETTE.map(b => (
              <button key={b.type} onClick={() => addBlock(b.type)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border hover:border-primary hover:text-primary text-left transition-colors">
                <span className="text-sm">{b.icon}</span>
                <span className="text-xs">{b.label}</span>
                <Plus className="w-2.5 h-2.5 ml-auto opacity-40" />
              </button>
            ))}
          </div>
          <Separator className="my-2" />
          <p className="text-[10px] font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide px-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {PERSONALIZATION_TAGS.map(tag => (
              <Badge key={tag} variant="outline" className="text-[8px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => { navigator.clipboard.writeText(tag); toast.success(`Copied`); }}>
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="overflow-y-auto" onClick={() => setSelectedBlockId(null)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{blocks.length} blocks</span>
            <div className="flex gap-1">
              <Button variant={previewMode === 'desktop' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('desktop')}>
                <Monitor className="w-3 h-3" /> Desktop
              </Button>
              <Button variant={previewMode === 'mobile' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('mobile')}>
                <Smartphone className="w-3 h-3" /> Mobile
              </Button>
            </div>
          </div>
          <div className={`mx-auto bg-white border-2 rounded-xl shadow overflow-hidden transition-all ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
            {blocks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Add blocks from the left panel</div>
            ) : blocks.map((block, idx) => (
              <BlockRenderer
                key={block.id}
                block={block}
                selected={selectedBlockId === block.id}
                onSelect={() => setSelectedBlockId(block.id)}
                onDelete={() => deleteBlock(block.id)}
                onMoveUp={() => moveBlock(block.id, -1)}
                onMoveDown={() => moveBlock(block.id, 1)}
                onDuplicate={() => duplicateBlock(block.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="bg-muted/30 rounded-xl p-3 overflow-y-auto">
          <BlockPropertyPanel
            block={selectedBlock}
            onChange={(newContent) => selectedBlock && updateBlockContent(selectedBlock.id, newContent)}
          />
        </div>
      </div>
    </div>
  );
}