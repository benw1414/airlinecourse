"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { triggerGrading, importGradingResults } from "@/lib/grading/pipeline";

export type GradingActionState = { error: string | null; message: string | null };

const idsSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
});

export async function triggerGradingAction(
  _prevState: GradingActionState,
  formData: FormData
): Promise<GradingActionState> {
  await requireLecturer();

  const parsed = idsSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
  });
  if (!parsed.success) return { error: "Invalid request", message: null };

  const supabase = await createClient();
  const result = await triggerGrading(supabase, parsed.data.assignmentId);

  if (result.error) return { error: result.error, message: null };

  revalidatePath(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );
  return {
    error: null,
    message: `Submitted ${result.submissionCount} submission(s) for grading.`,
  };
}

const importSchema = idsSchema.extend({
  gradingBatchId: z.string().uuid(),
});

export async function importGradingResultsAction(
  _prevState: GradingActionState,
  formData: FormData
): Promise<GradingActionState> {
  await requireLecturer();

  const parsed = importSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    gradingBatchId: formData.get("gradingBatchId"),
  });
  if (!parsed.success) return { error: "Invalid request", message: null };

  const supabase = await createClient();
  const result = await importGradingResults(supabase, parsed.data.gradingBatchId);

  if (result.error) return { error: result.error, message: null };

  revalidatePath(
    `/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`
  );

  return {
    error: null,
    message:
      result.status === "in_progress"
        ? "Batch is still processing — check back shortly."
        : `Imported ${result.imported} result(s), ${result.failed} failed.`,
  };
}
