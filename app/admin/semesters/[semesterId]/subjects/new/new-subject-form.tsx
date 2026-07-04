"use client";

import { useActionState } from "react";
import { createSubject, type SubjectActionState } from "@/app/admin/subjects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: SubjectActionState = { error: null };

export function NewSubjectForm({ semesterId }: { semesterId: string }) {
  const [state, formAction, pending] = useActionState(
    createSubject,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="semesterId" value={semesterId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Subject code</Label>
        <Input id="code" name="code" placeholder="AB301" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Airline Revenue Management" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create subject"}
      </Button>
    </form>
  );
}
