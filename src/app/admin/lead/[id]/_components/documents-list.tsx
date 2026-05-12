import type { LeadDocument } from "@/types";
import { DocumentPanel } from "./document-panel";

export function DocumentsList({
  documents,
  mode = "admin",
  token,
}: {
  documents: LeadDocument[];
  mode?: "admin" | "lead";
  token?: string;
}) {
  if (documents.length === 0) {
    return (
      <div className="mt-3 rounded-[12px] border border-dashed border-line bg-panel p-5 text-center text-[13px] text-ink-muted">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {documents.map((doc) => (
        <DocumentPanel key={doc.id} doc={doc} mode={mode} token={token} />
      ))}
    </div>
  );
}
