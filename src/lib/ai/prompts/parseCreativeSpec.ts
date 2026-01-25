export function buildParseCreativeSpecPrompt(rawBriefText: string) {
  const systemPrompt =
    "You are a senior creative strategist. Extract a structured creative map from briefs.";

  const userPrompt = [
    "Return only valid JSON with the following fields:",
    "objective (string)",
    "audience (string)",
    "key_message (string)",
    "tone_tags (array of strings)",
    "deliverables (array of objects: {type, notes})",
    "must_do (array of strings)",
    "must_avoid (array of strings)",
    "suggested_archetypes (array of strings)",
    "content_system_notes (string)",
    "If a field is missing, use an empty string, empty array, or empty object.",
    "Brief:",
    rawBriefText,
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
