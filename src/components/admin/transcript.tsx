import { cn } from "@/lib/utils";
import type { TranscriptLine } from "@/types";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Transcript({
  lines,
  userLabel,
}: {
  lines: TranscriptLine[];
  userLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-line bg-panel px-[22px] py-5">
      {lines.map((l, i) => {
        const isAgent = l.who === "agent";
        return (
          <div key={i} className="grid grid-cols-[50px_1fr] gap-[14px]">
            <div className="pt-[2px] font-mono text-[11px] text-ink-muted">
              {formatTime(l.t)}
            </div>
            <div>
              <div
                className={cn(
                  "mb-[2px] text-[10.5px] font-semibold tracking-[0.5px]",
                  isAgent ? "text-brand-ink" : "text-ink"
                )}
              >
                {isAgent ? "ADA (AI)" : userLabel.toUpperCase()}
              </div>
              <div className="text-[14px] leading-[1.45] text-pretty">
                {l.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
