import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeAllButton, ImportBatchButton } from "./grading-controls";
import { scanStatusBadgeVariant, scanStatusLabel } from "@/lib/uploads/scan-status";
import { DownloadFileLink } from "@/components/download-file-link";
import { formatStudentName } from "@/lib/format-name";
import { BackLink } from "@/components/back-link";
import { SyncGroupButton } from "./sync-group-button";
import { ensureSubmissionForGradingAction } from "./ensure-submission-actions";

// Grading a batch downloads + extracts every submission's files synchronously
// before handing off to the Anthropic Batches API. 60s is the max duration
// available on Vercel's free Hobby tier; bump to 300 on Pro if grading times
// out on assignments with many/large submissions.
export const maxDuration = 60;

type RubricCriterion = {
  id: string;
  name: string;
  description: string | null;
  max_points: number;
  position: number;
};

type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  student_id: string;
  submission_files: {
    id: string;
    original_filename: string;
    scan_status: string;
  }[];
};

type EnrollmentRow = {
  student_id: string;
  profiles: { full_name: string; nickname: string | null; group_name: string | null } | null;
};

type RosterRow = {
  studentId: string;
  displayName: string;
  groupName: string | null;
  submissionId: string | null;
  status: string;
  files: { id: string; original_filename: string; scan_status: string }[];
};

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string; assignmentId: string }>;
}) {
  const { subjectId, assignmentId } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, week_number, title, instructions, due_at, max_points, submission_mode")
    .eq("id", assignmentId)
    .eq("subject_id", subjectId)
    .single();

  if (!assignment) notFound();

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select<string, RubricCriterion>("id, name, description, max_points, position")
    .eq("assignment_id", assignmentId)
    .order("position");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select<string, EnrollmentRow>("student_id, profiles(full_name, nickname, group_name)")
    .eq("subject_id", subjectId);

  const { data: submissions } = await supabase
    .from("submissions")
    .select<string, SubmissionRow>(
      "id, status, submitted_at, student_id, submission_files(id, original_filename, scan_status)"
    )
    .eq("assignment_id", assignmentId);

  const submissionByStudent = new Map((submissions ?? []).map((s) => [s.student_id, s]));

  // Every enrolled student gets a row — not just the ones with an existing
  // submission — otherwise a student who never opened the assignment (but
  // was present and took part, e.g. relying on a groupmate to upload) has no
  // row at all and no way to be graded.
  const rosterRows: RosterRow[] = (enrollments ?? [])
    .map((e) => {
      const submission = submissionByStudent.get(e.student_id);
      return {
        studentId: e.student_id,
        displayName: formatStudentName(e.profiles?.full_name, e.profiles?.nickname) || "Unknown",
        groupName: e.profiles?.group_name ?? null,
        submissionId: submission?.id ?? null,
        status: submission?.status ?? "none",
        files: submission?.submission_files ?? [],
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const { data: gradingBatches } = await supabase
    .from("grading_batches")
    .select("id, status, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  let groups: string[] = [];
  if (assignment.submission_mode === "group") {
    const seenByKey = new Map<string, string>();
    for (const e of enrollments ?? []) {
      const name = e.profiles?.group_name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seenByKey.has(key)) seenByKey.set(key, name);
    }
    groups = Array.from(seenByKey.values()).sort((a, b) => a.localeCompare(b));
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/admin/subjects/${subjectId}/assignments`} label="Assignments" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              Week {assignment.week_number} &middot; {assignment.title}
            </h1>
            {assignment.submission_mode === "group" && (
              <Badge variant="secondary">Group submission</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {assignment.max_points} points
            {assignment.due_at &&
              ` · Due ${new Date(assignment.due_at).toLocaleString()}`}
          </p>
        </div>
        <Link
          href={`/admin/subjects/${subjectId}/assignments/${assignmentId}/edit`}
          className="text-sm underline underline-offset-4"
        >
          Edit
        </Link>
      </div>

      {assignment.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription className="whitespace-pre-wrap">
              {assignment.instructions}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rubric</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {criteria?.map((criterion) => (
            <div
              key={criterion.id}
              className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{criterion.name}</p>
                {criterion.description && (
                  <p className="text-sm text-muted-foreground">
                    {criterion.description}
                  </p>
                )}
              </div>
              <Badge variant="outline">{criterion.max_points} pts</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI grading</CardTitle>
          <CardDescription>
            Grades AI submissions with status &quot;submitted&quot;. Results stay
            hidden from students until you review and publish them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GradeAllButton subjectId={subjectId} assignmentId={assignmentId} />
          {gradingBatches?.length ? (
            <div className="flex flex-col gap-2">
              {gradingBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Batch started {new Date(batch.created_at).toLocaleString()}
                  </span>
                  <ImportBatchButton
                    subjectId={subjectId}
                    assignmentId={assignmentId}
                    gradingBatchId={batch.id}
                    status={batch.status}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {assignment.submission_mode === "group" && groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>
              Grade a whole group at once &mdash; you can leave out anyone who
              shouldn&apos;t receive the grade (e.g. missed class). If you just
              fixed a student&apos;s group name to match their teammates, hit
              &quot;Sync&quot; so their submission catches up.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {groups.map((groupName) => (
              <div key={groupName} className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/subjects/${subjectId}/assignments/${assignmentId}/group-grade?group=${encodeURIComponent(groupName)}`}
                >
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    Grade {groupName}
                  </Badge>
                </Link>
                <SyncGroupButton
                  subjectId={subjectId}
                  assignmentId={assignmentId}
                  groupName={groupName}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {assignment.submission_mode === "group" && (
                  <TableHead>Group</TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Files</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rosterRows.length ? (
                rosterRows.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>{row.displayName}</TableCell>
                    {assignment.submission_mode === "group" && (
                      <TableCell className="text-muted-foreground">
                        {row.groupName ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={row.status === "none" ? "outline" : "secondary"}>
                        {row.status === "none" ? "not started" : row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {row.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <DownloadFileLink
                              fileId={file.id}
                              filename={file.original_filename}
                            />
                            <Badge variant={scanStatusBadgeVariant(file.scan_status)}>
                              {scanStatusLabel(file.scan_status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.submissionId ? (
                        <Link
                          href={`/admin/subjects/${subjectId}/assignments/${assignmentId}/submissions/${row.submissionId}/review`}
                          className="text-sm underline underline-offset-4"
                        >
                          {row.status === "published" || row.status === "graded_pending_review"
                            ? "Review"
                            : "Grade"}
                        </Link>
                      ) : (
                        <form action={ensureSubmissionForGradingAction}>
                          <input type="hidden" name="subjectId" value={subjectId} />
                          <input type="hidden" name="assignmentId" value={assignmentId} />
                          <input type="hidden" name="studentId" value={row.studentId} />
                          <button
                            type="submit"
                            className="text-sm underline underline-offset-4"
                          >
                            Grade
                          </button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={assignment.submission_mode === "group" ? 5 : 4}
                    className="text-muted-foreground"
                  >
                    No students enrolled yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
