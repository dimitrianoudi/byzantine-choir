import { getSession } from "@/lib/session";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const session = await getSession();
  const role = session.user?.role || "member";
  return (
    <div className="container container--flush-left section section--flush-left">
      <CalendarView role={role} />
    </div>
  );
}
