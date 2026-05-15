const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const RewriteOpportunitySchema = z.object({
  id: z.string(),
  issueType: z.enum(['cliche', 'weak_phrase', 'passive_voice', 'missing_metrics', 'long_sentence']),
  section: z.string(),
  priority: z.string(),
  priorityClass: z.string(),
  title: z.string(),
  description: z.string(),
  formula: z.string(),
  sourceText: z.string().min(12),
  sourceMessage: z.string(),
  contextLabel: z.string().nullable().optional(),
});

const RewriteBatchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      variants: z.array(
        z.object({
          text: z.string(),
          whyItWorks: z.string(),
        })
      ).min(2).max(3),
    })
  ),
});

async function improveWritingBatch({ opportunities, position = null }) {
  const parsedOpportunities = z.array(RewriteOpportunitySchema).min(1).max(20).parse(opportunities);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });

  const prompt = parsedOpportunities
    .map((opportunity, index) => {
      const lines = [
        `Opportunity ${index + 1}`,
        `id: ${opportunity.id}`,
        `originalText: ${opportunity.sourceText}`,
        `detectedIssue: ${opportunity.title}`,
        `whyFlagged: ${opportunity.sourceMessage}`,
        `rewriteGuidance: ${opportunity.description}`,
        `rewriteFormula: ${opportunity.formula}`,
      ];

      if (opportunity.contextLabel) {
        lines.push(`context: ${opportunity.contextLabel}`);
      }

      if (position) {
        lines.push(`targetPosition: ${position}`);
      }

      return lines.join('\n');
    })
    .join('\n\n---\n\n');

  const response = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You improve resume bullet points and short summary fragments. Rewrite only the provided fragments. Follow the detected issue and rewrite formula strictly. Preserve the original language of each fragment. Do not invent numbers, metrics, technologies, responsibilities, scope, timelines, or achievements that are not present in the original text. Keep output concise, ATS-friendly, and truthful.'
      },
      {
        role: 'user',
        content: `${prompt}\n\nFor each opportunity, generate 2 or 3 rewrite variants. Each variant must be a single polished resume line or short fragment, not a paragraph. Return results for every id exactly once.`
      }
    ],
    response_format: zodResponseFormat(RewriteBatchSchema, 'rewrite_batch'),
  });

  const parsed = response.choices[0].message.parsed;
  if (!parsed) {
    throw new Error('Failed to parse rewrite batch');
  }

  return parsed.items;
}

module.exports = {
  improveWritingBatch,
};
