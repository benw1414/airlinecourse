"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const criteriaSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1, "Criterion name is required"),
      description: z.string().trim().optional(),
      maxPoints: z.coerce.number().positive("Points must be greater than 0"),
    })
  )
  .min(1, "Add at least one rubric criterion");

const assignmentSchema = z.object({
  subjectId: z.string().uuid(),
  weekNumber: z.coerce.number().int().positive("Week number must be positive"),
  title: z.string().trim().min(1, "Title is required"),
  instructions: z.string().trim().optional(),
  dueAt: z.string().optional(),
  criteria: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid rubric data" });
        return z.NEVER;
      }
    })
    .pipe(criteriaSchema),
});

export type AssignmentActionState = { error: string | null };

export async function createAssignment(
  _prevState: AssignmentActionState,
  formData: FormData
): Promise<AssignmentActionState> {
  await requireLecturer();

  const parsed = assignmentSchema.safeParse({
    subjectId: formData.get("subjectId"),
    weekNumber: formData.get("weekNumber"),
    title: formData.get("title"),
    instructions: formData.get("instructions") || undefined,
    dueAt: formData.get("dueAt") || undefined,
    criteria: formData.get("criteria"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      subject_id: parsed.data.subjectId,
      week_number: parsed.data.weekNumber,
      title: parsed.data.title,
      instructions: parsed.data.instructions ?? null,
      due_at: parsed.data.dueAt
        ? new Date(parsed.data.dueAt).toISOString()
        : null,
    })
    .select("id")
    .single();

  if (assignmentError) return { error: assignmentError.message };

  const { error: criteriaError } = await supabase.from("rubric_criteria").insert(
    parsed.data.criteria.map((c, index) => ({
      assignment_id: assignment.id,
      name: c.name,
      description: c.description ?? null,
      max_points: c.maxPoints,
      position: index,
    }))
  );

  if (criteriaError) {
    // Best-effort cleanup: remove the assignment so we don't leave an
    // assignment with zero rubric criteria behind.
    await supabase.from("assignments").delete().eq("id", assignment.id);
    return { error: criteriaError.message };
  }

  revalidatePath(`/admin/subjects/${parsed.data.subjectId}`);
  redirect(`/admin/subjects/${parsed.data.subjectId}/assignments/${assignment.id}`);
}
