import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Copy, Trash2, Eye, Search, Monitor, Smartphone, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import EmailEditorModal from './EmailEditorModal';
import { DEFAULT_TEMPLATES_CONFIG, CATEGORY_LABELS_ALL } from './defaultTemplateBlocks';

export default function TemplateManager({ schoolUser, onBack, onUseTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingOriginalBlocks, setEditingOriginalBlocks] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewItem, setPreviewItem] = useState(null); // { blocks, name, bgGradient }
  const [previewMode, setPreviewMode] = useState('desktop');

  useEffect(() => { load(); }, []);

  async function load() {
    const list = await base44.entities.EmailTemplate.filter({ schoolId: schoolUser.schoolId });
    setTemplates(list || []);
    setLoading(false);
  }

  function handleCreate() {
    setEditingTemplate({ name: '', category: 'custom', description: '', emailBody: '', blocks: [], schoolId: schoolUser.schoolId, isDefault: false });
    setEditingOriginalBlocks(null);
    setShowEditor(true);
  }

  function handleEdit(t) {
    setEditingTemplate(t);
    setEditingOriginalBlocks(t.blocks || null);
    setShowEditor(true);
  }

  // "Edit & Use" a default template — opens editor with original blocks so user can reset
  function handleEditDefault(dt) {
    setEditingTemplate({
      name: dt.name, category: dt.category, description: dt.description,
      emailBody: '', blocks: JSON.parse(JSON.stringify(dt.blocks)), schoolId: schoolUser.schoolId, isDefault: false,
    });
    setEditingOriginalBlocks(JSON.parse(JSON.stringify(dt.blocks)));
    setShowEditor(true);
  }

  async function handleSaveTemplate(templateData) {
    // If forceNew, always create new
    if (templateData.forceNew || !editingTemplate?.id) {
      const { forceNew, ...rest } = templateData;
      await base44.entities.EmailTemplate.create({ ...rest, schoolId: schoolUser.schoolId });
      toast.success('Template saved');
    } else {
      await base44.entities.EmailTemplate.update(editingTemplate.id, templateData);
      toast.success('Template updated');
    }
    setShowEditor(false);
    setEditingTemplate(null);
    setEditingOriginalBlocks(null);
    load();
  }

  async function handleAddDefaultToLibrary(dt) {
    await base44.entities.EmailTemplate.create({
      schoolId: schoolUser.schoolId, name: dt.name, category: dt.category, description: dt.description,
      emailBody: '', blocks: JSON.parse(JSON.stringify(dt.blocks)), isDefault: false, timesUsed: 0,
    });
    toast.success('Template added to your library — fully editable!');
    load();
  }

  async function handleDuplicate(t) {
    const { id, created_date, updated_date, ...rest } = t;
    await base44.entities.EmailTemplate.create({ ...rest, name: `${t.name} (Copy)`, schoolId: schoolUser.schoolId, isDefault: false });
    toast.success('Template duplicated');
    load();
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await base44.entities.EmailTemplate.delete(t.id);
    toast.success('Template deleted');
    load();
  }

  function handleUseMyTemplate(t) {
    onUseTemplate(t);
  }

  // Preview rendered HTML from blocks
  function getPreviewHTML(blocks) {
    if (!blocks?.length) return '<div style="padding:24px;color:#6b7280;text-align:center">No preview available</div>';
    return blocks.map(b => {
      const c = b.content;
      if (b.type === 'header') return `<div style="background-color:${c.bgColor};color:${c.textColor};text-align:${c.align||'center'};padding:${c.paddingV||32}px 24px;font-size:${c.fontSize||28}px;font-weight:bold;line-height:1.2">${c.text}${c.subtext?`<div style="font-size:${Math.round((c.fontSize||28)*0.55)}px;color:${c.subtextColor};margin-top:8px;font-weight:400">${c.subtext}</div>`:''}</div>`;
      if (b.type === 'text') return `<div style="background-color:${c.bgColor};color:${c.textColor};padding:${c.padding||20}px">${c.text}</div>`;
      if (b.type === 'cards') return `<div style="background-color:${c.bgColor||'#f8fafc'};padding:16px"><table style="width:100%"><tr>${(c.cards||[]).map(card=>`<td style="width:${Math.round(100/(c.cards?.length||3))}%;padding:6px;vertical-align:top"><div style="background-color:${card.bgColor};border-radius:10px;padding:14px 10px;text-align:center"><div style="font-size:24px;margin-bottom:6px">${card.icon}</div><div style="font-weight:700;color:${card.textColor};font-size:13px;margin-bottom:3px">${card.title}</div><div style="color:${card.textColor};font-size:11px;opacity:0.8">${card.text}</div></div></td>`).join('')}</tr></table></div>`;
      if (b.type === 'button') return `<div style="text-align:${c.align||'center'};padding:${c.paddingV||12}px 16px"><span style="background-color:${c.bgColor};color:${c.textColor};padding:${c.paddingV||12}px ${c.paddingH||28}px;border-radius:${c.borderRadius||6}px;display:inline-block;font-weight:700;font-size:${c.fontSize||15}px">${c.text}</span></div>`;
      if (b.type === 'footer') return `<div style="background-color:${c.bgColor};color:${c.textColor};text-align:${c.align||'center'};padding:16px 24px;font-size:12px">${c.text}</div>`;
      if (b.type === 'quote') return `<div style="background-color:${c.bgColor};border-left:4px solid ${c.borderColor};padding:16px 20px"><p style="color:${c.textColor};font-size:${c.fontSize||14}px;font-style:italic;margin:0">${c.text}</p></div>`;
      if (b.type === 'spacer') return `<div style="height:${c.height||20}px"></div>`;
      if (b.type === 'divider') return `<div style="padding:6px 16px"><hr style="border:none;border-top:${c.thickness||1}px solid ${c.color}" /></div>`;
      return '';
    }).join('');
  }

  const myTemplates = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const filteredDefaults = DEFAULT_TEMPLATES_CONFIG.filter(t =>
    (categoryFilter === 'all' || t.category === categoryFilter) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (showEditor) {
    return (
      <div className="h-full">
        <EmailEditorModal
          template={editingTemplate}
          originalBlocks={editingOriginalBlocks}
          onSave={handleSaveTemplate}
          onCancel={() => { setShowEditor(false); setEditingTemplate(null); setEditingOriginalBlocks(null); }}
          mode="template"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-xl font-bold">Email Templates</h2>
        <Button size="sm" className="ml-auto gap-1.5" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS_ALL).filter(([v]) => v !== 'custom').map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* My Templates */}
      {myTemplates.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">My Templates ({myTemplates.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myTemplates.map(t => {
              const defMatch = DEFAULT_TEMPLATES_CONFIG.find(d => d.category === t.category);
              return (
                <Card key={t.id} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`h-28 bg-gradient-to-br ${defMatch?.gradient || 'from-slate-500 to-slate-700'} flex items-center justify-center relative cursor-pointer`}
                      onClick={() => setPreviewItem({ blocks: t.blocks, name: t.name, gradient: defMatch?.gradient })}>
                      <span className="text-4xl">{defMatch?.emoji || '📧'}</span>
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <span className="text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded">Preview</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="font-semibold text-sm leading-tight">{t.name}</p>
                        <Badge className="bg-slate-100 text-slate-600 text-[9px] shrink-0">{CATEGORY_LABELS_ALL[t.category] || t.category}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">Used {t.timesUsed || 0} times{t.updated_date ? ` · ${format(parseISO(t.updated_date), 'MMM d')}` : ''}</p>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => handleUseMyTemplate(t)}>Use</Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPreviewItem({ blocks: t.blocks, name: t.name })} title="Preview"><Eye className="w-3 h-3" /></Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)} title="Edit"><Edit className="w-3 h-3" /></Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(t)} title="Duplicate"><Copy className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(t)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Templates */}
      {filteredDefaults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm">Default Templates ({filteredDefaults.length})</h3>
            <Badge variant="outline" className="text-xs">All fully editable — no locks</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDefaults.map(dt => (
              <Card key={dt.name} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-28 bg-gradient-to-br ${dt.gradient} flex items-center justify-center relative cursor-pointer`}
                    onClick={() => setPreviewItem({ blocks: dt.blocks, name: dt.name, gradient: dt.gradient })}>
                    <span className="text-4xl">{dt.emoji}</span>
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <span className="text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded">Preview</span>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-white/20 text-white text-[9px] border-white/30">Default</Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <p className="font-semibold text-sm leading-tight">{dt.name}</p>
                      <Badge variant="outline" className="text-[9px] shrink-0">{CATEGORY_LABELS_ALL[dt.category]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{dt.description}</p>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => handleEditDefault(dt)}>
                        <Pencil className="w-3 h-3" /> Edit & Use
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAddDefaultToLibrary(dt)}>Add to Library</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {myTemplates.length === 0 && filteredDefaults.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">No templates match your search.</div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{previewItem?.name}</DialogTitle>
              <div className="flex gap-1 mr-8">
                <Button variant={previewMode === 'desktop' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('desktop')}>
                  <Monitor className="w-3 h-3" /> Desktop
                </Button>
                <Button variant={previewMode === 'mobile' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewMode('mobile')}>
                  <Smartphone className="w-3 h-3" /> Mobile
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 bg-slate-100 p-4 rounded-xl">
            <div className={`mx-auto bg-white rounded-lg shadow overflow-hidden transition-all ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
              <div dangerouslySetInnerHTML={{ __html: getPreviewHTML(previewItem?.blocks) }} />
            </div>
          </div>
          <div className="flex gap-2 pt-2 shrink-0 justify-end">
            {(() => {
              const dt = DEFAULT_TEMPLATES_CONFIG.find(d => d.name === previewItem?.name);
              const myT = templates.find(t => t.name === previewItem?.name);
              if (dt) return (
                <>
                  <Button variant="outline" onClick={() => { setPreviewItem(null); handleAddDefaultToLibrary(dt); }}>Add to Library</Button>
                  <Button onClick={() => { setPreviewItem(null); handleEditDefault(dt); }} className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit & Use</Button>
                </>
              );
              if (myT) return (
                <>
                  <Button variant="outline" onClick={() => { setPreviewItem(null); handleEdit(myT); }} className="gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit Template</Button>
                  <Button onClick={() => { setPreviewItem(null); handleUseMyTemplate(myT); }}>Use Without Editing</Button>
                </>
              );
              return null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}