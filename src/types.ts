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
  uploadToken?: string | null;
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

export type DocumentType = "payslip" | "id_document" | "bank_statement";

export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "failed"
  | "confirmed";

export type PayslipFields = {
  employer: string | null;
  grossMonthly: number | null;
  netMonthly: number | null;
  payPeriodStart: string | null;   // ISO date
  payPeriodEnd: string | null;
  employmentType: string | null;   // "full-time" | "part-time" | "contractor" | "self-employed" | ...
  currency: string | null;         // ISO 4217, e.g. "USD"
};

export type IdDocumentFields = {
  fullName: string | null;
  dateOfBirth: string | null;
  idDocumentType: string | null;   // "passport" | "national_id" | "drivers_license"
  documentNumber: string | null;
  expiryDate: string | null;
  nationality: string | null;
};

export type BankStatementFields = {
  accountHolder: string | null;
  bankName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  averageBalance: number | null;
  totalInflows: number | null;
  totalOutflows: number | null;
  currency: string | null;
};

export type ExtractedDocumentFields =
  | PayslipFields
  | IdDocumentFields
  | BankStatementFields;

export type LeadDocument = {
  id: string;
  leadId: string;
  docType: DocumentType;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  status: DocumentStatus;
  extractedFields: ExtractedDocumentFields | null;
  parseError: string | null;
  uploadedAt: string;
  parsedAt: string | null;
  confirmedAt: string | null;
};
