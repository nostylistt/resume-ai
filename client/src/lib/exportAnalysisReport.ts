import { API_URL, authorizedFetch } from "./api";
import type { ResumeAnalysisResult } from "../types/analysis";

interface PdfExportPayload {
  position: string | null;
  analysisMode: ResumeAnalysisResult["analysisMode"];
  overallScore: number | null;
  resumeQualityScore: number | null;
  marketFitScore: number | null;
  requiredCoverage: number | null;
  structureScore: number | null;
  atsScore: number | null;
  textScore: number | null;
  matchedRequiredCount: number;
  requiredCount: number;
}

const buildExportPayload = (analysisResult: ResumeAnalysisResult): PdfExportPayload => ({
  position: analysisResult.marketData?.positionTitle || analysisResult.parsedResume.position || null,
  analysisMode: analysisResult.analysisMode,
  overallScore: analysisResult.overallScore,
  resumeQualityScore: analysisResult.resumeQualityScore,
  marketFitScore: analysisResult.skillsComparison?.stats.marketFitScore ?? null,
  requiredCoverage: analysisResult.skillsComparison?.stats.requiredCoverage ?? null,
  structureScore: analysisResult.structureAnalysis?.score ?? null,
  atsScore: analysisResult.structureAnalysis?.atsScore ?? null,
  textScore: analysisResult.textAnalysis?.score ?? null,
  matchedRequiredCount: analysisResult.skillsComparison?.stats.matchedRequiredCount ?? 0,
  requiredCount: analysisResult.skillsComparison?.stats.requiredCount ?? 0,
});

export const exportAnalysisReport = async (analysisResult: ResumeAnalysisResult) => {
  const response = await authorizedFetch(`${API_URL}/resume/export-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildExportPayload(analysisResult)),
  });

  if (!response.ok) {
    let message = "Не вдалося згенерувати PDF.";

    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) {
        message = data.message;
      }
    } catch {
      // Ignore JSON parsing failure for binary/error bodies.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const fileName = `resumatch-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
};
