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
import { ReviewForm } from "./review-form";

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
    .select("id, status, profiles(full_name)")
    .eq("id", submissionId)
    .eq("assignment_id", assignmentId)
    .single<{
      id: string;
      status: string;
      profiles: { full_name: string } | null;
    }>();

  if (!submission) notFound();

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
        <div>
          <h1 className="text-2xl font-semibold">
            Review &middot; {submission.profiles?.full_name}
          </h1>
          <Badge variant="default">
            Published {new Date(publishedGrade.published_at).toLocaleString()}
          </Badge>
        </div>
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
      </div>
    );
  }

  const { data: aiResult } = await supabase
    .from("ai_grading_results")
    .select("id, status, overall_feedback, needs_attention")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (!aiResult || aiResult.status !== "completed") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Review &middot; {submission.profiles?.full_name}</CardTitle>
            <CardDescription>
              {aiResult?.status === "failed"
                ? "AI grading failed for this submission. Try running “Grade all pending” again."
                : "This submission has not been graded yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { data: aiScores } = await supabase
    .from("ai_criterion_scores")
    .select("rubric_criterion_id, score, feedback")
    .eq("ai_grading_result_id", aiResult.id);

  const aiScoresByCriterion = new Map(
    aiScores?.map((s) => [s.rubric_criterion_id, s]) ?? []
  );

  const criteriaRows = criteria.map((c) => {
    const s = aiScoresByCriterion.get(c.id);
    return {
      rubricCriterionId: c.id,
      name: c.name,
      maxPoints: c.max_points,
      score: String(s?.score ?? 0),
      feedback: s?.feedback ?? "",
    };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Review &middot; {submission.profiles?.full_name}
        </h1>
        {aiResult.needs_attention && (
          <Badge variant="destructive">
            AI returned a score above a criterion&apos;s max &mdash; check before publishing
          </Badge>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>AI-suggested grade</CardTitle>
          <CardDescription>
            Edit anything below before publishing &mdash; nothing here is visible to
            the student until you publish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm
            subjectId={subjectId}
            assignmentId={assignmentId}
            submissionId={submissionId}
            aiGradingResultId={aiResult.id}
            overallFeedback={aiResult.overall_feedback ?? ""}
            criteria={criteriaRows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
