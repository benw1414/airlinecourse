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
  profiles: { full_name: string; group_name: string | null } | null;
  submission_files: {
    id: string;
    original_filename: string;
    scan_status: string;
  }[];
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

  const { data: submissions } = await supabase
    .from("submissions")
    .select<string, SubmissionRow>(
      "id, status, submitted_at, profiles(full_name, group_name), submission_files(id, original_filename, scan_status)"
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at");

  const { data: gradingBatches } = await supabase
    .from("grading_batches")
    .select("id, status, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
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
              {submissions?.length ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>{submission.profiles?.full_name}</TableCell>
                    {assignment.submission_mode === "group" && (
                      <TableCell className="text-muted-foreground">
                        {submission.profiles?.group_name ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">{submission.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {submission.submission_files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span>{file.original_filename}</span>
                            <Badge variant={scanStatusBadgeVariant(file.scan_status)}>
                              {scanStatusLabel(file.scan_status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.status !== "draft" &&
                        submission.status !== "submitted" && (
                          <Link
                            href={`/admin/subjects/${subjectId}/assignments/${assignmentId}/submissions/${submission.id}/review`}
                            className="text-sm underline underline-offset-4"
                          >
                            Review
                          </Link>
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
                    No submissions yet.
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
