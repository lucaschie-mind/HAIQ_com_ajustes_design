import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface LogEntry { role: string; content: string; sequenceNumber: number; }
interface PostTestData {
  blockA: Record<string, number>;
  blockB: Record<string, number>;
  blockC: Record<string, number>;
  blockD: Record<string, number>;
}

export interface EvaluationResult {
  d1Score: number; d2Score: number; d3Score: number; d4Score: number; haiqScore: number;
  humanAgencyPct: number; agencyClass: string;
  d1Parecer: string; d2Parecer: string; d3Parecer: string; d4Parecer: string;
  contextNote?: string;
  gaps: { dimension: string; label: string; signal: string; interviewerInsight: string; questions: string[]; }[];
  interviewQs: { dimension: string; tag: string; question: string; }[];
  rawEvidence: unknown;
  evaluationPath: string;
}

function avgBlock(b: Record<string, number>): string {
  const v = Object.values(b || {});
  return v.length ? (v.reduce((a, x) => a + x, 0) / v.length).toFixed(1) : "N/A";
}

async function extractEvidence(logs: LogEntry[], caseId: string, post: PostTestData, finalOutput: string): Promise<unknown> {
  const logText = logs.map(l => `[${l.role}] turno ${l.sequenceNumber}: ${l.content}`).join("\n\n");
  const thirds = Math.max(1, Math.floor(logs.length / 3));
  const opening = logs.slice(0, thirds).filter(l => l.role === "CANDIDATE").map(l => `[${l.sequenceNumber}]: ${l.content.slice(0, 300)}`).join("\n");
  const closing = logs.slice(-thirds).filter(l => l.role === "CANDIDATE").map(l => `[${l.sequenceNumber}]: ${l.content.slice(0, 300)}`).join("\n");

  const prompt = `You are a behavioral analyst for HAI-Q assessment (case ${caseId}).
Analyze this interaction log and extract structured evidence. Output ONLY valid JSON, no markdown.

## LOG
${logText}

## FINAL OUTPUT FROM CANDIDATE
${finalOutput || "(infer from last messages)"}

## POST-TEST AVERAGES
Block A (AI experience): ${avgBlock(post.blockA)}/5
Block B (session perception): ${avgBlock(post.blockB)}/5
Block C (anxiety/comfort): ${avgBlock(post.blockC)}/5
Block D (relevance): ${avgBlock(post.blockD)}/5

## OPENING CANDIDATE TURNS
${opening}

## CLOSING CANDIDATE TURNS
${closing}

Output this JSON:
{
  "log_stats": {"total_turns": 0, "candidate_turns": 0},
  "d1_evidence": {
    "delta_signal": "HIGH|MEDIUM|LOW|REVERSE",
    "domain_signal": "PRIOR_EXPERTISE|BUILT_DURING|UNCLEAR",
    "opening_quote": "<first notable candidate question>",
    "closing_quote": "<last or most sophisticated question>",
    "trajectory_summary": "<2-3 sentences in Portuguese>"
  },
  "d2_evidence": {
    "material_ai_errors_detected": 0,
    "candidate_contested": false,
    "contest_quote": null,
    "passive_acceptance_instances": 0,
    "productive_disagreement": false,
    "d2_testability": "FULL|PARTIAL|NOT_TESTABLE",
    "calibration_summary": "<2-3 sentences in Portuguese>"
  },
  "d3_evidence": {
    "appropriate_delegation_count": 0,
    "over_delegation_count": 0,
    "best_division_quote": null,
    "division_summary": "<2-3 sentences in Portuguese>"
  },
  "d4_evidence": {
    "uses_case_context": true,
    "non_obvious_elements": [],
    "final_output_summary": "<2-3 sentences in Portuguese>",
    "vs_expected": "ABOVE|WITHIN|BELOW"
  },
  "agency_index": {
    "human_origin_pct": 50,
    "ai_origin_pct": 50,
    "classification": "AI_LED|AI_DOMINANT|BALANCED|HUMAN_DOMINANT|HUMAN_LED",
    "interpretation": "<2-3 sentences in Portuguese>"
  },
  "posttest_flags": {
    "high_anxiety": false,
    "low_ai_experience": false,
    "notes": null
  }
}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function scoreAndReport(evidence: unknown, caseId: string, anxietyAvg: string) {
  const prompt = `You are a senior organizational psychologist scoring a HAI-Q assessment (case ${caseId}).

## EVIDENCE
${JSON.stringify(evidence, null, 2)}

## RUBRIC (scores in 0.5 steps from 1.0 to 4.0)

D1 — Grounded Investigation:
1=generic questions no progression | 2=some context use basic delta | 3=hypothesis-driven clear arc | 4=maps unknowns high delta
Rule: score = MAX(closing quality, delta magnitude)

D2 — Critical Calibration:
1=accepts all without filter | 2=flags obvious errors only | 3=detects contextual inadequacy redirects | 4=productive disagreement
Rule: if d2_testability=NOT_TESTABLE → minimum 2.5

D3 — Strategic Complementarity:
1=random delegation | 2=delegates obvious only | 3=conscious distribution | 4=maximizes dyad
Rule: BALANCED agency → D3 3-4; AI_LED → D3 max 2

D4 — Creative Output:
1=generic template | 2=adequate contextualised | 3=one non-obvious element | 4=only possible through dyad
Rule: if AI_LED or AI_DOMINANT agency → D4 max 2.5

HAI-Q = (D1+D2+D3+D4)/4

Candidate anxiety avg: ${anxietyAvg}/5 (lower=more anxious, may suppress D1/D2)

Output ONLY valid JSON, no markdown:
{
  "scores": {"d1": 0, "d2": 0, "d3": 0, "d4": 0, "haiq": 0},
  "pareceres": {
    "d1": "<3-5 sentences Portuguese with specific behaviors>",
    "d2": "<3-5 sentences Portuguese>",
    "d3": "<3-5 sentences Portuguese>",
    "d4": "<3-5 sentences Portuguese>"
  },
  "context_note": null,
  "gaps": [
    {"dimension": "D1", "label": "<Portuguese>", "signal": "<Portuguese>", "interviewer_insight": "<Portuguese>", "questions": ["<Portuguese>", "<Portuguese>"]}
  ],
  "confirmatory_questions": [
    {"dimension": "D1", "tag": "<short>", "question": "<Portuguese>"}
  ]
}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 3500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function runEvaluation(logs: LogEntry[], caseId: string, post: PostTestData, finalOutput = ""): Promise<EvaluationResult> {
  const evidence = await extractEvidence(logs, caseId, post, finalOutput);
  const ev = evidence as Record<string, Record<string, unknown>>;
  const agency = ev.agency_index || {};
  const anxietyAvg = avgBlock(post.blockC);
  const scored = await scoreAndReport(evidence, caseId, anxietyAvg);

  return {
    d1Score: scored.scores.d1, d2Score: scored.scores.d2,
    d3Score: scored.scores.d3, d4Score: scored.scores.d4,
    haiqScore: scored.scores.haiq,
    humanAgencyPct: (agency.human_origin_pct as number) ?? 50,
    agencyClass: (agency.classification as string) ?? "BALANCED",
    d1Parecer: scored.pareceres.d1, d2Parecer: scored.pareceres.d2,
    d3Parecer: scored.pareceres.d3, d4Parecer: scored.pareceres.d4,
    contextNote: scored.context_note || undefined,
    gaps: (scored.gaps || []).map((g: Record<string, unknown>) => ({
      dimension: g.dimension as string, label: g.label as string,
      signal: g.signal as string, interviewerInsight: g.interviewer_insight as string,
      questions: g.questions as string[],
    })),
    interviewQs: (scored.confirmatory_questions || []).map((q: Record<string, unknown>) => ({
      dimension: q.dimension as string, tag: q.tag as string, question: q.question as string,
    })),
    rawEvidence: evidence,
    evaluationPath: "SIMPLIFIED_2_AGENT_V1",
  };
}
