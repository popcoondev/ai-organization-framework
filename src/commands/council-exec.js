import path from "node:path";
import { councilCommand } from "./council.js";
import { executeCouncilStage, executeCouncilStageWithModel } from "../runtime/council-execution.js";
import { updateDecisionRecordForEscalation } from "../runtime/decision.js";
import { recordRecentConfirmation } from "../runtime/project-memory.js";
import { loadTemplate } from "../runtime/template-loader.js";
import { appendCouncilExecutionRun, loadSession, markApprovalFailureEscalation } from "../runtime/session.js";
import { nowIso, withSessionMutationLock, writeJsonArtifact } from "../runtime/utils.js";

function deriveProjectRootFromSession(sessionPath) {
  return path.dirname(path.dirname(path.dirname(sessionPath)));
}

function toSeatMap(pairs = []) {
  return Object.fromEntries(
    pairs.map((pair) => {
      const [role, value] = pair.split("=", 2);
      return [role, value];
    })
  );
}

export async function councilExecCommand(options, deps = {}) {
  const recordRecentConfirmationImpl = deps.recordRecentConfirmation ?? recordRecentConfirmation;
  const sessionPath = path.resolve(options.session);
  return withSessionMutationLock(sessionPath, async () => {
    const session = await loadSession(sessionPath);
    const projectRoot = options.project
      ? path.resolve(options.project)
      : deriveProjectRootFromSession(sessionPath);
    const template = await loadTemplate(projectRoot);
    const execution = options.invokeModel
      ? await executeCouncilStageWithModel({
          template,
          session,
          stage: options.stage,
          includeOptional: options.includeOptional,
          roleOverride: options.role,
          modelConfig: {
            provider: options.provider,
            model: options.model,
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
            apiKeyEnv: options.apiKeyEnv,
            timeoutMs: options.timeoutMs,
            maxRetries: options.maxRetries,
            mockSeatDecisions: toSeatMap(options.mockSeatDecisions),
            mockSeatVetos: toSeatMap(options.mockSeatVetos),
            temperature: options.temperature
          }
        })
      : executeCouncilStage({
          template,
          session,
          stage: options.stage,
          includeOptional: options.includeOptional,
          roleOverride: options.role
        });
    let nextSession = await appendCouncilExecutionRun(session, execution);
    let escalation = null;
    if (execution.approval_outcome?.status === "rejected") {
      nextSession = await markApprovalFailureEscalation(nextSession, {
        executionRun: execution,
        escalationTarget: template.governance.escalation.target
      });
      escalation = nextSession.escalation;
      const decisionId = nextSession.open_decision_ids?.[0];
      if (decisionId) {
        await updateDecisionRecordForEscalation({
          projectRoot,
          template,
          decisionId,
          execution,
          escalation
        });
      }
    }
    const planSummary = await councilCommand(options);
    let confirmationResult = null;
    if (options.stage === "approval") {
      try {
        const question = "council approval で何が決まったか";
        const answer = execution.summary ?? `approval stage completed with status=${execution.approval_outcome?.status ?? "unknown"}`;
        const result = await recordRecentConfirmationImpl({
          projectRoot,
          question,
          answer,
          expectationState: execution.approval_outcome?.status ?? null,
          mismatchState: execution.approval_outcome?.status === "rejected"
            ? "council approval rejected the current slice and opened human escalation"
            : null,
          scaleDirection: execution.approval_outcome?.status === "approved"
            ? "proceed to outcome tracking or release closure"
            : "wait for human escalation resolution before continuing",
          sourceSessionId: nextSession.session_id,
          sourceDecisionRecordId: nextSession.open_decision_ids?.[0] ?? null
        });
        confirmationResult = {
          ok: true,
          windowPath: result.windowPath,
          question
        };
      } catch (error) {
        confirmationResult = {
          ok: false,
          error: error.message
        };
      }
    }

    const payload = {
      ok: true,
      sessionId: nextSession.session_id,
      stage: options.stage,
      executionId: execution.execution_id,
      executionStatus: execution.status,
      invokedModel: options.invokeModel,
      seatCount: execution.steps.length,
      summary: execution.summary,
      lastCouncilExecutionId: nextSession.last_council_execution_id,
      escalation,
      plan: planSummary.plan,
      execution,
      projectMemory: {
        confirmationResult
      }
    };

    if (options.artifactPath) {
      const artifact = {
        artifact_type: "council-exec",
        generated_at: nowIso(),
        payload
      };
      payload.artifactPath = await writeJsonArtifact(options.artifactPath, artifact);
    }

    return payload;
  });
}
