import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EnrollmentWithSubject } from "@/lib/supabase/query-types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select<string, EnrollmentWithSubject>(
      "subject_id, subjects(id, code, title, semesters(name))"
    )
    .eq("student_id", profile.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My subjects</h1>
        <p className="text-muted-foreground">
          Subjects you&apos;re currently enrolled in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {enrollments?.length ? (
          enrollments.map((enrollment) => {
            const subject = enrollment.subjects;
            if (!subject) return null;
            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle>
                      {subject.code} &middot; {subject.title}
                    </CardTitle>
                    <CardDescription>{subject.semesters?.name}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })
        ) : (
          <p className="text-muted-foreground">
            You&apos;re not enrolled in any subjects yet.{" "}
            <Link href="/subjects" className="underline underline-offset-4">
              Browse subjects
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
