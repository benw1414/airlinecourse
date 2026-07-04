"use client";

import { useActionState } from "react";
import { enroll, unenroll, type EnrollActionState } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: EnrollActionState = { error: null };

export function EnrollButton({
  subjectId,
  enrolled,
}: {
  subjectId: string;
  enrolled: boolean;
}) {
  const action = enrolled ? unenroll : enroll;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="subjectId" value={subjectId} />
      <Button
        type="submit"
        variant={enrolled ? "outline" : "default"}
        size="sm"
        disabled={pending}
      >
        {pending ? "..." : enrolled ? "Unenroll" : "Enroll"}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
