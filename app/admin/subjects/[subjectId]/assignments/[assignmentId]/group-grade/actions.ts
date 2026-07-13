"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type GroupGradeActionState = { error: string | null };

const criterionSchema = z.object({
  rubricCriterionId: z.string().uuid(),
  score: z.coerce.number().min(0),
  feedback: z.string().trim(),
});

const publishGroupGradeSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  groupName: z.string().trim().min(1),
  overallFeedback: z.string().trim(),
  criteria: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid scores payload" });
        return z.NEVER;
      }
    })
    .pipe(z.array(criterionSchema)),
  includeStudentIds: z.array(z.string().uuid()).min(1, "Select at least one student to grade"),
});

export async function publishGroupGradeAction(
  _prevState: GroupGradeActionState,
  formData: FormData
): Promise<GroupGradeActionState> {
  const profile = await requireLecturer();

  const parsed = publishGroupGradeSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    groupName: formData.get("groupName"),
    overallFeedback: formData.get("overallFeedback"),
    criteria: formData.get("criteria"),
    includeStudentIds: formData.getAll("includeStudentIds"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const totalScore = parsed.data.criteria.reduce((sum, c) => sum + c.score, 0);
  const publishedAt = new Date().toISOString();

  for (const studentId of parsed.data.includeStudentIds) {
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id")
      .eq("assignment_id", parsed.data.assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    let submissionId = existingSubmission?.id;

    if (!submissionId) {
      const { data: created, error: createError } = await supabase
        .from("submissions")
        .insert({
          assignment_id: parsed.data.assignmentId,
          student_id: studentId,
          status: "submitted",
          submitted_at: publishedAt,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return { error: createError?.message ?? "Could not create a submission record" };
      }
      submissionId = created.id;
    }

    const { data: publishedGrade, error: publishError } = await supabase
      .from("published_grades")
      .upsert(
        {
          submission_id: submissionId,
          total_score: totalScore,
          overall_feedback: parsed.data.overallFeedback,
          published_by: profile.id,
          published_at: publishedAt,
        },
        { onConflict: "submission_id" }
      )
      .select("id")
      .single();

    if (publishError || !publishedGrade) {
      return { error: publishError?.message ?? "Failed to publish grade" };
    }

    await supabase
      .from("published_criterion_scores")
      .delete()
      .eq("published_grade_id", publishedGrade.id);

    const { error: criteriaError } = await supabase
      .from("published_criterion_scores")
      .insert(
        parsed.data.criteria.map((c) => ({
          published_grade_id: publishedGrade.id,
          rubric_criterion_id: c.rubricCriterionId,
          score: c.score,
          feedback: c.feedback,
        }))
      );

    if (criteriaError) return { error: criteriaError.message };

    await supabase.from("submissions").update({ status: "published" }).eq("id", submissionId);
  }

  revalidatePath(`/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`);
  redirect(`/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`);
}
