/**
 * The API has no categories, so topics are derived from each post's SEO keywords and title.
 * A post can belong to several topics; rules are checked in display order.
 */
const TOPIC_RULES = [
  { id: "real-estate", label: "Real Estate", test: /real estate|developer|rera|propert/i },
  { id: "ai-films", label: "AI Films", test: /\bai\b|ai-powered|artificial intelligence/i },
  { id: "lead-generation", label: "Lead Generation", test: /lead generation|\bleads?\b/i },
  { id: "advertising", label: "Advertising", test: /advertis|\bad (agency|film)/i },
  { id: "delhi-ncr", label: "Delhi NCR", test: /delhi|\bncr\b|noida|gurgaon|gurugram/i },
  { id: "creative-agency", label: "Creative Agency", test: /creative/i },
] as const;

export type TopicId = (typeof TOPIC_RULES)[number]["id"];

export const TOPIC_LABELS = Object.fromEntries(TOPIC_RULES.map((t) => [t.id, t.label])) as Record<TopicId, string>;

export function deriveTopics(...text: string[]): TopicId[] {
  const haystack = text.join(" ");
  return TOPIC_RULES.filter((rule) => rule.test.test(haystack)).map((rule) => rule.id);
}
