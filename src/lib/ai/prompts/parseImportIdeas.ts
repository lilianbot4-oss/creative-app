export function buildParseImportIdeasPrompt(rawText: string) {
  const systemPrompt =
    "You are a creative professional parsing a document of campaign ideas. " +
    "Split the text into individual ideas, extracting a clear title and full description for each.";

  const userPrompt = [
    "Parse the following text into individual ideas.",
    "Return a JSON array where each object has:",
    '- "title": the idea name/title',
    '- "description": the full description text for this idea',
    '- "original_text": the exact text from the input that corresponds to this idea (include the title line and all body text, preserve formatting)',
    "",
    "Important rules:",
    "- Preserve the original text exactly. Do not summarize, rewrite, or edit.",
    "- If ideas are numbered (1., 2., etc.), use the text after the number as the title.",
    "- If you cannot identify distinct ideas, return a single idea with the full text.",
    "- Return ONLY the JSON array, no other text.",
    "",
    "Text to parse:",
    rawText,
  ].join("\n");

  return { systemPrompt, userPrompt };
}
