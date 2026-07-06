import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditSubjectForm } from "./edit-subject-form";
import { BackLink } from "@/components/back-link";

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
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <BackLink href={`/admin/subjects/${subjectId}`} label={subject.code} />
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
