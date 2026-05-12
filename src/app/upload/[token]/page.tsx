import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getLeadByUploadToken, getLeadDocuments } from "@/lib/data";
import { RealtimeLeads } from "@/app/admin/_components/realtime-leads";
import { DocumentsCard } from "@/app/admin/lead/[id]/_components/documents-card";
import { DocumentsList } from "@/app/admin/lead/[id]/_components/documents-list";
import { SectionTitle } from "@/components/admin/section-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lead = await getLeadByUploadToken(token);
  return {
    title: lead ? `Upload documents · Northline` : "Link unavailable · Northline",
  };
}

export default async function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lead = await getLeadByUploadToken(token);

  if (!lead) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center px-5 py-12 text-center">
        <div className="font-mono text-[11px] tracking-[2px] text-ink-muted uppercase">
          Northline
        </div>
        <h1 className="mt-3 text-[24px] font-semibold tracking-[-0.4px]">
          This link is no longer active
        </h1>
        <p className="mt-3 max-w-[420px] text-[14px] leading-[1.55] text-ink-muted">
          The upload link you followed is invalid or has been revoked. Please
          contact your loan specialist for a new one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1 rounded-[8px] border border-line bg-panel px-4 py-2 text-[13px] text-ink hover:bg-bg"
        >
          Back to Northline
        </Link>
      </main>
    );
  }

  const documents = await getLeadDocuments(lead.id);
  const firstName = lead.name.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
      <RealtimeLeads leadId={lead.id} />

      <header className="mb-8">
        <div className="font-mono text-[11px] tracking-[2px] text-ink-muted uppercase">
          Northline
        </div>
        <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.4px]">
          Hi {firstName} — let&apos;s verify a few things.
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-muted">
          Upload a recent payslip, a government-issued ID, and a recent bank
          statement. Each file should be a PDF, up to 10 MB. Our AI reviews
          them in seconds — you&apos;ll see the extracted details below and can
          fix anything that&apos;s wrong.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-[6px] text-[12px] text-ink-muted">
          <ShieldCheck className="size-[13px]" />
          Encrypted upload · Only your loan specialist can view these files
        </div>
      </header>

      <section className="mb-8">
        <SectionTitle>Upload a document</SectionTitle>
        <DocumentsCard leadId={lead.id} mode="lead" token={token} />
      </section>

      <section>
        <div className="mb-[10px] flex items-baseline justify-between">
          <SectionTitle className="mb-0">Your documents</SectionTitle>
          <div className="font-mono text-[12px] text-ink-muted">
            {documents.length} uploaded
          </div>
        </div>
        <DocumentsList documents={documents} mode="lead" token={token} />
      </section>

      <footer className="mt-12 border-t border-line pt-5 text-[12px] text-ink-muted">
        Need help? Reply to the email or text we sent you and your specialist
        will get back to you.
      </footer>
    </main>
  );
}
