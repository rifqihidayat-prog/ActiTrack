import SurveyTracker from "@/components/survey/survey-tracker";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewSurveyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--ga-text)" }}>Survey Baru</h1>
      <SurveyTracker userStoreName={session.storeName} userName={session.name} />
    </div>
  );
}
