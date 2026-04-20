import { cn } from "@/lib/utils";
import type { MemberStatus } from "@/types";

const colors: Record<MemberStatus, string> = {
  available: "bg-brand",
  "on-call": "bg-amber-500",
  away: "bg-ink-muted",
  offline: "bg-line",
};

export function StatusDot({
  status,
  className,
}: {
  status: MemberStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-[6px] rounded-full", colors[status], className)}
      aria-label={status}
    />
  );
}
