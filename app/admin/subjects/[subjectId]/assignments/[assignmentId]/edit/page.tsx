import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditAssignmentForm } from "./edit-assignment-form";

function toDatetimeLocal(value: string | null): string | null {
  if (!value) return null;
  // "2026-09-01T14:00:00.000Z" -> "2026-09-01T14:00" for a <input type="datetime-local">
  return new Date(value).toISOString().slice(0, 16);
}

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ subjectId: string; assignmentId: string }>;
}) {
  const { subjectId, assignmentId } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, week_number, title, instructions, due_at, submission_mode")
    .eq("id", assignmentId)
    .eq("subject_id", subjectId)
    .single();

  if (!assignment) notFound();

  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select("id, name, description, max_points")
    .eq("assignment_id", assignmentId)
    .order("position");

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit assignment</CardTitle>
          <CardDescription>
            Week {assignment.week_number} &middot; {assignment.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditAssignmentForm
            subjectId={subjectId}
            assignmentId={assignment.id}
            weekNumber={assignment.week_number}
            title={assignment.title}
            instructions={assignment.instructions}
            dueAt={toDatetimeLocal(assignment.due_at)}
            submissionMode={assignment.submission_mode}
            criteria={(criteria ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              maxPoints: c.max_points,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
