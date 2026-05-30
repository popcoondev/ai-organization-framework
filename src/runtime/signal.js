import fs from "node:fs/promises";

function nowIso() {
  return new Date().toISOString();
}

function normalizeReviewLevel(signal) {
  return signal.required_review_level ?? "context-only";
}

function requiresDeepPath(reviewLevel) {
  return [
    "context-and-intent-review",
    "context-intent-need-review",
    "full-council-review",
    "high-risk-review"
  ].includes(reviewLevel);
}

function resolveRoutingModeForReopen(session, signal) {
  const currentMode = session.routing_mode ?? "deep-path";
  const reviewLevel = normalizeReviewLevel(signal);
  const nextMode = currentMode === "fast-track" && requiresDeepPath(reviewLevel)
    ? "deep-path"
    : currentMode;

  return {
    previousRoutingMode: currentMode,
    nextRoutingMode: nextMode,
    routingEscalated: currentMode !== nextMode,
    reviewLevel
  };
}

function makeSignalQuestion(signal) {
  const summary = signal.signal_summary ?? signal.summary ?? "external signal";
  return {
    question: `外部変化「${summary}」によって、何を再評価すべきですか`,
    rationale: "A reopen from signal should explicitly capture what changed in scope, constraints, or intent.",
    trigger_class: "external-signal",
    target_fields: ["context", "intent", "need"]
  };
}

export async function loadSignal(signalPath) {
  const text = await fs.readFile(signalPath, "utf8");
  return JSON.parse(text);
}

export function applySignalToSession(session, signal, signalPath) {
  const signalId = signal.signal_id ?? signal.signalId ?? "signal";
  const signalSummary = signal.signal_summary ?? signal.summary ?? "external signal";
  const signalRef = signalPath ?? signalId;
  const existingRefs = session.signal_refs ?? [];
  const existingRoundCount = session.clarification?.round_count ?? 0;
  const pendingQuestion = makeSignalQuestion(signal);
  const updatedAt = nowIso();
  const routingResolution = resolveRoutingModeForReopen(session, signal);

  return {
    ...session,
    status: "reopened",
    current_stage: "clarification",
    routing_mode: routingResolution.nextRoutingMode,
    signal_refs: [...existingRefs, signalRef],
    clarification: {
      ...(session.clarification ?? {}),
      round_count: existingRoundCount + 1,
      pending_questions: [pendingQuestion],
      question_rationale: [pendingQuestion.rationale],
      trigger_classes: ["external-signal"],
      target_fields: [pendingQuestion.target_fields],
      remaining_gaps: [
        `External signal requires re-evaluation: ${signalSummary}`
      ],
      unresolved_ambiguity: [
        `External signal requires re-evaluation: ${signalSummary}`
      ],
      next_stop_condition: "capture reopen clarification before reframing",
      clarification_summary: `runtime reopened the session from external signal: ${signalSummary}`,
      should_wait_for_user: true
    },
    updated_at: updatedAt,
    reopen_context: {
      signal_id: signalId,
      signal_summary: signalSummary,
      affected_scope: signal.affected_scope ?? null,
      required_review_level: routingResolution.reviewLevel,
      impact_guess: signal.impact_guess ?? null,
      previous_routing_mode: routingResolution.previousRoutingMode,
      next_routing_mode: routingResolution.nextRoutingMode,
      routing_escalated: routingResolution.routingEscalated,
      reopened_at: updatedAt
    }
  };
}
