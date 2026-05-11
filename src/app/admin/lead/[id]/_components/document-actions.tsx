"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

export function DocumentActions({
  docId,
  status,
}: {
  docId: string;
  status: DocumentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"reparse" | "confirm" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armTimer.current) clearTimeout(armTimer.current);
  }, []);

  const reparse = async () => {
    setBusy("reparse");
    try {
      await fetch(`/api/documents/${docId}/parse`, { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy("confirm");
    try {
      await fetch(`/api/documents/${docId}/confirm`, { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
    }
  };

  const onTrashClick = () => {
    if (confirmingDelete) {
      void remove();
      return;
    }
    setConfirmingDelete(true);
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setConfirmingDelete(false), 3000);
  };

  const disabled = busy !== null || pending;

  return (
    <div className="flex items-center gap-2">
      {(status === "parsed" || status === "failed") && (
        <button
          type="button"
          onClick={reparse}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-[7px] border border-line bg-panel px-[10px] py-[6px] text-[12px] text-ink-muted transition hover:text-ink",
            disabled && "opacity-60"
          )}
        >
          {busy === "reparse" ? (
            <Loader2 className="size-[13px] animate-spin" />
          ) : (
            <RefreshCw className="size-[13px]" />
          )}
          Re-parse
        </button>
      )}
      {status === "parsed" && (
        <button
          type="button"
          onClick={confirm}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-[7px] bg-ink px-[12px] py-[6px] text-[12px] font-medium text-bg transition hover:opacity-90",
            disabled && "opacity-60"
          )}
        >
          {busy === "confirm" ? (
            <Loader2 className="size-[13px] animate-spin" />
          ) : (
            <CheckCircle2 className="size-[13px]" />
          )}
          Confirm
        </button>
      )}
      <button
        type="button"
        onClick={onTrashClick}
        disabled={disabled}
        title={confirmingDelete ? "Click again to confirm" : "Remove document"}
        className={cn(
          "inline-flex items-center gap-1 rounded-[7px] border px-[10px] py-[6px] text-[12px] transition",
          confirmingDelete
            ? "border-red-500/40 bg-red-500/10 text-red-600"
            : "border-line bg-panel text-ink-muted hover:text-ink",
          disabled && "opacity-60"
        )}
      >
        {busy === "delete" ? (
          <Loader2 className="size-[13px] animate-spin" />
        ) : (
          <Trash2 className="size-[13px]" />
        )}
        {confirmingDelete ? "Confirm" : "Remove"}
      </button>
    </div>
  );
}
