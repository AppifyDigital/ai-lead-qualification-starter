import { cn } from "@/lib/utils";

export type FactItem = {
  label: string;
  value: string;
  mono?: boolean;
};

export function Facts({ items }: { items: FactItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "grid grid-cols-[90px_1fr] gap-[10px] py-2 text-[13px]",
            i < items.length - 1 && "border-b border-line"
          )}
        >
          <div className="text-[12px] text-ink-muted">{item.label}</div>
          <div
            className={cn(
              "text-right text-[12.5px] text-ink",
              item.mono && "font-mono"
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
