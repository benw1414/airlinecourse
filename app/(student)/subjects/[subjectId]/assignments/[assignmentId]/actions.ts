"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fileTypeFromBuffer } from "file-type";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedMimeType,
  MAX_FILE_SIZE_BYTES,
  mimeTypeFromExtension,
} from "@/lib/uploads/constraints";
import { scanFileForViruses } from "@/lib/uploads/virus-scan";

export type ActionState = { error: string | null };

const uuid = z.string().uuid();

export async function ensureSubmission(
  assignmentId: string
): Promise<{ submissionId: string | null; error: string | null }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing) return { submissionId: existing.id, error: null };

  const { data: created, error } = await supabase
    .from("submissions")
    .insert({ assignment_id: assignmentId, student_id: profile.id })
    .select("id")
    .single();

  if (error) return { submissionId: null, error: error.message };
  return { submissionId: created.id, error: null };
}

const recordFileSchema = z.object({
  submissionId: uuid,
  storagePath: z.string().trim().min(1),
  originalFilename: z.string().trim().min(1),
  // Browsers frequently report an empty file.type for perfectly valid files
  // (especially on mobile) — allow it through; effectiveMimeType below
  // falls back to magic-byte sniffing and the file extension.
  mimeType: z.string().trim(),
  sizeBytes: z.coerce.number().positive(),
});

export async function recordUploadedFile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();

  const parsed = recordFileSchema.safeParse({
    submissionId: formData.get("submissionId"),
    storagePath: formData.get("storagePath"),
    originalFilename: formData.get("originalFilename"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { submissionId, storagePath, originalFilename, mimeType, sizeBytes } =
    parsed.data;

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    await removeStorageObject(storagePath);
    return { error: "File exceeds the 25MB per-file limit" };
  }

  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, student_id")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.student_id !== profile.id) {
    await removeStorageObject(storagePath);
    return { error: "Submission not found" };
  }

  const { data: downloaded, error: downloadError } = await supabase.storage
    .from("submissions")
    .download(storagePath);

  if (downloadError || !downloaded) {
    await removeStorageObject(storagePath);
    return { error: "Could not read the uploaded file" };
  }

  const bytes = await downloaded.arrayBuffer();
  const sniffed = await fileTypeFromBuffer(new Uint8Array(bytes));
  // Prefer byte-level sniffing, then the extension (reliable and canonical),
  // and only fall back to the browser-reported type as a last resort — it's
  // frequently empty or wrong on mobile browsers and files from chat apps.
  const effectiveMimeType =
    sniffed?.mime ?? mimeTypeFromExtension(originalFilename) ?? mimeType;

  if (!isAllowedMimeType(effectiveMimeType)) {
    await removeStorageObject(storagePath);
    return { error: `File type "${effectiveMimeType}" is not allowed` };
  }

  const scanStatus = await scanFileForViruses(bytes, originalFilename);

  if (scanStatus === "infected") {
    await removeStorageObject(storagePath);
    return {
      error: "This file failed a virus scan and was rejected. Please re-upload.",
    };
  }

  const { error: insertError } = await supabase.from("submission_files").insert({
    submission_id: submissionId,
    storage_path: storagePath,
    original_filename: originalFilename,
    mime_type: effectiveMimeType,
    size_bytes: sizeBytes,
    scan_status: scanStatus,
  });

  if (insertError) {
    await removeStorageObject(storagePath);
    return { error: insertError.message };
  }

  revalidatePath(
    `/subjects/${formData.get("subjectId")}/assignments/${formData.get("assignmentId")}`
  );
  return { error: null };
}

async function removeStorageObject(path: string) {
  const supabase = await createClient();
  await supabase.storage.from("submissions").remove([path]);
}

const deleteFileSchema = z.object({
  fileId: uuid,
  storagePath: z.string().trim().min(1),
  subjectId: uuid,
  assignmentId: uuid,
});

export async function deleteSubmissionFile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireProfile();

  const parsed = deleteFileSchema.safeParse({
    fileId: formData.get("fileId"),
    storagePath: formData.get("storagePath"),
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) return { error: "Invalid request" };

  const supabase = await createClient();
  await supabase.storage.from("submissions").remove([parsed.data.storagePath]);
  const { error } = await supabase
    .from("submission_files")
    .delete()
    .eq("id", parsed.data.fileId);

  if (error) return { error: error.message };

  revalidatePath(
    `/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
  return { error: null };
}

const markSubmittedSchema = z.object({
  submissionId: uuid,
  subjectId: uuid,
  assignmentId: uuid,
});

export async function markSubmitted(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireProfile();

  const parsed = markSubmittedSchema.safeParse({
    submissionId: formData.get("submissionId"),
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) return { error: "Invalid request" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", parsed.data.submissionId);

  if (error) return { error: error.message };

  revalidatePath(
    `/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
  return { error: null };
}
