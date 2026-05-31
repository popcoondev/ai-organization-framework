const HIGH_STAKES_PATTERNS = [
  /security/i,
  /auth/i,
  /payment/i,
  /legal/i,
  /privacy/i,
  /個人情報/,
  /認証/,
  /決済/,
  /法規/,
  /安全/
];

const BROWNFIELD_PATTERNS = [
  /existing/i,
  /current/i,
  /improve/i,
  /optimize/i,
  /refactor/i,
  /既存/,
  /現行/,
  /改善/,
  /改修/,
  /リファクタ/
];

function hasPattern(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasConfiguredTerm(terms, text) {
  const normalizedText = text.toLowerCase();
  return terms.some((term) => normalizedText.includes(term.toLowerCase()));
}

function resolveClarificationConfig(template) {
  const config = template.organization.clarification ?? {};
  return {
    useDefaultHighStakesPatterns: config.use_default_high_stakes_patterns !== false,
    useDefaultBrownfieldPatterns: config.use_default_brownfield_patterns !== false,
    highStakesTerms: Array.isArray(config.high_stakes_terms) ? config.high_stakes_terms : [],
    brownfieldTerms: Array.isArray(config.brownfield_terms) ? config.brownfield_terms : []
  };
}

const CLARIFICATION_COPY = {
  ja: {
    gapSummaries: {
      need: "解決したい本質的な need がまだ十分に特定されていません。",
      intent: "実現したい方向性がまだ明確ではありません。",
      context: "制約、対象範囲、現状などの context が不足しています。",
      success: "成功判定に必要な基準が未定義です。",
      prohibited: "変更してはいけない条件や非交渉事項が明示されていません。",
      brownfield: "既存の実装や運用を前提にしている可能性がありますが、引き継ぐべき現状情報が不足しています。",
      highStakes: "高リスク領域に関わる可能性があり、安全に仮定だけで進めることができません。"
    },
    questions: {
      scope: "今回、何を改善対象とし、どの範囲までを扱いますか",
      success: "改善成功は、どの指標または状態で判断しますか",
      prohibited: "今回、変更してはいけない制約や既存要素はありますか",
      brownfield: "現行の実装や運用で、今回の判断に必ず引き継ぐべき前提はありますか",
      highStakes: "安全性、法規制、認証、個人情報の観点で絶対に外せない条件はありますか"
    },
    rationales: {
      scope: "主要な対象を定め、扱う範囲を実行可能な大きさに絞るために必要です。",
      success: "下流の planning に入る前に、成功条件を明確にする必要があります。",
      prohibited: "危険な解釈を避けるため、非交渉条件と変更禁止条件が必要です。",
      brownfield: "既存案件に見えるため、引き継ぐ制約や前提を早い段階で回収する必要があります。",
      highStakes: "高リスク要素があるため、安全性に関わる条件を最初に明確化する必要があります。"
    },
    nextStopWait: "ユーザー回答または明示的な assumption を待つ",
    summaryInitialQuestions: "runtime は初回の clarification gap を特定し、1 回目の質問を生成しました",
    summaryNoQuestions: "runtime は直ちに聞くべき clarification question を見つけませんでした"
  },
  en: {
    gapSummaries: {
      need: "The underlying need is not specific enough yet.",
      intent: "The intended direction is not yet explicit.",
      context: "Key constraints, scope, and current conditions are missing.",
      success: "Success cannot be evaluated yet.",
      prohibited: "Forbidden changes or non-negotiables are not explicit.",
      brownfield: "The request likely refers to an existing flow or system, but current-state context is incomplete.",
      highStakes: "The request touches a potentially high-stakes domain and cannot safely rely on assumptions."
    },
    questions: {
      scope: "What exactly should be improved, and what scope should this effort cover?",
      success: "How should improvement success be judged: which metric or end state matters most?",
      prohibited: "Are there any constraints, existing elements, or non-negotiables that must not be changed?",
      brownfield: "In the current implementation or operation, what context must be carried forward into this decision?",
      highStakes: "For safety, legal, authentication, or personal-data concerns, what conditions are absolutely non-negotiable?"
    },
    rationales: {
      scope: "This frames the primary target and narrows the request into a workable scope.",
      success: "Success criteria are currently missing and are required before downstream planning.",
      prohibited: "Non-negotiables and prohibited conditions are needed to avoid unsafe interpretation.",
      brownfield: "The request appears brownfield, so inherited constraints should be captured early.",
      highStakes: "High-stakes risk is present, so safety-critical constraints must be clarified first."
    },
    nextStopWait: "wait for user answers or explicit assumptions before framing",
    summaryInitialQuestions: "runtime identified initial clarification gaps and generated first-round user questions",
    summaryNoQuestions: "runtime found no immediate clarification questions"
  }
};

function resolveClarificationLocale(template) {
  const requested = template.organization.language ?? "ja";
  return CLARIFICATION_COPY[requested] ? requested : "ja";
}

function makeGap(dimension, status, triggerClass, summary) {
  return { dimension, status, trigger_class: triggerClass, summary };
}

function makeQuestion(question, rationale, triggerClass, targetFields) {
  return {
    question,
    rationale,
    trigger_class: triggerClass,
    target_fields: targetFields
  };
}

export function deriveInitialClarification(request, template) {
  const text = request.trim();
  const config = resolveClarificationConfig(template);
  const highStakes = (
    (config.useDefaultHighStakesPatterns && hasPattern(HIGH_STAKES_PATTERNS, text)) ||
    hasConfiguredTerm(config.highStakesTerms, text)
  );
  const likelyBrownfield = (
    (config.useDefaultBrownfieldPatterns && hasPattern(BROWNFIELD_PATTERNS, text)) ||
    hasConfiguredTerm(config.brownfieldTerms, text)
  );
  const copy = CLARIFICATION_COPY[resolveClarificationLocale(template)];

  const dimensions = {
    need_clarity: "partial",
    intent_clarity: "partial",
    context_completeness: "missing",
    success_criteria_clarity: "missing",
    prohibited_conditions_clarity: "partial",
    governance_scope_clarity: template.workflow.default_governance_scope ? "clear" : "partial",
    brownfield_orientation_completeness: likelyBrownfield ? "partial" : "clear",
    risk_exposure: highStakes ? "conflicting" : "partial"
  };

  const gaps = [
    makeGap("need_clarity", "partial", "ambiguity", copy.gapSummaries.need),
    makeGap("intent_clarity", "partial", "ambiguity", copy.gapSummaries.intent),
    makeGap("context_completeness", "missing", "missing-constraint", copy.gapSummaries.context),
    makeGap("success_criteria_clarity", "missing", "missing-success-criteria", copy.gapSummaries.success),
    makeGap("prohibited_conditions_clarity", "partial", "missing-prohibition", copy.gapSummaries.prohibited)
  ];

  if (likelyBrownfield) {
    gaps.push(
      makeGap(
        "brownfield_orientation_completeness",
        "partial",
        "brownfield-gap",
        copy.gapSummaries.brownfield
      )
    );
  }

  if (highStakes) {
    gaps.push(
      makeGap(
        "risk_exposure",
        "conflicting",
        "high-stakes-risk",
        copy.gapSummaries.highStakes
      )
    );
  }

  const questions = [
    makeQuestion(
      copy.questions.scope,
      copy.rationales.scope,
      "missing-constraint",
      ["need", "context"]
    ),
    makeQuestion(
      copy.questions.success,
      copy.rationales.success,
      "missing-success-criteria",
      ["success_criteria", "intent"]
    ),
    makeQuestion(
      copy.questions.prohibited,
      copy.rationales.prohibited,
      "missing-prohibition",
      ["context", "prohibited_conditions"]
    )
  ];

  if (likelyBrownfield) {
    questions.push(
      makeQuestion(
        copy.questions.brownfield,
        copy.rationales.brownfield,
        "brownfield-gap",
        ["background_or_prior_decisions", "context"]
      )
    );
  }

  if (highStakes) {
    questions.unshift(
      makeQuestion(
        copy.questions.highStakes,
        copy.rationales.highStakes,
        "high-stakes-risk",
        ["prohibited_conditions", "context", "risk_exposure"]
      )
    );
  }

  const initialQuestionBudget = 3;
  const pendingQuestions = questions.slice(0, initialQuestionBudget);

  return {
    dimensions,
    gaps,
    pending_questions: pendingQuestions,
    asked_questions: [],
    question_rationale: pendingQuestions.map((item) => item.rationale),
    trigger_classes: pendingQuestions.map((item) => item.trigger_class),
    target_fields: pendingQuestions.map((item) => item.target_fields),
    user_answers: [],
    assumptions: [],
    ask_or_assume_decision: "ask",
    remaining_gaps: gaps.map((gap) => gap.summary),
    unresolved_ambiguity: gaps.map((gap) => gap.summary),
    question_budget: {
      initial_question_budget: initialQuestionBudget,
      followup_budget: 2,
      max_rounds: 3
    },
    next_stop_condition: copy.nextStopWait,
    clarification_summary:
      pendingQuestions.length > 0
        ? copy.summaryInitialQuestions
        : copy.summaryNoQuestions,
    should_wait_for_user: pendingQuestions.length > 0
  };
}
