"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PublishActionState = { error: string | null };

const criterionSchema = z.object({
  rubricCriterionId: z.string().uuid(),
  score: z.coerce.number().min(0),
  feedback: z.string().trim(),
});

const publishSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  submissionId: z.string().uuid(),
  aiGradingResultId: z.string().uuid().optional(),
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
});

export async function publishGrade(
  _prevState: PublishActionState,
  formData: FormData
): Promise<PublishActionState> {
  const profile = await requireLecturer();

  const parsed = publishSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    submissionId: formData.get("submissionId"),
    aiGradingResultId: formData.get("aiGradingResultId") || undefined,
    overallFeedback: formData.get("overallFeedback"),
    criteria: formData.get("criteria"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const totalScore = parsed.data.criteria.reduce((sum, c) => sum + c.score, 0);

  const { data: publishedGrade, error: publishError } = await supabase
    .from("published_grades")
    .upsert(
      {
        submission_id: parsed.data.submissionId,
        total_score: totalScore,
        overall_feedback: parsed.data.overallFeedback,
        published_by: profile.id,
        published_at: new Date().toISOString(),
        source_ai_grading_result_id: parsed.data.aiGradingResultId ?? null,
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

  const { error: statusError } = await supabase
    .from("submissions")
    .update({ status: "published" })
    .eq("id", parsed.data.submissionId);

  if (statusError) return { error: statusError.message };

  revalidatePath(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
  redirect(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
}

const unpublishSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  submissionId: z.string().uuid(),
});

// Removes a single student's published grade — e.g. they were included in a
// group publish by mistake, or missed class and shouldn't have received it.
// Only that student's grade is affected; the rest of the group is untouched.
export async function unpublishGrade(
  _prevState: PublishActionState,
  formData: FormData
): Promise<PublishActionState> {
  await requireLecturer();

  const parsed = unpublishSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    submissionId: formData.get("submissionId"),
  });

  if (!parsed.success) return { error: "Invalid request" };

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("published_grades")
    .delete()
    .eq("submission_id", parsed.data.submissionId);

  if (deleteError) return { error: deleteError.message };

  const { data: files } = await supabase
    .from("submission_files")
    .select("id")
    .eq("submission_id", parsed.data.submissionId)
    .limit(1);

  const { error: statusError } = await supabase
    .from("submissions")
    .update({ status: files?.length ? "submitted" : "draft" })
    .eq("id", parsed.data.submissionId);

  if (statusError) return { error: statusError.message };

  revalidatePath(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
  redirect(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}/submissions/${parsed.data.submissionId}/review`
  );
}
