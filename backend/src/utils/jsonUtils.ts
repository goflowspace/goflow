// backend/src/utils/jsonUtils.ts
/**
 * Cleans a string that is supposed to be a JSON object but might be wrapped in markdown code blocks.
 * e.g., "```json\n{\"key\": \"value\"}\n```" -> "{\"key\": \"value\"}"
 * @param aiJsonString The raw string from the AI model.
 * @returns A cleaned string, ready for JSON.parse().
 */
export function sanitizeJsonString(aiJsonString: string): string {
  // Trim whitespace from the start and end of the string.
  let cleanedString = aiJsonString.trim();

  const jsonRegex = /```(json)?\s*([\s\S]*?)\s*```/;
  const match = cleanedString.match(jsonRegex);

  if (match && match[2]) {
      cleanedString = match[2];
  }

  // Trim again to remove any newlines or spaces left by the fence removal.
  return cleanedString.trim();
}

