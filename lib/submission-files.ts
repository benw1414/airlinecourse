"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Storage RLS (student owns their path, or is_lecturer()) is the real
// authorization boundary here — this just wraps createSignedUrl, which
// itself respects those policies, so a caller with no access simply gets
// an error back rather than a URL.
export async function getSubmissionFileUrl(
  fileId: string
): Promise<{ url: string | null; error: string | null }> {
  await requireProfile();
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("submission_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (!file) return { url: null, error: "File not found" };

  const { data: signed, error } = await supabase.storage
    .from("submissions")
    .createSignedUrl(file.storage_path, 60);

  if (error || !signed) {
    return { url: null, error: error?.message ?? "Could not create a download link" };
  }

  return { url: signed.signedUrl, error: null };
}
