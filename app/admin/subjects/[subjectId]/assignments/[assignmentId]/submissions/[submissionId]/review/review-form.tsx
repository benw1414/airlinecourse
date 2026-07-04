"use client";

import { useActionState, useState } from "react";
import { publishGrade, type PublishActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type CriterionRow = {
  rubricCriterionId: string;
  name: string;
  maxPoints: number;
  score: string;
  feedback: string;
};

const initialState: PublishActionState = { error: null };

export function ReviewForm({
  subjectId,
  assignmentId,
  submissionId,
  aiGradingResultId,
  overallFeedback: initialOverallFeedback,
  criteria: initialCriteria,
}: {
  subjectId: string;
  assignmentId: string;
  submissionId: string;
  aiGradingResultId: string | null;
  overallFeedback: string;
  criteria: CriterionRow[];
}) {
  const [state, formAction, pending] = useActionState(publishGrade, initialState);
  const [overallFeedback, setOverallFeedback] = useState(initialOverallFeedback);
  const [criteria, setCriteria] = useState(initialCriteria);

  const total = criteria.reduce((sum, c) => sum + (Number(c.score) || 0), 0);

  function updateCriterion(id: string, patch: Partial<CriterionRow>) {
    setCriteria((rows) =>
      rows.map((row) => (row.rubricCriterionId === id ? { ...row, ...patch } : row))
    );
  }

  const criteriaPayload = JSON.stringify(
    criteria.map((c) => ({
      rubricCriterionId: c.rubricCriterionId,
      score: c.score,
      feedback: c.feedback,
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="submissionId" value={submissionId} />
      {aiGradingResultId && (
        <input type="hidden" name="aiGradingResultId" value={aiGradingResultId} />
      )}
      <input type="hidden" name="criteria" value={criteriaPayload} />
      <input type="hidden" name="overallFeedback" value={overallFeedback} />

      <div className="flex flex-col gap-3">
        {criteria.map((criterion) => (
          <div
            key={criterion.rubricCriterionId}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{criterion.name}</span>
              <Badge variant="outline">max {criterion.maxPoints} pts</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`score-${criterion.rubricCriterionId}`}>Score</Label>
              <Input
                id={`score-${criterion.rubricCriterionId}`}
                type="number"
                min={0}
                max={criterion.maxPoints}
                step="0.5"
                value={criterion.score}
                onChange={(e) =>
                  updateCriterion(criterion.rubricCriterionId, {
                    score: e.target.value,
                  })
                }
                className="w-24"
              />
            </div>
            <Textarea
              rows={2}
              value={criterion.feedback}
              onChange={(e) =>
                updateCriterion(criterion.rubricCriterionId, {
                  feedback: e.target.value,
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="overall">Overall feedback</Label>
        <Textarea
          id="overall"
          rows={4}
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total: {total} points</span>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing..." : "Publish grade"}
        </Button>
      </div>
    </form>
  );
}
