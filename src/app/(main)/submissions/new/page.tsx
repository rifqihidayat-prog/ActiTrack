import SubmissionWizard from "@/components/form/submission-wizard";
import { getSession } from "@/lib/auth";
import { getStoreList } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function NewSubmissionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const stores = await getStoreList();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Form Pengajuan Aktivasi</h1>
        <p className="text-sm text-slate-500 mt-1">Isi detail acara aktivasi toko baru</p>
      </div>
      <SubmissionWizard userStoreName={session.storeName} stores={stores} />
    </div>
  );
}
