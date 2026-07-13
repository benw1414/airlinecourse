import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackLink } from "@/components/back-link";
import { formatStudentName } from "@/lib/format-name";
import { GroupGradeForm } from "./group-grade-form";

function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

export default async function GroupGradePage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string; assignmentId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { subjectId, assignmentId } = await params;
  const { group } = await searchParams;
  if (!group) notFound();

  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, week_number, title, submission_mode")
    .eq("id", assignmentId)
    .eq("subject_id", subjectId)
    .single();

  if (!assignment || assignment.submission_mode !== "group") notFound();

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select("id, name, max_points, position")
    .eq("assignment_id", assignmentId)
    .order("position");

  if (!criteria?.length) notFound();

  type MemberEnrollment = {
    student_id: string;
    profiles: { full_name: string; nickname: string | null; group_name: string | null } | null;
  };

  const { data: subjectEnrollments } = await supabase
    .from("enrollments")
    .select<string, MemberEnrollment>("student_id, profiles!inner(full_name, nickname, group_name)")
    .eq("subject_id", subjectId);

  const normalizedGroup = normalizeGroupName(group);
  const enrollments = (subjectEnrollments ?? []).filter(
    (e) => e.profiles?.group_name && normalizeGroupName(e.profiles.group_name) === normalizedGroup
  );

  if (!enrollments.length) notFound();

  const studentIds = enrollments.map((e) => e.student_id);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, student_id, status, submission_files(id)")
    .eq("assignment_id", assignmentId)
    .in("student_id", studentIds);

  const submissionByStudent = new Map((submissions ?? []).map((s) => [s.student_id, s]));

  const members = enrollments.map((e) => {
    const submission = submissionByStudent.get(e.student_id);
    const hasFiles = (submission?.submission_files?.length ?? 0) > 0;
    return {
      studentId: e.student_id,
      displayName: formatStudentName(e.profiles?.full_name, e.profiles?.nickname) || "Unknown",
      status: submission?.status ?? "none",
      // Default-checked only for students who actually turned something in —
      // this is what keeps an absent student's grade from being distributed
      // to them automatically: no submitted files means they start unchecked.
      defaultChecked: hasFiles && submission?.status !== "draft",
    };
  });

  const criteriaRows = criteria.map((c) => ({
    rubricCriterionId: c.id,
    name: c.name,
    maxPoints: c.max_points,
    score: "0",
    feedback: "",
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink
        href={`/admin/subjects/${subjectId}/assignments/${assignmentId}`}
        label="Back to submissions"
      />
      <div>
        <h1 className="text-2xl font-semibold">
          Grade group &middot; {group}
        </h1>
        <p className="text-muted-foreground">
          Week {assignment.week_number} &middot; {assignment.title}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>One grade, applied to the group</CardTitle>
          <CardDescription>
            Enter scores and feedback once below — they&apos;ll be published to every
            student checked in the list. Uncheck anyone who shouldn&apos;t receive this
            grade (for example, someone who missed class and didn&apos;t take part).
            Students with no submitted files start unchecked automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupGradeForm
            subjectId={subjectId}
            assignmentId={assignmentId}
            groupName={group}
            criteria={criteriaRows}
            members={members}
          />
        </CardContent>
      </Card>
    </div>
  );
}
