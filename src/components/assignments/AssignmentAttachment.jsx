import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { openAttachment } from '@/lib/attachmentUpload';

/** Opens an assignment's attached document or image through a signed link. */
export default function AssignmentAttachment({ fileUri, fileName, className = '' }) {
  const [busy, setBusy] = useState(false);

  if (!fileUri) return null;

  async function open(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await openAttachment(fileUri);
    } catch {
      toast.error('Could not open that attachment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`max-w-full ${className}`}
      onClick={open}
      disabled={busy}
      title={fileName || 'Attachment'}
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
      <span className="truncate">{fileName || 'Attachment'}</span>
    </Button>
  );
}