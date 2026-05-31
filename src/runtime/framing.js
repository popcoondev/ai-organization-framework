function firstAnswerForTarget(userAnswers, targetField) {
  return userAnswers.find((item) => Array.isArray(item.target_fields) && item.target_fields.includes(targetField));
}

export function deriveFramingFromClarification(clarification, request) {
  const userAnswers = clarification.user_answers ?? [];
  const needAnswer = firstAnswerForTarget(userAnswers, "need");
  const intentAnswer = firstAnswerForTarget(userAnswers, "intent");
  const successAnswer = firstAnswerForTarget(userAnswers, "success_criteria");

  const contextAnswers = userAnswers
    .filter((item) => Array.isArray(item.target_fields) && item.target_fields.includes("context"))
    .map((item) => item.answer);

  const prohibitionAnswers = userAnswers
    .filter((item) => Array.isArray(item.target_fields) && item.target_fields.includes("prohibited_conditions"))
    .map((item) => item.answer);

  const need = needAnswer?.answer ?? request;
  const intent = intentAnswer?.answer ?? "to be refined after clarification";

  const contextParts = [];
  if (contextAnswers.length > 0) {
    contextParts.push(`context: ${contextAnswers.join(" / ")}`);
  }
  if (prohibitionAnswers.length > 0) {
    contextParts.push(`prohibited: ${prohibitionAnswers.join(" / ")}`);
  }
  if (successAnswer?.answer) {
    contextParts.push(`success: ${successAnswer.answer}`);
  }

  const activeContext = contextParts.length > 0
    ? contextParts.join(" | ")
    : "clarification answers did not yet produce an explicit active context";

  const clarificationsOrAssumptions = userAnswers.length > 0
    ? userAnswers.map((item) => `${item.question} => ${item.answer}`).join(" / ")
    : "no clarification answers captured yet";

  return {
    request,
    need,
    intent,
    active_context: activeContext,
    success_criteria: successAnswer?.answer ?? "not yet explicit",
    clarifications_or_assumptions: clarificationsOrAssumptions
  };
}
