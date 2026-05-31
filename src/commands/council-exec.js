import path from "node:path";
import { councilCommand } from "./council.js";
import { executeCouncilStage, executeCouncilStageWithModel } from "../runtime/council-execution.js";
import { updateDecisionRecordForEscalation } from "../runtime/decision.js";
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

export async function councilExecCommand(options) {
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
      execution
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
