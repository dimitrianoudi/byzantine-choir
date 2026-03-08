import { unstable_noStore as noStore } from "next/cache";
import { getSystemStatus } from "@/lib/status";
import StatusDashboard from "@/app/status/StatusDashboard";

export default async function StatusPage() {
  noStore();
  const status = await getSystemStatus();
  return <StatusDashboard initialStatus={status} />;
}
