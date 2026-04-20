import { StatusDot } from "./status-dot";
import type { TeamMember } from "@/types";

export function TeamPanel({ team }: { team: TeamMember[] }) {
  const online = team.filter((m) => m.status === "available").length;

  return (
    <aside className="flex flex-col gap-4 overflow-y-auto bg-panel p-5">
      <div>
        <div className="mb-1 font-mono text-[10px] tracking-[1.5px] text-ink-muted uppercase">
          Team
        </div>
        <div className="text-[13px] text-ink">
          <span className="font-medium">{online}</span>
          <span className="text-ink-muted"> of {team.length} online</span>
        </div>
      </div>

      <ul className="flex flex-col gap-[2px]">
        {team.map((m) => (
          <li
            key={m.id}
            className="grid grid-cols-[26px_1fr_auto] items-center gap-[10px] rounded-[7px] px-[10px] py-2"
          >
            <div className="grid size-[26px] place-items-center rounded-full border border-line bg-bg text-[10px] font-semibold text-ink">
              {m.initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-ink">
                {m.name}
              </div>
              <div className="flex items-center gap-[6px] text-[11px] text-ink-muted">
                <StatusDot status={m.status} />
                <span>{m.status}</span>
                <span>·</span>
                <span>{m.languages.map((l) => l.slice(0, 2)).join("/")}</span>
              </div>
            </div>
            <div className="font-mono text-[11px] text-ink-muted">
              {m.activeLeads}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
