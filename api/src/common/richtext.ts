import sanitizeHtml from "sanitize-html";

// Ported from the Next.js app's src/lib/richtext.ts. Milestone descriptions are
// stored as HTML but limited to bold + bulleted lists (spec §4.2).
export function sanitizeMilestoneHtml(input: string | null | undefined): string {
  return sanitizeHtml(input ?? "", {
    allowedTags: ["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"],
    allowedAttributes: {},
    allowedSchemes: [],
    transformTags: {
      div: "p",
    },
  }).trim();
}
