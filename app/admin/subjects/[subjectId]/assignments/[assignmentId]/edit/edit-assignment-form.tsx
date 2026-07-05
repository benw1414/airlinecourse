"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAssignment } from "@/app/admin/subjects/[subjectId]/assignments/actions";
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

export function EditAssignmentForm({
  subjectId,
  assignmentId,
  weekNumber,
  title,
  instructions,
  dueAt,
  criteria: initialCriteria,
}: {
  subjectId: string;
  assignmentId: string;
  weekNumber: number;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  criteria: { id: string; name: string; description: string | null; maxPoints: number }[];
}) {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [criteria, setCriteria] = useState<Criterion[]>(
    initialCriteria.map((c) => ({
      key: c.id,
      name: c.name,
      description: c.description ?? "",
      maxPoints: String(c.maxPoints),
    }))
  );

  const total = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

  function updateCriterion(key: string, patch: Partial<Criterion>) {
    setCriteria((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeCriterion(key: string) {
    setCriteria((rows) => rows.filter((row) => row.key !== key));
  }

  function handleSubmit(formData: FormData) {
    const criteriaPayload = JSON.stringify(
      criteria
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name,
          description: c.description || undefined,
          maxPoints: c.maxPoints,
        }))
    );
    formData.set("criteria", criteriaPayload);

    startTransition(async () => {
      const result = await updateAssignment({ error: null }, formData);
      if (result.error) setError(result.error);
      else router.push(`/admin/subjects/${subjectId}/assignments/${assignmentId}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-weekNumber`}>Week number</Label>
          <Input
            id={`${formId}-weekNumber`}
            name="weekNumber"
            type="number"
            min={1}
            defaultValue={weekNumber}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-dueAt`}>Due date (optional)</Label>
          <Input
            id={`${formId}-dueAt`}
            name="dueAt"
            type="datetime-local"
            defaultValue={dueAt ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-title`}>Title</Label>
        <Input id={`${formId}-title`} name="title" defaultValue={title} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-instructions`}>Instructions (optional)</Label>
        <Textarea
          id={`${formId}-instructions`}
          name="instructions"
          rows={4}
          defaultValue={instructions ?? ""}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Rubric criteria</Label>
          <span className="text-sm text-muted-foreground">
            Total: {total} point{total === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Removing a criterion that already has AI or published scores will delete
          those scores for it.
        </p>

        {criteria.map((criterion, index) => (
          <div key={criterion.key} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Criterion {index + 1}</span>
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
              onChange={(e) => updateCriterion(criterion.key, { name: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description (optional)"
              rows={2}
              value={criterion.description}
              onChange={(e) =>
                updateCriterion(criterion.key, { description: e.target.value })
              }
            />
            <Input
              type="number"
              min={1}
              step="0.5"
              placeholder="Max points"
              value={criterion.maxPoints}
              onChange={(e) => updateCriterion(criterion.key, { maxPoints: e.target.value })}
              required
              className="w-32"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setCriteria((rows) => [
              ...rows,
              { key: crypto.randomUUID(), name: "", description: "", maxPoints: "" },
            ])
          }
        >
          Add criterion
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
