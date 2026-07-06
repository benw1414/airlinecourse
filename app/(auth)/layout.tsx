import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/40 via-background to-background p-6">
      <Link href="/login" className="flex items-center gap-2 font-semibold tracking-tight">
        <LogoMark />
        Airline Business Courses
      </Link>
      {children}
    </div>
  );
}
