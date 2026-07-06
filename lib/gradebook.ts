import type { SupabaseClient } from "@supabase/supabase-js";

export type GradebookAssignment = {
  id: string;
  title: string;
  weekNumber: number;
  maxPoints: number;
};

export type GradebookRow = {
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  scores: Record<string, number | null>;
  totalScore: number;
  totalPossible: number;
};

export type SubjectGradebook = {
  assignments: GradebookAssignment[];
  rows: GradebookRow[];
};

export async function computeSubjectGradebook(
  supabase: SupabaseClient,
  subjectId: string
): Promise<SubjectGradebook> {
  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("id, title, week_number, max_points")
    .eq("subject_id", subjectId)
    .order("week_number");

  const assignments: GradebookAssignment[] = (assignmentRows ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    weekNumber: a.week_number,
    maxPoints: a.max_points,
  }));

  type EnrollmentRow = {
    student_id: string;
    profiles: { full_name: string; student_number: string | null } | null;
  };

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select<string, EnrollmentRow>("student_id, profiles(full_name, student_number)")
    .eq("subject_id", subjectId);

  const students = (enrollments ?? [])
    .map((e) => ({
      studentId: e.student_id,
      studentName: e.profiles?.full_name ?? "",
      studentNumber: e.profiles?.student_number ?? null,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const assignmentIds = assignments.map((a) => a.id);
  const maxPointsByAssignment = new Map(assignments.map((a) => [a.id, a.maxPoints]));

  type SubmissionRow = {
    student_id: string;
    assignment_id: string;
    published_grades: { total_score: number } | null;
  };

  const { data: submissions } = assignmentIds.length
    ? await supabase
        .from("submissions")
        .select<string, SubmissionRow>(
          "student_id, assignment_id, published_grades(total_score)"
        )
        .in("assignment_id", assignmentIds)
    : { data: [] as SubmissionRow[] };

  const scoreByStudentAndAssignment = new Map<string, number>();
  for (const s of submissions ?? []) {
    if (s.published_grades) {
      scoreByStudentAndAssignment.set(
        `${s.student_id}:${s.assignment_id}`,
        s.published_grades.total_score
      );
    }
  }

  const rows: GradebookRow[] = students.map(({ studentId, studentName, studentNumber }) => {
    const scores: Record<string, number | null> = {};
    let totalScore = 0;
    let totalPossible = 0;

    for (const assignment of assignments) {
      const score = scoreByStudentAndAssignment.get(`${studentId}:${assignment.id}`);
      scores[assignment.id] = score ?? null;
      if (score !== undefined) {
        totalScore += score;
        totalPossible += maxPointsByAssignment.get(assignment.id) ?? 0;
      }
    }

    return { studentId, studentName, studentNumber, scores, totalScore, totalPossible };
  });

  return { assignments, rows };
}

export function gradebookToCsv(gradebook: SubjectGradebook): string {
  const header = [
    "Student ID",
    "Student",
    ...gradebook.assignments.map((a) => `Week ${a.weekNumber} - ${a.title} (${a.maxPoints})`),
    "Total",
    "Percentage",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = [header.map(escape).join(",")];

  for (const row of gradebook.rows) {
    const percentage =
      row.totalPossible > 0 ? `${((row.totalScore / row.totalPossible) * 100).toFixed(1)}%` : "";
    const cells = [
      row.studentNumber ?? "",
      row.studentName,
      ...gradebook.assignments.map((a) => (row.scores[a.id] === null ? "" : String(row.scores[a.id]))),
      String(row.totalScore),
      percentage,
    ];
    lines.push(cells.map(escape).join(","));
  }

  return lines.join("\n");
}
