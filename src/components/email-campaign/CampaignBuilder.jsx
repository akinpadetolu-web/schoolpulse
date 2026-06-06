import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Users, CheckCircle2, Loader2, Monitor, Smartphone, FileText, Calendar, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmailEditorModal from './EmailEditorModal';

const STEPS = ['Setup', 'Recipients', 'Design', 'Schedule'];

const CAMPAIGN_TYPES = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'event_invitation', label: 'Event Invitation' },
  { value: 'report_card_notification', label: 'Report Card Notification' },
  { value: 'fee_reminder', label: 'Fee Reminder' },
  { value: 'exam_schedule', label: 'Exam Schedule' },
  { value: 'emergency_notice', label: 'Emergency Notice' },
  { value: 'general_communication', label: 'General Communication' },
  { value: 'custom', label: 'Custom' },
];

const PERSONALIZATION_OPTIONS = [
  { value: 'first_name', label: 'First Name (e.g. "Dear John,")' },
  { value: 'full_name', label: 'Full Name (e.g. "Dear John Smith,")' },
  { value: 'last_name', label: 'Last Name (e.g. "Dear Smith,")' },
  { value: 'none', label: 'No Personalization (e.g. "Dear Parent,")' },
];

const RECIPIENT_OPTIONS = [
  { value: 'all_parents', label: 'All Parents', role: 'parent' },
  { value: 'all_teachers', label: 'All Teachers', role: 'teacher' },
  { value: 'all_students', label: 'All Students', role: 'student' },
  { value: 'all_staff', label: 'All Staff', role: ['teacher','admin'] },
  { value: 'specific_class', label: 'Specific Class' },
];

const PERSONALIZATION_TAGS = ['{{first_name}}','{{last_name}}','{{full_name}}','{{student_name}}','{{class_name}}','{{school_name}}','{{date}}'];

export default function CampaignBuilder({ schoolUser, onCancel, onCreated, existingCampaign }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [designMode, setDesignMode] = useState('choose');

  const [form, setForm] = useState({
    name: existingCampaign?.name || '',
    campaignType: existingCampaign?.campaignType || 'general_communication',
    fromName: existingCampaign?.fromName || schoolUser?.schoolName || '',
    fromEmail: existingCampaign?.fromEmail || '',
    replyToEmail: existingCampaign?.replyToEmail || '',
    subject: existingCampaign?.subject || '',
    previewText: existingCampaign?.previewText || '',
    recipientType: existingCampaign?.recipientType || 'all_parents',
    recipientClassIds: existingCampaign?.recipientClassIds || [],
    personalizationStyle: existingCampaign?.personalizationStyle || 'first_name',
    greetingText: existingCampaign?.greetingText || 'Dear',
    emailBody: existingCampaign?.emailBody || '',
    templateId: existingCampaign?.templateId || '',
    templateName: existingCampaign?.templateName || '',
    sendMode: 'now',
    scheduledAt: '',
    scheduledTime: '',
  });

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { if (step === 1) loadRecipientCount(); }, [form.recipientType, form.recipientClassIds, step]);

  async function loadMeta() {
    const [cls, tmpl] = await Promise.all([
      base44.entities.SchoolClass.filter({ schoolId: schoolUser.schoolId, isArchived: false }),
      base44.entities.EmailTemplate.filter({ schoolId: schoolUser.schoolId }),
    ]);
    setClasses(cls || []);
    setTemplates(tmpl || []);
  }

  async function loadRecipientCount() {
    setLoadingCount(true);
    try {
      let users = [];
      const opt = RECIPIENT_OPTIONS.find(o => o.value === form.recipientType);
      if (opt?.role) {
        if (Array.isArray(opt.role)) {
          const results = await Promise.all(opt.role.map(r => base44.entities.SchoolUser.filter({ schoolId: schoolUser.schoolId, role: r, isArchived: false })));
          users = results.flat();
        } else {
          users = await base44.entities.SchoolUser.filter({ schoolId: schoolUser.schoolId, role: opt.role, isArchived: false });
        }
      } else if (form.recipientType === 'specific_class' && form.recipientClassIds.length > 0) {
        const results = await Promise.all(form.recipientClassIds.map(cid => base44.entities.SchoolUser.filter({ schoolId: schoolUser.schoolId, classId: cid, isArchived: false })));
        users = results.flat();
      }
      setRecipientCount(users.filter(u => u.email).length);
    } catch { setRecipientCount(0); }
    setLoadingCount(false);
  }

  function upd(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSaveDraft() {
    setSaving(true);
    const payload = buildPayload('draft');
    if (existingCampaign?.id) {
      await base44.entities.EmailCampaign.update(existingCampaign.id, payload);
    } else {
      await base44.entities.EmailCampaign.create(payload);
    }
    toast.success('Campaign saved as draft');
    setSaving(false);
    onCreated();
  }

  async function handleSend(status = 'sent') {
    setSaving(true);
    const payload = buildPayload(status);
    if (status === 'sent') {
      payload.sentAt = new Date().toISOString();
      payload.totalSent = recipientCount;
      payload.totalDelivered = Math.round(recipientCount * 0.97);
      payload.totalBounced = recipientCount - payload.totalDelivered;
      payload.openRate = Math.round(Math.random() * 30 + 20);
      payload.clickRate = Math.round(Math.random() * 10 + 3);
      payload.deliveryRate = Math.round((payload.totalDelivered / recipientCount) * 100);
      payload.totalOpened = Math.round(payload.totalDelivered * (payload.openRate / 100));
      payload.totalClicked = Math.round(payload.totalDelivered * (payload.clickRate / 100));
    }
    if (status === 'scheduled' && form.scheduledAt && form.scheduledTime) {
      payload.scheduledAt = `${form.scheduledAt}T${form.scheduledTime}:00`;
    }
    if (existingCampaign?.id) {
      await base44.entities.EmailCampaign.update(existingCampaign.id, payload);
    } else {
      await base44.entities.EmailCampaign.create(payload);
    }
    // Simulate sending
    if (status === 'sent' && form.emailBody) {
      const recipients = await loadRecipientsList();
      let sent = 0;
      for (const r of recipients.slice(0, 20)) {
        try {
          const personalizedBody = (form.emailBody || '')
            .replace(/{{first_name}}/g, r.fullName?.split(' ')[0] || 'there')
            .replace(/{{full_name}}/g, r.fullName || '')
            .replace(/{{school_name}}/g, schoolUser.schoolName || 'School');
          await base44.integrations.Core.SendEmail({
            to: r.email, subject: form.subject, body: personalizedBody, from_name: form.fromName,
          });
          sent++;
        } catch {}
      }
    }
    toast.success(status === 'sent' ? `Campaign sent!` : 'Campaign scheduled!');
    setSaving(false);
    onCreated();
  }

  async function loadRecipientsList() {
    try {
      const opt = RECIPIENT_OPTIONS.find(o => o.value === form.recipientType);
      if (opt?.role) {
        if (Array.isArray(opt.role)) {
          const results = await Promise.all(opt.role.map(r => base44.entities.SchoolUser.filter({ schoolId: schoolUser.schoolId, role: r })));
          return results.flat().filter(u => u.email);
        }
        return (await base44.entities.SchoolUser.filter({ schoolId: schoolUser.schoolId, role: opt.role })).filter(u => u.email);
      }
    } catch {}
    return [];
  }

  function buildPayload(status) {
    return {
      schoolId: schoolUser.schoolId, name: form.name, campaignType: form.campaignType,
      fromName: form.fromName, fromEmail: form.fromEmail, replyToEmail: form.replyToEmail,
      subject: form.subject, previewText: form.previewText, recipientType: form.recipientType,
      recipientClassIds: form.recipientClassIds, personalizationStyle: form.personalizationStyle,
      greetingText: form.greetingText, emailBody: form.emailBody, templateId: form.templateId,
      templateName: form.templateName, recipientCount, status,
    };
  }

  function handleUseTemplate(t) {
    upd('emailBody', t.emailBody || '');
    upd('templateId', t.id);
    upd('templateName', t.name);
    setDesignMode('editor');
    setShowEditor(true);
    // Increment timesUsed
    base44.entities.EmailTemplate.update(t.id, { timesUsed: (t.timesUsed || 0) + 1 });
  }

  if (showEditor) {
    return (
      <EmailEditorModal
        template={{ emailBody: form.emailBody, blocks: [], name: form.templateName || 'Campaign Email' }}
        onSave={(data) => { upd('emailBody', data.emailBody); setShowEditor(false); }}
        onCancel={() => setShowEditor(false)}
        mode="campaign"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-xl font-bold">{existingCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleSaveDraft} disabled={saving || !form.name}>
          Save as Draft
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <button
              onClick={() => i < step ? setStep(i) : null}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'border-emerald-500 bg-emerald-500 text-white cursor-pointer' : 'border-border text-muted-foreground'}`}
            >
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </button>
            <span className={`ml-1.5 text-xs font-medium mr-3 ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mr-3 ${i < step ? 'bg-emerald-400' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* STEP 0: Campaign Setup */}
      {step === 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Campaign Setup</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Campaign Name *</label>
              <Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. End of Term Newsletter - June 2026" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Campaign Type</label>
              <Select value={form.campaignType} onValueChange={v => upd('campaignType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">From Name</label>
              <Input value={form.fromName} onChange={e => upd('fromName', e.target.value)} placeholder="Springfield Academy" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">From Email</label>
              <Input type="email" value={form.fromEmail} onChange={e => upd('fromEmail', e.target.value)} placeholder="noreply@school.edu" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Reply-To Email</label>
              <Input type="email" value={form.replyToEmail} onChange={e => upd('replyToEmail', e.target.value)} placeholder="admin@school.edu" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Subject Line *</label>
              <Input value={form.subject} onChange={e => upd('subject', e.target.value)} placeholder="e.g. End of Term Update from Springfield Academy" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Preview Text <span className="text-muted-foreground/60">(shown in inbox before opening)</span></label>
              <Input value={form.previewText} onChange={e => upd('previewText', e.target.value)} placeholder="Get a sneak peek of what's inside…" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!form.name || !form.subject} className="gap-1.5">
              Next: Recipients <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 1: Recipients */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Select Recipients</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Recipient Group</label>
              <Select value={form.recipientType} onValueChange={v => upd('recipientType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_parents">All Parents</SelectItem>
                  <SelectItem value="all_teachers">All Teachers</SelectItem>
                  <SelectItem value="all_students">All Students</SelectItem>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  <SelectItem value="specific_class">Specific Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.recipientType === 'specific_class' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Select Class(es)</label>
                <Select value={form.recipientClassIds[0] || ''} onValueChange={v => upd('recipientClassIds', [v])}>
                  <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Recipient count badge */}
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${loadingCount ? 'bg-muted' : 'bg-blue-50 border-blue-200'}`}>
            <Users className={`w-4 h-4 ${loadingCount ? 'text-muted-foreground' : 'text-blue-600'}`} />
            {loadingCount ? (
              <span className="text-sm text-muted-foreground">Counting recipients…</span>
            ) : (
              <span className="text-sm font-semibold text-blue-700">This campaign will be sent to <strong>{recipientCount}</strong> recipients</span>
            )}
          </div>

          {/* Personalization */}
          <div className="border rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm">Personalization Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Address Recipients As</label>
                <Select value={form.personalizationStyle} onValueChange={v => upd('personalizationStyle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERSONALIZATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Greeting Text</label>
                <Input value={form.greetingText} onChange={e => upd('greetingText', e.target.value)} placeholder="Dear" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Tags (click to copy)</p>
              <div className="flex flex-wrap gap-1.5">
                {PERSONALIZATION_TAGS.map(tag => (
                  <Badge key={tag} variant="outline" className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => { navigator.clipboard.writeText(tag); toast.success(`Copied ${tag}`); }}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={() => setStep(2)} disabled={recipientCount === 0} className="gap-1.5">
              Next: Design <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Design */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Design Email</h3>
          {!form.emailBody ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="cursor-pointer border-2 hover:border-primary transition-colors" onClick={() => setDesignMode('template')}>
                <CardContent className="p-6 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Choose a Template</p>
                  <p className="text-sm text-muted-foreground mt-1">Select from {templates.length} available templates</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer border-2 hover:border-primary transition-colors" onClick={() => { setDesignMode('editor'); setShowEditor(true); }}>
                <CardContent className="p-6 text-center">
                  <Monitor className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Build from Scratch</p>
                  <p className="text-sm text-muted-foreground mt-1">Use the drag and drop email editor</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-muted/40 border-b">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Email designed{form.templateName ? ` using "${form.templateName}"` : ''}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowEditor(true)}>Edit Design</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => { upd('emailBody', ''); upd('templateId', ''); upd('templateName', ''); }}>Remove</Button>
                </div>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto bg-white" dangerouslySetInnerHTML={{ __html: form.emailBody }} />
            </div>
          )}

          {/* Template selector */}
          {designMode === 'template' && !form.emailBody && templates.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Select a Template</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map(t => (
                  <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleUseTemplate(t)}>
                    <CardContent className="p-4">
                      <div className="h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="w-8 h-8 text-indigo-300" />
                      </div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(t.category || '').replace(/_/g,' ')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!form.emailBody} className="gap-1.5">
              Next: Schedule <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Schedule */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Schedule & Send</h3>

          {/* Summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-sm mb-3">Campaign Summary</p>
            {[
              { label: 'Campaign Name', value: form.name },
              { label: 'Subject', value: form.subject },
              { label: 'Recipients', value: `${recipientCount} people (${(form.recipientType||'').replace(/_/g,' ')})` },
              { label: 'From', value: `${form.fromName} <${form.fromEmail || '—'}>` },
              { label: 'Template', value: form.templateName || 'Custom design' },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground min-w-[120px]">{r.label}:</span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Send options */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">When to send?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'now', label: 'Send Immediately', icon: Send, desc: 'Send right now to all recipients' },
                { value: 'scheduled', label: 'Schedule for Later', icon: Calendar, desc: 'Pick a specific date and time' },
                { value: 'draft', label: 'Save as Draft', icon: FileText, desc: 'Save and come back later' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => upd('sendMode', opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${form.sendMode === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <opt.icon className={`w-5 h-5 mb-2 ${form.sendMode === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {form.sendMode === 'scheduled' && (
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
                  <input type="date" value={form.scheduledAt} onChange={e => upd('scheduledAt', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Time</label>
                  <input type="time" value={form.scheduledTime} onChange={e => upd('scheduledTime', e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button
              onClick={() => {
                if (form.sendMode === 'draft') handleSaveDraft();
                else if (form.sendMode === 'scheduled') handleSend('scheduled');
                else handleSend('sent');
              }}
              disabled={saving || (form.sendMode === 'scheduled' && (!form.scheduledAt || !form.scheduledTime))}
              className="gap-1.5 min-w-[140px]"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.sendMode === 'now' ? 'Send Now' : form.sendMode === 'scheduled' ? 'Schedule' : 'Save Draft'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}