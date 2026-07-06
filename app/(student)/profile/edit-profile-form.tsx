"use client";

import { useActionState } from "react";
import { updateOwnProfileAction, type ProfileActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ProfileActionState = { error: null, success: false };

export function EditProfileForm({
  firstName,
  lastName,
  nickname,
  studentNumber,
  groupName,
}: {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  studentNumber: string | null;
  groupName: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" name="firstName" defaultValue={firstName ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" name="lastName" defaultValue={lastName ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname">Nickname (optional)</Label>
        <Input id="nickname" name="nickname" defaultValue={nickname ?? ""} />
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
      {state.success && (
        <p className="text-sm text-muted-foreground">Saved.</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
