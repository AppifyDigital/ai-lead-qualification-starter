export type LeadStage = "New" | "Contacted" | "Qualified" | "In review";

export type Language = "English" | "Spanish" | "Korean" | "German" | "Mandarin";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  zip: string;
  amount: number;
  termMonths: number;
  language: Language;
  purpose: string;
  stage: LeadStage;
  score: number;
  assigneeId: string | null;
  receivedAt: string;
  isNew?: boolean;
};

export type MemberStatus = "available" | "on-call" | "away" | "offline";

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  languages: Language[];
  activeLeads: number;
  status: MemberStatus;
};

export type TranscriptLine = {
  t: number;
  who: "agent" | "user";
  text: string;
};

export type ExtractedCallData = {
  confirmedAmount: number | null;
  repaymentPeriodMonths: number | null;
  employmentStatus: string | null;
  loanPurpose: string | null;
  qualificationScore: number;
  recommendedNextAction: string;
  estimatedIncome: string | null;
};

export type LeadCall = {
  leadId: string;
  durationSec: number;
  language: Language;
  summary: string;
  summaryTail: string;
  estimatedIncome: string;
  transcript: TranscriptLine[];
  extracted?: ExtractedCallData | null;
};

export type RoutingDecision = {
  leadId: string;
  assigneeId: string | null;
  reasoning: string;
  createdAt: string;
};
