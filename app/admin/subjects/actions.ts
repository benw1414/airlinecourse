"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const subjectSchema = z.object({
  semesterId: z.string().uuid(),
  code: z.string().trim().min(1, "Code is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
});

export type SubjectActionState = { error: string | null };

export async function createSubject(
  _prevState: SubjectActionState,
  formData: FormData
): Promise<SubjectActionState> {
  await requireLecturer();

  const parsed = subjectSchema.safeParse({
    semesterId: formData.get("semesterId"),
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      semester_id: parsed.data.semesterId,
      code: parsed.data.code,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/semesters");
  redirect(`/admin/subjects/${data.id}`);
}

const updateSubjectSchema = z.object({
  subjectId: z.string().uuid(),
  code: z.string().trim().min(1, "Code is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
});

export async function updateSubject(
  _prevState: SubjectActionState,
  formData: FormData
): Promise<SubjectActionState> {
  await requireLecturer();

  const parsed = updateSubjectSchema.safeParse({
    subjectId: formData.get("subjectId"),
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({
      code: parsed.data.code,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .eq("id", parsed.data.subjectId);

  if (error) {
    return {
      error: error.code === "23505" ? "That code is already used in this semester" : error.message,
    };
  }

  revalidatePath("/admin/semesters");
  revalidatePath(`/admin/subjects/${parsed.data.subjectId}`);
  return { error: null };
}
