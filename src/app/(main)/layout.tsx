import Sidebar from "@/components/ui/sidebar";
import BottomNav from "@/components/ui/bottom-nav";
import { getSession } from "@/lib/auth";
import { getPendingSubmissionCount } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const pendingCount = await getPendingSubmissionCount();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={session?.role} userName={session?.name} pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav userRole={session?.role} pendingCount={pendingCount} />
    </div>
  );
}
