import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { LeadsTable } from "@/components/admin/leads-table";
import { TeamPanel } from "@/components/admin/team-panel";
import { getLeads, getTeam } from "@/lib/data";
import { RealtimeLeads } from "./_components/realtime-leads";

export const metadata = {
  title: "Leads · Northline Admin",
};

export default async function AdminPage() {
  const [leads, team] = await Promise.all([getLeads(), getTeam()]);

  return (
    <div className="grid h-screen grid-cols-[220px_1fr] overflow-hidden bg-bg text-ink">
      <RealtimeLeads />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-col">
        <Topbar eyebrow="Leads / Inbox" title="New leads" />
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px]">
          <LeadsTable leads={leads} team={team} />
          <TeamPanel team={team} />
        </div>
      </div>
    </div>
  );
}
