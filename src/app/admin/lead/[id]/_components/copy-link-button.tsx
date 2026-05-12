"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyLinkButton({ leadId }: { leadId: string }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/upload-link`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `failed_${res.status}`);
      }
      const { url } = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setError(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-[6px] rounded-[7px] border border-line bg-panel px-3 py-[7px] text-[13px] text-ink transition",
        busy && "opacity-60"
      )}
    >
      {busy ? (
        <Loader2 className="size-[14px] animate-spin" />
      ) : copied ? (
        <Check className="size-[14px] text-emerald-600" />
      ) : (
        <LinkIcon className="size-[14px]" />
      )}
      {error ? `Error: ${error}` : copied ? "Link copied" : "Copy upload link"}
    </button>
  );
}
