import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ensureSubmission } from "./actions";
import { UploadWidget } from "./upload-widget";
import { BackLink } from "@/components/back-link";

type RubricCriterion = {
  id: string;
  name: string;
  description: string | null;
  max_points: number;
};

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ subjectId: string; assignmentId: string }>;
}) {
  const { subjectId, assignmentId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (!enrollment) notFound();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, week_number, title, instructions, due_at, max_points, submission_mode")
    .eq("id", assignmentId)
    .eq("subject_id", subjectId)
    .single();

  if (!assignment) notFound();

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select<string, RubricCriterion>("id, name, description, max_points")
    .eq("assignment_id", assignmentId)
    .order("position");

  const { submissionId, error } = await ensureSubmission(assignmentId);

  const { data: submission } = submissionId
    ? await supabase
        .from("submissions")
        .select("id, status, submission_files(id, original_filename, scan_status)")
        .eq("id", submissionId)
        .single()
    : { data: null };

  const { data: publishedGrade } = submissionId
    ? await supabase
        .from("published_grades")
        .select("id, total_score, overall_feedback, published_at")
        .eq("submission_id", submissionId)
        .maybeSingle()
    : { data: null };

  const publishedScores = publishedGrade
    ? (
        await supabase
          .from("published_criterion_scores")
          .select("rubric_criterion_id, score, feedback")
          .eq("published_grade_id", publishedGrade.id)
      ).data
    : null;

  const publishedScoresByCriterion = new Map(
    publishedScores?.map((s) => [s.rubric_criterion_id, s]) ?? []
  );

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/subjects/${subjectId}`} label="Back to subject" />
      <div>
        <h1 className="text-2xl font-semibold">
          Week {assignment.week_number} &middot; {assignment.title}
        </h1>
        <p className="text-muted-foreground">
          {assignment.max_points} points
          {assignment.due_at &&
            ` · Due ${new Date(assignment.due_at).toLocaleString()}`}
        </p>
        {assignment.submission_mode === "group" && (
          <p className="mt-2 text-sm text-muted-foreground">
            This is a <strong>group submission</strong>.{" "}
            {profile.group_name ? (
              <>
                When you submit, it will also submit for everyone else in{" "}
                <strong>{profile.group_name}</strong> enrolled in this subject.
              </>
            ) : (
              "You don't have a group name set on your profile, so this will only submit for you."
            )}
          </p>
        )}
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
          {criteria?.map((criterion) => {
            const score = publishedScoresByCriterion.get(criterion.id);
            return (
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
                  {score?.feedback && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {score.feedback}
                    </p>
                  )}
                </div>
                <Badge variant={score ? "default" : "outline"}>
                  {score ? `${score.score} / ${criterion.max_points}` : criterion.max_points}
                  {" pts"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {publishedGrade && (
        <Card>
          <CardHeader>
            <CardTitle>
              Your grade &mdash; {publishedGrade.total_score} / {assignment.max_points}
            </CardTitle>
            <CardDescription className="whitespace-pre-wrap">
              {publishedGrade.overall_feedback}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Your submission
            {assignment.submission_mode === "group" && profile.group_name && (
              <Badge variant="outline">Group: {profile.group_name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error || !submission ? (
            <p className="text-sm text-destructive">
              {error ?? "Could not load your submission."}
            </p>
          ) : (
            <UploadWidget
              studentId={profile.id}
              subjectId={subjectId}
              assignmentId={assignmentId}
              submissionId={submission.id}
              status={submission.status}
              files={submission.submission_files}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
