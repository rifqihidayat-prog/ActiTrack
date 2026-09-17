import SurveyTracker from "@/components/survey/survey-tracker";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewSurveyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-md mx-auto w-full">
      <SurveyTracker userStoreName={session.storeName} userName={session.name} />
    </div>
  );
}

