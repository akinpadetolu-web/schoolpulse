import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Pencil, Trash2, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';

const FEATURE_TOGGLES = [
  { key: 'includeSubjectAverages', label: 'Subject Averages' },
  { key: 'includeAttendance', label: 'Attendance Rate' },
  { key: 'includeComments', label: "Teacher's Comment" },
  { key: 'includeBehavior', label: 'Behavior Summary' },
  { key: 'includeLessonProgress', label: 'Lesson Progress' },
  { key: 'includeAssignmentRate', label: 'Assignment Submission Rate' },
  { key: 'includeCategoryBreakdown', label: 'Category Breakdown (per subject)' },
  { key: 'includePrincipalComment', label: "Principal's Comment" },
  { key: 'includePromotionRecommendation', label: 'Promotion Recommendation' },
];

const defaultForm = {
  name: '',
  type: 'custom',
  gradeScale: 'both',
  schoolLogo: '',
  footerText: '',
  description: '',
  schoolBranding: { primaryColor: '#1e3a5f', secondaryColor: '#f0f4ff' },
  includeSubjectAverages: true,
  includeAttendance: true,
  includeComments: true,
  includeBehavior: false,
  includeLessonProgress: true,
  includeAssignmentRate: true,
  includeCategoryBreakdown: false,
  includePrincipalComment: false,
  includePromotionRecommendation: false,
};

export default function AdminReportCardTemplates() {
  const { schoolUser: user } = useSchoolAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const data = await base44.entities.ReportCardTemplate.filter({ schoolId: user?.schoolId });
    setTemplates(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...defaultForm });
    setShowDialog(true);
  }

  function openEdit(template) {
    setEditing(template);
    setForm({
      ...defaultForm,
      ...template,
      schoolBranding: template.schoolBranding || { primaryColor: '#1e3a5f', secondaryColor: '#f0f4ff' },
    });
    setShowDialog(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name) return toast.error('Template name is required');
    setSaving(true);
    const payload = { ...form, schoolId: user.schoolId, schoolName: user.schoolName };
    if (editing) {
      await base44.entities.ReportCardTemplate.update(editing.id, payload);
      toast.success('Template updated');
    } else {
      await base44.entities.ReportCardTemplate.create(payload);
      toast.success('Template created');
    }
    setSaving(false);
    setShowDialog(false);
    loadTemplates();
  }

  async function handleDelete(template) {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    await base44.entities.ReportCardTemplate.delete(template.id);
    toast.success('Template deleted');
    loadTemplates();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Report Card Templates</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Template</Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No templates yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <Card key={t.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline" className="capitalize">{t.type}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-4">
                  {FEATURE_TOGGLES.filter(f => t[f.key]).map(f => (
                    <span key={f.key} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{f.label}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(t)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Report Card Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Final Term Report" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Grade Display</Label>
              <Select value={form.gradeScale} onValueChange={v => setForm({ ...form, gradeScale: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (e.g. 78% - B)</SelectItem>
                  <SelectItem value="percentage">Percentage Only (e.g. 78%)</SelectItem>
                  <SelectItem value="letter">Letter Only (e.g. B)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.schoolBranding?.primaryColor || '#1e3a5f'}
                    onChange={e => setForm({ ...form, schoolBranding: { ...form.schoolBranding, primaryColor: e.target.value } })}
                    className="w-10 h-9 rounded cursor-pointer border"
                  />
                  <Input value={form.schoolBranding?.primaryColor || ''} onChange={e => setForm({ ...form, schoolBranding: { ...form.schoolBranding, primaryColor: e.target.value } })} placeholder="#1e3a5f" />
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.schoolBranding?.secondaryColor || '#f0f4ff'}
                    onChange={e => setForm({ ...form, schoolBranding: { ...form.schoolBranding, secondaryColor: e.target.value } })}
                    className="w-10 h-9 rounded cursor-pointer border"
                  />
                  <Input value={form.schoolBranding?.secondaryColor || ''} onChange={e => setForm({ ...form, schoolBranding: { ...form.schoolBranding, secondaryColor: e.target.value } })} placeholder="#f0f4ff" />
                </div>
              </div>
            </div>

            <div>
              <Label>School Logo URL</Label>
              <Input value={form.schoolLogo} onChange={e => setForm({ ...form, schoolLogo: e.target.value })} placeholder="https://..." />
            </div>

            <div>
              <Label>Footer Text</Label>
              <Input value={form.footerText} onChange={e => setForm({ ...form, footerText: e.target.value })} placeholder="e.g. This report is confidential and for authorized use only." />
            </div>

            <div>
              <Label className="mb-2 block">Sections to Include</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURE_TOGGLES.map(f => (
                  <label key={f.key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}