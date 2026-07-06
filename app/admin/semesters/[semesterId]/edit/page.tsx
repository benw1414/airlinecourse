import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditSemesterForm } from "./edit-semester-form";
import { BackLink } from "@/components/back-link";

export default async function EditSemesterPage({
  params,
}: {
  params: Promise<{ semesterId: string }>;
}) {
  const { semesterId } = await params;
  const supabase = await createClient();

  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, starts_on, ends_on")
    .eq("id", semesterId)
    .single();

  if (!semester) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <BackLink href="/admin/semesters" label="Semesters" />
      <Card>
        <CardHeader>
          <CardTitle>Edit semester</CardTitle>
        </CardHeader>
        <CardContent>
          <EditSemesterForm
            semesterId={semester.id}
            name={semester.name}
            startsOn={semester.starts_on}
            endsOn={semester.ends_on}
          />
        </CardContent>
      </Card>
    </div>
  );
}
