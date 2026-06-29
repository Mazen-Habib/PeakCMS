import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar role={user.role} name={user.name || "User"} />
      <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
