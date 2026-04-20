import { cn } from "@/lib/utils";

export function SectionTitle({
  children,
  small,
  className,
}: {
  children: React.ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-mono font-semibold tracking-[1.5px] text-ink-muted uppercase",
        small ? "mb-[10px] text-[10px]" : "mb-[14px] text-[11px]",
        className
      )}
    >
      {children}
    </div>
  );
}
