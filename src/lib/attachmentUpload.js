import { base44 } from '@/api/base44Client';

/**
 * Attachment handling for assignments.
 *
 * Every file is uploaded to private storage and then inspected on the server
 * before its URI is kept: corrupt, renamed, oversized or executable content is
 * refused, so nothing unsafe ever reaches a student.
 */

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp';
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const attachmentExtension = (name) => String(name || '').split('.').pop().toLowerCase();

export const isImageAttachment = (fileName) =>
  ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(attachmentExtension(fileName));

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads one file (stored privately) and returns its validated fields.
 * Throws with a readable reason when the file is refused.
 */
export async function uploadValidatedAttachment(file) {
  const ext = attachmentExtension(file.name);
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    throw new Error(`".${ext}" files are not accepted. Attach a PDF, Word document, text file or image.`);
  }
  if (file.size === 0) throw new Error('That file is empty.');
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('The file is larger than 25 MB.');

  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

  const response = await base44.functions.invoke('validateUpload', { file_uri, fileName: file.name });
  const result = response?.data || {};
  if (!result.valid) {
    throw new Error(result.reason || 'That file was rejected as unsafe or unreadable.');
  }

  return {
    attachmentFileUri: file_uri,
    attachmentFileName: file.name,
    attachmentMimeType: file.type || '',
  };
}

/** Opens a stored attachment through a short-lived signed link. */
export async function openAttachment(fileUri) {
  if (!fileUri) return;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 300,
  });
  if (signed_url) window.open(signed_url, '_blank', 'noopener');
}