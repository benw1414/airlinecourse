import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EnrollmentWithProfile } from "@/lib/supabase/query-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnenrollButton } from "./unenroll-button";
import { formatStudentName } from "@/lib/format-name";

export default async function RosterPage({
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

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select<string, EnrollmentWithProfile>(
      "id, student_id, enrolled_at, profiles(full_name, first_name, last_name, nickname, student_number, group_name)"
    )
    .eq("subject_id", subjectId)
    .order("enrolled_at");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Roster &middot; {subject.code}
        </h1>
        <p className="text-muted-foreground">{subject.title}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Enrolled on</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments?.length ? (
            enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  {formatStudentName(enrollment.profiles?.full_name, enrollment.profiles?.nickname)}
                </TableCell>
                <TableCell>{enrollment.profiles?.student_number ?? "—"}</TableCell>
                <TableCell>{enrollment.profiles?.group_name ?? "—"}</TableCell>
                <TableCell>
                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/subjects/${subjectId}/roster/${enrollment.student_id}/edit`}
                      className="text-sm underline underline-offset-4"
                    >
                      Edit
                    </Link>
                    <UnenrollButton
                      subjectId={subjectId}
                      studentId={enrollment.student_id}
                      studentName={
                        formatStudentName(enrollment.profiles?.full_name, enrollment.profiles?.nickname) ||
                        "this student"
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No students enrolled yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
