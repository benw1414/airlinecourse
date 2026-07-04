import { NextResponse } from "next/server";
import { requireLecturer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeSubjectGradebook, gradebookToCsv } from "@/lib/gradebook";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  await requireLecturer();
  const { subjectId } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("code")
    .eq("id", subjectId)
    .single();

  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const gradebook = await computeSubjectGradebook(supabase, subjectId);
  const csv = gradebookToCsv(gradebook);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${subject.code}-gradebook.csv"`,
    },
  });
}
