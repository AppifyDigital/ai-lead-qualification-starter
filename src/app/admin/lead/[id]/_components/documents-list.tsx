import { FileText, Loader2 } from "lucide-react";
import { Facts, type FactItem } from "@/components/admin/facts";
import { cn } from "@/lib/utils";
import type {
  BankStatementFields,
  DocumentStatus,
  DocumentType,
  IdDocumentFields,
  LeadDocument,
  PayslipFields,
} from "@/types";
import { DocumentActions } from "./document-actions";

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

function payslipFacts(f: PayslipFields): FactItem[] {
  return [
    { label: "Employer", value: f.employer ?? "—" },
    { label: "Gross / mo", value: formatNumber(f.grossMonthly, f.currency), mono: true },
    { label: "Net / mo", value: formatNumber(f.netMonthly, f.currency), mono: true },
    { label: "Period", value: f.payPeriodStart && f.payPeriodEnd ? `${f.payPeriodStart} → ${f.payPeriodEnd}` : "—", mono: true },
    { label: "Type", value: f.employmentType ?? "—" },
  ];
}

function idFacts(f: IdDocumentFields): FactItem[] {
  return [
    { label: "Full name", value: f.fullName ?? "—" },
    { label: "DOB", value: f.dateOfBirth ?? "—", mono: true },
    { label: "Doc kind", value: f.idDocumentType ?? "—" },
    { label: "Number", value: f.documentNumber ?? "—", mono: true },
    { label: "Expires", value: f.expiryDate ?? "—", mono: true },
    { label: "Nationality", value: f.nationality ?? "—" },
  ];
}

function bankFacts(f: BankStatementFields): FactItem[] {
  return [
    { label: "Holder", value: f.accountHolder ?? "—" },
    { label: "Bank", value: f.bankName ?? "—" },
    { label: "Period", value: f.periodStart && f.periodEnd ? `${f.periodStart} → ${f.periodEnd}` : "—", mono: true },
    { label: "Avg balance", value: formatNumber(f.averageBalance, f.currency), mono: true },
    { label: "Inflows", value: formatNumber(f.totalInflows, f.currency), mono: true },
    { label: "Outflows", value: formatNumber(f.totalOutflows, f.currency), mono: true },
  ];
}

function factsFor(doc: LeadDocument): FactItem[] {
  if (!doc.extractedFields) return [];
  switch (doc.docType) {
    case "payslip":
      return payslipFacts(doc.extractedFields as PayslipFields);
    case "id_document":
      return idFacts(doc.extractedFields as IdDocumentFields);
    case "bank_statement":
      return bankFacts(doc.extractedFields as BankStatementFields);
  }
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

export function DocumentsList({ documents }: { documents: LeadDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="mt-3 rounded-[12px] border border-dashed border-line bg-panel p-5 text-center text-[13px] text-ink-muted">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {documents.map((doc) => {
        const isShowingFields = doc.status === "parsed" || doc.status === "confirmed";
        return (
          <div
            key={doc.id}
            className="rounded-[12px] border border-line bg-panel p-[16px]"
          >
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
              <div className="flex items-center gap-2">
                <StatusBadge status={doc.status} />
                <DocumentActions docId={doc.id} status={doc.status} />
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

            {isShowingFields && (
              <div className="mt-3 rounded-[10px] border border-line bg-bg p-3">
                <Facts items={factsFor(doc)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
