"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSemester } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditSemesterForm({
  semesterId,
  name,
  startsOn,
  endsOn,
}: {
  semesterId: string;
  name: string;
  startsOn: string;
  endsOn: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSemester({ error: null }, formData);
      if (result.error) setError(result.error);
      else router.push("/admin/semesters");
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="semesterId" value={semesterId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Semester name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="startsOn">Starts on</Label>
        <Input id="startsOn" name="startsOn" type="date" defaultValue={startsOn} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="endsOn">Ends on</Label>
        <Input id="endsOn" name="endsOn" type="date" defaultValue={endsOn} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
