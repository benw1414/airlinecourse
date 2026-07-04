"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const subjectIdSchema = z.string().uuid();

export type EnrollActionState = { error: string | null };

export async function enroll(
  _prevState: EnrollActionState,
  formData: FormData
): Promise<EnrollActionState> {
  const profile = await requireProfile();
  const parsed = subjectIdSchema.safeParse(formData.get("subjectId"));

  if (!parsed.success) return { error: "Invalid subject" };

  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert({
    subject_id: parsed.data,
    student_id: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function unenroll(
  _prevState: EnrollActionState,
  formData: FormData
): Promise<EnrollActionState> {
  const profile = await requireProfile();
  const parsed = subjectIdSchema.safeParse(formData.get("subjectId"));

  if (!parsed.success) return { error: "Invalid subject" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("subject_id", parsed.data)
    .eq("student_id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { error: null };
}
