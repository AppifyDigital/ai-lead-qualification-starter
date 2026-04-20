import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { StagePill } from "@/components/admin/stage-pill";
import { StatusDot } from "@/components/admin/status-dot";
import { ScoreRing } from "@/components/admin/score-ring";
import { SectionTitle } from "@/components/admin/section-title";
import { Facts } from "@/components/admin/facts";
import { Transcript } from "@/components/admin/transcript";
import { getLeadById, getLeadCall, getMemberById, getTeam } from "@/lib/data";
import { formatAmount, formatRelative } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  return {
    title: lead ? `${lead.name} · Northline Admin` : "Lead · Northline Admin",
  };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const [assignee, call, team] = await Promise.all([
    getMemberById(lead.assigneeId),
    getLeadCall(lead.id),
    getTeam(),
  ]);

  const callDuration = call
    ? `${Math.floor(call.durationSec / 60)}:${String(call.durationSec % 60).padStart(2, "0")}`
    : "—";

  const availableMatching = team.filter(
    (m) =>
      m.status === "available" &&
      m.languages.includes(lead.language) &&
      m.id !== lead.assigneeId
  );

  return (
    <div className="grid h-screen grid-cols-[220px_1fr] overflow-hidden bg-bg text-ink">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-col">
        {/* Breadcrumb bar */}
        <div className="flex items-center justify-between border-b border-line bg-bg px-8 py-[14px]">
          <nav className="flex items-center gap-[10px] text-[12px] text-ink-muted">
            <Link href="/admin" className="hover:text-ink">
              Leads
            </Link>
            <ChevronRight className="size-[12px]" />
            <span className="text-ink">{lead.name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-[7px] border border-line bg-panel px-3 py-[7px] text-[13px] text-ink"
            >
              Reassign
            </button>
            <button
              type="button"
              className="rounded-[7px] bg-ink px-[14px] py-[7px] text-[13px] font-medium text-bg"
            >
              Approve &amp; contact
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px] overflow-hidden">
          {/* Main */}
          <div className="min-h-0 overflow-y-auto px-9 pt-7 pb-10">
            {/* Header */}
            <div className="mb-7 flex items-start justify-between">
              <div>
                <div className="font-mono text-[11px] tracking-[1px] text-ink-muted uppercase">
                  LEAD · {formatRelative(lead.receivedAt)}
                </div>
                <h1 className="my-[4px] mb-[6px] text-[32px] font-semibold tracking-[-0.7px]">
                  {lead.name}
                </h1>
                <div className="flex items-center gap-[10px]">
                  <StagePill stage={lead.stage} />
                  <span className="text-[13px] text-ink-muted">
                    Score{" "}
                    <span className="font-mono font-medium text-ink">
                      {lead.score}
                    </span>
                    {" "}/ 100
                  </span>
                  {call && (
                    <>
                      <span className="text-[13px] text-ink-muted">·</span>
                      <span className="text-[13px] text-ink-muted">
                        Call duration{" "}
                        <span className="font-mono text-ink">
                          {callDuration}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ScoreRing score={lead.score} />
            </div>

            {/* AI summary */}
            <section className="mb-9">
              <SectionTitle>AI summary</SectionTitle>
              {call ? (
                <div className="rounded-[12px] border border-line bg-panel p-[18px] text-[14.5px] leading-[1.55] text-pretty">
                  <p className="m-0 mb-[10px]">{call.summary}</p>
                  <p className="m-0 text-ink-muted">{call.summaryTail}</p>
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-line bg-panel p-[18px] text-[13.5px] text-ink-muted">
                  No AI summary available — lead has not completed a qualification call yet.
                </div>
              )}
            </section>

            {/* Transcript */}
            <section>
              <div className="mb-[10px] flex items-baseline justify-between">
                <SectionTitle className="mb-0">Call transcript</SectionTitle>
                {call && (
                  <div className="font-mono text-[12px] text-ink-muted">
                    {call.transcript.length} exchanges · {callDuration}
                  </div>
                )}
              </div>
              {call ? (
                <Transcript lines={call.transcript} userLabel={lead.name.split(" ")[0]} />
              ) : (
                <div className="rounded-[12px] border border-dashed border-line bg-panel p-6 text-center text-[13px] text-ink-muted">
                  No transcript recorded.
                </div>
              )}
            </section>
          </div>

          {/* Right rail */}
          <aside className="overflow-y-auto border-l border-line bg-panel px-6 py-7">
            {/* Assignee */}
            <div className="mb-7">
              <SectionTitle small>Assigned to</SectionTitle>
              {assignee ? (
                <>
                  <div className="flex items-center gap-3 rounded-[10px] border border-line bg-bg p-3">
                    <div className="grid size-9 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">
                      {assignee.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px] font-medium">
                        {assignee.name}
                      </div>
                      <div className="text-[11.5px] text-ink-muted">
                        {assignee.role}
                      </div>
                    </div>
                    <StatusDot status={assignee.status} />
                  </div>
                  <div className="mt-2 text-[11.5px] leading-[1.5] text-ink-muted">
                    Matched on language ({lead.language}) · {assignee.activeLeads} active · {assignee.status}
                  </div>
                </>
              ) : (
                <div className="rounded-[10px] border border-dashed border-line bg-bg p-3 text-[12.5px] text-ink-muted">
                  Unassigned — {availableMatching.length} available{" "}
                  {lead.language}-speaking rep
                  {availableMatching.length === 1 ? "" : "s"}
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="mb-7">
              <SectionTitle small>Contact</SectionTitle>
              <Facts
                items={[
                  { label: "Name", value: lead.name },
                  { label: "Phone", value: lead.phone, mono: true },
                  { label: "Email", value: lead.email },
                  { label: "ZIP", value: lead.zip, mono: true },
                ]}
              />
            </div>

            {/* Qualification */}
            <div>
              <SectionTitle small>Qualification</SectionTitle>
              <Facts
                items={[
                  { label: "Amount", value: formatAmount(lead.amount), mono: true },
                  { label: "Term", value: `${lead.termMonths} months` },
                  { label: "Purpose", value: lead.purpose },
                  { label: "Language", value: lead.language },
                  ...(call
                    ? [
                        {
                          label: "Est. income",
                          value: call.estimatedIncome,
                          mono: true,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
