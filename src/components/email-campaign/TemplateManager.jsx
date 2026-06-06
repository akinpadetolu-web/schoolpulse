import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit, Copy, Trash2, Eye, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import EmailEditorModal from './EmailEditorModal';

const CATEGORY_LABELS = {
  welcome: 'Welcome', report_card: 'Report Card', fee_reminder: 'Fee Reminder',
  exam_timetable: 'Exam Timetable', event_invitation: 'Event', emergency: 'Emergency',
  newsletter: 'Newsletter', parent_teacher_meeting: 'Parent-Teacher Meeting', custom: 'Custom',
};

const DEFAULT_TEMPLATES = [
  { name: 'Welcome to New Term', category: 'welcome', description: 'Warm welcome message for the start of a new academic term', isDefault: true },
  { name: 'Report Card Available', category: 'report_card', description: 'Notify parents that report cards are ready to view', isDefault: true },
  { name: 'School Fees Reminder', category: 'fee_reminder', description: 'Friendly reminder about outstanding school fees', isDefault: true },
  { name: 'Exam Timetable Released', category: 'exam_timetable', description: 'Share the upcoming exam schedule with students and parents', isDefault: true },
  { name: 'Event Invitation', category: 'event_invitation', description: 'Invite school community to an upcoming event', isDefault: true },
  { name: 'Emergency Notice', category: 'emergency', description: 'Urgent communication to parents and staff', isDefault: true },
  { name: 'General Newsletter', category: 'newsletter', description: 'Monthly school newsletter template', isDefault: true },
  { name: 'Parent-Teacher Meeting', category: 'parent_teacher_meeting', description: 'Invitation for parent-teacher conference', isDefault: true },
];

export default function TemplateManager({ schoolUser, onBack, onUseTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const list = await base44.entities.EmailTemplate.filter({ schoolId: schoolUser.schoolId });
    setTemplates(list || []);
    setLoading(false);
  }

  async function handleCreate() {
    setEditingTemplate({ name: '', category: 'custom', description: '', emailBody: '', blocks: [], schoolId: schoolUser.schoolId, isDefault: false });
    setShowEditor(true);
  }

  async function handleEdit(t) {
    setEditingTemplate(t);
    setShowEditor(true);
  }

  async function handleSaveTemplate(templateData) {
    if (editingTemplate?.id) {
      await base44.entities.EmailTemplate.update(editingTemplate.id, templateData);
      toast.success('Template updated');
    } else {
      await base44.entities.EmailTemplate.create({ ...templateData, schoolId: schoolUser.schoolId });
      toast.success('Template created');
    }
    setShowEditor(false);
    setEditingTemplate(null);
    load();
  }

  async function handleDuplicate(t) {
    await base44.entities.EmailTemplate.create({ ...t, id: undefined, name: `${t.name} (Copy)`, schoolId: schoolUser.schoolId, isDefault: false });
    toast.success('Template duplicated');
    load();
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await base44.entities.EmailTemplate.delete(t.id);
    toast.success('Template deleted');
    load();
  }

  async function handleUseDefault(dt) {
    const created = await base44.entities.EmailTemplate.create({
      schoolId: schoolUser.schoolId, name: dt.name, category: dt.category, description: dt.description,
      emailBody: getDefaultBody(dt.category), isDefault: false, timesUsed: 0,
    });
    toast.success('Template added to your library');
    load();
  }

  function getDefaultBody(category) {
    const bodies = {
      welcome: '<h1 style="color:#1e40af">Welcome to the New Term!</h1><p>Dear {{first_name}},</p><p>We are delighted to welcome you to the new academic term at <strong>{{school_name}}</strong>. We look forward to a productive and enriching term ahead.</p><p>Best regards,<br/>{{school_name}} Administration</p>',
      report_card: '<h1 style="color:#1e40af">Report Card Now Available</h1><p>Dear {{first_name}},</p><p>We are pleased to inform you that the report card for <strong>{{student_name}}</strong> is now available for viewing.</p><p>Please log in to your parent portal to access the report.</p><p>Regards,<br/>{{school_name}}</p>',
      fee_reminder: '<h1 style="color:#dc2626">Fee Payment Reminder</h1><p>Dear {{first_name}},</p><p>This is a friendly reminder that school fees for <strong>{{student_name}}</strong> are due. Please make your payment at the earliest convenience to avoid any disruption to your child\'s education.</p><p>Thank you,<br/>{{school_name}} Accounts Office</p>',
      exam_timetable: '<h1 style="color:#1e40af">Exam Timetable Released</h1><p>Dear {{first_name}},</p><p>The examination timetable for <strong>{{class_name}}</strong> has been released. Please find the schedule attached or log in to the portal to view it.</p><p>We wish all students the very best.<br/>{{school_name}}</p>',
      event_invitation: '<h1 style="color:#7c3aed">You\'re Invited!</h1><p>Dear {{first_name}},</p><p>We cordially invite you to join us for an upcoming event at <strong>{{school_name}}</strong>. Please see the details below and RSVP at your earliest convenience.</p><p>We look forward to seeing you.<br/>{{school_name}}</p>',
      emergency: '<h1 style="color:#dc2626">⚠ Important Notice</h1><p>Dear {{first_name}},</p><p>This is an urgent message from <strong>{{school_name}}</strong> requiring your immediate attention. Please read the information below carefully and take any necessary action.</p><p>{{school_name}} Management</p>',
      newsletter: '<h1 style="color:#1e40af">{{school_name}} Newsletter</h1><p>Dear {{first_name}},</p><p>Welcome to our latest school newsletter! Here are the highlights from this period:</p><ul><li>Academic Updates</li><li>Upcoming Events</li><li>Student Achievements</li><li>Important Notices</li></ul><p>Best regards,<br/>{{school_name}}</p>',
      parent_teacher_meeting: '<h1 style="color:#1e40af">Parent-Teacher Meeting Invitation</h1><p>Dear {{first_name}},</p><p>We would like to invite you to attend the upcoming Parent-Teacher Meeting at <strong>{{school_name}}</strong> to discuss <strong>{{student_name}}\'s</strong> academic progress.</p><p>Please confirm your attendance.<br/>{{school_name}}</p>',
    };
    return bodies[category] || '<h1>Email Title</h1><p>Dear {{first_name}},</p><p>Your message here.</p><p>Regards,<br/>{{school_name}}</p>';
  }

  const myTemplates = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  if (showEditor) {
    return (
      <EmailEditorModal
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
        mode="template"
      />
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
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* My Templates */}
      {myTemplates.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">My Templates ({myTemplates.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myTemplates.map(t => (
              <Card key={t.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Preview thumbnail */}
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-xl flex items-center justify-center">
                    <FileText className="w-10 h-10 text-indigo-300" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm leading-tight">{t.name}</p>
                      <Badge className="bg-slate-100 text-slate-600 text-[10px] shrink-0">{CATEGORY_LABELS[t.category] || t.category}</Badge>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>}
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Used {t.timesUsed || 0} times{t.updated_date ? ` · ${format(parseISO(t.updated_date), 'MMM d, yyyy')}` : ''}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onUseTemplate(t)}>Use</Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)} title="Edit"><Edit className="w-3 h-3" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(t)} title="Duplicate"><Copy className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(t)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Default Templates */}
      {(categoryFilter === 'all' || DEFAULT_TEMPLATES.some(t => t.category === categoryFilter)) && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Default Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEFAULT_TEMPLATES.filter(t => categoryFilter === 'all' || t.category === categoryFilter).map(t => (
              <Card key={t.name} className="border border-dashed shadow-sm hover:shadow-md transition-shadow opacity-80 hover:opacity-100">
                <CardContent className="p-0">
                  <div className="h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-t-xl flex items-center justify-center">
                    <FileText className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm">{t.name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">{CATEGORY_LABELS[t.category]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleUseDefault(t)}>
                      Add to My Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {myTemplates.length === 0 && templates.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No templates yet. Create one or add from the Default Templates above.
        </div>
      )}
    </div>
  );
}