import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SubjectWithSemester } from "@/lib/supabase/query-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnrollButton } from "../enroll-button";

export default async function StudentSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select<string, SubjectWithSemester>(
      "id, code, title, description, semesters(name)"
    )
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("student_id", profile.id)
    .maybeSingle();

  const { data: assignments } = enrollment
    ? await supabase
        .from("assignments")
        .select("id, week_number, title, max_points, due_at")
        .eq("subject_id", subjectId)
        .order("week_number")
    : { data: null };

  const { data: submissions } = enrollment
    ? await supabase
        .from("submissions")
        .select("assignment_id, status")
        .eq("student_id", profile.id)
    : { data: null };

  const statusByAssignment = new Map(
    submissions?.map((s) => [s.assignment_id, s.status]) ?? []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {subject.code} &middot; {subject.title}
          </h1>
          <p className="text-muted-foreground">{subject.semesters?.name}</p>
        </div>
        <EnrollButton subjectId={subject.id} enrolled={!!enrollment} />
      </div>

      {subject.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>{subject.description}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {enrollment ? (
        <div className="flex flex-col gap-3">
          {assignments?.length ? (
            assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/subjects/${subjectId}/assignments/${assignment.id}`}
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>
                        Week {assignment.week_number} &middot; {assignment.title}
                      </CardTitle>
                      <CardDescription>
                        {assignment.max_points} points
                        {assignment.due_at &&
                          ` · Due ${new Date(assignment.due_at).toLocaleString()}`}
                      </CardDescription>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {statusByAssignment.get(assignment.id) ?? "not started"}
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground">No assignments yet.</p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            Enroll in this subject to see its weekly assignments.{" "}
            <Link href="/subjects" className="underline underline-offset-4">
              Back to browse
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
