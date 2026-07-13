"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ensureSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
});

// Lets the lecturer open the grade/review page for an enrolled student who
// never created a submission row at all (never opened the assignment, or
// took part in a group's work without personally uploading anything) — the
// review page needs a submission id to attach a published grade to.
export async function ensureSubmissionForGradingAction(formData: FormData) {
  await requireLecturer();

  const parsed = ensureSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
  });

  if (!parsed.success) redirect(`/admin/subjects/${formData.get("subjectId")}`);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("student_id", parsed.data.studentId)
    .maybeSingle();

  let submissionId = existing?.id;

  if (!submissionId) {
    const { data: created } = await supabase
      .from("submissions")
      .insert({
        assignment_id: parsed.data.assignmentId,
        student_id: parsed.data.studentId,
        status: "draft",
      })
      .select("id")
      .single();
    submissionId = created?.id;
  }

  redirect(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}/submissions/${submissionId}/review`
  );
}
