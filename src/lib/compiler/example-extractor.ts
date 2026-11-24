export interface ProblemExampleCase {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * Extracts structured examples from problem description text (e.g. from LeetCode or bulk upload Excel files)
 * and returns a clean description stripped of raw markdown example blocks, along with structured examples.
 * If no examples are in the description, cleanly falls back to public/sample test cases.
 */
export function extractExamplesAndCleanDescription(
  rawDescription?: string | null,
  fallbackCases?: any[]
): {
  cleanDescription: string;
  examples: ProblemExampleCase[];
} {
  if (!rawDescription || typeof rawDescription !== "string") {
    const examples = (fallbackCases || []).slice(0, 3).map((tc) => ({
      input: String(tc.input ?? ""),
      output: String(tc.expected_output ?? tc.output ?? ""),
      explanation: tc.explanation || undefined,
    }));
    return { cleanDescription: "", examples };
  }

  const desc = String(rawDescription);
  const examples: ProblemExampleCase[] = [];

  // Match the start of the Example section (e.g. "### Example 1", "Example 1:", "**Example 1:**")
  const exampleStartMatch = desc.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*)?Example\s*(\d+)?:?(?:\*\*)?/i);

  let cleanDescription = desc;
  if (exampleStartMatch && exampleStartMatch.index !== undefined) {
    cleanDescription = desc.slice(0, exampleStartMatch.index).trim();
    const exampleSection = desc.slice(exampleStartMatch.index);

    // Split into individual examples
    const parts = exampleSection
      .split(/(?:^|\n)(?=\s*(?:#{1,4}\s*)?(?:\*\*)?Example\s*\d*)/i)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      // If there's a Constraints section inside, cut it off from this example
      const constraintMatch = part.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*)?Constraints?:?(?:\*\*)?/i);
      const textToScan = constraintMatch && constraintMatch.index !== undefined ? part.slice(0, constraintMatch.index) : part;

      let input = "";
      let output = "";
      let explanation = "";

      // Match Input block
      const inBlockMatch = textToScan.match(/(?:\*\*Input:\*\*|Input:)\s*(?:```(?:[a-z0-9_-]*\n)?([\s\S]*?)```|`([^`]+)`|([^\n\r]+))/i);
      if (inBlockMatch) {
        input = (inBlockMatch[1] || inBlockMatch[2] || inBlockMatch[3] || "").trim();
      }

      // Match Output block
      const outBlockMatch = textToScan.match(/(?:\*\*Output:\*\*|Output:)\s*(?:```(?:[a-z0-9_-]*\n)?([\s\S]*?)```|`([^`]+)`|([^\n\r]+))/i);
      if (outBlockMatch) {
        output = (outBlockMatch[1] || outBlockMatch[2] || outBlockMatch[3] || "").trim();
      }

      // Match Explanation block
      const expBlockMatch = textToScan.match(/(?:\*\*Explanation:\*\*|Explanation:)\s*(?:```(?:[a-z0-9_-]*\n)?([\s\S]*?)```|`([^`]+)`|([\s\S]*?))(?=(?:\n\s*#{1,4}|\n\s*(?:\*\*)?Example|\n\s*(?:\*\*)?Constraints|$))/i);
      if (expBlockMatch) {
        explanation = (expBlockMatch[1] || expBlockMatch[2] || expBlockMatch[3] || "").trim();
      }

      if (input || output) {
        examples.push({
          input,
          output,
          explanation: explanation || undefined,
        });
      }
    }
  }

  // Fallback to sample test cases if no examples could be parsed from description
  if (examples.length === 0 && Array.isArray(fallbackCases) && fallbackCases.length > 0) {
    fallbackCases.slice(0, 3).forEach((tc) => {
      examples.push({
        input: String(tc.input ?? ""),
        output: String(tc.expected_output ?? tc.output ?? ""),
        explanation: tc.explanation || undefined,
      });
    });
  }

  return { cleanDescription: cleanDescription || desc, examples };
}
