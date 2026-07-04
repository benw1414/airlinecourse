"use client";

import { useActionState } from "react";
import {
  triggerGradingAction,
  importGradingResultsAction,
  type GradingActionState,
} from "./grading-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const initialState: GradingActionState = { error: null, message: null };

export function GradeAllButton({
  subjectId,
  assignmentId,
}: {
  subjectId: string;
  assignmentId: string;
}) {
  const [state, formAction, pending] = useActionState(
    triggerGradingAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Grade all pending"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}
    </form>
  );
}

export function ImportBatchButton({
  subjectId,
  assignmentId,
  gradingBatchId,
  status,
}: {
  subjectId: string;
  assignmentId: string;
  gradingBatchId: string;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(
    importGradingResultsAction,
    initialState
  );

  return (
    <div className="flex items-center gap-3">
      <Badge variant={status === "ended" ? "default" : "outline"}>{status}</Badge>
      <form action={formAction} className="flex flex-col items-start gap-1">
        <input type="hidden" name="subjectId" value={subjectId} />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input type="hidden" name="gradingBatchId" value={gradingBatchId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Checking..." : "Check status / Import results"}
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.message && (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        )}
      </form>
    </div>
  );
}
