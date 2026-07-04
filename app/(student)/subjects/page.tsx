import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SubjectWithSemester } from "@/lib/supabase/query-types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnrollButton } from "./enroll-button";

export default async function BrowseSubjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: subjects }, { data: myEnrollments }] = await Promise.all([
    supabase
      .from("subjects")
      .select<string, SubjectWithSemester>(
        "id, code, title, description, semesters(name)"
      )
      .order("code"),
    supabase
      .from("enrollments")
      .select("subject_id")
      .eq("student_id", profile.id),
  ]);

  const enrolledIds = new Set(myEnrollments?.map((e) => e.subject_id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse subjects</h1>
        <p className="text-muted-foreground">
          Enroll in any subject you&apos;re taking this semester.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects?.length ? (
          subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {subject.code} &middot; {subject.title}
                  </CardTitle>
                  <CardDescription>{subject.semesters?.name}</CardDescription>
                  {subject.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {subject.description}
                    </p>
                  )}
                </div>
                <EnrollButton
                  subjectId={subject.id}
                  enrolled={enrolledIds.has(subject.id)}
                />
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">No subjects available yet.</p>
        )}
      </div>
    </div>
  );
}
