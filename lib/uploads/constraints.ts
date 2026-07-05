export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
] as const;

// Canonical MIME type per accepted extension — used both to validate an
// extension and to normalize a file's stored mime_type when the browser's
// reported type and magic-byte sniffing disagree or come back empty.
export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per file
export const MAX_SUBMISSION_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per submission

export function isAllowedMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function mimeTypeFromExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return (ext && EXTENSION_TO_MIME_TYPE[ext]) ?? null;
}

export function isAllowedExtension(filename: string): boolean {
  return mimeTypeFromExtension(filename) !== null;
}

// Browsers are unreliable at reporting `file.type` — mobile browsers, files
// saved from chat apps, and various document types often come through with
// an empty or generic MIME type even though the file itself is fine. Accept
// a file client-side if EITHER the reported MIME type OR the extension
// matches; the server re-validates the real content via magic-byte sniffing
// regardless, so this is just about not blocking legitimate uploads early.
export function isAllowedFile(filename: string, mimeType: string): boolean {
  return isAllowedMimeType(mimeType) || isAllowedExtension(filename);
}
