import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Upload, FileText, CheckCircle2, X,
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ── Toolbar button ──────────────────────────────────────────────────────────
function ToolbarBtn({ icon: Icon, title, onClick, active }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? 'bg-muted text-primary' : 'text-foreground'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ── Rich-text editor ────────────────────────────────────────────────────────
function RichEditor({ content, onChange }) {
  const editorRef = useRef(null);

  function exec(command, value = null) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML || '');
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML || '');
  }

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40">
        <ToolbarBtn icon={Bold} title="Bold" onClick={() => exec('bold')} />
        <ToolbarBtn icon={Italic} title="Italic" onClick={() => exec('italic')} />
        <ToolbarBtn icon={Underline} title="Underline" onClick={() => exec('underline')} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn icon={Heading1} title="Heading 1" onClick={() => exec('formatBlock', '<h2>')} />
        <ToolbarBtn icon={Heading2} title="Heading 2" onClick={() => exec('formatBlock', '<h3>')} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn icon={List} title="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <ToolbarBtn icon={ListOrdered} title="Numbered list" onClick={() => exec('insertOrderedList')} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn icon={AlignLeft} title="Align left" onClick={() => exec('justifyLeft')} />
        <ToolbarBtn icon={AlignCenter} title="Align center" onClick={() => exec('justifyCenter')} />
        <ToolbarBtn icon={AlignRight} title="Align right" onClick={() => exec('justifyRight')} />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="flex-1 p-4 outline-none text-sm leading-relaxed overflow-y-auto prose prose-sm max-w-none"
        style={{ minHeight: 300 }}
        dangerouslySetInnerHTML={content === '' ? undefined : undefined}
        data-placeholder="Start typing your assignment here..."
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin: .5rem 0; }
        [contenteditable] h3 { font-size: 1.05rem; font-weight: 600; margin: .4rem 0; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5rem; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5rem; }
      `}</style>
    </div>
  );
}

// ── Main dialog ─────────────────────────────────────────────────────────────
export default function AssignmentSubmitDialog({ open, onOpenChange, assignment, user }) {
  const [tab, setTab] = useState('type');
  const [richContent, setRichContent] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const fileInputRef = useRef(null);

  // Load any existing submission
  useEffect(() => {
    if (!open || !assignment?.id) return;
    setRichContent('');
    setFile(null);
    setExistingSubmission(null);
    base44.entities.Submission.filter({ assignmentId: assignment.id, studentId: user.id })
      .then(res => {
        if (res?.length > 0) setExistingSubmission(res[0]);
      });
  }, [open, assignment?.id]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
    if (f.size > 100 * 1024 * 1024) { toast.error('File must be under 100MB'); return; }
    setFile(f);
  }

  async function handleSubmit() {
    if (tab === 'type' && !richContent.trim()) { toast.error('Please write something before submitting'); return; }
    if (tab === 'upload' && !file) { toast.error('Please select a PDF file'); return; }

    setSubmitting(true);
    try {
      let fileUrl = null;
      if (tab === 'upload' && file) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        fileUrl = res.file_url;
        setUploading(false);
      }

      const payload = {
        schoolId: user.schoolId,
        assignmentId: assignment.id,
        studentId: user.id,
        studentName: user.fullName,
        content: tab === 'type' ? richContent : null,
        fileUrl: fileUrl || null,
        submittedAt: new Date().toISOString(),
      };

      if (existingSubmission) {
        await base44.entities.Submission.update(existingSubmission.id, payload);
        toast.success('Submission updated!');
      } else {
        await base44.entities.Submission.create(payload);
        toast.success('Assignment submitted!');
      }

      onOpenChange(false);
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  if (!assignment) return null;

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{assignment.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{assignment.subjectName} • {assignment.teacherName}</span>
            {assignment.dueDate && (
              <Badge variant={isPastDue ? 'destructive' : 'outline'} className="text-xs">
                Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">Max score: {assignment.maxScore || 100}</Badge>
          </div>
        </DialogHeader>

        {/* Assignment description */}
        {assignment.description && (
          <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground border">
            <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Instructions</p>
            <p>{assignment.description}</p>
          </div>
        )}

        {/* Existing submission banner */}
        {existingSubmission && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>You already submitted this assignment. You can update your submission below.</span>
          </div>
        )}

        {/* Submission tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="type" className="flex-1">Type your answer</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload PDF</TabsTrigger>
          </TabsList>

          {/* Rich text */}
          <TabsContent value="type" className="mt-3">
            <RichEditor content={richContent} onChange={setRichContent} />
          </TabsContent>

          {/* PDF upload */}
          <TabsContent value="upload" className="mt-3">
            <div
              className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <FileText className="w-12 h-12 text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={e => { e.stopPropagation(); setFile(null); fileInputRef.current.value = ''; }}
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <p className="font-medium">Click to select a PDF file</p>
                  <p className="text-xs text-muted-foreground">PDF only, max 100MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting && (uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Loader2 className="w-4 h-4 animate-spin mr-2" />)}
            {existingSubmission ? 'Update Submission' : 'Submit Assignment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}