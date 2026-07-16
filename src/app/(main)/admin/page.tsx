import { getSubmissionsWithDetails } from "@/lib/actions";
import ApprovalKanban from "@/components/dashboard/approval-kanban";

export default async function AdminPage() {
  const submissions = await getSubmissionsWithDetails();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Pengajuan</h1>
          <p className="text-sm text-slate-500 mt-1">Tinjau dan setujui/tolak pengajuan aktivasi toko</p>
        </div>
        <div className="text-sm text-slate-500">{submissions.filter(s => s.approvalStatus === "Pending").length} pending</div>
      </div>
      <ApprovalKanban submissions={submissions} />
    </div>
  );
}
