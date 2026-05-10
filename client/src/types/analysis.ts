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
