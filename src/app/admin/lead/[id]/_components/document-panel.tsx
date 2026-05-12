"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { Facts, type FactItem } from "@/components/admin/facts";
import { cn } from "@/lib/utils";
import { FIELD_SCHEMAS, type FieldSchema } from "@/lib/documents";
import type {
  BankStatementFields,
  DocumentStatus,
  DocumentType,
  IdDocumentFields,
  LeadDocument,
  PayslipFields,
} from "@/types";

type Mode = "admin" | "lead";

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  payslip: "Payslip",
  id_document: "ID document",
  bank_statement: "Bank statement",
};

const STATUS_STYLE: Record<DocumentStatus, string> = {
  uploaded: "bg-panel text-ink-muted",
  parsing: "bg-panel text-ink-muted",
  parsed: "bg-brand-tint text-brand-ink",
  failed: "bg-panel text-ink",
  confirmed: "bg-brand-tint text-brand-ink",
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  parsing: "Parsing",
  parsed: "Parsed",
  failed: "Failed",
  confirmed: "Confirmed",
};

function formatNumber(n: number | null, currency: string | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
  return currency ? `${formatted} ${currency}` : formatted;
}

function readFacts(doc: LeadDocument): FactItem[] {
  if (!doc.extractedFields) return [];
  if (doc.docType === "payslip") {
    const f = doc.extractedFields as PayslipFields;
    return [
      { label: "Employer", value: f.employer ?? "—" },
      { label: "Gross / mo", value: formatNumber(f.grossMonthly, f.currency), mono: true },
      { label: "Net / mo", value: formatNumber(f.netMonthly, f.currency), mono: true },
      { label: "Period", value: f.payPeriodStart && f.payPeriodEnd ? `${f.payPeriodStart} → ${f.payPeriodEnd}` : "—", mono: true },
      { label: "Type", value: f.employmentType ?? "—" },
    ];
  }
  if (doc.docType === "id_document") {
    const f = doc.extractedFields as IdDocumentFields;
    return [
      { label: "Full name", value: f.fullName ?? "—" },
      { label: "DOB", value: f.dateOfBirth ?? "—", mono: true },
      { label: "Doc kind", value: f.idDocumentType ?? "—" },
      { label: "Number", value: f.documentNumber ?? "—", mono: true },
      { label: "Expires", value: f.expiryDate ?? "—", mono: true },
      { label: "Nationality", value: f.nationality ?? "—" },
    ];
  }
  const f = doc.extractedFields as BankStatementFields;
  return [
    { label: "Holder", value: f.accountHolder ?? "—" },
    { label: "Bank", value: f.bankName ?? "—" },
    { label: "Period", value: f.periodStart && f.periodEnd ? `${f.periodStart} → ${f.periodEnd}` : "—", mono: true },
    { label: "Avg balance", value: formatNumber(f.averageBalance, f.currency), mono: true },
    { label: "Inflows", value: formatNumber(f.totalInflows, f.currency), mono: true },
    { label: "Outflows", value: formatNumber(f.totalOutflows, f.currency), mono: true },
  ];
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line px-[9px] py-[3px] text-[11px] font-medium",
        STATUS_STYLE[status]
      )}
    >
      {(status === "parsing" || status === "uploaded") && (
        <Loader2 className="size-[11px] animate-spin" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

function initialFormState(doc: LeadDocument): Record<string, string> {
  const out: Record<string, string> = {};
  const schemas = FIELD_SCHEMAS[doc.docType];
  const fields = (doc.extractedFields ?? {}) as Record<string, unknown>;
  for (const s of schemas) {
    const v = fields[s.key];
    out[s.key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

function buildFieldsPayload(
  docType: DocumentType,
  form: Record<string, string>,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const s of FIELD_SCHEMAS[docType]) {
    const raw = form[s.key];
    if (raw === undefined || raw === "") {
      out[s.key] = null;
      continue;
    }
    if (s.kind === "number") {
      const n = Number(raw);
      out[s.key] = Number.isFinite(n) ? n : null;
    } else {
      out[s.key] = raw;
    }
  }
  return out;
}

export function DocumentPanel({
  doc,
  mode,
  token,
}: {
  doc: LeadDocument;
  mode: Mode;
  token?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"reparse" | "confirm" | "delete" | "save" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => initialFormState(doc));
  const [editError, setEditError] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armTimer.current) clearTimeout(armTimer.current);
  }, []);

  const disabled = busy !== null || pending;
  const canEdit = doc.status === "parsed" || doc.status === "confirmed";
  const canReparse = mode === "admin" && (doc.status === "parsed" || doc.status === "failed");
  const canConfirm = mode === "admin" && doc.status === "parsed";
  const showFields = doc.status === "parsed" || doc.status === "confirmed";

  // URL builders — choose admin vs token-gated paths based on mode.
  const url = {
    parse:   `/api/documents/${doc.id}/parse`,
    confirm: `/api/documents/${doc.id}/confirm`,
    fields:  mode === "admin"
      ? `/api/documents/${doc.id}/fields`
      : `/api/upload/${token}/documents/${doc.id}/fields`,
    remove:  mode === "admin"
      ? `/api/documents/${doc.id}`
      : `/api/upload/${token}/documents/${doc.id}`,
  };

  const refresh = () => startTransition(() => router.refresh());

  const reparse = async () => {
    setBusy("reparse");
    try {
      await fetch(url.parse, { method: "POST" });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy("confirm");
    try {
      await fetch(url.confirm, { method: "POST" });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await fetch(url.remove, { method: "DELETE" });
      refresh();
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
    }
  };

  const save = async () => {
    setBusy("save");
    setEditError(null);
    try {
      const res = await fetch(url.fields, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: buildFieldsPayload(doc.docType, form) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEditError(body.error ?? `save_failed_${res.status}`);
        return;
      }
      setEditing(false);
      refresh();
    } finally {
      setBusy(null);
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

  const toggleEdit = () => {
    if (editing) {
      setEditing(false);
      setEditError(null);
      setForm(initialFormState(doc));
    } else {
      setForm(initialFormState(doc));
      setEditing(true);
    }
  };

  return (
    <div className="rounded-[12px] border border-line bg-panel p-[16px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-line bg-bg">
            <FileText className="size-4 text-ink-muted" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-medium text-ink">
              {doc.fileName}
            </div>
            <div className="mt-[2px] font-mono text-[10.5px] tracking-[1px] text-ink-muted uppercase">
              {DOC_TYPE_LABEL[doc.docType]}
              {doc.fileSize ? ` · ${Math.round(doc.fileSize / 1024)} kB` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge status={doc.status} />

          {canReparse && !editing && (
            <button
              type="button"
              onClick={reparse}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-[7px] border border-line bg-panel px-[10px] py-[6px] text-[12px] text-ink-muted transition hover:text-ink",
                disabled && "opacity-60"
              )}
            >
              {busy === "reparse" ? <Loader2 className="size-[13px] animate-spin" /> : <RefreshCw className="size-[13px]" />}
              Re-parse
            </button>
          )}

          {canConfirm && !editing && (
            <button
              type="button"
              onClick={confirm}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-[7px] bg-ink px-[12px] py-[6px] text-[12px] font-medium text-bg transition hover:opacity-90",
                disabled && "opacity-60"
              )}
            >
              {busy === "confirm" ? <Loader2 className="size-[13px] animate-spin" /> : <CheckCircle2 className="size-[13px]" />}
              Confirm
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={toggleEdit}
              disabled={disabled && !editing}
              className={cn(
                "inline-flex items-center gap-1 rounded-[7px] border border-line px-[10px] py-[6px] text-[12px] transition",
                editing
                  ? "bg-bg text-ink"
                  : "bg-panel text-ink-muted hover:text-ink"
              )}
            >
              {editing ? <X className="size-[13px]" /> : <Pencil className="size-[13px]" />}
              {editing ? "Cancel" : "Edit"}
            </button>
          )}

          {!editing && (
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
              {busy === "delete" ? <Loader2 className="size-[13px] animate-spin" /> : <Trash2 className="size-[13px]" />}
              {confirmingDelete ? "Confirm" : "Remove"}
            </button>
          )}
        </div>
      </div>

      {doc.status === "parsing" && (
        <div className="mt-3 rounded-[10px] border border-dashed border-line bg-bg p-3 text-[12.5px] text-ink-muted">
          Claude is reading the document…
        </div>
      )}

      {doc.status === "failed" && (
        <div className="mt-3 rounded-[10px] border border-line bg-bg p-3 text-[12.5px] text-ink-muted">
          <div className="mb-1 font-mono text-[10.5px] tracking-[1px] text-ink uppercase">
            Parse failed
          </div>
          <div>{doc.parseError ?? "Unknown error."}</div>
        </div>
      )}

      {showFields && !editing && (
        <div className="mt-3 rounded-[10px] border border-line bg-bg p-3">
          <Facts items={readFacts(doc)} />
        </div>
      )}

      {editing && (
        <EditForm
          schemas={FIELD_SCHEMAS[doc.docType]}
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={toggleEdit}
          saving={busy === "save"}
          error={editError}
        />
      )}
    </div>
  );
}

function EditForm({
  schemas,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  error,
}: {
  schemas: FieldSchema[];
  form: Record<string, string>;
  setForm: (next: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-3 rounded-[10px] border border-line bg-bg p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {schemas.map((s) => (
          <label key={s.key} className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">{s.label}</span>
            <input
              type={s.kind === "number" ? "number" : s.kind === "date" ? "date" : "text"}
              inputMode={s.kind === "number" ? "decimal" : undefined}
              step={s.kind === "number" ? "any" : undefined}
              value={form[s.key] ?? ""}
              onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
              className="rounded-[7px] border border-line bg-panel px-[10px] py-[6px] text-[13px] text-ink"
            />
          </label>
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-[7px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">
          {error}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-[7px] border border-line bg-panel px-[12px] py-[6px] text-[12px] text-ink-muted transition hover:text-ink"
        >
          <X className="size-[13px]" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-1 rounded-[7px] bg-ink px-[14px] py-[6px] text-[12px] font-medium text-bg transition hover:opacity-90",
            saving && "opacity-60"
          )}
        >
          {saving ? <Loader2 className="size-[13px] animate-spin" /> : <Save className="size-[13px]" />}
          Save
        </button>
      </div>
    </div>
  );
}
