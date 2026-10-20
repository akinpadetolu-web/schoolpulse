import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paperclip, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ATTACHMENT_ACCEPT, uploadValidatedAttachment } from '@/lib/attachmentUpload';

/**
 * Document / image field for assignment creation. The chosen file is uploaded
 * and content-checked before it is accepted, so a corrupt, renamed or
 * executable file never gets attached.
 */
export default function AttachmentPicker({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file) {
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await uploadValidatedAttachment(file);
      onChange(attachment);
      toast.success(`${attachment.attachmentFileName} attached`);
    } catch (err) {
      toast.error(err?.message || 'That file could not be attached');
      onChange(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <Label>Attachment</Label>

      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />

      {value?.attachmentFileUri ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <Paperclip className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 min-w-0 truncate text-sm">{value.attachmentFileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
          {uploading ? 'Checking file…' : 'Attach document or image'}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        PDF, Word, text or image, up to 25 MB. Files that are damaged, renamed or contain active content are refused.
      </p>
    </div>
  );
}