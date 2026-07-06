"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = { error: string | null; success: boolean };

const updateOwnProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  nickname: z.string().trim(),
  studentNumber: z.string().trim().min(1, "Student ID is required"),
  groupName: z.string().trim(),
});

export async function updateOwnProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const profile = await requireProfile();

  const parsed = updateOwnProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    nickname: formData.get("nickname"),
    studentNumber: formData.get("studentNumber"),
    groupName: formData.get("groupName"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      nickname: parsed.data.nickname || null,
      student_number: parsed.data.studentNumber,
      group_name: parsed.data.groupName || null,
    })
    .eq("id", profile.id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/profile");
  return { error: null, success: true };
}
