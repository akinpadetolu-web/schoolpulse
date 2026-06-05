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
  Camera, ImagePlus, Trash2,
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
    <div className="border rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 260 }}>
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
        style={{ minHeight: 200 }}
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
  const [images, setImages] = useState([]); // array of File objects
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Stop camera on tab change or close
  useEffect(() => {
    if (tab !== 'images' || !open) stopCamera();
  }, [tab, open]);

  function stopCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setCameraActive(false);
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    setCameraStream(stream);
    setCameraActive(true);
    setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      const f = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setImages(prev => [...prev, f]);
    }, 'image/jpeg', 0.9);
  }

  function handleImageFiles(e) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024);
    if (valid.length !== files.length) toast.error('Some files were skipped (images only, max 20MB each)');
    setImages(prev => [...prev, ...valid]);
    e.target.value = '';
  }

  // Load any existing submission
  useEffect(() => {
    if (!open || !assignment?.id) return;
    setRichContent('');
    setFile(null);
    setImages([]);
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
    if (tab === 'images' && images.length === 0) { toast.error('Please add at least one image'); return; }

    setSubmitting(true);
    try {
      let fileUrl = null;
      let imageUrls = [];

      if (tab === 'upload' && file) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        fileUrl = res.file_url;
        setUploading(false);
      }

      if (tab === 'images' && images.length > 0) {
        setUploading(true);
        const uploads = await Promise.all(images.map(img => base44.integrations.Core.UploadFile({ file: img })));
        imageUrls = uploads.map(r => r.file_url);
        setUploading(false);
      }

      const payload = {
        schoolId: user.schoolId,
        assignmentId: assignment.id,
        studentId: user.id,
        studentName: user.fullName,
        content: tab === 'type' ? richContent : null,
        fileUrl: fileUrl || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
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
      <DialogContent className="w-full max-w-3xl h-[95vh] sm:h-auto sm:max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-xl pr-6">{assignment.title}</DialogTitle>
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
            <TabsTrigger value="type" className="flex-1 text-xs sm:text-sm">Type answer</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 text-xs sm:text-sm">Upload PDF</TabsTrigger>
            <TabsTrigger value="images" className="flex-1 text-xs sm:text-sm">Images / Camera</TabsTrigger>
          </TabsList>

          {/* Rich text */}
          <TabsContent value="type" className="mt-3">
            <RichEditor content={richContent} onChange={setRichContent} />
          </TabsContent>

          {/* Images / Camera */}
          <TabsContent value="images" className="mt-3 space-y-3">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" /> Upload Images
              </Button>
              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={cameraActive ? stopCamera : startCamera}>
                <Camera className="w-4 h-4" /> {cameraActive ? 'Stop Camera' : 'Take Photo'}
              </Button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageFiles} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFiles} />
            </div>

            {/* Live camera */}
            {cameraActive && (
              <div className="relative rounded-lg overflow-hidden border bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-contain" />
                <Button
                  type="button"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 gap-2 shadow-lg"
                  onClick={capturePhoto}
                >
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </div>
            )}

            {/* Image previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border aspect-[4/3] bg-muted">
                    <img src={URL.createObjectURL(img)} alt={`img-${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-600 transition-colors"
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && !cameraActive && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground cursor-pointer hover:border-primary transition-colors"
                onClick={() => imageInputRef.current?.click()}>
                <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Upload photos or take a picture</p>
                <p className="text-xs mt-1">JPEG, PNG etc. — max 20MB each</p>
              </div>
            )}
          </TabsContent>

          {/* PDF upload */}
          <TabsContent value="upload" className="mt-3">
            <div
              className="border-2 border-dashed rounded-lg p-6 sm:p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors"
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