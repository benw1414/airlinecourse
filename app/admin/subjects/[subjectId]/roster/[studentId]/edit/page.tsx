import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditStudentForm } from "./edit-student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ subjectId: string; studentId: string }>;
}) {
  const { subjectId, studentId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, student_number, group_name")
    .eq("id", studentId)
    .single();

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit student</CardTitle>
        </CardHeader>
        <CardContent>
          <EditStudentForm
            subjectId={subjectId}
            studentId={profile.id}
            firstName={profile.first_name}
            lastName={profile.last_name}
            studentNumber={profile.student_number}
            groupName={profile.group_name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
