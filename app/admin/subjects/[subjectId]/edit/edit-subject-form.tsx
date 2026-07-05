"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSubject } from "@/app/admin/subjects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditSubjectForm({
  subjectId,
  code,
  title,
  description,
}: {
  subjectId: string;
  code: string;
  title: string;
  description: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSubject({ error: null }, formData);
      if (result.error) setError(result.error);
      else router.push(`/admin/subjects/${subjectId}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Subject code</Label>
        <Input id="code" name="code" defaultValue={code} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={title} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={description ?? ""} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
