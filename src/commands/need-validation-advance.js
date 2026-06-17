import fs from "node:fs/promises";
import path from "node:path";

import { createFramingDecision } from "../runtime/decision.js";
import { recordRecentConfirmation, writeGoalProjection } from "../runtime/project-memory.js";
import { loadSession, promoteNeedValidationToPlanning } from "../runtime/session.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { validateWithBundledSchema } from "../runtime/validation.js";
import { withSessionMutationLock } from "../runtime/utils.js";

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function needValidationAdvanceCommand(options, deps = {}) {
  const sessionPath = path.resolve(options.session);
  const recordRecentConfirmationImpl = deps.recordRecentConfirmation ?? recordRecentConfirmation;
  const writeGoalProjectionImpl = deps.writeGoalProjection ?? writeGoalProjection;

  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    if (session.current_stage !== "need-validation" || session.status !== "framed") {
      throw new Error("Session is not waiting at the need validation gate.");
    }

    const projectRoot = path.resolve(path.dirname(sessionPath), "..", "..");
    const template = await loadTemplate(projectRoot);
    const needValidationRecordPath = path.resolve(options.needValidationRecord);
    const needValidationRecord = await loadJson(needValidationRecordPath);
    await validateWithBundledSchema(needValidationRecord, "aof-need-validation-record.schema.json", "need validation record");

    if (needValidationRecord.validation_status !== "validated" && needValidationRecord.validation_status !== "reframed") {
      throw new Error("Need validation record is not in an approvable state.");
    }
    if (needValidationRecord.authority_action !== "approve-project-charter") {
      throw new Error("Need validation record does not approve a project charter.");
    }
    if (needValidationRecord.project_creation_recommendation !== "create-project") {
      throw new Error("Need validation record does not authorize project creation.");
    }

    const projectCharterRef = options.projectCharterRef || needValidationRecord.project_charter_ref;
    if (!projectCharterRef) {
      throw new Error("A project charter ref is required to advance past need validation.");
    }
    const projectCharterPath = path.resolve(projectRoot, projectCharterRef);
    const projectCharter = await loadJson(projectCharterPath);
    await validateWithBundledSchema(projectCharter, "aof-project-charter.schema.json", "project charter");

    const planningDecision = await createFramingDecision({
      projectRoot,
      template,
      session
    });

    const artifactRefs = [
      path.relative(projectRoot, needValidationRecordPath).replaceAll("\\", "/"),
      projectCharterRef
    ];
    for (const ref of [
      needValidationRecord.problem_statement_ref,
      needValidationRecord.value_hypothesis_ref,
      needValidationRecord.alternative_analysis_ref,
      needValidationRecord.experiment_proposal_ref,
      needValidationRecord.discovery_handoff_ref
    ]) {
      if (ref) {
        artifactRefs.push(ref);
      }
    }

    const nextSession = await promoteNeedValidationToPlanning(session, {
      decisionId: planningDecision.decision_id,
      artifactRefs
    });

    const projection = await writeGoalProjectionImpl({
      projectRoot,
      goalType: "operating-goal",
      content: needValidationRecord.validated_need ?? session.framing?.need ?? session.trigger.request_payload,
      agreedWithHuman: true,
      sourceSessionId: nextSession.session_id,
      sourceDecisionRecordId: planningDecision.decision_id
    });

    const confirmation = await recordRecentConfirmationImpl({
      projectRoot,
      question: "need validation で何が確定したか",
      answer: needValidationRecord.decision_summary,
      expectationState: needValidationRecord.validation_status,
      mismatchState: null,
      scaleDirection: "advance toward planning",
      sourceSessionId: nextSession.session_id,
      sourceDecisionRecordId: planningDecision.decision_id
    });

    return {
      ok: true,
      sessionId: nextSession.session_id,
      status: nextSession.status,
      currentStage: nextSession.current_stage,
      decisionId: planningDecision.decision_id,
      decisionMarkdownPath: planningDecision.__markdown_path,
      decisionJsonPath: planningDecision.__json_path,
      needValidationRecordPath,
      projectCharterPath,
      projectMemory: {
        operatingGoalProjection: {
          ok: true,
          goalPath: projection.goalPath,
          content: projection.payload.content
        },
        confirmationResult: {
          ok: true,
          windowPath: confirmation.windowPath
        }
      }
    };
  });
}
