import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  role: "lecturer" | "student";
  first_name: string | null;
  last_name: string | null;
  student_number: string | null;
  group_name: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, first_name, last_name, student_number, group_name")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireLecturer(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "lecturer") redirect("/dashboard");
  return profile;
}
