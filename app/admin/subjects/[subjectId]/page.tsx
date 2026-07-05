import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SubjectWithSemesterAndEnrollmentCount } from "@/lib/supabase/query-types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: subject } = await supabase
    .from("subjects")
    .select<string, SubjectWithSemesterAndEnrollmentCount>(
      "id, code, title, description, semesters(name), enrollments(count)"
    )
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { count: assignmentCount } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {subject.code} &middot; {subject.title}
          </h1>
          <p className="text-muted-foreground">{subject.semesters?.name}</p>
        </div>
        <Link
          href={`/admin/subjects/${subject.id}/edit`}
          className="text-sm underline underline-offset-4"
        >
          Edit
        </Link>
      </div>

      {subject.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>{subject.description}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/admin/subjects/${subject.id}/roster`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>
                {subject.enrollments?.[0]?.count ?? 0} student(s) enrolled
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/admin/subjects/${subject.id}/assignments`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>{assignmentCount ?? 0} assignment(s)</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/admin/subjects/${subject.id}/gradebook`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Gradebook</CardTitle>
              <CardDescription>Published grades across all assignments</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
