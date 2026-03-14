import type { AssessmentAnswerValue } from "@/types/compliance";

export type AssessmentQuestionDomain = "administrative" | "technical" | "physical";

export type AssessmentQuestion = {
  id: string;
  domain: AssessmentQuestionDomain;
  prompt: string;
  guidance: string;
  weight: number;
  recommendationTitle: string;
  recommendationBody: string;
};

export type AssessmentTemplateDefinition = {
  slug: string;
  title: string;
  framework: string;
  version: number;
  description: string;
  questions: AssessmentQuestion[];
  maxScore: number;
};

export type AssessmentGap = {
  questionId: string;
  domain: AssessmentQuestionDomain;
  question: string;
  answer: AssessmentAnswerValue;
  priority: "high" | "medium";
  impact: string;
};

export type AssessmentRecommendation = {
  questionId: string;
  domain: AssessmentQuestionDomain;
  priority: "high" | "medium";
  title: string;
  action: string;
};

export type AssessmentDomainScore = {
  domain: AssessmentQuestionDomain;
  score: number;
  answered: number;
  possible: number;
};

export type AssessmentEvaluation = {
  score: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  summary: string;
  gaps: AssessmentGap[];
  recommendations: AssessmentRecommendation[];
  domainScores: AssessmentDomainScore[];
};

const ANSWER_MULTIPLIER: Record<AssessmentAnswerValue, number> = {
  yes: 1,
  partial: 0.5,
  no: 0
};

const DOMAIN_LABELS: Record<AssessmentQuestionDomain, string> = {
  administrative: "Administrative",
  technical: "Technical",
  physical: "Physical"
};

const HIPAA_BASELINE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "security-risk-analysis",
    domain: "administrative",
    prompt: "Has the organization completed and documented a current security risk analysis?",
    guidance: "Review the annual risk analysis artifact, scope, and remediation backlog.",
    weight: 5,
    recommendationTitle: "Establish a formal security risk analysis cadence",
    recommendationBody:
      "Complete a documented enterprise risk analysis and refresh it annually or after major system changes."
  },
  {
    id: "workforce-training",
    domain: "administrative",
    prompt: "Do workforce members complete HIPAA privacy and security training on a recurring basis?",
    guidance: "Verify onboarding training, annual refreshers, and completion evidence.",
    weight: 4,
    recommendationTitle: "Strengthen workforce training coverage",
    recommendationBody:
      "Assign recurring HIPAA security training, track completions, and remediate missed or overdue courses."
  },
  {
    id: "access-management",
    domain: "technical",
    prompt: "Are access requests, changes, and removals approved and logged through a defined process?",
    guidance: "Inspect joiner, mover, and leaver controls for systems handling ePHI.",
    weight: 5,
    recommendationTitle: "Tighten access provisioning controls",
    recommendationBody:
      "Require documented approvals, periodic access reviews, and timely deprovisioning for all workforce accounts."
  },
  {
    id: "audit-logging",
    domain: "technical",
    prompt: "Are system audit logs enabled, retained, and reviewed for systems storing or processing ePHI?",
    guidance: "Confirm log coverage, retention, alerting, and documented review procedures.",
    weight: 5,
    recommendationTitle: "Expand audit logging and review",
    recommendationBody:
      "Enable detailed audit trails, retain logs for the required period, and define a recurring review workflow."
  },
  {
    id: "encryption-controls",
    domain: "technical",
    prompt: "Is ePHI encrypted in transit and at rest across critical systems and backups?",
    guidance: "Validate transport encryption, storage encryption, and backup handling.",
    weight: 4,
    recommendationTitle: "Close encryption gaps",
    recommendationBody:
      "Apply encryption for databases, storage, backups, and data transfers where ePHI is present."
  },
  {
    id: "facility-access",
    domain: "physical",
    prompt: "Are facility access, workstation placement, and device protections enforced for areas handling ePHI?",
    guidance: "Check badge access, screen protections, clean desk controls, and device security.",
    weight: 3,
    recommendationTitle: "Improve physical safeguards",
    recommendationBody:
      "Restrict physical access to sensitive areas and document workstation and device protection requirements."
  },
  {
    id: "incident-response",
    domain: "administrative",
    prompt: "Does the organization maintain a tested incident response and breach notification process?",
    guidance: "Review the incident playbook, notification timelines, and tabletop exercise evidence.",
    weight: 4,
    recommendationTitle: "Formalize incident response readiness",
    recommendationBody:
      "Maintain a documented breach response plan and test it with periodic exercises."
  },
  {
    id: "vendor-management",
    domain: "administrative",
    prompt: "Are business associates risk assessed and covered by current Business Associate Agreements?",
    guidance: "Inspect vendor inventories, BAAs, and vendor review records.",
    weight: 3,
    recommendationTitle: "Reinforce business associate oversight",
    recommendationBody:
      "Maintain current BAAs, assess vendor risk, and document remediation expectations for high-risk vendors."
  }
];

export const DEFAULT_HIPAA_TEMPLATE: AssessmentTemplateDefinition = {
  slug: "hipaa-security-rule-baseline",
  title: "HIPAA Security Rule Baseline Assessment",
  framework: "hipaa",
  version: 1,
  description:
    "Baseline administrative, physical, and technical safeguard review for healthcare organizations.",
  questions: HIPAA_BASELINE_QUESTIONS,
  maxScore: HIPAA_BASELINE_QUESTIONS.reduce((sum, question) => sum + question.weight, 0)
};

export function formatAssessmentAnswerLabel(value: AssessmentAnswerValue) {
  switch (value) {
    case "yes":
      return "Compliant";
    case "partial":
      return "Partially compliant";
    case "no":
      return "Not compliant";
  }
}

export function getDefaultHipaaAssessmentTemplate() {
  return {
    ...DEFAULT_HIPAA_TEMPLATE,
    questions: DEFAULT_HIPAA_TEMPLATE.questions.map((question) => ({ ...question }))
  };
}

export function normalizeAssessmentQuestions(input: unknown): AssessmentQuestion[] {
  if (!Array.isArray(input)) {
    return getDefaultHipaaAssessmentTemplate().questions;
  }

  const normalized = input
    .map((question) => {
      if (!question || typeof question !== "object") {
        return null;
      }

      const record = question as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : null;
      const domain =
        record.domain === "administrative" ||
        record.domain === "technical" ||
        record.domain === "physical"
          ? record.domain
          : null;
      const prompt = typeof record.prompt === "string" ? record.prompt : null;
      const guidance = typeof record.guidance === "string" ? record.guidance : "";
      const weight = typeof record.weight === "number" ? record.weight : null;
      const recommendationTitle =
        typeof record.recommendation_title === "string"
          ? record.recommendation_title
          : typeof record.recommendationTitle === "string"
            ? record.recommendationTitle
            : null;
      const recommendationBody =
        typeof record.recommendation_body === "string"
          ? record.recommendation_body
          : typeof record.recommendationBody === "string"
            ? record.recommendationBody
            : null;

      if (!id || !domain || !prompt || !weight || !recommendationTitle || !recommendationBody) {
        return null;
      }

      return {
        id,
        domain,
        prompt,
        guidance,
        weight,
        recommendationTitle,
        recommendationBody
      } satisfies AssessmentQuestion;
    })
    .filter((question): question is AssessmentQuestion => question !== null);

  return normalized.length > 0 ? normalized : getDefaultHipaaAssessmentTemplate().questions;
}

export function evaluateAssessment(
  questions: AssessmentQuestion[],
  answers: Record<string, AssessmentAnswerValue>
): AssessmentEvaluation {
  const possible = questions.reduce((sum, question) => sum + question.weight, 0);
  let earned = 0;
  let compliantCount = 0;
  let partialCount = 0;
  let nonCompliantCount = 0;

  const gaps: AssessmentGap[] = [];
  const recommendations: AssessmentRecommendation[] = [];
  const domainAccumulator = new Map<
    AssessmentQuestionDomain,
    { earned: number; possible: number; answered: number }
  >();

  for (const question of questions) {
    const answer = answers[question.id];
    const multiplier = ANSWER_MULTIPLIER[answer];
    earned += question.weight * multiplier;

    const domainState = domainAccumulator.get(question.domain) ?? {
      earned: 0,
      possible: 0,
      answered: 0
    };
    domainState.earned += question.weight * multiplier;
    domainState.possible += question.weight;
    domainState.answered += 1;
    domainAccumulator.set(question.domain, domainState);

    if (answer === "yes") {
      compliantCount += 1;
      continue;
    }

    if (answer === "partial") {
      partialCount += 1;
    } else {
      nonCompliantCount += 1;
    }

    const priority: "high" | "medium" = answer === "no" || question.weight >= 5 ? "high" : "medium";
    const answerLabel = formatAssessmentAnswerLabel(answer).toLowerCase();

    gaps.push({
      questionId: question.id,
      domain: question.domain,
      question: question.prompt,
      answer,
      priority,
      impact: `${DOMAIN_LABELS[question.domain]} safeguards are currently ${answerLabel}.`
    });

    recommendations.push({
      questionId: question.id,
      domain: question.domain,
      priority,
      title: question.recommendationTitle,
      action: question.recommendationBody
    });
  }

  const domainScores = Array.from(domainAccumulator.entries())
    .map(([domain, values]) => ({
      domain,
      score: values.possible > 0 ? Math.round((values.earned / values.possible) * 100) : 0,
      answered: values.answered,
      possible: values.possible
    }))
    .sort((left, right) => left.domain.localeCompare(right.domain));

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  let summary = "The organization has not yet established a reliable HIPAA control baseline.";

  if (score >= 85) {
    summary = "The organization shows a strong HIPAA baseline with only limited remediation pressure.";
  } else if (score >= 70) {
    summary = "The organization has a workable HIPAA baseline, but several controls still need follow-through.";
  } else if (score >= 50) {
    summary = "The organization has material HIPAA gaps that should be scheduled into a formal remediation plan.";
  }

  if (nonCompliantCount >= 3) {
    summary += " Multiple controls are fully non-compliant and should be escalated.";
  }

  return {
    score,
    compliantCount,
    partialCount,
    nonCompliantCount,
    summary,
    gaps,
    recommendations,
    domainScores
  };
}
