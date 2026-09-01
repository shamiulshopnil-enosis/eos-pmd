import sanitizeHtml from "sanitize-html";

// Milestone descriptions are stored as HTML but limited to bold + bulleted lists
// (spec §4.2). Run on every write; also safe to run on read.
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
