import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

const styles: Record<LeadStage, string> = {
  New: "bg-panel text-ink-muted",
  Contacted: "bg-panel text-ink",
  Qualified: "bg-brand-tint text-brand-ink",
  "In review": "bg-panel text-ink",
};

export function StagePill({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line px-[9px] py-[3px] text-[11px] font-medium",
        styles[stage]
      )}
    >
      {stage}
    </span>
  );
}
