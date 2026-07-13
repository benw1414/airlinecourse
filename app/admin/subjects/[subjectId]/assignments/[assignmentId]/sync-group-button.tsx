"use client";

import { useActionState } from "react";
import { syncGroupSubmissionsAction, type SyncGroupActionState } from "./group-actions";
import { Button } from "@/components/ui/button";

const initialState: SyncGroupActionState = { error: null, message: null };

export function SyncGroupButton({
  subjectId,
  assignmentId,
  groupName,
}: {
  subjectId: string;
  assignmentId: string;
  groupName: string;
}) {
  const [state, formAction, pending] = useActionState(syncGroupSubmissionsAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="groupName" value={groupName} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Syncing..." : "Sync"}
      </Button>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state.message && <span className="text-xs text-muted-foreground">{state.message}</span>}
    </form>
  );
}
