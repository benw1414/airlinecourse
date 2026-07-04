import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic/client";
import { extractSubmissionContent } from "./extract";
import {
  GRADING_SYSTEM_PROMPT,
  buildRubricSchema,
  buildUserMessageContent,
  type RubricCriterionInput,
} from "./prompt";

const MAX_TOKENS = 8000;

export type TriggerGradingResult = {
  gradingBatchId: string | null;
  submissionCount: number;
  error: string | null;
};

export async function triggerGrading(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<TriggerGradingResult> {
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, title, instructions")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return { gradingBatchId: null, submissionCount: 0, error: "Assignment not found" };
  }

  const { data: criteriaRows, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .select("id, name, description, max_points")
    .eq("assignment_id", assignmentId)
    .order("position");

  if (criteriaError || !criteriaRows?.length) {
    return { gradingBatchId: null, submissionCount: 0, error: "No rubric criteria found" };
  }

  const criteria: RubricCriterionInput[] = criteriaRows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    maxPoints: c.max_points,
  }));

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      "id, submission_files(id, storage_path, original_filename, mime_type, scan_status)"
    )
    .eq("assignment_id", assignmentId)
    .eq("status", "submitted");

  if (submissionsError) {
    return { gradingBatchId: null, submissionCount: 0, error: submissionsError.message };
  }

  if (!submissions?.length) {
    return { gradingBatchId: null, submissionCount: 0, error: "No pending submissions" };
  }

  const schema = buildRubricSchema(criteria);
  const requests = [];

  for (const submission of submissions) {
    const eligibleFiles = submission.submission_files.filter(
      (f: { scan_status: string }) => f.scan_status !== "infected"
    );

    const downloaded = await Promise.all(
      eligibleFiles.map(
        async (f: {
          storage_path: string;
          original_filename: string;
          mime_type: string;
        }) => {
          const { data } = await supabase.storage
            .from("submissions")
            .download(f.storage_path);
          if (!data) return null;
          const bytes = Buffer.from(await data.arrayBuffer());
          return { filename: f.original_filename, mimeType: f.mime_type, bytes };
        }
      )
    );

    const validFiles = downloaded.filter((f): f is NonNullable<typeof f> => f !== null);
    const { blocks, skippedFiles } = await extractSubmissionContent(validFiles);

    const content = buildUserMessageContent({
      assignmentTitle: assignment.title,
      instructions: assignment.instructions,
      criteria,
      contentBlocks: blocks,
      skippedFiles,
    });

    requests.push({
      custom_id: submission.id,
      params: {
        model: GRADING_MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: "text" as const,
            text: GRADING_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        thinking: { type: "adaptive" as const },
        output_config: {
          effort: "high" as const,
          format: { type: "json_schema" as const, schema },
        },
        messages: [{ role: "user" as const, content }],
      },
    });
  }

  const batch = await anthropic.messages.batches.create({ requests });

  const { data: gradingBatch, error: gradingBatchError } = await supabase
    .from("grading_batches")
    .insert({
      assignment_id: assignmentId,
      anthropic_batch_id: batch.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (gradingBatchError) {
    return { gradingBatchId: null, submissionCount: 0, error: gradingBatchError.message };
  }

  return {
    gradingBatchId: gradingBatch.id,
    submissionCount: requests.length,
    error: null,
  };
}

export type ImportResult = {
  status: "in_progress" | "ended";
  imported: number;
  failed: number;
  error: string | null;
};

export async function importGradingResults(
  supabase: SupabaseClient,
  gradingBatchId: string
): Promise<ImportResult> {
  const { data: gradingBatch, error: gradingBatchError } = await supabase
    .from("grading_batches")
    .select("id, anthropic_batch_id, assignment_id")
    .eq("id", gradingBatchId)
    .single();

  if (gradingBatchError || !gradingBatch) {
    return { status: "in_progress", imported: 0, failed: 0, error: "Batch not found" };
  }

  const batch = await anthropic.messages.batches.retrieve(gradingBatch.anthropic_batch_id);

  if (batch.processing_status !== "ended") {
    return { status: "in_progress", imported: 0, failed: 0, error: null };
  }

  const { data: criteriaRows } = await supabase
    .from("rubric_criteria")
    .select("id, max_points")
    .eq("assignment_id", gradingBatch.assignment_id);

  const maxPointsById = new Map((criteriaRows ?? []).map((c) => [c.id, c.max_points]));

  let imported = 0;
  let failed = 0;

  for await (const result of await anthropic.messages.batches.results(
    gradingBatch.anthropic_batch_id
  )) {
    const submissionId = result.custom_id;

    if (result.result.type !== "succeeded") {
      await supabase.from("ai_grading_results").upsert(
        {
          submission_id: submissionId,
          grading_batch_id: gradingBatchId,
          model_used: process.env.GRADING_MODEL ?? "claude-sonnet-5",
          status: "failed",
          raw_response: result.result,
        },
        { onConflict: "submission_id" }
      );
      failed++;
      continue;
    }

    const textBlock = result.result.message.content.find(
      (b: { type: string }) => b.type === "text"
    ) as { text: string } | undefined;

    let parsed: { overall_feedback: string; criteria: { rubric_criterion_id: string; score: number; feedback: string }[] } | null = null;
    try {
      parsed = textBlock ? JSON.parse(textBlock.text) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      await supabase.from("ai_grading_results").upsert(
        {
          submission_id: submissionId,
          grading_batch_id: gradingBatchId,
          model_used: process.env.GRADING_MODEL ?? "claude-sonnet-5",
          status: "failed",
          raw_response: result.result,
        },
        { onConflict: "submission_id" }
      );
      failed++;
      continue;
    }

    let needsAttention = false;
    const clampedCriteria = parsed.criteria.map((c) => {
      const maxPoints = maxPointsById.get(c.rubric_criterion_id) ?? 0;
      if (c.score > maxPoints) needsAttention = true;
      return { ...c, score: Math.min(c.score, maxPoints) };
    });
    const totalScore = clampedCriteria.reduce((sum, c) => sum + c.score, 0);

    const { data: aiResult, error: aiResultError } = await supabase
      .from("ai_grading_results")
      .upsert(
        {
          submission_id: submissionId,
          grading_batch_id: gradingBatchId,
          model_used: process.env.GRADING_MODEL ?? "claude-sonnet-5",
          status: "completed",
          total_score: totalScore,
          overall_feedback: parsed.overall_feedback,
          raw_response: result.result,
          needs_attention: needsAttention,
        },
        { onConflict: "submission_id" }
      )
      .select("id")
      .single();

    if (aiResultError || !aiResult) {
      failed++;
      continue;
    }

    await supabase
      .from("ai_criterion_scores")
      .delete()
      .eq("ai_grading_result_id", aiResult.id);

    await supabase.from("ai_criterion_scores").insert(
      clampedCriteria.map((c) => ({
        ai_grading_result_id: aiResult.id,
        rubric_criterion_id: c.rubric_criterion_id,
        score: c.score,
        feedback: c.feedback,
      }))
    );

    await supabase
      .from("submissions")
      .update({ status: "graded_pending_review" })
      .eq("id", submissionId);

    imported++;
  }

  await supabase
    .from("grading_batches")
    .update({ status: "ended" })
    .eq("id", gradingBatchId);

  return { status: "ended", imported, failed, error: null };
}
