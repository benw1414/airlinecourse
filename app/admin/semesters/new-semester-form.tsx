"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSemester, type SemesterActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SemesterActionState = { error: null };

export function NewSemesterForm() {
  const [state, formAction, pending] = useActionState(
    createSemester,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Semester name</Label>
        <Input id="name" name="name" placeholder="Fall 2026" required className="w-48" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="startsOn">Starts on</Label>
        <Input id="startsOn" name="startsOn" type="date" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="endsOn">Ends on</Label>
        <Input id="endsOn" name="endsOn" type="date" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add semester"}
      </Button>
      {state.error && <p className="text-sm text-destructive w-full">{state.error}</p>}
    </form>
  );
}
