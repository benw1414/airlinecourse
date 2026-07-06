"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import type { Profile } from "@/lib/auth";
import { formatStudentName } from "@/lib/format-name";
import { cn } from "@/lib/utils";

export function SiteHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const links =
    profile.role === "lecturer"
      ? [
          { href: "/admin", label: "Subjects" },
          { href: "/admin/semesters", label: "Semesters" },
        ]
      : [
          { href: "/dashboard", label: "My Subjects" },
          { href: "/subjects", label: "Browse Subjects" },
          { href: "/grades", label: "My Grades" },
          { href: "/profile", label: "My Profile" },
        ];

  const displayName = formatStudentName(profile.full_name, profile.nickname);
  const initial = (profile.nickname ?? profile.first_name ?? profile.full_name ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href={profile.role === "lecturer" ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <LogoMark />
            <span className="hidden sm:inline">Airline Business Courses</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/admin" && link.href !== "/dashboard" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initial}
            </span>
            <span className="text-muted-foreground">{displayName}</span>
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
