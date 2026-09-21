import { getSurveyRoutesWithDetails, getSurveyDashboardAnalytics } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import SurveyDashboard from "@/components/survey/survey-dashboard";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const session = await getSession();
  const [routes, initialAnalytics] = await Promise.all([
    getSurveyRoutesWithDetails(),
    getSurveyDashboardAnalytics("all"),
  ]);

  return (
    <SurveyDashboard
      initialData={initialAnalytics}
      allRoutes={routes as any}
      userRole={session?.role}
    />
  );
}
