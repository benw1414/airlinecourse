import { requireLecturer } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireLecturer();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
