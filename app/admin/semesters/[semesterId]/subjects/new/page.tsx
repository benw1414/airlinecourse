import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewSubjectForm } from "./new-subject-form";

export default async function NewSubjectPage({
  params,
}: {
  params: Promise<{ semesterId: string }>;
}) {
  const { semesterId } = await params;
  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("id", semesterId)
    .single();

  if (!semester) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New subject in {semester.name}</CardTitle>
          <CardDescription>
            Students will be able to browse and self-enroll once created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewSubjectForm semesterId={semester.id} />
        </CardContent>
      </Card>
    </div>
  );
}
