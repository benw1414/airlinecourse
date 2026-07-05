import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewSemesterForm } from "./new-semester-form";

export default async function SemestersPage() {
  const supabase = await createClient();
  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, name, starts_on, ends_on, subjects(count)")
    .order("starts_on", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Semesters</h1>
        <p className="text-muted-foreground">
          Create a semester, then add subjects within it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New semester</CardTitle>
        </CardHeader>
        <CardContent>
          <NewSemesterForm />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {semesters?.length ? (
          semesters.map((semester) => (
            <Card key={semester.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{semester.name}</CardTitle>
                  <CardDescription>
                    {semester.starts_on} &ndash; {semester.ends_on} &middot;{" "}
                    {semester.subjects?.[0]?.count ?? 0} subject
                    {semester.subjects?.[0]?.count === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/admin/semesters/${semester.id}/edit`}
                    className="text-sm underline underline-offset-4"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/semesters/${semester.id}/subjects/new`}
                    className="text-sm underline underline-offset-4"
                  >
                    Add subject
                  </Link>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">No semesters yet.</p>
        )}
      </div>
    </div>
  );
}
