import type { ContentBlock } from "./extract";

export type RubricCriterionInput = {
  id: string;
  name: string;
  description: string | null;
  maxPoints: number;
};

// Stable across every grading request — this is what makes prompt caching
// pay off across a whole "grade all pending" batch (same assignment, same
// rubric, same instructions; only the submission content varies).
export const GRADING_SYSTEM_PROMPT = `You are grading a university airline-business assignment on behalf of the lecturer.

Grade strictly against the rubric criteria provided. For each criterion:
- Base the score only on that criterion's stated description — do not invent additional expectations.
- Award partial credit where the submission partially meets a criterion.
- Write specific, actionable feedback referencing what the student actually wrote.
- Never award more than the criterion's max points.

If a submission is missing content needed to evaluate a criterion, score it low and say what was missing rather than guessing generously.

Provide overall_feedback summarizing the submission's strengths and weaknesses across all criteria.`;

export function buildRubricSchema(criteria: RubricCriterionInput[]) {
  return {
    type: "object",
    properties: {
      overall_feedback: { type: "string" },
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            rubric_criterion_id: {
              type: "string",
              enum: criteria.map((c) => c.id),
            },
            score: { type: "number" },
            feedback: { type: "string" },
          },
          required: ["rubric_criterion_id", "score", "feedback"],
          additionalProperties: false,
        },
      },
    },
    required: ["overall_feedback", "criteria"],
    additionalProperties: false,
  } as const;
}

function rubricToText(criteria: RubricCriterionInput[]): string {
  return criteria
    .map(
      (c) =>
        `- [id: ${c.id}] ${c.name} (max ${c.maxPoints} pts)${
          c.description ? `: ${c.description}` : ""
        }`
    )
    .join("\n");
}

export function buildUserMessageContent({
  assignmentTitle,
  instructions,
  criteria,
  contentBlocks,
  skippedFiles,
}: {
  assignmentTitle: string;
  instructions: string | null;
  criteria: RubricCriterionInput[];
  contentBlocks: ContentBlock[];
  skippedFiles: string[];
}): ContentBlock[] {
  const header = [
    `Assignment: ${assignmentTitle}`,
    instructions ? `Instructions: ${instructions}` : null,
    "",
    "Rubric criteria:",
    rubricToText(criteria),
    "",
    skippedFiles.length
      ? `Note: ${skippedFiles.length} file(s) could not be read and are not included: ${skippedFiles.join(", ")}.`
      : null,
    "",
    "Student submission follows:",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return [{ type: "text", text: header }, ...contentBlocks];
}
