import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SubjectWithSemesterAndEnrollmentCount } from "@/lib/supabase/query-types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select<string, SubjectWithSemesterAndEnrollmentCount>(
      "id, code, title, semesters(name), enrollments(count)"
    )
    .order("code");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <p className="text-muted-foreground">
            All subjects across every semester.
          </p>
        </div>
        <Link href="/admin/semesters" className="text-sm underline underline-offset-4">
          Manage semesters
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects?.length ? (
          subjects.map((subject) => (
            <Link key={subject.id} href={`/admin/subjects/${subject.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>
                    {subject.code} &middot; {subject.title}
                  </CardTitle>
                  <CardDescription>
                    {subject.semesters?.name} &middot;{" "}
                    {subject.enrollments?.[0]?.count ?? 0} enrolled
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground">
            No subjects yet.{" "}
            <Link href="/admin/semesters" className="underline underline-offset-4">
              Create a semester
            </Link>{" "}
            to get started.
          </p>
        )}
      </div>
    </div>
  );
}
