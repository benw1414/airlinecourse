import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSubjectGradebook } from "@/lib/gradebook";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GradebookPage({
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

  const { assignments, rows } = await computeSubjectGradebook(supabase, subjectId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Gradebook &middot; {subject.code}
          </h1>
          <p className="text-muted-foreground">{subject.title}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/subjects/${subjectId}/gradebook/export`}>
            Export CSV
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published grades</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Student</TableHead>
                {assignments.map((a) => (
                  <TableHead key={a.id} className="whitespace-nowrap">
                    Week {a.weekNumber}
                    <span className="block text-xs font-normal text-muted-foreground">
                      /{a.maxPoints}
                    </span>
                  </TableHead>
                ))}
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.studentNumber ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.studentName}
                    </TableCell>
                    {assignments.map((a) => (
                      <TableCell key={a.id}>
                        {row.scores[a.id] === null ? (
                          <span className="text-muted-foreground">&mdash;</span>
                        ) : (
                          row.scores[a.id]
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap">
                      {row.totalScore} / {row.totalPossible}
                      {row.totalPossible > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          ({Math.round((row.totalScore / row.totalPossible) * 100)}%)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={assignments.length + 3}
                    className="text-muted-foreground"
                  >
                    No enrolled students yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
