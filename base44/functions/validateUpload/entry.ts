import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Content validation for files attached to assignments.
 *
 * The browser-reported type is never trusted: the uploaded bytes are downloaded
 * from private storage and inspected. A file is rejected when it is empty, too
 * large, renamed (its bytes do not match its extension), corrupt, or carries
 * executable / active content.
 */

const MAX_BYTES = 25 * 1024 * 1024;

// Extension -> the byte signatures its content must begin with. A mismatch means
// the file is corrupt or deliberately renamed.
const SIGNATURES = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  gif: [[0x47, 0x49, 0x46, 0x38]], // GIF8
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF, confirmed as WEBP below
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // legacy OLE2
  docx: [[0x50, 0x4b, 0x03, 0x04]], // zip container
  txt: null, // plain text has no signature
};

// Executable / script signatures. A document or image must never start with one,
// whatever its extension claims.
const EXECUTABLES = [
  { bytes: [0x4d, 0x5a], label: 'a Windows executable' },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: 'a Linux executable' },
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], label: 'a Mac executable' },
  { bytes: [0xfe, 0xed, 0xfa, 0xce], label: 'a Mac executable' },
  { bytes: [0xfe, 0xed, 0xfa, 0xcf], label: 'a Mac executable' },
  { bytes: [0x23, 0x21], label: 'a script' }, // #!
];

// Active content that must not travel inside a document.
const ACTIVE_CONTENT = [
  { needle: '/javascript', label: 'an embedded script' },
  { needle: '/js', label: 'an embedded script' },
  { needle: '/launch', label: 'an embedded program' },
  { needle: '/openaction', label: 'an automatic action' },
  { needle: '/embeddedfile', label: 'an embedded file' },
  { needle: '/richmedia', label: 'embedded media' },
  { needle: 'vbaproject', label: 'a macro' },
  { needle: '<?php', label: 'server-side code' },
];

const ZIP_BASED = new Set(['docx']);

const startsWith = (bytes, signature) =>
  signature.length <= bytes.length && signature.every((byte, i) => bytes[i] === byte);

const latin1 = (bytes) => {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_uri, fileName } = await req.json();
    if (!file_uri || !fileName) {
      return Response.json({ valid: false, reason: 'The uploaded file could not be identified.' });
    }

    const ext = String(fileName).split('.').pop().toLowerCase();
    if (!(ext in SIGNATURES)) {
      return Response.json({
        valid: false,
        reason: `".${ext}" files are not accepted. Attach a PDF, Word document, text file or image.`,
      });
    }

    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 120,
    });
    if (!signed_url) {
      return Response.json({ valid: false, reason: 'The uploaded file could not be read.' });
    }

    const download = await fetch(signed_url, { signal: AbortSignal.timeout(20000) });
    if (!download.ok) {
      return Response.json({ valid: false, reason: 'The uploaded file could not be read.' });
    }

    const declaredSize = Number(download.headers.get('content-length') || 0);
    if (declaredSize > MAX_BYTES) {
      return Response.json({ valid: false, reason: 'The file is larger than 25 MB.' });
    }

    const bytes = new Uint8Array(await download.arrayBuffer());
    if (bytes.length === 0) {
      return Response.json({ valid: false, reason: 'The file is empty or unreadable.' });
    }
    if (bytes.length > MAX_BYTES) {
      return Response.json({ valid: false, reason: 'The file is larger than 25 MB.' });
    }

    const executable = EXECUTABLES.find(e => startsWith(bytes, e.bytes));
    if (executable) {
      return Response.json({ valid: false, reason: `This file is ${executable.label}, not a document or image.` });
    }

    const signatures = SIGNATURES[ext];
    if (signatures && !signatures.some(signature => startsWith(bytes, signature))) {
      return Response.json({
        valid: false,
        reason: `This file is damaged or is not really a ".${ext}" file.`,
      });
    }

    // A zip that is not a .docx is a disguised archive.
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && !ZIP_BASED.has(ext)) {
      return Response.json({ valid: false, reason: 'This file is an archive, not a document or image.' });
    }

    if (ext === 'webp') {
      const riffType = latin1(bytes.subarray(8, 12));
      if (riffType !== 'WEBP') {
        return Response.json({ valid: false, reason: 'This image is damaged or unreadable.' });
      }
    }

    if (['pdf', 'doc', 'docx'].includes(ext)) {
      const text = latin1(bytes).toLowerCase();
      const found = ACTIVE_CONTENT.find(pattern => text.includes(pattern.needle));
      if (found) {
        return Response.json({
          valid: false,
          reason: `This file contains ${found.label} and was blocked for safety.`,
        });
      }
    }

    return Response.json({ valid: true, bytes: bytes.length, extension: ext });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}