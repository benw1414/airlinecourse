"use client";

import { useActionState } from "react";
import { updateStudentAction, type RosterActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RosterActionState = { error: null };

export function EditStudentForm({
  subjectId,
  studentId,
  firstName,
  lastName,
  studentNumber,
  groupName,
}: {
  subjectId: string;
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  studentNumber: string | null;
  groupName: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateStudentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" name="firstName" defaultValue={firstName ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" name="lastName" defaultValue={lastName ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="studentNumber">Student ID</Label>
        <Input id="studentNumber" name="studentNumber" defaultValue={studentNumber ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="groupName">Group name (optional)</Label>
        <Input id="groupName" name="groupName" defaultValue={groupName ?? ""} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
