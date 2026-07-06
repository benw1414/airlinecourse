import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, code, title")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, week_number, title, max_points, due_at")
    .eq("subject_id", subjectId)
    .order("week_number");

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/admin/subjects/${subjectId}`} label={subject.code} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Assignments &middot; {subject.code}
          </h1>
          <p className="text-muted-foreground">{subject.title}</p>
        </div>
        <Button asChild>
          <Link href={`/admin/subjects/${subjectId}/assignments/new`}>
            New assignment
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {assignments?.length ? (
          assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/admin/subjects/${subjectId}/assignments/${assignment.id}`}
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
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground">No assignments yet.</p>
        )}
      </div>
    </div>
  );
}
