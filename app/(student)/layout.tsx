import { requireProfile } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
