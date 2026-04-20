import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatAmount, formatTerm, formatRelative } from "@/lib/format";
import { StagePill } from "./stage-pill";
import type { Lead, TeamMember } from "@/types";

const GRID =
  "grid grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1.3fr_0.9fr_0.9fr_0.8fr] gap-3";

const COLUMNS = [
  "Lead",
  "Amount",
  "Term",
  "Language",
  "Purpose",
  "Stage",
  "Assignee",
  "Received",
];

export function LeadsTable({
  leads,
  team,
}: {
  leads: Lead[];
  team: TeamMember[];
}) {
  const byId = new Map(team.map((m) => [m.id, m]));

  return (
    <div className="overflow-y-auto border-r border-line">
      <div
        className={cn(
          GRID,
          "sticky top-0 z-[2] border-b border-line bg-panel px-5 py-[10px] font-mono text-[11px] tracking-[1px] text-ink-muted uppercase"
        )}
      >
        {COLUMNS.map((c) => (
          <div key={c}>{c}</div>
        ))}
      </div>
      {leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          assignee={lead.assigneeId ? byId.get(lead.assigneeId) ?? null : null}
        />
      ))}
    </div>
  );
}

function LeadRow({
  lead,
  assignee,
}: {
  lead: Lead;
  assignee: TeamMember | null;
}) {
  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Link
      href={`/admin/lead/${lead.id}`}
      className={cn(
        GRID,
        "relative items-center border-b border-line px-5 py-[14px] text-[13px] transition-colors hover:bg-panel",
        lead.isNew && "bg-[color-mix(in_oklch,var(--brand)_6%,var(--bg))] hover:bg-[color-mix(in_oklch,var(--brand)_10%,var(--bg))]"
      )}
    >
      {lead.isNew && (
        <span className="absolute top-0 bottom-0 left-0 w-[3px] bg-brand" />
      )}

      <div className="flex items-center gap-[10px] min-w-0">
        <div className="grid size-[26px] place-items-center rounded-full border border-line bg-panel text-[11px] font-medium text-ink-muted">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{lead.name}</div>
          {lead.isNew && (
            <div className="font-mono text-[10px] font-semibold tracking-[0.5px] text-brand-ink uppercase">
              New · AI qualified
            </div>
          )}
        </div>
      </div>

      <div className="font-mono text-[12px] text-ink">
        {formatAmount(lead.amount)}
      </div>
      <div className="text-[12px] text-ink-muted">
        {formatTerm(lead.termMonths)}
      </div>
      <div className="text-[12px] text-ink-muted">{lead.language}</div>
      <div className="truncate text-[12px] text-ink-muted">{lead.purpose}</div>
      <div>
        <StagePill stage={lead.stage} />
      </div>
      <div>
        {assignee ? (
          <div className="flex items-center gap-[7px]">
            <div className="grid size-[22px] place-items-center rounded-full bg-ink text-[10px] font-semibold text-bg">
              {assignee.initials}
            </div>
            <span className="text-[12px] text-ink">
              {assignee.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <span className="font-mono text-[11px] tracking-[0.5px] text-ink-muted">
            unassigned
          </span>
        )}
      </div>
      <div className="font-mono text-[12px] text-ink-muted">
        {formatRelative(lead.receivedAt)}
      </div>
    </Link>
  );
}
