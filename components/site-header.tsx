import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/auth";
import { formatStudentName } from "@/lib/format-name";

export function SiteHeader({ profile }: { profile: Profile }) {
  const links =
    profile.role === "lecturer"
      ? [
          { href: "/admin/semesters", label: "Semesters" },
          { href: "/admin", label: "Subjects" },
        ]
      : [
          { href: "/dashboard", label: "My Subjects" },
          { href: "/subjects", label: "Browse Subjects" },
          { href: "/grades", label: "My Grades" },
        ];

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href={profile.role === "lecturer" ? "/admin" : "/dashboard"} className="font-semibold">
            Airline Business Courses
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {formatStudentName(profile.full_name, profile.nickname)}
          </span>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
