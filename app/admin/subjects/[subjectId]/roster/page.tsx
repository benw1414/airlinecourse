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
      "id, enrolled_at, profiles(full_name, student_number, group_name)"
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments?.length ? (
            enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>{enrollment.profiles?.full_name}</TableCell>
                <TableCell>{enrollment.profiles?.student_number ?? "—"}</TableCell>
                <TableCell>{enrollment.profiles?.group_name ?? "—"}</TableCell>
                <TableCell>
                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No students enrolled yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
