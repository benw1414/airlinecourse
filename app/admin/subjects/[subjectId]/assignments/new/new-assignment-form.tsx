"use client";

import { useActionState, useId, useState } from "react";
import {
  createAssignment,
  type AssignmentActionState,
} from "@/app/admin/subjects/[subjectId]/assignments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Criterion = {
  key: string;
  name: string;
  description: string;
  maxPoints: string;
};

const initialState: AssignmentActionState = { error: null };

function newCriterion(): Criterion {
  return {
    key: crypto.randomUUID(),
    name: "",
    description: "",
    maxPoints: "",
  };
}

export function NewAssignmentForm({ subjectId }: { subjectId: string }) {
  const [state, formAction, pending] = useActionState(
    createAssignment,
    initialState
  );
  const [criteria, setCriteria] = useState<Criterion[]>([newCriterion()]);
  const formId = useId();

  const total = criteria.reduce(
    (sum, c) => sum + (Number(c.maxPoints) || 0),
    0
  );

  function updateCriterion(key: string, patch: Partial<Criterion>) {
    setCriteria((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function removeCriterion(key: string) {
    setCriteria((rows) => rows.filter((row) => row.key !== key));
  }

  const criteriaPayload = JSON.stringify(
    criteria
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name,
        description: c.description || undefined,
        maxPoints: c.maxPoints,
      }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="criteria" value={criteriaPayload} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-weekNumber`}>Week number</Label>
          <Input
            id={`${formId}-weekNumber`}
            name="weekNumber"
            type="number"
            min={1}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-dueAt`}>Due date (optional)</Label>
          <Input id={`${formId}-dueAt`} name="dueAt" type="datetime-local" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-title`}>Title</Label>
        <Input
          id={`${formId}-title`}
          name="title"
          placeholder="Route Profitability Analysis"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-instructions`}>
          Instructions (optional)
        </Label>
        <Textarea
          id={`${formId}-instructions`}
          name="instructions"
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-submissionMode`}>Submission type</Label>
        <select
          id={`${formId}-submissionMode`}
          name="submissionMode"
          defaultValue="individual"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="individual">Individual</option>
          <option value="group">Group (by student group name)</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Rubric criteria</Label>
          <span className="text-sm text-muted-foreground">
            Total: {total} point{total === 1 ? "" : "s"}
          </span>
        </div>

        {criteria.map((criterion, index) => (
          <div
            key={criterion.key}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Criterion {index + 1}
              </span>
              {criteria.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCriterion(criterion.key)}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  Remove
                </button>
              )}
            </div>
            <Input
              placeholder="Criterion name"
              value={criterion.name}
              onChange={(e) =>
                updateCriterion(criterion.key, { name: e.target.value })
              }
              required
            />
            <Textarea
              placeholder="Description (optional)"
              rows={2}
              value={criterion.description}
              onChange={(e) =>
                updateCriterion(criterion.key, {
                  description: e.target.value,
                })
              }
            />
            <Input
              type="number"
              min={1}
              step="0.5"
              placeholder="Max points"
              value={criterion.maxPoints}
              onChange={(e) =>
                updateCriterion(criterion.key, { maxPoints: e.target.value })
              }
              required
              className="w-32"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => setCriteria((rows) => [...rows, newCriterion()])}
        >
          Add criterion
        </Button>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create assignment"}
      </Button>
    </form>
  );
}
