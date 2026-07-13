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
import { DownloadFileLink } from "@/components/download-file-link";
import { scanStatusBadgeVariant, scanStatusLabel } from "@/lib/uploads/scan-status";
import { ReviewForm } from "./review-form";
import { formatStudentName } from "@/lib/format-name";
import { BackLink } from "@/components/back-link";
import { UnpublishButton } from "./unpublish-button";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{
    subjectId: string;
    assignmentId: string;
    submissionId: string;
  }>;
}) {
  const { subjectId, assignmentId, submissionId } = await params;
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, status, profiles(full_name, nickname, group_name), submission_files(id, original_filename, scan_status)"
    )
    .eq("id", submissionId)
    .eq("assignment_id", assignmentId)
    .single<{
      id: string;
      status: string;
      profiles: { full_name: string; nickname: string | null; group_name: string | null } | null;
      submission_files: { id: string; original_filename: string; scan_status: string }[];
    }>();

  if (!submission) notFound();

  const studentDisplayName = formatStudentName(
    submission.profiles?.full_name,
    submission.profiles?.nickname
  );
  const groupName = submission.profiles?.group_name ?? null;

  const filesCard = submission.submission_files.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Submitted files</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {submission.submission_files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 text-sm">
            <DownloadFileLink fileId={file.id} filename={file.original_filename} />
            <Badge variant={scanStatusBadgeVariant(file.scan_status)}>
              {scanStatusLabel(file.scan_status)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select("id, name, max_points, position")
    .eq("assignment_id", assignmentId)
    .order("position");

  if (!criteria?.length) notFound();

  const { data: publishedGrade } = await supabase
    .from("published_grades")
    .select("id, total_score, overall_feedback, published_at")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (publishedGrade) {
    const { data: publishedScores } = await supabase
      .from("published_criterion_scores")
      .select("rubric_criterion_id, score, feedback")
      .eq("published_grade_id", publishedGrade.id);

    const scoresByCriterion = new Map(
      publishedScores?.map((s) => [s.rubric_criterion_id, s]) ?? []
    );

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <BackLink
          href={`/admin/subjects/${subjectId}/assignments/${assignmentId}`}
          label="Back to submissions"
        />
        <div>
          <h1 className="text-2xl font-semibold">
            Review &middot; {studentDisplayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {groupName && <Badge variant="outline">Group: {groupName}</Badge>}
            <Badge variant="default">
              Published {new Date(publishedGrade.published_at).toLocaleString()}
            </Badge>
          </div>
        </div>
        {filesCard}
        <Card>
          <CardHeader>
            <CardTitle>Published grade &mdash; {publishedGrade.total_score} points</CardTitle>
            <CardDescription className="whitespace-pre-wrap">
              {publishedGrade.overall_feedback}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {criteria.map((criterion) => {
              const s = scoresByCriterion.get(criterion.id);
              return (
                <div key={criterion.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{criterion.name}</span>
                    <Badge variant="outline">
                      {s?.score ?? 0} / {criterion.max_points} pts
                    </Badge>
                  </div>
                  {s?.feedback && (
                    <p className="text-sm text-muted-foreground">{s.feedback}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <UnpublishButton
            subjectId={subjectId}
            assignmentId={assignmentId}
            submissionId={submissionId}
            studentName={studentDisplayName}
          />
        </div>
      </div>
    );
  }

  const { data: aiResult } = await supabase
    .from("ai_grading_results")
    .select("id, status, overall_feedback, needs_attention")
    .eq("submission_id", submissionId)
    .maybeSingle();

  const hasCompletedAiResult = aiResult?.status === "completed";

  let criteriaRows = criteria.map((c) => ({
    rubricCriterionId: c.id,
    name: c.name,
    maxPoints: c.max_points,
    score: "0",
    feedback: "",
  }));
  let overallFeedback = "";

  if (hasCompletedAiResult) {
    const { data: aiScores } = await supabase
      .from("ai_criterion_scores")
      .select("rubric_criterion_id, score, feedback")
      .eq("ai_grading_result_id", aiResult.id);

    const aiScoresByCriterion = new Map(
      aiScores?.map((s) => [s.rubric_criterion_id, s]) ?? []
    );

    criteriaRows = criteria.map((c) => {
      const s = aiScoresByCriterion.get(c.id);
      return {
        rubricCriterionId: c.id,
        name: c.name,
        maxPoints: c.max_points,
        score: String(s?.score ?? 0),
        feedback: s?.feedback ?? "",
      };
    });
    overallFeedback = aiResult.overall_feedback ?? "";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink
        href={`/admin/subjects/${subjectId}/assignments/${assignmentId}`}
        label="Back to submissions"
      />
      <div>
        <h1 className="text-2xl font-semibold">
          Review &middot; {studentDisplayName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {groupName && <Badge variant="outline">Group: {groupName}</Badge>}
          {hasCompletedAiResult && aiResult.needs_attention && (
            <Badge variant="destructive">
              AI returned a score above a criterion&apos;s max &mdash; check before publishing
            </Badge>
          )}
        </div>
      </div>
      {filesCard}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasCompletedAiResult ? "AI-suggested grade" : "Enter grade manually"}
          </CardTitle>
          <CardDescription>
            {hasCompletedAiResult
              ? "Edit anything below before publishing — nothing here is visible to the student until you publish."
              : aiResult?.status === "failed"
                ? "AI grading failed for this submission — enter scores manually below, or try “Grade all pending” again first."
                : "This submission hasn't been through AI grading yet — enter scores below to publish directly, or run “Grade all pending” first for AI-suggested scores."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm
            subjectId={subjectId}
            assignmentId={assignmentId}
            submissionId={submissionId}
            aiGradingResultId={hasCompletedAiResult ? aiResult.id : null}
            overallFeedback={overallFeedback}
            criteria={criteriaRows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
