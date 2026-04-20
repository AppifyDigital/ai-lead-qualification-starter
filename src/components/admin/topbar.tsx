import { Search, SlidersHorizontal, Plus } from "lucide-react";

export function Topbar({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-bg px-8 py-[18px]">
      <div>
        <div className="font-mono text-[11px] tracking-[1px] text-ink-muted uppercase">
          {eyebrow}
        </div>
        <h1 className="mt-[2px] text-[22px] font-semibold tracking-[-0.4px]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-[10px]">
        <div className="flex w-60 items-center gap-2 rounded-[8px] border border-line bg-panel px-3 py-[7px] text-[13px] text-ink-muted">
          <Search className="size-[13px]" />
          <span>Search leads…</span>
          <span className="ml-auto font-mono text-[11px]">⌘K</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-[6px] rounded-[7px] border border-line bg-panel px-3 py-[7px] text-[13px] text-ink"
        >
          <SlidersHorizontal className="size-[13px]" /> Filters
        </button>
        <button
          type="button"
          className="flex items-center gap-[6px] rounded-[7px] bg-ink px-[14px] py-[7px] text-[13px] font-medium text-bg"
        >
          <Plus className="size-[13px]" /> New
        </button>
      </div>
    </div>
  );
}
