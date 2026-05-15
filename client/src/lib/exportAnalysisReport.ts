import { API_URL, authorizedFetch } from "./api";
export const exportAnalysisReport = async (analysisId: number) => {
  const response = await authorizedFetch(`${API_URL}/resume/export-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ analysisId }),
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
