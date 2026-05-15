export type AnalysisMode = "full" | "degraded_market" | "no_market_profile";

export interface SkillMatchItem {
  skill: string;
  matchedWith?: string;
  category: string;
  source?: "required" | "preferred";
}

export interface SkillStats {
  matchedRequiredCount: number;
  matchedPreferredCount: number;
  requiredCount: number;
  preferredCount: number;
  irrelevantCount: number;
  resumeSkillCount: number;
  requiredCoverage: number;
  preferredCoverage: number;
  irrelevantRate: number;
  marketFitScore: number;
}

export interface SkillsComparison {
  matched: SkillMatchItem[];
  missingRequired: SkillMatchItem[];
  missingOptional: SkillMatchItem[];
  irrelevant: SkillMatchItem[];
  stats: SkillStats;
}

export interface StructureFeedbackItem {
  type: string;
  message: string;
  section: string;
}

export interface StructureAnalysis {
  score: number;
  feedback: StructureFeedbackItem[];
  atsScore: number;
  atsIssues: string[];
}

export interface TextAnalysis {
  score: number;
  feedback: StructureFeedbackItem[];
  rewriteOpportunities?: RewriteOpportunity[];
}

export type RewriteIssueType =
  | "cliche"
  | "weak_phrase"
  | "passive_voice"
  | "missing_metrics"
  | "long_sentence";

export interface RewriteOpportunity {
  id: string;
  issueType: RewriteIssueType;
  section: string;
  priority: string;
  priorityClass: string;
  title: string;
  description: string;
  formula: string;
  sourceText: string;
  sourceMessage: string;
  contextLabel?: string | null;
}

export interface RewriteSuggestion {
  text: string;
  whyItWorks: string;
}

export interface ParsedResume {
  position?: string | null;
  summary?: string | null;
  contact?: Record<string, string | null>;
  experience?: unknown[];
  education?: unknown[];
  skills?: {
    technical?: string[];
    soft?: string[];
    tools?: string[];
  };
  languages?: unknown[];
  certifications?: unknown[];
  projects?: unknown[];
}

export interface MarketData {
  vacancies?: MarketVacancy[];
  positionTitle: string | null;
  typicalExperience: string | null;
  commonRequirements: string[];
  trendingTechnologies: string[];
  marketInsights?: string | null;
  sampleSize?: number;
  sourceCount?: number;
  dedupeStats?: {
    duplicatesRemoved?: number;
    finalCount?: number;
  };
  sources?: string[];
}

export interface MarketVacancy {
  source: "dou" | "workua" | "robota";
  url: string;
  title: string | null;
}

export interface ResumeAnalysisResult {
  message: string;
  format: string;
  resumeQualityScore: number | null;
  overallScore: number | null;
  analysisMode: AnalysisMode;
  parsedResume: ParsedResume;
  structureAnalysis: StructureAnalysis | null;
  textAnalysis: TextAnalysis | null;
  marketData: MarketData | null;
  skillsComparison: SkillsComparison | null;
}

export interface ResumeAnalysisHistoryItem {
  id: number;
  analysisKind: string;
  sourceType: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  targetPosition: string | null;
  analysisMode: AnalysisMode | null;
  overallScore: number | null;
  resumeQualityScore: number | null;
  marketFitScore: number | null;
  resultSchemaVersion: number;
  createdAt: string;
}

export interface ResumeAnalysisHistoryRecord extends ResumeAnalysisHistoryItem {
  result: ResumeAnalysisResult;
}

export interface UploadAnalysisResponse extends ResumeAnalysisResult {
  historyEntry: ResumeAnalysisHistoryItem | null;
}
