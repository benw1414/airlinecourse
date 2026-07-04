// Hand-written row shapes for embedded-resource queries.
//
// supabase-js can only infer whether an embedded relation is a single object
// or an array when it has a generated `Database` type describing foreign key
// cardinality. Until this project is wired up to a live Supabase project (so
// `supabase gen types typescript` can run against the real schema), we pin
// the result shape explicitly via `.select<Query, Row>()` instead.

export type SemesterRef = { name: string } | null;

export type SubjectWithSemester = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  semesters: SemesterRef;
};

export type SubjectWithSemesterAndEnrollmentCount = SubjectWithSemester & {
  enrollments: { count: number }[];
};

export type EnrollmentWithSubject = {
  subject_id: string;
  subjects: {
    id: string;
    code: string;
    title: string;
    semesters: SemesterRef;
  } | null;
};

export type EnrollmentWithProfile = {
  id: string;
  enrolled_at: string;
  profiles: { full_name: string } | null;
};
