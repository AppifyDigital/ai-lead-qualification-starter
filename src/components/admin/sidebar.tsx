import { cn } from "@/lib/utils";
import {
  Inbox,
  Users,
  GitBranch,
  Contact,
  BarChart3,
  Settings,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  active?: boolean;
};

const items: NavItem[] = [
  { label: "Inbox", icon: Inbox, count: 3 },
  { label: "Leads", icon: Users, count: 24, active: true },
  { label: "Pipeline", icon: GitBranch },
  { label: "Contacts", icon: Contact },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-6 border-r border-line bg-panel px-3 py-[18px]">
      <div className="flex items-center gap-[9px] px-2 py-1">
        <div className="grid size-5 place-items-center rounded-[5px] bg-ink text-[11px] font-bold text-bg">
          N
        </div>
        <div className="text-[14px] font-semibold tracking-[-0.2px]">
          Northline
        </div>
      </div>

      <nav className="flex flex-col gap-px">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            className={cn(
              "flex items-center justify-between rounded-[7px] border border-transparent px-[10px] py-[7px] text-[13px] transition-colors",
              it.active
                ? "border-line bg-bg text-ink font-medium"
                : "text-ink-muted hover:text-ink"
            )}
          >
            <span className="flex items-center gap-2">
              <it.icon className="size-[14px]" />
              {it.label}
            </span>
            {it.count !== undefined && (
              <span className="font-mono text-[11px] text-ink-muted">
                {it.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-[9px] border-t border-line px-[10px] pt-3">
        <div className="grid size-[26px] place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
          SR
        </div>
        <div className="text-[12px] leading-[1.2]">
          <div className="font-medium text-ink">Sofia Ramirez</div>
          <div className="text-[11px] text-ink-muted">Team admin</div>
        </div>
      </div>
    </aside>
  );
}
