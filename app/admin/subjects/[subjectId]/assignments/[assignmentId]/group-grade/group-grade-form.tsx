"use client";

import { useActionState, useState } from "react";
import { publishGroupGradeAction, type GroupGradeActionState } from "./actions";
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

type Member = {
  studentId: string;
  displayName: string;
  status: string;
  defaultChecked: boolean;
};

const initialState: GroupGradeActionState = { error: null };

const STATUS_LABEL: Record<string, string> = {
  none: "No submission",
  draft: "Draft (not submitted)",
  submitted: "Submitted",
  graded_pending_review: "AI-graded, pending review",
  published: "Already published",
};

export function GroupGradeForm({
  subjectId,
  assignmentId,
  groupName,
  criteria: initialCriteria,
  overallFeedback: initialOverallFeedback,
  members,
}: {
  subjectId: string;
  assignmentId: string;
  groupName: string;
  criteria: CriterionRow[];
  overallFeedback: string;
  members: Member[];
}) {
  const [state, formAction, pending] = useActionState(publishGroupGradeAction, initialState);
  const [overallFeedback, setOverallFeedback] = useState(initialOverallFeedback);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.studentId, m.defaultChecked]))
  );

  const total = criteria.reduce((sum, c) => sum + (Number(c.score) || 0), 0);
  const includedCount = Object.values(checked).filter(Boolean).length;

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
      <input type="hidden" name="groupName" value={groupName} />
      <input type="hidden" name="criteria" value={criteriaPayload} />
      <input type="hidden" name="overallFeedback" value={overallFeedback} />

      <div className="flex flex-col gap-2">
        <Label>Group members</Label>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          {members.map((member) => (
            <label
              key={member.studentId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="includeStudentIds"
                  value={member.studentId}
                  checked={checked[member.studentId] ?? false}
                  onChange={(e) =>
                    setChecked((c) => ({ ...c, [member.studentId]: e.target.checked }))
                  }
                  className="size-4 accent-primary"
                />
                {member.displayName}
              </span>
              <Badge variant={member.status === "none" || member.status === "draft" ? "outline" : "secondary"}>
                {STATUS_LABEL[member.status] ?? member.status}
              </Badge>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {includedCount} of {members.length} will receive this grade when published.
        </p>
      </div>

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
              placeholder="Feedback for this criterion"
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
        <Button type="submit" disabled={pending || includedCount === 0}>
          {pending ? "Publishing..." : `Publish to ${includedCount} student(s)`}
        </Button>
      </div>
    </form>
  );
}
