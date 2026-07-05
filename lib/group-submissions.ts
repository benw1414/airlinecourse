import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Copies a just-submitted student's files + submitted status to every other
// student sharing their group_name within the same subject. Each groupmate
// keeps their own submission/file rows (under their own storage path, so
// existing per-student RLS keeps working unmodified) and — per the lecturer's
// design — their own independent grade; only the submitted content and
// status are shared at the moment of submission.
export async function propagateGroupSubmission({
  subjectId,
  assignmentId,
  uploaderId,
}: {
  subjectId: string;
  assignmentId: string;
  uploaderId: string;
}): Promise<void> {
  const serviceRole = createServiceRoleClient();

  const { data: uploaderProfile } = await serviceRole
    .from("profiles")
    .select("group_name")
    .eq("id", uploaderId)
    .single();

  const groupName = uploaderProfile?.group_name;
  if (!groupName) return;

  const { data: uploaderSubmission } = await serviceRole
    .from("submissions")
    .select("id, submission_files(storage_path, original_filename, mime_type, size_bytes, scan_status)")
    .eq("assignment_id", assignmentId)
    .eq("student_id", uploaderId)
    .single();

  if (!uploaderSubmission?.submission_files?.length) return;

  const { data: groupmateEnrollments } = await serviceRole
    .from("enrollments")
    .select("student_id, profiles!inner(group_name)")
    .eq("subject_id", subjectId)
    .eq("profiles.group_name", groupName)
    .neq("student_id", uploaderId);

  const submittedAt = new Date().toISOString();

  for (const mate of groupmateEnrollments ?? []) {
    const { data: existing } = await serviceRole
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", mate.student_id)
      .maybeSingle();

    let mateSubmissionId = existing?.id;

    if (!mateSubmissionId) {
      const { data: created, error: createError } = await serviceRole
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: mate.student_id,
          status: "submitted",
          submitted_at: submittedAt,
        })
        .select("id")
        .single();
      if (createError || !created) continue;
      mateSubmissionId = created.id;
    } else {
      await serviceRole
        .from("submissions")
        .update({ status: "submitted", submitted_at: submittedAt })
        .eq("id", mateSubmissionId);
    }

    for (const file of uploaderSubmission.submission_files) {
      const mateStoragePath = `${subjectId}/${assignmentId}/${mate.student_id}/${mateSubmissionId}/${file.original_filename}`;

      await serviceRole.storage
        .from("submissions")
        .copy(file.storage_path, mateStoragePath);

      await serviceRole.from("submission_files").upsert(
        {
          submission_id: mateSubmissionId,
          storage_path: mateStoragePath,
          original_filename: file.original_filename,
          mime_type: file.mime_type,
          size_bytes: file.size_bytes,
          scan_status: file.scan_status,
        },
        { onConflict: "storage_path" }
      );
    }
  }
}
