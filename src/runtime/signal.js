import fs from "node:fs/promises";
import { nowIso } from "./utils.js";

function normalizeReviewLevel(signal) {
  return signal.required_review_level ?? "context-only";
}

function isContextOnlyReview(reviewLevel) {
  return reviewLevel === "context-only";
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

function buildSignalContext(session, signal, routingResolution, updatedAt, disposition) {
  return {
    signal_id: signal.signal_id ?? signal.signalId ?? "signal",
    signal_summary: signal.signal_summary ?? signal.summary ?? "external signal",
    affected_scope: signal.affected_scope ?? null,
    required_review_level: routingResolution.reviewLevel,
    impact_guess: signal.impact_guess ?? null,
    previous_routing_mode: routingResolution.previousRoutingMode,
    next_routing_mode: routingResolution.nextRoutingMode,
    routing_escalated: routingResolution.routingEscalated,
    disposition,
    applied_at: updatedAt
  };
}

function appendContextNote(existing, signalSummary, affectedScope, locale = "ja") {
  const scopeSuffix = affectedScope ? ` [scope=${affectedScope}]` : "";
  const note = locale === "en"
    ? `External signal noted: ${signalSummary}${scopeSuffix}`
    : `外部 signal を反映: ${signalSummary}${scopeSuffix}`;

  if (!existing) {
    return note;
  }

  if (existing.includes(note)) {
    return existing;
  }

  return `${existing} | ${note}`;
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
  const affectedScope = signal.affected_scope ?? null;
  const signalRef = signalPath ?? signalId;
  const existingRefs = session.signal_refs ?? [];
  const existingRoundCount = session.clarification?.round_count ?? 0;
  const pendingQuestion = makeSignalQuestion(signal);
  const updatedAt = nowIso();
  const routingResolution = resolveRoutingModeForReopen(session, signal);
  const locale = session.organization?.language === "en" ? "en" : "ja";
  const signalContext = buildSignalContext(session, signal, routingResolution, updatedAt, isContextOnlyReview(routingResolution.reviewLevel) ? "context-updated" : "reopened");

  if (isContextOnlyReview(routingResolution.reviewLevel)) {
    return {
      ...session,
      routing_mode: routingResolution.nextRoutingMode,
      signal_refs: [...existingRefs, signalRef],
      framing: session.framing
        ? {
            ...session.framing,
            active_context: appendContextNote(session.framing.active_context, signalSummary, affectedScope, locale)
          }
        : session.framing,
      clarification: session.framing
        ? session.clarification
        : {
            ...(session.clarification ?? {}),
            assumptions: [
              ...(session.clarification?.assumptions ?? []),
              appendContextNote("", signalSummary, affectedScope, locale)
            ],
            clarification_summary: appendContextNote(session.clarification?.clarification_summary ?? "", signalSummary, affectedScope, locale)
          },
      updated_at: updatedAt,
      signal_context: signalContext
    };
  }

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
    signal_context: signalContext,
    reopen_context: {
      signal_id: signalId,
      signal_summary: signalSummary,
      affected_scope: affectedScope,
      required_review_level: routingResolution.reviewLevel,
      impact_guess: signal.impact_guess ?? null,
      previous_routing_mode: routingResolution.previousRoutingMode,
      next_routing_mode: routingResolution.nextRoutingMode,
      routing_escalated: routingResolution.routingEscalated,
      reopened_at: updatedAt
    }
  };
}
