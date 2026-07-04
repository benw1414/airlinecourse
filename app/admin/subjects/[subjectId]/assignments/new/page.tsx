import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewAssignmentForm } from "./new-assignment-form";

export default async function NewAssignmentPage({
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

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            New assignment &middot; {subject.code}
          </CardTitle>
          <CardDescription>
            Define the rubric criteria now &mdash; students will be graded
            against exactly these points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewAssignmentForm subjectId={subject.id} />
        </CardContent>
      </Card>
    </div>
  );
}
