import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EnrollmentRow = {
  subject_id: string;
  subjects: { id: string; code: string; title: string } | null;
};

type AssignmentRow = {
  id: string;
  subject_id: string;
  max_points: number;
};

type SubmissionRow = {
  assignment_id: string;
  published_grades: { total_score: number } | null;
};

export default async function StudentGradesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select<string, EnrollmentRow>("subject_id, subjects(id, code, title)")
    .eq("student_id", profile.id);

  const subjects = (enrollments ?? [])
    .map((e) => e.subjects)
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const subjectIds = subjects.map((s) => s.id);

  const { data: assignments } = subjectIds.length
    ? await supabase
        .from("assignments")
        .select<string, AssignmentRow>("id, subject_id, max_points")
        .in("subject_id", subjectIds)
    : { data: [] as AssignmentRow[] };

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const maxPointsByAssignment = new Map((assignments ?? []).map((a) => [a.id, a.max_points]));
  const subjectByAssignment = new Map((assignments ?? []).map((a) => [a.id, a.subject_id]));

  const { data: submissions } = assignmentIds.length
    ? await supabase
        .from("submissions")
        .select<string, SubmissionRow>("assignment_id, published_grades(total_score)")
        .eq("student_id", profile.id)
        .in("assignment_id", assignmentIds)
    : { data: [] as SubmissionRow[] };

  const totalsBySubject = new Map<string, { score: number; possible: number }>();
  for (const s of submissions ?? []) {
    if (!s.published_grades) continue;
    const subjectId = subjectByAssignment.get(s.assignment_id);
    if (!subjectId) continue;
    const current = totalsBySubject.get(subjectId) ?? { score: 0, possible: 0 };
    current.score += s.published_grades.total_score;
    current.possible += maxPointsByAssignment.get(s.assignment_id) ?? 0;
    totalsBySubject.set(subjectId, current);
  }

  const overall = Array.from(totalsBySubject.values()).reduce(
    (acc, t) => ({ score: acc.score + t.score, possible: acc.possible + t.possible }),
    { score: 0, possible: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My grades</h1>
        {overall.possible > 0 && (
          <p className="text-muted-foreground">
            Overall: {overall.score} / {overall.possible} (
            {Math.round((overall.score / overall.possible) * 100)}%)
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.length ? (
          subjects.map((subject) => {
            const totals = totalsBySubject.get(subject.id);
            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle>
                      {subject.code} &middot; {subject.title}
                    </CardTitle>
                    <CardDescription>
                      {totals
                        ? `${totals.score} / ${totals.possible} (${Math.round(
                            (totals.score / totals.possible) * 100
                          )}%)`
                        : "No published grades yet"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })
        ) : (
          <p className="text-muted-foreground">
            You&apos;re not enrolled in any subjects yet.
          </p>
        )}
      </div>
    </div>
  );
}
