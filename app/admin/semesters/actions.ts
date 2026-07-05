"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const semesterSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    startsOn: z.string().min(1, "Start date is required"),
    endsOn: z.string().min(1, "End date is required"),
  })
  .refine((v) => new Date(v.endsOn) > new Date(v.startsOn), {
    message: "End date must be after the start date",
    path: ["endsOn"],
  });

export type SemesterActionState = { error: string | null };

export async function createSemester(
  _prevState: SemesterActionState,
  formData: FormData
): Promise<SemesterActionState> {
  const profile = await requireLecturer();

  const parsed = semesterSchema.safeParse({
    name: formData.get("name"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("semesters").insert({
    name: parsed.data.name,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/semesters");
  return { error: null };
}

const updateSemesterSchema = semesterSchema.and(
  z.object({ semesterId: z.string().uuid() })
);

export async function updateSemester(
  _prevState: SemesterActionState,
  formData: FormData
): Promise<SemesterActionState> {
  await requireLecturer();

  const parsed = updateSemesterSchema.safeParse({
    semesterId: formData.get("semesterId"),
    name: formData.get("name"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("semesters")
    .update({
      name: parsed.data.name,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
    })
    .eq("id", parsed.data.semesterId);

  if (error) return { error: error.message };

  revalidatePath("/admin/semesters");
  return { error: null };
}
