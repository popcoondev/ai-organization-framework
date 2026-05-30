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
  const highStakes = hasPattern(HIGH_STAKES_PATTERNS, text);
  const likelyBrownfield = hasPattern(BROWNFIELD_PATTERNS, text);

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
    makeGap("need_clarity", "partial", "ambiguity", "The underlying need is not specific enough yet."),
    makeGap("intent_clarity", "partial", "ambiguity", "The intended direction is not yet explicit."),
    makeGap("context_completeness", "missing", "missing-constraint", "Key constraints, scope, and current conditions are missing."),
    makeGap("success_criteria_clarity", "missing", "missing-success-criteria", "Success cannot be evaluated yet."),
    makeGap("prohibited_conditions_clarity", "partial", "missing-prohibition", "Forbidden changes or non-negotiables are not explicit.")
  ];

  if (likelyBrownfield) {
    gaps.push(
      makeGap(
        "brownfield_orientation_completeness",
        "partial",
        "brownfield-gap",
        "The request likely refers to an existing flow or system, but current-state context is incomplete."
      )
    );
  }

  if (highStakes) {
    gaps.push(
      makeGap(
        "risk_exposure",
        "conflicting",
        "high-stakes-risk",
        "The request touches a potentially high-stakes domain and cannot safely rely on assumptions."
      )
    );
  }

  const questions = [
    makeQuestion(
      "今回、何を改善対象とし、どの範囲までを扱いますか",
      "This frames the primary target and narrows the request into a workable scope.",
      "missing-constraint",
      ["need", "context"]
    ),
    makeQuestion(
      "改善成功は、どの指標または状態で判断しますか",
      "Success criteria are currently missing and are required before downstream planning.",
      "missing-success-criteria",
      ["success_criteria", "intent"]
    ),
    makeQuestion(
      "今回、変更してはいけない制約や既存要素はありますか",
      "Non-negotiables and prohibited conditions are needed to avoid unsafe interpretation.",
      "missing-prohibition",
      ["context", "prohibited_conditions"]
    )
  ];

  if (likelyBrownfield) {
    questions.push(
      makeQuestion(
        "現行の実装や運用で、今回の判断に必ず引き継ぐべき前提はありますか",
        "The request appears brownfield, so inherited constraints should be captured early.",
        "brownfield-gap",
        ["background_or_prior_decisions", "context"]
      )
    );
  }

  if (highStakes) {
    questions.unshift(
      makeQuestion(
        "安全性、法規制、認証、個人情報の観点で絶対に外せない条件はありますか",
        "High-stakes risk is present, so safety-critical constraints must be clarified first.",
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
    next_stop_condition: "wait for user answers or explicit assumptions before framing",
    clarification_summary:
      pendingQuestions.length > 0
        ? "runtime identified initial clarification gaps and generated first-round user questions"
        : "runtime found no immediate clarification questions",
    should_wait_for_user: pendingQuestions.length > 0
  };
}
