import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditSubjectForm } from "./edit-subject-form";

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, code, title, description")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit subject</CardTitle>
        </CardHeader>
        <CardContent>
          <EditSubjectForm
            subjectId={subject.id}
            code={subject.code}
            title={subject.title}
            description={subject.description}
          />
        </CardContent>
      </Card>
    </div>
  );
}
