"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RosterActionState = { error: string | null };

const updateStudentSchema = z.object({
  subjectId: z.string().uuid(),
  studentId: z.string().uuid(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  studentNumber: z.string().trim().min(1, "Student ID is required"),
  groupName: z.string().trim(),
});

export async function updateStudentAction(
  _prevState: RosterActionState,
  formData: FormData
): Promise<RosterActionState> {
  await requireLecturer();

  const parsed = updateStudentSchema.safeParse({
    subjectId: formData.get("subjectId"),
    studentId: formData.get("studentId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    studentNumber: formData.get("studentNumber"),
    groupName: formData.get("groupName"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      student_number: parsed.data.studentNumber,
      group_name: parsed.data.groupName || null,
    })
    .eq("id", parsed.data.studentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/subjects/${parsed.data.subjectId}/roster`);
  redirect(`/admin/subjects/${parsed.data.subjectId}/roster`);
}

const unenrollSchema = z.object({
  subjectId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export async function unenrollStudentAction(
  _prevState: RosterActionState,
  formData: FormData
): Promise<RosterActionState> {
  await requireLecturer();

  const parsed = unenrollSchema.safeParse({
    subjectId: formData.get("subjectId"),
    studentId: formData.get("studentId"),
  });

  if (!parsed.success) return { error: "Invalid request" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("subject_id", parsed.data.subjectId)
    .eq("student_id", parsed.data.studentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/subjects/${parsed.data.subjectId}/roster`);
  return { error: null };
}
