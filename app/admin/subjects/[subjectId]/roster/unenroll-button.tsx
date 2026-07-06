"use client";

import { useActionState } from "react";
import { unenrollStudentAction, type RosterActionState } from "./actions";

const initialState: RosterActionState = { error: null };

export function UnenrollButton({
  subjectId,
  studentId,
  studentName,
}: {
  subjectId: string;
  studentId: string;
  studentName: string;
}) {
  const [state, formAction, pending] = useActionState(unenrollStudentAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Remove ${studentName} from this subject's roster? Their existing submissions and grades are kept.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-destructive underline underline-offset-4 disabled:opacity-50"
      >
        {pending ? "Removing..." : "Remove"}
      </button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
