"use client";

import { useActionState } from "react";
import { unpublishGrade, type PublishActionState } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: PublishActionState = { error: null };

export function UnpublishButton({
  subjectId,
  assignmentId,
  submissionId,
  studentName,
}: {
  subjectId: string;
  assignmentId: string;
  submissionId: string;
  studentName: string;
}) {
  const [state, formAction, pending] = useActionState(unpublishGrade, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Remove ${studentName}'s published grade? They'll no longer see it, and you can re-grade them separately.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Removing..." : "Unpublish grade"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
