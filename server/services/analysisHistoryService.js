const pool = require('../config/db');

const ANALYSIS_KIND = 'resume_review';
const SOURCE_TYPE = 'resume_upload';
const RESULT_SCHEMA_VERSION = 1;

function mapHistoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    analysisKind: row.analysis_kind,
    sourceType: row.source_type,
    fileName: row.file_name,
    fileMimeType: row.file_mime_type,
    fileSizeBytes: row.file_size_bytes,
    targetPosition: row.target_position,
    analysisMode: row.analysis_mode,
    overallScore: row.overall_score,
    resumeQualityScore: row.resume_quality_score,
    marketFitScore: row.market_fit_score,
    resultSchemaVersion: row.result_schema_version,
    createdAt: row.created_at,
  };
}

async function saveResumeAnalysisSnapshot({ userId, file, analysisResult }) {
  const query = `
    INSERT INTO resume_analyses (
      user_id,
      analysis_kind,
      source_type,
      file_name,
      file_mime_type,
      file_size_bytes,
      target_position,
      analysis_mode,
      overall_score,
      resume_quality_score,
      market_fit_score,
      result_schema_version,
      analysis_payload
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
    RETURNING
      id,
      analysis_kind,
      source_type,
      file_name,
      file_mime_type,
      file_size_bytes,
      target_position,
      analysis_mode,
      overall_score,
      resume_quality_score,
      market_fit_score,
      result_schema_version,
      created_at
  `;

  const values = [
    userId,
    ANALYSIS_KIND,
    SOURCE_TYPE,
    file?.originalname || null,
    file?.mimetype || null,
    file?.size || null,
    analysisResult.parsedResume?.position || analysisResult.marketData?.positionTitle || null,
    analysisResult.analysisMode || null,
    analysisResult.overallScore ?? null,
    analysisResult.resumeQualityScore ?? null,
    analysisResult.skillsComparison?.stats?.marketFitScore ?? null,
    RESULT_SCHEMA_VERSION,
    JSON.stringify(analysisResult),
  ];

  const result = await pool.query(query, values);
  return mapHistoryRow(result.rows[0]);
}

async function listResumeAnalysisSummaries(userId, limit = 20) {
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  const result = await pool.query(
    `
      SELECT
        id,
        analysis_kind,
        source_type,
        file_name,
        file_mime_type,
        file_size_bytes,
        target_position,
        analysis_mode,
        overall_score,
        resume_quality_score,
        market_fit_score,
        result_schema_version,
        created_at
      FROM resume_analyses
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [userId, normalizedLimit]
  );

  return result.rows.map(mapHistoryRow);
}

async function getResumeAnalysisSnapshot(userId, analysisId) {
  const result = await pool.query(
    `
      SELECT
        id,
        analysis_kind,
        source_type,
        file_name,
        file_mime_type,
        file_size_bytes,
        target_position,
        analysis_mode,
        overall_score,
        resume_quality_score,
        market_fit_score,
        result_schema_version,
        analysis_payload,
        created_at
      FROM resume_analyses
      WHERE user_id = $1 AND id = $2
      LIMIT 1
    `,
    [userId, analysisId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...mapHistoryRow(row),
    result: row.analysis_payload,
  };
}

module.exports = {
  RESULT_SCHEMA_VERSION,
  saveResumeAnalysisSnapshot,
  listResumeAnalysisSummaries,
  getResumeAnalysisSnapshot,
};
