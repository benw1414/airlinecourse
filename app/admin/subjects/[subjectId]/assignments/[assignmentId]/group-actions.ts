"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { propagateGroupSubmission } from "@/lib/group-submissions";

export type SyncGroupActionState = { error: string | null; message: string | null };

const syncGroupSchema = z.object({
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  groupName: z.string().trim().min(1),
});

function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

type MemberEnrollment = {
  student_id: string;
  profiles: { group_name: string | null } | null;
};

type MemberSubmission = {
  student_id: string;
  submitted_at: string | null;
  submission_files: { id: string }[];
};

// Re-runs group propagation after the lecturer fixes a student's group name
// to match their teammates. Propagation only fires at the moment a student
// clicks "submit" — renaming a group afterward doesn't retroactively copy
// anything, so this finds whichever current member already has a submitted
// file and re-propagates it to the rest of the (now correctly matched) group.
export async function syncGroupSubmissionsAction(
  _prevState: SyncGroupActionState,
  formData: FormData
): Promise<SyncGroupActionState> {
  await requireLecturer();

  const parsed = syncGroupSchema.safeParse({
    subjectId: formData.get("subjectId"),
    assignmentId: formData.get("assignmentId"),
    groupName: formData.get("groupName"),
  });

  if (!parsed.success) return { error: "Invalid request", message: null };

  const supabase = await createClient();

  const { data: subjectEnrollments } = await supabase
    .from("enrollments")
    .select<string, MemberEnrollment>("student_id, profiles!inner(group_name)")
    .eq("subject_id", parsed.data.subjectId);

  const normalizedGroup = normalizeGroupName(parsed.data.groupName);
  const memberIds = (subjectEnrollments ?? [])
    .filter((e) => e.profiles?.group_name && normalizeGroupName(e.profiles.group_name) === normalizedGroup)
    .map((e) => e.student_id);

  if (!memberIds.length) {
    return { error: "No students found in this group", message: null };
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select<string, MemberSubmission>("student_id, submitted_at, submission_files(id)")
    .eq("assignment_id", parsed.data.assignmentId)
    .in("student_id", memberIds);

  const withFiles = (submissions ?? [])
    .filter((s) => s.submission_files.length > 0)
    .sort((a, b) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime());

  if (!withFiles.length) {
    return { error: "No one in this group has submitted a file yet", message: null };
  }

  await propagateGroupSubmission({
    subjectId: parsed.data.subjectId,
    assignmentId: parsed.data.assignmentId,
    uploaderId: withFiles[0].student_id,
  });

  revalidatePath(`/admin/subjects/${parsed.data.subjectId}/assignments/${parsed.data.assignmentId}`);

  return {
    error: null,
    message: `Synced to ${memberIds.length - 1} other group member(s).`,
  };
}
