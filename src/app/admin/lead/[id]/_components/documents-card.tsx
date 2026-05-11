"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/types";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "payslip", label: "Payslip" },
  { value: "id_document", label: "ID document" },
  { value: "bank_statement", label: "Bank statement" },
];

export function DocumentsCard({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [docType, setDocType] = useState<DocumentType>("payslip");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (next: File | null) => {
    setError(null);
    if (next && next.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      setFile(null);
      return;
    }
    if (next && next.size > 10 * 1024 * 1024) {
      setError("File is larger than 10 MB.");
      setFile(null);
      return;
    }
    setFile(next);
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("doc_type", docType);
      form.append("file", file);

      const res = await fetch(`/api/leads/${leadId}/documents`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `upload_failed_${res.status}`);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-[12px] border border-line bg-panel p-[18px]">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-center">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-muted">
            Document type
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-[13px] text-ink"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink-muted">
            PDF file
          </label>
          <label
            className={cn(
              "flex items-center gap-2 rounded-[8px] border border-dashed bg-bg px-3 py-2 text-[13px] transition",
              file ? "border-line text-ink" : "border-line text-ink-muted hover:border-ink-muted"
            )}
          >
            <UploadCloud className="size-4 shrink-0" />
            <span className="truncate">
              {file ? file.name : "Choose a PDF (max 10 MB)"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!file || uploading || isPending}
          className={cn(
            "mt-[18px] inline-flex items-center justify-center gap-2 rounded-[8px] px-[14px] py-2 text-[13px] font-medium transition sm:mt-[18px]",
            file && !uploading
              ? "bg-ink text-bg hover:opacity-90"
              : "cursor-not-allowed bg-panel text-ink-muted",
            "border border-line"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading
            </>
          ) : (
            <>
              <FileText className="size-4" />
              Upload &amp; parse
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-[8px] border border-line bg-bg px-3 py-2 text-[12.5px] text-ink-muted">
          {error}
        </div>
      )}
    </div>
  );
}
