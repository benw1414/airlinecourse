import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditStudentForm } from "./edit-student-form";
import { BackLink } from "@/components/back-link";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ subjectId: string; studentId: string }>;
}) {
  const { subjectId, studentId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, nickname, student_number, group_name")
    .eq("id", studentId)
    .single();

  if (!profile) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <BackLink href={`/admin/subjects/${subjectId}/roster`} label="Roster" />
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
            nickname={profile.nickname}
            studentNumber={profile.student_number}
            groupName={profile.group_name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
